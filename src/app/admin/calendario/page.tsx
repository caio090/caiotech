import { redirect } from "next/navigation";
import { requireAdminContentOSContext } from "@/lib/admin-contentos-api";
import {
  buildMonthWindow,
  resolveRequestedMonth,
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
  type GlobalCalendarEvent,
} from "@/lib/global-calendar";
import { GlobalCalendarContent } from "./_client-content";

export default async function AdminGlobalCalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;

  const ctx = await requireAdminContentOSContext();
  if (ctx instanceof Response) redirect("/login");
  const { adminDb } = ctx;

  const { year, month } = resolveRequestedMonth(params.year, params.month);
  const window = buildMonthWindow(year, month);
  const { startIso, endIso } = timestampWindowBounds(window.gridStartKey, window.gridEndKey);

  let events: GlobalCalendarEvent[] = [];
  const sourceErrors: string[] = [];

  const [contentItemsRes, operationalTasksRes, approvalsRes] = await Promise.allSettled([
    adminDb
      .from("content_items")
      .select("id, client_id, title, type, channel, status, scheduled_date, responsible_id")
      .gte("scheduled_date", window.gridStartKey)
      .lte("scheduled_date", window.gridEndKey),
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
    sourceErrors.push("conteudos");
    console.error("[admin/calendario] content_items fetch error:", contentItemsRes.status === "rejected" ? contentItemsRes.reason : contentItemsRes.value.error);
  }

  const operationalTaskRows: OperationalTaskRow[] =
    operationalTasksRes.status === "fulfilled" && !operationalTasksRes.value.error
      ? ((operationalTasksRes.value.data ?? []) as OperationalTaskRow[])
      : [];
  if (operationalTasksRes.status === "rejected" || operationalTasksRes.value?.error) {
    sourceErrors.push("tarefas");
    console.error("[admin/calendario] operational_tasks fetch error:", operationalTasksRes.status === "rejected" ? operationalTasksRes.reason : operationalTasksRes.value.error);
  }

  const approvalRows: ApprovalRow[] =
    approvalsRes.status === "fulfilled" && !approvalsRes.value.error
      ? ((approvalsRes.value.data ?? []) as ApprovalRow[])
      : [];
  if (approvalsRes.status === "rejected" || approvalsRes.value?.error) {
    sourceErrors.push("aprovacoes");
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

  // Client names, batched for exactly the clients referenced by the events found.
  const clientIds = Array.from(new Set([
    ...contentItemRows.map((c) => c.client_id),
    ...operationalTaskRows.map((t) => t.client_id).filter((id): id is string => !!id),
    ...approvalRows.map((a) => a.client_id),
  ].filter(Boolean)));

  const clientNames: ClientNameLookup = new Map();
  if (clientIds.length > 0) {
    const { data, error } = await adminDb
      .from("clients")
      .select("id, company_name")
      .in("id", clientIds);
    if (!error && data) {
      for (const row of data as { id: string; company_name: string | null }[]) {
        if (row.company_name) clientNames.set(row.id, row.company_name);
      }
    }
  }

  events = [
    ...normalizeContentItems(contentItemRows, clientNames),
    ...normalizeOperationalTasks(operationalTaskRows, clientNames),
    ...normalizeApprovals(approvalRows, clientNames, contentTitles),
  ];

  const clients = Array.from(clientNames.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return (
    <GlobalCalendarContent
      initialEvents={events}
      initialYear={window.year}
      initialMonth={window.month}
      clients={clients}
      sourceErrors={sourceErrors}
      serverToday={getFortalezaToday().dateKey}
      timezone={GLOBAL_CALENDAR_TIMEZONE}
    />
  );
}
