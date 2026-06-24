import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
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
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        userRole = profile?.role ?? "";

        // Fetch clients, filter to only those whose owner has role='cliente'
        const { data: allClients } = await supabase
          .from("clients")
          .select("id, company_name, owner_id")
          .order("company_name", { ascending: true });

        const allData = allClients ?? [];
        const ownerIds = [
          ...new Set(
            allData.map((c) => (c as { owner_id?: string }).owner_id).filter(Boolean)
          ),
        ] as string[];

        const realOwnerIds = new Set<string>();
        if (ownerIds.length > 0) {
          const { data: pRows } = await supabase
            .from("profiles")
            .select("id")
            .in("id", ownerIds)
            .eq("role", "cliente");
          (pRows ?? []).forEach((p: { id: string }) => realOwnerIds.add(p.id));
        }

        // Include clients with no owner (manually created) or whose owner is 'cliente'
        clients = allData
          .filter((c) => {
            const oid = (c as { owner_id?: string }).owner_id;
            return !oid || realOwnerIds.has(oid);
          })
          .map((c) => ({ id: c.id, company_name: c.company_name }));
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
