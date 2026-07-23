import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireAdminContentOSContext } from "@/lib/admin-contentos-api";
import { resolveClientContext } from "@/lib/rec-os-client-context";
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

  let serverApprovals: DbApprovalWithContent[] | null = null;
  let suggestions: Awaited<ReturnType<typeof getContentOSSuggestions>> = [];
  let activeClientName: string | null = null;
  let clientStatus: "absent" | "valid" | "invalid" = "absent";

  if (isSupabaseConfigured) {
    const ctx = await requireAdminContentOSContext();
    if (!(ctx instanceof Response)) {
      const { adminDb } = ctx;
      const clientContext = await resolveClientContext(adminDb, activeClientId);
      clientStatus = clientContext.status;

      if (clientContext.status === "valid") {
        activeClientName = clientContext.companyName;

        // Use adminDb to bypass RLS on approvals table
        const { data, error } = await adminDb
          .from("approvals")
          .select("*, content_items(id, title, type, channel, objective, caption, script, status, scheduled_date)")
          .eq("client_id", clientContext.clientId)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("[admin/contentos/aprovacoes] approvals fetch error:", error.message);
          // Fallback: attempt without relational join
          const { data: flatData } = await adminDb
            .from("approvals")
            .select("*")
            .eq("client_id", clientContext.clientId)
            .order("created_at", { ascending: false });
          serverApprovals = (flatData ?? []) as DbApprovalWithContent[];
        } else {
          serverApprovals = data ?? [];
        }

        suggestions = await getContentOSSuggestions(adminDb, clientContext.clientId);
      } else if (clientContext.status === "absent") {
        // Fase 6 do hotfix canônico 1.0.1 — modo global: sem client na URL,
        // mostra aprovações de todos os clientes em vez de redirecionar ao
        // seletor. Mesmo padrão já usado por src/app/contentos/aprovacoes/
        // page.tsx (staff sem cliente ativo — "show all").
        const { data, error } = await adminDb
          .from("approvals")
          .select("*, content_items(id, title, type, channel, objective, caption, script, status, scheduled_date), clients(company_name)")
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) {
          console.error("[admin/contentos/aprovacoes] global approvals fetch error:", error.message);
        } else {
          serverApprovals = data ?? [];
        }
      }
    }
  }

  const serverNow = Date.now();

  return (
    <>
      <ContentosSubNavServer initialClientId={activeClientId ?? undefined} />
      {clientStatus === "invalid" && (
        <div className="mb-5 bg-red-50 border border-red-100 rounded-2xl p-4 text-xs text-red-700">
          Cliente não encontrado ou sem acesso para o ID informado na URL. Selecione outro cliente ou remova o filtro para ver todos.
        </div>
      )}
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
