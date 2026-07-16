import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateContentOSClient } from "@/lib/admin-contentos-clients";
import type { DbApprovalWithContent } from "@/lib/supabase/types";
import { ContentosAprovacoesContent } from "@/app/contentos/aprovacoes/_client-content";
import { ContentosSubNavServer } from "../_contentos-subnav-server";
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
  let activeClientName: string | null = null;

  if (isSupabaseConfigured) {
    const validClient = await validateContentOSClient(activeClientId);
    if (!validClient) {
      redirect("/admin/contentos/selecionar-cliente");
    }

    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: clientRow } = await supabase
          .from("clients")
          .select("company_name")
          .eq("id", activeClientId)
          .maybeSingle();
        activeClientName = clientRow?.company_name ?? null;

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
      <ContentosSubNavServer initialClientId={activeClientId} />
      {suggestions.length > 0 && (
        <SmartSuggestionsPanel suggestions={suggestions} compact className="mb-5" />
      )}
      <ContentosAprovacoesContent
        serverApprovals={serverApprovals}
        initialApprovalId={initialApprovalId}
        activeClientId={activeClientId}
        activeClientName={activeClientName}
      />
    </>
  );
}
