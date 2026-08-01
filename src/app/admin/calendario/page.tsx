import { redirect } from "next/navigation";
import { requireAdminContentOSContext } from "@/lib/admin-contentos-api";
import { CLIENT_VISIBLE_STATUSES, isMissingClientVisibilityColumn, isVisibleClientRecord } from "@/lib/client-visibility";
import {
  buildMonthWindow,
  resolveRequestedMonth,
  resolveRequestedSource,
  resolveInitialSelectedDay,
  timestampWindowBounds,
  normalizeContentItems,
  normalizeOperationalTasks,
  normalizeApprovals,
  getFortalezaToday,
  GLOBAL_CALENDAR_TIMEZONE,
  type ContentItemRow,
  type OperationalTaskRow,
  type ApprovalRow,
  type ClientNameLookup,
  type ContentTitleLookup,
  type ResponsibleNameLookup,
  type GlobalCalendarEvent,
  type CalendarEventSource,
} from "@/lib/global-calendar";
import { GlobalCalendarContent } from "./_client-content";
import { AdminContentOSUnavailableState } from "@/components/admin-contentos-unavailable-state";

const RETURN_TO_ALLOWED_PREFIX = "/admin/";
const RETURN_TO_BLOCKED_PREFIXES = ["http://", "https://", "//", "javascript:", "data:"];

/** Fase 13 — só aceita um caminho relativo dentro de /admin/; qualquer outra coisa é ignorada, nunca quebra a página. */
function sanitizeCalendarReturnTo(raw: string | undefined): string | null {
  if (!raw) return null;
  const decoded = decodeURIComponent(raw);
  if (RETURN_TO_BLOCKED_PREFIXES.some((p) => decoded.startsWith(p))) return null;
  if (!decoded.startsWith(RETURN_TO_ALLOWED_PREFIX)) return null;
  return decoded;
}

/** buildCalendarNavigationUrl() do REC OS manda `month` como "YYYY-MM"; resolveRequestedMonth() espera ano/mês separados — traduz sem alterar o contrato existente da função. */
function splitCombinedMonth(month: string | undefined): { year?: string; month?: string } {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return {};
  const [y, m] = month.split("-");
  return { year: y, month: String(Number(m)) };
}

export default async function AdminGlobalCalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; client?: string; source?: string; return_to?: string; content_id?: string; campaign?: string }>;
}) {
  const params = await searchParams;

  // Sprint Navegação e Experiência 3.0.1.2 (Fase 4) — antes, QUALQUER falha
  // de requireAdminContentOSContext() (401/403/503) virava redirect("/login"),
  // então um admin autenticado com sessão válida (já confirmada pelo proxy)
  // caía no login sempre que o serviço estivesse indisponível (ex.: sem
  // SUPABASE_SERVICE_ROLE_KEY neste ambiente local) — o estado real deste
  // ambiente. Só 401 (genuinamente "sem sessão") ainda vai para /login.
  const ctx = await requireAdminContentOSContext();
  if (ctx instanceof Response) {
    if (ctx.status === 401) redirect("/login");
    const retryQs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]).toString();
    return <AdminContentOSUnavailableState status={ctx.status} retryHref={`/admin/calendario${retryQs ? `?${retryQs}` : ""}`} />;
  }
  const { adminDb } = ctx;

  const combinedMonth = splitCombinedMonth(params.month);
  const { year, month } = resolveRequestedMonth(combinedMonth.year ?? params.year, combinedMonth.month ?? params.month);
  const returnTo = sanitizeCalendarReturnTo(params.return_to);
  const requestedSource = resolveRequestedSource(params.source);
  const window = buildMonthWindow(year, month);
  const { startIso, endIso } = timestampWindowBounds(window.gridStartKey, window.gridEndKey);
  const serverToday = getFortalezaToday();

  // ── Full authorized client list (Fase 3) — independent of which clients have
  // events this month, so a client with zero events still shows up in the filter. ──
  let clientsResult = await adminDb
    .from("clients")
    .select("id, company_name, status, deleted_at, archived_at")
    .in("status", CLIENT_VISIBLE_STATUSES)
    .order("company_name");

  if (clientsResult.error && isMissingClientVisibilityColumn(clientsResult.error)) {
    clientsResult = await adminDb
      .from("clients")
      .select("id, company_name, status")
      .in("status", CLIENT_VISIBLE_STATUSES)
      .order("company_name") as typeof clientsResult;
  }

  type ClientRow = { id: string; company_name: string | null; status?: string | null; deleted_at?: string | null; archived_at?: string | null };
  const visibleClients = ((clientsResult.data ?? []) as ClientRow[]).filter(isVisibleClientRecord);

  const clientNames: ClientNameLookup = new Map();
  for (const c of visibleClients) {
    if (c.company_name) clientNames.set(c.id, c.company_name);
  }

  const clients = visibleClients
    .filter((c) => !!c.company_name)
    .map((c) => ({ id: c.id, name: c.company_name as string }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  // Fase 2 — validate `client` param server-side; an unknown id is ignored, never a 500.
  const requestedClientId = params.client && clientNames.has(params.client) ? params.client : "all";

  let events: GlobalCalendarEvent[] = [];
  const sourceErrors: CalendarEventSource[] = [];

  const [contentItemsRes, operationalTasksRes, approvalsRes] = await Promise.allSettled([
    adminDb
      .from("content_items")
      .select("id, client_id, title, type, channel, status, scheduled_date, scheduled_at, caption, responsible_id")
      .or(
        `and(scheduled_date.gte.${window.gridStartKey},scheduled_date.lte.${window.gridEndKey}),` +
        `and(scheduled_at.gte.${startIso},scheduled_at.lte.${endIso})`
      ),
    adminDb
      .from("operational_tasks")
      .select("id, client_id, content_item_id, approval_id, title, description, due_date, start_date, status, department, task_type, priority, assigned_to, assigned_role")
      .or(
        `and(due_date.gte.${window.gridStartKey},due_date.lte.${window.gridEndKey}),` +
        `and(due_date.is.null,start_date.gte.${window.gridStartKey},start_date.lte.${window.gridEndKey})`
      ),
    adminDb
      .from("approvals")
      .select("id, client_id, content_id, status, approval_sent_at, approval_due_at, created_at")
      .or(
        `and(approval_due_at.gte.${startIso},approval_due_at.lte.${endIso}),` +
        `and(approval_due_at.is.null,approval_sent_at.gte.${startIso},approval_sent_at.lte.${endIso}),` +
        `and(approval_due_at.is.null,approval_sent_at.is.null,created_at.gte.${startIso},created_at.lte.${endIso})`
      ),
  ]);

  const contentItemRows: ContentItemRow[] =
    contentItemsRes.status === "fulfilled" && !contentItemsRes.value.error
      ? ((contentItemsRes.value.data ?? []) as ContentItemRow[])
      : [];
  if (contentItemsRes.status === "rejected" || contentItemsRes.value?.error) {
    sourceErrors.push("content_item");
    console.error("[admin/calendario] content_items fetch error:", contentItemsRes.status === "rejected" ? contentItemsRes.reason : contentItemsRes.value.error);
  }

  const operationalTaskRows: OperationalTaskRow[] =
    operationalTasksRes.status === "fulfilled" && !operationalTasksRes.value.error
      ? ((operationalTasksRes.value.data ?? []) as OperationalTaskRow[])
      : [];
  if (operationalTasksRes.status === "rejected" || operationalTasksRes.value?.error) {
    sourceErrors.push("operational_task");
    console.error("[admin/calendario] operational_tasks fetch error:", operationalTasksRes.status === "rejected" ? operationalTasksRes.reason : operationalTasksRes.value.error);
  }

  const approvalRows: ApprovalRow[] =
    approvalsRes.status === "fulfilled" && !approvalsRes.value.error
      ? ((approvalsRes.value.data ?? []) as ApprovalRow[])
      : [];
  if (approvalsRes.status === "rejected" || approvalsRes.value?.error) {
    sourceErrors.push("approval");
    console.error("[admin/calendario] approvals fetch error:", approvalsRes.status === "rejected" ? approvalsRes.reason : approvalsRes.value.error);
  }

  // Related content titles for approvals (approvals carry no title of their own).
  const approvalContentIds = Array.from(
    new Set(approvalRows.map((a) => a.content_id).filter((id): id is string => !!id))
  );
  const contentTitles: ContentTitleLookup = new Map();
  if (approvalContentIds.length > 0) {
    const { data, error } = await adminDb
      .from("content_items")
      .select("id, title")
      .in("id", approvalContentIds);
    if (!error && data) {
      for (const row of data as { id: string; title: string | null }[]) {
        if (row.title) contentTitles.set(row.id, row.title);
      }
    }
  }

  // Responsible names (Fase 9) — batched, id -> profiles.name.
  const responsibleIds = Array.from(new Set([
    ...contentItemRows.map((c) => c.responsible_id).filter((id): id is string => !!id),
    ...operationalTaskRows.map((t) => t.assigned_to).filter((id): id is string => !!id),
  ]));
  const responsibleNames: ResponsibleNameLookup = new Map();
  if (responsibleIds.length > 0) {
    const { data, error } = await adminDb
      .from("profiles")
      .select("id, name")
      .in("id", responsibleIds);
    if (!error && data) {
      for (const row of data as { id: string; name: string | null }[]) {
        if (row.name) responsibleNames.set(row.id, row.name);
      }
    }
  }

  events = [
    ...normalizeContentItems(contentItemRows, clientNames, responsibleNames),
    ...normalizeOperationalTasks(operationalTaskRows, clientNames, responsibleNames),
    ...normalizeApprovals(approvalRows, clientNames, contentTitles),
  ];

  return (
    <GlobalCalendarContent
      key={`${window.year}-${window.month}-${requestedClientId}-${requestedSource}`}
      initialEvents={events}
      initialYear={window.year}
      initialMonth={window.month}
      initialSelectedDay={resolveInitialSelectedDay(window.year, window.month, serverToday)}
      initialFilterClient={requestedClientId}
      initialFilterSource={requestedSource}
      clients={clients}
      sourceErrors={sourceErrors}
      serverToday={serverToday.dateKey}
      timezone={GLOBAL_CALENDAR_TIMEZONE}
      returnTo={returnTo}
    />
  );
}
