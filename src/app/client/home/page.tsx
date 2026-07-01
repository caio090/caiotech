import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveCurrentClient } from "@/lib/client/resolve-client";
import { ClientHomeContent } from "./_client-content";
import type { ServerPageData, DbOnboardingProfile, DbProfile, DbClient } from "@/lib/supabase/types";
import { SmartSuggestionsPanel } from "@/components/smart-suggestions-panel";
import { getClientSafeSuggestions } from "@/lib/ai-suggestions";
import { CLIENT_VISIBLE_STATUSES } from "@/lib/client-visibility";

export default async function ClientHomePage() {
  let serverData: ServerPageData | null = null;
  let suggestions: Awaited<ReturnType<typeof getClientSafeSuggestions>> = [];

  if (isSupabaseConfigured) {
    try {
      const resolved = await resolveCurrentClient();

      if (resolved?.userId) {
        const supabase = await createServerSupabaseClient();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const clientData = resolved.client as any;
        let onboarding: DbOnboardingProfile | null = null;

        if (clientData?.id) {
          const { data: onb } = await supabase
            .from("onboarding_profiles")
            .select("*")
            .eq("client_id", clientData.id)
            .maybeSingle();
          onboarding = onb ?? null;
        }

        // Fallback onboarding via owner_id (clientes antigos com owner_id)
        if (!onboarding) {
          const { data: onbJoin } = await supabase
            .from("onboarding_profiles")
            .select("*, clients!inner(owner_id)")
            .eq("clients.owner_id", resolved.userId)
            .in("clients.status", CLIENT_VISIBLE_STATUSES)
            .is("clients.deleted_at", null)
            .is("clients.archived_at", null)
            .maybeSingle();
          if (onbJoin) {
            onboarding = onbJoin as unknown as DbOnboardingProfile;
          }
        }

        serverData = {
          profile:    resolved.profile as DbProfile | null,
          client:     resolved.client as DbClient | null,
          onboarding,
        };

        if (clientData?.id) {
          suggestions = await getClientSafeSuggestions(supabase, clientData.id);
        }

        console.log("[client/home] resolved:", {
          clientId:  resolved.clientId,
          hasClient: !!resolved.client,
          hasOnb:    !!onboarding,
        });
      }
    } catch (e) {
      console.error("[client/home] error:", e);
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
