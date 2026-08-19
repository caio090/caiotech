import { redirect } from "next/navigation";
import { requireAdminContentOSContext } from "@/lib/admin-contentos-api";
import { listAuthorizedCompanies } from "@/lib/office-global/authorized-companies";
import type { ContentItemRow, ApprovalRow, ClientNameLookup } from "@/lib/global-calendar";
import {
  computeHubCounts,
  computeClientSummaries,
  countClientsWithPendencies,
  buildAttentionList,
  approvalDueDates,
} from "@/lib/rec-os-hub";
import { RecOSHubContent } from "./_hub-client-content";
import { ContentosSubNavServer } from "./_contentos-subnav-server";
import { AdminContentOSUnavailableState } from "@/components/admin-contentos-unavailable-state";

export default async function AdminContentosPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; clientPicker?: string }>;
}) {
  const params = await searchParams;

  // Sprint Navegação e Experiência 3.0.1.2 (Fase 5) — mesmo defeito do
  // Calendário: REC OS (o hub principal, entrada canônica de /admin/contentos)
  // enviava qualquer admin autenticado ao /login sempre que
  // requireAdminContentOSContext() retornava 403/503 — nunca era realmente
  // "sem sessão". Só 401 (genuinamente sem sessão) ainda redireciona.
  const ctx = await requireAdminContentOSContext();
  if (ctx instanceof Response) {
    if (ctx.status === 401) redirect("/login");
    const retryQs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]).toString();
    return <AdminContentOSUnavailableState status={ctx.status} retryHref={`/admin/contentos${retryQs ? `?${retryQs}` : ""}`} />;
  }
  const { adminDb, user, role } = ctx;

  // REC OS Context Foundation V1 — antes esta lista vinha de uma query
  // direta em `clients` (só filtrada por status/visibilidade, nunca por
  // autorização real), podendo divergir da lista que o resto do produto usa
  // (Company Central/Escritório/header, todos via listAuthorizedCompanies()).
  // Mesma autoridade canônica agora, nenhuma auth paralela.
  const authorizedCompanies = await listAuthorizedCompanies(adminDb, user.id, role);

  const clientNames: ClientNameLookup = new Map();
  for (const c of authorizedCompanies) {
    if (c.companyName) clientNames.set(c.id, c.companyName);
  }

  const clientOptions = authorizedCompanies
    .filter((c) => !!c.companyName)
    .map((c) => ({ id: c.id, name: c.companyName as string }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  // Fase 3 — client from the URL is the only source of truth; an unknown id
  // is treated as "todos os clientes" and never used to query anything.
  const requestedClientId =
    params.client && clientNames.has(params.client) ? params.client : null;

  let contentItems: ContentItemRow[] = [];
  let approvals: ApprovalRow[] = [];
  const sourceErrors: string[] = [];

  let contentQuery = adminDb
    .from("content_items")
    .select("id, client_id, title, type, channel, status, scheduled_date, scheduled_at, caption, responsible_id")
    .order("created_at", { ascending: false })
    .limit(500);
  if (requestedClientId) contentQuery = contentQuery.eq("client_id", requestedClientId);

  let approvalsQuery = adminDb
    .from("approvals")
    .select("id, client_id, content_id, status, approval_sent_at, approval_due_at, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (requestedClientId) approvalsQuery = approvalsQuery.eq("client_id", requestedClientId);

  const [contentRes, approvalsRes] = await Promise.allSettled([contentQuery, approvalsQuery]);

  if (contentRes.status === "fulfilled" && !contentRes.value.error) {
    contentItems = (contentRes.value.data ?? []) as ContentItemRow[];
  } else {
    sourceErrors.push("content_items");
    console.error(
      "[admin/contentos] content_items fetch error:",
      contentRes.status === "rejected" ? contentRes.reason : contentRes.value.error
    );
  }

  if (approvalsRes.status === "fulfilled" && !approvalsRes.value.error) {
    approvals = (approvalsRes.value.data ?? []) as ApprovalRow[];
  } else {
    sourceErrors.push("approvals");
    console.error(
      "[admin/contentos] approvals fetch error:",
      approvalsRes.status === "rejected" ? approvalsRes.reason : approvalsRes.value.error
    );
  }

  // Only items belonging to a visible/authorized client ever reach the UI —
  // this is the isolation boundary (Fase 11): an orphaned or hidden
  // client_id simply has no name and is filtered out downstream.
  const visibleContentItems = contentItems.filter((c) => clientNames.has(c.client_id));

  const today = new Date();
  const counts = computeHubCounts(visibleContentItems, today);
  const clientSummaries = computeClientSummaries(visibleContentItems, clientNames);
  const clientsWithPendencies = countClientsWithPendencies(clientSummaries);
  const dueDates = approvalDueDates(approvals);
  const attentionItems = buildAttentionList(visibleContentItems, clientNames).map((item) => ({
    ...item,
    relevant_date: item.relevant_date ?? dueDates.get(item.key) ?? null,
  }));

  return (
    <>
      <ContentosSubNavServer initialClientId={requestedClientId ?? undefined} />
      <RecOSHubContent
        clientOptions={clientOptions}
        activeClientId={requestedClientId}
        counts={counts}
        clientsWithPendencies={clientsWithPendencies}
        clientSummaries={clientSummaries}
        attentionItems={attentionItems}
        sourceErrors={sourceErrors}
        openClientPicker={params.clientPicker === "open"}
      />
    </>
  );
}
