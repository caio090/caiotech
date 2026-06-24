import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateContentOSClient } from "@/lib/admin-contentos-clients";
import type { DbApprovalWithContent } from "@/lib/supabase/types";
import { ContentosAprovacoesContent } from "@/app/contentos/aprovacoes/_client-content";
import { ContentosSubNav } from "../_contentos-subnav";
import { SmartSuggestionsPanel } from "@/components/smart-suggestions-panel";
import { getContentOSSuggestions } from "@/lib/ai-suggestions";

export default async function AdminContentosAprovacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; approval?: string }>;
}) {
  const params          = await searchParams;
  const activeClientId  = params.client ?? null;
  const initialApprovalId = params.approval ?? null;

  if (!activeClientId) {
    redirect("/admin/contentos/selecionar-cliente");
  }

  let serverApprovals: DbApprovalWithContent[] | null = null;
  let suggestions: Awaited<ReturnType<typeof getContentOSSuggestions>> = [];

  if (isSupabaseConfigured) {
    const validClient = await validateContentOSClient(activeClientId);
    if (!validClient) {
      redirect("/admin/contentos/selecionar-cliente");
    }

    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from("approvals")
          .select("*, content_items(id, title, type, channel, objective, caption, script, status, scheduled_date)")
          .eq("client_id", activeClientId)
          .order("created_at", { ascending: false });
        serverApprovals = data ?? [];
      }
      suggestions = await getContentOSSuggestions(supabase, activeClientId);
    } catch (e) {
      console.error("[admin/contentos/aprovacoes] Supabase fetch error:", e);
    }
  }

  return (
    <>
      <ContentosSubNav />
      {suggestions.length > 0 && (
        <SmartSuggestionsPanel suggestions={suggestions} compact className="mb-5" />
      )}
      <ContentosAprovacoesContent serverApprovals={serverApprovals} initialApprovalId={initialApprovalId} />
    </>
  );
}
