import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowUpRight } from "lucide-react";
import { resolveCompanyContext } from "@/lib/company-context/resolve";
import { CompanyContextRequiredState } from "@/components/company-context-required-state";
import { createSupabaseAdminClient, hasSupabaseServiceRoleKey } from "@/lib/supabase/server";
import {
  buildMonthWindow,
  resolveRequestedMonth,
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
import { GlobalCalendarContent } from "../../calendario/_client-content";
import { ContentosSubNavServer } from "../_contentos-subnav-server";

/**
 * REC OS Context Foundation V1 — antes, esta rota era só um redirect para
 * /admin/calendario (Fase 8 do hotfix canônico 1.0.1), tirando o usuário do
 * REC OS só para ver o calendário. Agora é uma VIEW CONTEXTUAL real: mesma
 * fonte (global-calendar.ts, content_items/operational_tasks/approvals),
 * mesmo componente de apresentação (GlobalCalendarContent, com basePath
 * apontado para cá) -- nenhuma duplicação de normalização, nenhuma tabela
 * nova, nenhuma segunda fonte de verdade. Filtra sempre por UMA Company
 * (nunca "todos os clientes" -- isso continua sendo o papel do Calendário
 * Global). Company Context resolvido via a mesma autoridade canônica do
 * resto do produto (resolveCompanyContext), nunca um mecanismo próprio.
 */
export default async function RecOsCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const clientId = params.client ?? null;
  const nextPath = clientId ? `/admin/contentos/calendario?client=${clientId}` : "/admin/contentos/calendario";

  const resolution = await resolveCompanyContext(clientId);
  if (!resolution.valid) {
    if (resolution.reason === "not_authenticated") redirect("/login");
    if (resolution.reason === "role_not_supported") redirect("/admin/dashboard");
    return (
      <>
        <ContentosSubNavServer />
        <CompanyContextRequiredState reason={resolution.reason ?? "company_required"} nextPath={nextPath} />
      </>
    );
  }
  const context = resolution.context!;

  if (!hasSupabaseServiceRoleKey()) {
    return (
      <>
        <ContentosSubNavServer initialClientId={context.companyId} />
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          Este recurso está temporariamente indisponível. Sua sessão continua ativa.
        </div>
      </>
    );
  }

  const { year, month } = resolveRequestedMonth(params.year, params.month);
  const window = buildMonthWindow(year, month);
  const { startIso, endIso } = timestampWindowBounds(window.gridStartKey, window.gridEndKey);
  const serverToday = getFortalezaToday();
  const adminDb = createSupabaseAdminClient();

  const clientNames: ClientNameLookup = new Map([[context.companyId, context.companyName ?? "Empresa"]]);

  let events: GlobalCalendarEvent[] = [];
  const sourceErrors: CalendarEventSource[] = [];

  // Mesmas 3 queries/janelas de /admin/calendario/page.tsx, só que
  // restritas a esta Company -- nunca uma segunda normalização.
  const [contentItemsRes, operationalTasksRes, approvalsRes] = await Promise.allSettled([
    adminDb
      .from("content_items")
      .select("id, client_id, title, type, channel, status, scheduled_date, scheduled_at, caption, responsible_id")
      .eq("client_id", context.companyId)
      .or(
        `and(scheduled_date.gte.${window.gridStartKey},scheduled_date.lte.${window.gridEndKey}),` +
        `and(scheduled_at.gte.${startIso},scheduled_at.lte.${endIso})`
      ),
    adminDb
      .from("operational_tasks")
      .select("id, client_id, content_item_id, approval_id, title, description, due_date, start_date, status, department, task_type, priority, assigned_to, assigned_role")
      .eq("client_id", context.companyId)
      .or(
        `and(due_date.gte.${window.gridStartKey},due_date.lte.${window.gridEndKey}),` +
        `and(due_date.is.null,start_date.gte.${window.gridStartKey},start_date.lte.${window.gridEndKey})`
      ),
    adminDb
      .from("approvals")
      .select("id, client_id, content_id, status, approval_sent_at, approval_due_at, created_at")
      .eq("client_id", context.companyId)
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
    console.error("[admin/contentos/calendario] content_items fetch error:", contentItemsRes.status === "rejected" ? contentItemsRes.reason : contentItemsRes.value.error);
  }

  const operationalTaskRows: OperationalTaskRow[] =
    operationalTasksRes.status === "fulfilled" && !operationalTasksRes.value.error
      ? ((operationalTasksRes.value.data ?? []) as OperationalTaskRow[])
      : [];
  if (operationalTasksRes.status === "rejected" || operationalTasksRes.value?.error) {
    sourceErrors.push("operational_task");
    console.error("[admin/contentos/calendario] operational_tasks fetch error:", operationalTasksRes.status === "rejected" ? operationalTasksRes.reason : operationalTasksRes.value.error);
  }

  const approvalRows: ApprovalRow[] =
    approvalsRes.status === "fulfilled" && !approvalsRes.value.error
      ? ((approvalsRes.value.data ?? []) as ApprovalRow[])
      : [];
  if (approvalsRes.status === "rejected" || approvalsRes.value?.error) {
    sourceErrors.push("approval");
    console.error("[admin/contentos/calendario] approvals fetch error:", approvalsRes.status === "rejected" ? approvalsRes.reason : approvalsRes.value.error);
  }

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
    <>
      <ContentosSubNavServer initialClientId={context.companyId} />
      <div className="mb-3 flex justify-end">
        <Link
          href={`/admin/calendario?client=${context.companyId}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
        >
          Abrir Calendário Global <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <GlobalCalendarContent
        key={`${window.year}-${window.month}-${context.companyId}`}
        initialEvents={events}
        initialYear={window.year}
        initialMonth={window.month}
        initialSelectedDay={resolveInitialSelectedDay(window.year, window.month, serverToday)}
        initialFilterClient={context.companyId}
        initialFilterSource="all"
        clients={[{ id: context.companyId, name: context.companyName ?? "Empresa" }]}
        sourceErrors={sourceErrors}
        serverToday={serverToday.dateKey}
        timezone={GLOBAL_CALENDAR_TIMEZONE}
        returnTo={null}
        basePath="/admin/contentos/calendario"
        headerTitle="Calendário — REC OS"
        headerDescription={`Conteúdos, produção e aprovações de ${context.companyName ?? "esta empresa"} — somente leitura`}
      />
    </>
  );
}
