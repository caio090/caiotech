/**
 * Sprint Navegação e Experiência 3.0.1.2 (Fase 17) — busca real para Meu
 * Escritório. Reaproveita as MESMAS três consultas e os MESMOS
 * normalizadores do Calendário Global (src/lib/global-calendar.ts) — nunca
 * uma segunda fonte de verdade. A única diferença é a janela de datas
 * (mais ampla, para cobrir Hoje/Semana/Mês/Planejamento do próximo mês
 * numa única busca).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizeContentItems, normalizeOperationalTasks, normalizeApprovals, getFortalezaToday,
  GLOBAL_CALENDAR_TIMEZONE, type ContentItemRow, type OperationalTaskRow, type ApprovalRow,
  type ClientNameLookup, type ContentTitleLookup, type ResponsibleNameLookup, type GlobalCalendarEvent,
} from "../global-calendar";
import { buildFeedItemFromCalendarEvent, type BusinessOfficeFeedItem } from "./types";

function windowBoundsForOffice(): { startIso: string; endIso: string; todayKey: string } {
  const today = getFortalezaToday();
  const start = new Date(`${today.dateKey}T00:00:00-03:00`);
  start.setUTCDate(start.getUTCDate() - 7);
  const end = new Date(`${today.dateKey}T23:59:59-03:00`);
  end.setUTCDate(end.getUTCDate() + 40);
  return { startIso: start.toISOString(), endIso: end.toISOString(), todayKey: today.dateKey };
}

export async function getBusinessOfficeFeed(
  adminDb: SupabaseClient,
  { clientId }: { clientId: string | null },
): Promise<{ items: BusinessOfficeFeedItem[]; todayKey: string; sourceErrors: string[] }> {
  const { startIso, endIso, todayKey } = windowBoundsForOffice();
  const startKey = startIso.slice(0, 10);
  const endKey = endIso.slice(0, 10);
  const sourceErrors: string[] = [];

  let contentQuery = adminDb
    .from("content_items")
    .select("id, client_id, title, type, channel, status, scheduled_date, scheduled_at, caption, responsible_id")
    .or(`and(scheduled_date.gte.${startKey},scheduled_date.lte.${endKey}),and(scheduled_at.gte.${startIso},scheduled_at.lte.${endIso})`);
  if (clientId) contentQuery = contentQuery.eq("client_id", clientId);

  let taskQuery = adminDb
    .from("operational_tasks")
    .select("id, client_id, content_item_id, approval_id, title, description, due_date, start_date, status, department, task_type, priority, assigned_to, assigned_role")
    .or(`and(due_date.gte.${startKey},due_date.lte.${endKey}),and(due_date.is.null,start_date.gte.${startKey},start_date.lte.${endKey})`);
  if (clientId) taskQuery = taskQuery.eq("client_id", clientId);

  let approvalQuery = adminDb
    .from("approvals")
    .select("id, client_id, content_id, status, approval_sent_at, approval_due_at, created_at")
    .or(`and(approval_due_at.gte.${startIso},approval_due_at.lte.${endIso}),and(approval_due_at.is.null,approval_sent_at.gte.${startIso},approval_sent_at.lte.${endIso}),and(approval_due_at.is.null,approval_sent_at.is.null,created_at.gte.${startIso},created_at.lte.${endIso})`);
  if (clientId) approvalQuery = approvalQuery.eq("client_id", clientId);

  const [contentRes, taskRes, approvalRes] = await Promise.allSettled([contentQuery, taskQuery, approvalQuery]);

  const contentRows: ContentItemRow[] = contentRes.status === "fulfilled" && !contentRes.value.error ? (contentRes.value.data ?? []) : (sourceErrors.push("content_items"), []);
  const taskRows: OperationalTaskRow[] = taskRes.status === "fulfilled" && !taskRes.value.error ? (taskRes.value.data ?? []) : (sourceErrors.push("operational_tasks"), []);
  const approvalRows: ApprovalRow[] = approvalRes.status === "fulfilled" && !approvalRes.value.error ? (approvalRes.value.data ?? []) : (sourceErrors.push("approvals"), []);

  const clientIds = new Set([...contentRows.map((r) => r.client_id), ...taskRows.map((r) => r.client_id).filter((v): v is string => !!v), ...approvalRows.map((r) => r.client_id)]);
  const clientNames: ClientNameLookup = new Map();
  if (clientIds.size > 0) {
    const { data } = await adminDb.from("clients").select("id, company_name").in("id", [...clientIds]);
    for (const row of (data ?? []) as { id: string; company_name: string | null }[]) {
      if (row.company_name) clientNames.set(row.id, row.company_name);
    }
  }

  const contentTitles: ContentTitleLookup = new Map();
  const approvalContentIds = [...new Set(approvalRows.map((a) => a.content_id).filter((v): v is string => !!v))];
  if (approvalContentIds.length > 0) {
    const { data } = await adminDb.from("content_items").select("id, title").in("id", approvalContentIds);
    for (const row of (data ?? []) as { id: string; title: string | null }[]) {
      if (row.title) contentTitles.set(row.id, row.title);
    }
  }

  const responsibleIds = [...new Set([
    ...contentRows.map((r) => r.responsible_id).filter((v): v is string => !!v),
    ...taskRows.map((r) => r.assigned_to).filter((v): v is string => !!v),
  ])];
  const responsibleNames: ResponsibleNameLookup = new Map();
  if (responsibleIds.length > 0) {
    const { data } = await adminDb.from("profiles").select("id, name").in("id", responsibleIds);
    for (const row of (data ?? []) as { id: string; name: string | null }[]) {
      if (row.name) responsibleNames.set(row.id, row.name);
    }
  }

  const events: GlobalCalendarEvent[] = [
    ...normalizeContentItems(contentRows, clientNames, responsibleNames),
    ...normalizeOperationalTasks(taskRows, clientNames, responsibleNames),
    ...normalizeApprovals(approvalRows, clientNames, contentTitles),
  ];

  return { items: events.map(buildFeedItemFromCalendarEvent), todayKey, sourceErrors };
}

export { GLOBAL_CALENDAR_TIMEZONE };
