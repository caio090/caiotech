import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DbApprovalWithContent } from "@/lib/supabase/types";
import { ContentosAprovacoesContent } from "./_client-content";

export default async function ContentosAprovacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const params = await searchParams;
  const activeClientId = params.client ?? null;

  let serverApprovals: DbApprovalWithContent[] | null = null;

  if (isSupabaseConfigured) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: clientData } = await supabase
          .from("clients").select("id").eq("owner_id", user.id).maybeSingle();

        const SELECT_FIELDS = "*, content_items(id, title, type, channel, objective, caption, script, status, scheduled_date)";

        if (clientData) {
          // Regular client: own approvals only
          const { data } = await supabase
            .from("approvals")
            .select(SELECT_FIELDS)
            .eq("client_id", clientData.id)
            .order("created_at", { ascending: false });
          serverApprovals = data ?? [];
        } else if (activeClientId) {
          // Staff with active client selected
          const { data } = await supabase
            .from("approvals")
            .select(SELECT_FIELDS)
            .eq("client_id", activeClientId)
            .order("created_at", { ascending: false });
          serverApprovals = data ?? [];
        } else {
          // Staff with no specific client — show all
          const { data } = await supabase
            .from("approvals")
            .select(SELECT_FIELDS)
            .order("created_at", { ascending: false })
            .limit(50);
          serverApprovals = data ?? [];
        }
      }
    } catch (e) {
      console.error("[contentos/aprovacoes] Supabase fetch error:", e);
    }
  }

  return <ContentosAprovacoesContent serverApprovals={serverApprovals} />;
}
