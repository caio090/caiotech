import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ClientHomeContent } from "./_client-content";
import type { ServerPageData, DbOnboardingProfile } from "@/lib/supabase/types";
import { SmartSuggestionsPanel } from "@/components/smart-suggestions-panel";
import { getClientSafeSuggestions } from "@/lib/ai-suggestions";
import { CLIENT_VISIBLE_STATUSES } from "@/lib/client-visibility";

export default async function ClientHomePage() {
  let serverData: ServerPageData | null = null;
  let suggestions: Awaited<ReturnType<typeof getClientSafeSuggestions>> = [];

  if (isSupabaseConfigured) {
    try {
      const supabase = await createServerSupabaseClient();

      // getUser() valida o JWT com o servidor Supabase; getSession() lê só do cookie.
      // Tentamos ambos para cobrir casos onde o token ainda não foi renovado nesta request.
      let userId: string | null = null;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id ?? null;
      }

      console.log("[client/home] userId:", userId ?? "null — serverData ficará null");

      if (userId) {
        const [profileRes, clientByOwnerRes] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
          supabase
            .from("clients")
            .select("*")
            .eq("owner_id", userId)
            .in("status", CLIENT_VISIBLE_STATUSES)
            .is("deleted_at", null)
            .is("archived_at", null)
            .maybeSingle(),
        ]);

        // Caminho 2: cliente convidado — profiles.client_id (set pelo accept_client_invite RPC)
        // Não filtra por status: status "inactive" não deve bloquear acesso do convidado.
        let clientRes = clientByOwnerRes;
        if (!clientRes.data && profileRes.data?.client_id) {
          clientRes = await supabase
            .from("clients")
            .select("*")
            .eq("id", profileRes.data.client_id)
            .is("deleted_at", null)
            .is("archived_at", null)
            .maybeSingle() as typeof clientRes;
        }

        // Caminho 3: convite aceito — client_invites.accepted_by = userId
        // Fallback para quando profiles.client_id ficou null (ex: RPC sem sessão ativa).
        // Também repara o profiles.client_id para visitas futuras.
        if (!clientRes.data) {
          const { data: inviteRow } = await supabase
            .from("client_invites")
            .select("client_id")
            .eq("accepted_by", userId)
            .eq("status", "accepted")
            .order("accepted_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (inviteRow?.client_id) {
            clientRes = await supabase
              .from("clients")
              .select("*")
              .eq("id", inviteRow.client_id)
              .is("deleted_at", null)
              .is("archived_at", null)
              .maybeSingle() as typeof clientRes;

            // Auto-repara profiles.client_id para que próximas visitas usem caminho 2
            if (clientRes.data) {
              await supabase
                .from("profiles")
                .update({ client_id: inviteRow.client_id, role: "client" })
                .eq("id", userId);
            }
          }
        }

        let onboarding = null;

        // Caminho 1: busca direta via client_id
        if (clientRes.data?.id) {
          const { data: onb, error: onbErr } = await supabase
            .from("onboarding_profiles")
            .select("*")
            .eq("client_id", clientRes.data.id)
            .maybeSingle();
          console.log("[client/home] onboarding (path1):", onb?.id ?? "null", onbErr?.code ?? "ok");
          onboarding = onb ?? null;
        }

        // Caminho 2: join com clients
        if (!onboarding) {
          const { data: onbJoin, error: joinErr } = await supabase
            .from("onboarding_profiles")
            .select("*, clients!inner(owner_id)")
            .eq("clients.owner_id", userId)
            .in("clients.status", CLIENT_VISIBLE_STATUSES)
            .is("clients.deleted_at", null)
            .is("clients.archived_at", null)
            .maybeSingle();
          console.log("[client/home] onboarding (path2):", onbJoin?.id ?? "null", joinErr?.code ?? "ok");
          if (onbJoin) {
            onboarding = onbJoin as unknown as DbOnboardingProfile;
          }
        }

        serverData = {
          profile:    profileRes.data,
          client:     clientRes.data,
          onboarding,
        };

        if (clientRes.data?.id) {
          suggestions = await getClientSafeSuggestions(supabase, clientRes.data.id);
        }

        console.log("[client/home] serverData:", {
          profile: !!serverData.profile,
          client:  !!serverData.client,
          onboarding: !!serverData.onboarding,
        });
      }
    } catch (e) {
      console.error("[client/home] Supabase fetch error:", e);
    }
  }

  return (
    <>
      {suggestions.length > 0 && (
        <SmartSuggestionsPanel suggestions={suggestions} compact className="mb-5" />
      )}
      <ClientHomeContent serverData={serverData} />
    </>
  );
}
