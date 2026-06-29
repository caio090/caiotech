import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { canAccessAdmin, canAccessContenOS } from "@/lib/access-control";
import { SelecionarClienteContent } from "./_client-content";
import { CLIENT_VISIBLE_STATUSES, isMissingClientVisibilityColumn, isVisibleClientRecord } from "@/lib/client-visibility";

export default async function SelecionarClientePage() {
  let clients: Array<{ id: string; company_name: string | null }> = [];
  let userRole = "";

  if (isSupabaseConfigured) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, client_id")
          .eq("id", user.id)
          .maybeSingle();
        userRole = profile?.role ?? "";

        if (userRole === "cliente") {
          const profileClientId = (profile as { client_id?: string | null } | null)?.client_id ?? null;
          let query = supabase
            .from("clients")
            .select("id, company_name, status, deleted_at, archived_at")
            .in("status", CLIENT_VISIBLE_STATUSES)
            .is("deleted_at", null)
            .is("archived_at", null)
            .order("company_name", { ascending: true });

          query = profileClientId
            ? query.eq("id", profileClientId)
            : query.eq("owner_id", user.id);

          let result = await query;
          if (result.error && isMissingClientVisibilityColumn(result.error)) {
            let fallbackQuery = supabase
              .from("clients")
              .select("id, company_name, status")
              .in("status", CLIENT_VISIBLE_STATUSES)
              .order("company_name", { ascending: true });

            fallbackQuery = profileClientId
              ? fallbackQuery.eq("id", profileClientId)
              : fallbackQuery.eq("owner_id", user.id);

            result = await fallbackQuery as typeof result;
          }
          clients = (result.data ?? [])
            .filter(isVisibleClientRecord)
            .map((c) => ({ id: c.id, company_name: c.company_name }));
        } else if (canAccessAdmin(userRole) || canAccessContenOS(userRole)) {
          let result = await supabase
            .from("clients")
            .select("id, company_name, status, deleted_at, archived_at")
            .in("status", CLIENT_VISIBLE_STATUSES)
            .is("deleted_at", null)
            .is("archived_at", null)
            .order("company_name", { ascending: true });
          if (result.error && isMissingClientVisibilityColumn(result.error)) {
            result = await supabase
              .from("clients")
              .select("id, company_name, status")
              .in("status", CLIENT_VISIBLE_STATUSES)
              .order("company_name", { ascending: true }) as typeof result;
          }
          clients = (result.data ?? [])
            .filter(isVisibleClientRecord)
            .map((c) => ({ id: c.id, company_name: c.company_name }));
        }
      }
    } catch (e) {
      console.error("[selecionar-cliente] error:", e);
    }
  }

  return (
    <SelecionarClienteContent
      clients={clients}
      userRole={userRole}
      isSupabaseActive={isSupabaseConfigured}
    />
  );
}
