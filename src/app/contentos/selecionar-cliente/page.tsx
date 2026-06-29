import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { canAccessAdmin, canAccessContenOS } from "@/lib/access-control";
import { SelecionarClienteContent } from "./_client-content";

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
            .select("id, company_name")
            .in("status", ["active", "onboarding"])
            .order("company_name", { ascending: true });

          query = profileClientId
            ? query.eq("id", profileClientId)
            : query.eq("owner_id", user.id);

          const { data } = await query;
          clients = (data ?? []).map((c) => ({ id: c.id, company_name: c.company_name }));
        } else if (canAccessAdmin(userRole) || canAccessContenOS(userRole)) {
          const { data } = await supabase
            .from("clients")
            .select("id, company_name")
            .in("status", ["active", "onboarding"])
            .order("company_name", { ascending: true });
          clients = (data ?? []).map((c) => ({ id: c.id, company_name: c.company_name }));
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
