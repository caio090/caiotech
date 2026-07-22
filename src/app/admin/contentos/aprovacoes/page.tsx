import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  requireAdminContentOSContext,
  validateAdminClient,
} from "@/lib/admin-contentos-api";
import type { DbApprovalWithContent } from "@/lib/supabase/types";
import { ContentosAprovacoesContent } from "@/app/contentos/aprovacoes/_client-content";
import { ContentosSubNavServer } from "../_contentos-subnav-server";
import { SmartSuggestionsPanel } from "@/components/smart-suggestions-panel";
import { getContentOSSuggestions } from "@/lib/ai-suggestions";

export default async function AdminContentosAprovacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; approval?: string; content_id?: string; status?: string }>;
}) {
  const params            = await searchParams;
  const activeClientId    = params.client ?? null;
  const initialApprovalId = params.approval ?? null;
  const initialStatusFilter = params.status ?? null;

  if (!activeClientId) {
    redirect("/admin/contentos/selecionar-cliente");
  }

  let serverApprovals: DbApprovalWithContent[] | null = null;
  let suggestions: Awaited<ReturnType<typeof getContentOSSuggestions>> = [];
  let activeClientName: string | null = null;

  if (isSupabaseConfigured) {
    const ctx = await requireAdminContentOSContext();
    if (ctx instanceof Response) redirect("/admin/contentos/selecionar-cliente");
    const { adminDb } = ctx as Exclude<typeof ctx, Response>;

    const valid = await validateAdminClient(adminDb, activeClientId);
    if (!valid) {
      redirect("/admin/contentos/selecionar-cliente");
    }

    const { data: clientRow } = await adminDb
      .from("clients")
      .select("company_name")
      .eq("id", activeClientId)
      .maybeSingle();
    activeClientName = (clientRow as { company_name?: string } | null)?.company_name ?? null;

    // Use adminDb to bypass RLS on approvals table
    const { data, error } = await adminDb
      .from("approvals")
      .select("*, content_items(id, title, type, channel, objective, caption, script, status, scheduled_date)")
      .eq("client_id", activeClientId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[admin/contentos/aprovacoes] approvals fetch error:", error.message);
      // Fallback: attempt without relational join
      const { data: flatData } = await adminDb
        .from("approvals")
        .select("*")
        .eq("client_id", activeClientId)
        .order("created_at", { ascending: false });
      serverApprovals = (flatData ?? []) as DbApprovalWithContent[];
    } else {
      serverApprovals = data ?? [];
    }

    suggestions = await getContentOSSuggestions(adminDb, activeClientId);
  }

  const serverNow = Date.now();

  return (
    <>
      <ContentosSubNavServer initialClientId={activeClientId} />
      {suggestions.length > 0 && (
        <SmartSuggestionsPanel suggestions={suggestions} compact className="mb-5" />
      )}
      <ContentosAprovacoesContent
        serverApprovals={serverApprovals}
        initialApprovalId={initialApprovalId}
        initialStatusFilter={initialStatusFilter}
        activeClientId={activeClientId}
        activeClientName={activeClientName}
        serverNow={serverNow}
      />
    </>
  );
}
