/**
 * Global Calendar — read-only aggregation model (Sprint 3.1A).
 *
 * Normalizes content_items, operational_tasks and approvals into a single
 * GlobalCalendarEvent[] shape. This module has no Supabase calls — it only
 * transforms already-fetched rows into the canonical event shape, so it can
 * be reasoned about (and eventually tested) as pure functions.
 */

export const GLOBAL_CALENDAR_TIMEZONE = "America/Fortaleza" as const;
/** America/Fortaleza has no DST — fixed UTC-03:00 offset. */
const FORTALEZA_OFFSET = "-03:00";

export type CalendarEventSource = "content_item" | "operational_task" | "approval";

export interface GlobalCalendarEvent {
  id: string;
  source: CalendarEventSource;
  source_id: string;
  client_id: string;
  client_name: string | null;
  title: string;
  description: string | null;
  event_type: string | null;
  status: string;
  start_at: string;
  end_at: string | null;
  date_key: string;
  all_day: boolean;
  timezone: typeof GLOBAL_CALENDAR_TIMEZONE;
  responsible_id: string | null;
  responsible_name: string | null;
  origin_href: string;
  editable: false;
  group_key: string | null;
  metadata: Record<string, unknown> | null;
}

// ── Row shapes (only the columns this module reads) ────────────────────────

export interface ContentItemRow {
  id: string;
  client_id: string;
  title: string | null;
  type: string | null;
  channel: string | null;
  status: string;
  scheduled_date: string | null; // date column, "YYYY-MM-DD"
  responsible_id: string | null;
}

export interface OperationalTaskRow {
  id: string;
  client_id: string | null;
  content_item_id: string | null;
  approval_id: string | null;
  title: string | null;
  description: string | null;
  due_date: string | null;   // date column, "YYYY-MM-DD"
  start_date: string | null; // date column, "YYYY-MM-DD"
  status: string;
  department: string | null;
  task_type: string | null;
  priority: string | null;
  assigned_to: string | null;
  assigned_role: string | null;
}

export interface ApprovalRow {
  id: string;
  client_id: string;
  content_id: string | null;
  status: string;
  approval_sent_at: string | null;
  approval_due_at: string | null;
  created_at: string;
}

/** Lookup of content_item id -> title, used so approval events can borrow the related content's title. */
export type ContentTitleLookup = Map<string, string>;
/** Lookup of client id -> company_name. */
export type ClientNameLookup = Map<string, string>;

// ── Date-key helpers ─────────────────────────────────────────────────────────

/** Builds the internal ISO instant for a date-only (YYYY-MM-DD) value at Fortaleza midnight. */
function dateOnlyToStartAt(dateKey: string): string {
  return `${dateKey}T00:00:00${FORTALEZA_OFFSET}`;
}

/** Extracts the Fortaleza-local calendar day (YYYY-MM-DD) from a timestamptz ISO string. */
export function dateKeyFromTimestamp(iso: string): string {
  const d = new Date(iso);
  // en-CA formats as YYYY-MM-DD, which is exactly what date_key needs.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: GLOBAL_CALENDAR_TIMEZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d);
}

// ── Origin links (Fase 7 — always internal, never built from DB data) ──────

function contentOriginHref(clientId: string, contentId: string): string {
  return `/admin/contentos/criar?client=${encodeURIComponent(clientId)}&content_id=${encodeURIComponent(contentId)}`;
}

function taskOriginHref(clientId: string, contentItemId: string | null, taskId: string): string {
  const params = new URLSearchParams({ client: clientId, task: taskId });
  if (contentItemId) params.set("content_id", contentItemId);
  return `/admin/contentos/producao?${params.toString()}`;
}

function approvalOriginHref(clientId: string, contentId: string | null, approvalId: string): string {
  const params = new URLSearchParams({ client: clientId, approval: approvalId });
  if (contentId) params.set("content_id", contentId);
  return `/admin/contentos/aprovacoes?${params.toString()}`;
}

// ── Normalizers ──────────────────────────────────────────────────────────────

export function normalizeContentItems(
  rows: ContentItemRow[],
  clientNames: ClientNameLookup
): GlobalCalendarEvent[] {
  const events: GlobalCalendarEvent[] = [];
  for (const row of rows) {
    if (!row.scheduled_date) continue;
    const dateKey = row.scheduled_date;
    events.push({
      id: `content_item:${row.id}`,
      source: "content_item",
      source_id: row.id,
      client_id: row.client_id,
      client_name: clientNames.get(row.client_id) ?? null,
      title: row.title?.trim() || "Conteúdo sem título",
      description: null,
      event_type: row.type ?? "conteudo",
      status: row.status,
      start_at: dateOnlyToStartAt(dateKey),
      end_at: null,
      date_key: dateKey,
      all_day: true,
      timezone: GLOBAL_CALENDAR_TIMEZONE,
      responsible_id: row.responsible_id,
      responsible_name: null,
      origin_href: contentOriginHref(row.client_id, row.id),
      editable: false,
      group_key: row.id,
      metadata: { channel: row.channel },
    });
  }
  return events;
}

export function normalizeOperationalTasks(
  rows: OperationalTaskRow[],
  clientNames: ClientNameLookup
): GlobalCalendarEvent[] {
  const events: GlobalCalendarEvent[] = [];
  for (const row of rows) {
    // A task without a client cannot be placed on a per-client global calendar —
    // skip rather than fabricate a "generic" event (see docs/architecture/GLOBAL_CALENDAR_V1.md).
    if (!row.client_id) continue;

    const dateKey = row.due_date ?? row.start_date;
    if (!dateKey) continue; // guarded by the query window too, but stay defensive here

    const title = row.title?.trim() || row.task_type || row.department || "Tarefa operacional";

    events.push({
      id: `operational_task:${row.id}`,
      source: "operational_task",
      source_id: row.id,
      client_id: row.client_id,
      client_name: clientNames.get(row.client_id) ?? null,
      title,
      description: row.description,
      event_type: row.task_type ?? "tarefa",
      status: row.status,
      start_at: dateOnlyToStartAt(dateKey),
      end_at: null,
      date_key: dateKey,
      all_day: true,
      timezone: GLOBAL_CALENDAR_TIMEZONE,
      responsible_id: row.assigned_to,
      responsible_name: row.assigned_role,
      origin_href: taskOriginHref(row.client_id, row.content_item_id, row.id),
      editable: false,
      group_key: row.content_item_id,
      metadata: { department: row.department, priority: row.priority },
    });
  }
  return events;
}

export function normalizeApprovals(
  rows: ApprovalRow[],
  clientNames: ClientNameLookup,
  contentTitles: ContentTitleLookup
): GlobalCalendarEvent[] {
  const events: GlobalCalendarEvent[] = [];
  for (const row of rows) {
    const principalDate = row.approval_due_at ?? row.approval_sent_at ?? row.created_at;
    if (!principalDate) continue;

    const dateKey = dateKeyFromTimestamp(principalDate);
    const relatedTitle = row.content_id ? contentTitles.get(row.content_id) : undefined;

    events.push({
      id: `approval:${row.id}`,
      source: "approval",
      source_id: row.id,
      client_id: row.client_id,
      client_name: clientNames.get(row.client_id) ?? null,
      title: relatedTitle?.trim() || "Aprovação de conteúdo",
      description: null,
      event_type: "aprovacao",
      status: row.status,
      start_at: principalDate,
      end_at: null,
      date_key: dateKey,
      all_day: false,
      timezone: GLOBAL_CALENDAR_TIMEZONE,
      responsible_id: null,
      responsible_name: null,
      origin_href: approvalOriginHref(row.client_id, row.content_id, row.id),
      editable: false,
      group_key: row.content_id,
      metadata: null,
    });
  }
  return events;
}

// ── Calendar grid (pure, UTC-anchored so it never depends on server-local timezone) ──

export interface MonthWindow {
  year: number;
  month: number; // 1-12
  /** First date_key shown in the grid (may be in the previous month). */
  gridStartKey: string;
  /** Last date_key shown in the grid (may be in the next month). */
  gridEndKey: string;
  /** All date_keys in the grid, in order, chunked into weeks of 7. */
  weeks: string[][];
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function utcDateKey(utcMs: number): string {
  const d = new Date(utcMs);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** Builds a full 6-week (42-day) grid for the given year/month, starting on Sunday. */
export function buildMonthWindow(year: number, month: number): MonthWindow {
  const firstOfMonthUtc = Date.UTC(year, month - 1, 1);
  const firstWeekday = new Date(firstOfMonthUtc).getUTCDay(); // 0 = Sunday
  const gridStartUtc = firstOfMonthUtc - firstWeekday * 86_400_000;

  const dayKeys: string[] = [];
  for (let i = 0; i < 42; i++) {
    dayKeys.push(utcDateKey(gridStartUtc + i * 86_400_000));
  }

  const weeks: string[][] = [];
  for (let i = 0; i < 42; i += 7) weeks.push(dayKeys.slice(i, i + 7));

  return {
    year, month,
    gridStartKey: dayKeys[0],
    gridEndKey: dayKeys[41],
    weeks,
  };
}

/** Today's calendar date in America/Fortaleza, as {year, month, day}. Never reads server-local time directly. */
export function getFortalezaToday(now: Date = new Date()): { year: number; month: number; day: number; dateKey: string } {
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: GLOBAL_CALENDAR_TIMEZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  const [year, month, day] = dateKey.split("-").map(Number);
  return { year, month, day, dateKey };
}

/** Validates/clamps year+month search params, falling back to the current Fortaleza month. */
export function resolveRequestedMonth(yearParam: string | undefined, monthParam: string | undefined): { year: number; month: number } {
  const today = getFortalezaToday();
  const year = Number(yearParam);
  const month = Number(monthParam);
  const validYear = Number.isInteger(year) && year >= 2020 && year <= 2100 ? year : today.year;
  const validMonth = Number.isInteger(month) && month >= 1 && month <= 12 ? month : today.month;
  return { year: validYear, month: validMonth };
}

/** ISO instant bounds (Fortaleza offset) for a timestamptz query filter across a date_key window. */
export function timestampWindowBounds(startKey: string, endKeyExclusiveOf: string): { startIso: string; endIso: string } {
  return {
    startIso: `${startKey}T00:00:00${FORTALEZA_OFFSET}`,
    endIso: `${endKeyExclusiveOf}T23:59:59.999${FORTALEZA_OFFSET}`,
  };
}

/** Groups events by date_key for grid/agenda rendering. */
export function groupEventsByDateKey(events: GlobalCalendarEvent[]): Map<string, GlobalCalendarEvent[]> {
  const map = new Map<string, GlobalCalendarEvent[]>();
  for (const event of events) {
    const list = map.get(event.date_key);
    if (list) list.push(event);
    else map.set(event.date_key, [event]);
  }
  return map;
}
