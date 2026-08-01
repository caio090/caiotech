/**
 * Sprint Navegação e Experiência 3.0.1.2 (Fase 17) — adaptador BusinessOfficeFeed.
 * Antes de desenhar isto, auditamos o que já existe (Fase 16): content_items,
 * operational_tasks e approvals já são normalizados em `GlobalCalendarEvent`
 * (src/lib/global-calendar.ts) para o Calendário Global — Meu Escritório
 * reaproveita EXATAMENTE essa mesma normalização, mapeada para um shape mais
 * genérico. Nenhuma fonte de verdade nova; nenhuma tabela nova.
 *
 * Módulos sem fonte real ainda (reuniões, financeiro, campanhas como
 * entidade própria, decisões, metas, notas, documentos) aparecem como
 * `dataAvailability: "not_integrated"` — nunca como zero fabricado.
 */
import type { GlobalCalendarEvent, CalendarEventSource } from "../global-calendar";

export type BusinessOfficeFeedType =
  | "task" | "meeting" | "follow_up" | "content" | "approval" | "campaign"
  | "finance" | "deadline" | "decision" | "note" | "goal" | "document" | "operational_item";

export type BusinessOfficePeriod = "today" | "week" | "month" | "other";

export type BusinessOfficeDataAvailability = "available" | "unavailable" | "not_integrated";

export interface BusinessOfficeFeedItem {
  id: string;
  workspaceId: string;
  sourceModule: string;
  sourceEntityId: string;
  type: BusinessOfficeFeedType;
  title: string;
  description: string | null;
  startsAt: string | null;
  dueAt: string | null;
  completedAt: string | null;
  status: string;
  priority: "alta" | "media" | "baixa" | null;
  responsible: string | null;
  href: string;
  period: BusinessOfficePeriod;
  isDemo: boolean;
  dataAvailability: BusinessOfficeDataAvailability;
}

const SOURCE_TO_MODULE: Record<CalendarEventSource, string> = {
  content_item: "rec_os",
  operational_task: "operacional",
  approval: "aprovacoes",
};

const SOURCE_TO_TYPE: Record<CalendarEventSource, BusinessOfficeFeedType> = {
  content_item: "content",
  operational_task: "task",
  approval: "approval",
};

const COMPLETED_STATUSES = new Set(["concluido", "publicado", "aprovado"]);

/** Mapeia um evento já real do Calendário Global para um item do feed — nenhum dado recalculado. */
export function buildFeedItemFromCalendarEvent(event: GlobalCalendarEvent): BusinessOfficeFeedItem {
  return {
    id: `${event.source}:${event.id}`,
    workspaceId: event.client_id,
    sourceModule: SOURCE_TO_MODULE[event.source],
    sourceEntityId: event.source_id,
    type: SOURCE_TO_TYPE[event.source],
    title: event.title,
    description: event.description,
    startsAt: event.start_at,
    dueAt: event.end_at ?? event.start_at,
    completedAt: COMPLETED_STATUSES.has(event.status) ? event.start_at : null,
    status: event.status,
    priority: null,
    responsible: event.responsible_name,
    href: event.origin_href,
    period: "other",
    isDemo: false,
    dataAvailability: "available",
  };
}

/** Módulos que Fase 13-15 pedem mas ainda não têm fonte real conectada a Meu Escritório. */
export const BUSINESS_OFFICE_NOT_INTEGRATED_MODULES: { type: BusinessOfficeFeedType; label: string }[] = [
  { type: "meeting", label: "Reuniões" },
  { type: "finance", label: "Pendências financeiras" },
  { type: "campaign", label: "Campanhas" },
  { type: "decision", label: "Decisões" },
  { type: "goal", label: "Metas" },
  { type: "document", label: "Documentos" },
];

function toDateKey(iso: string, timezone: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: timezone });
}

function startOfWeekKey(todayKey: string): string {
  const d = new Date(`${todayKey}T00:00:00Z`);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}
function endOfWeekKey(todayKey: string): string {
  const start = new Date(`${startOfWeekKey(todayKey)}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() + 6);
  return start.toISOString().slice(0, 10);
}

/**
 * Classifica itens em Hoje/Semana/Mês a partir de UM ÚNICO array de entrada
 * (Fase 12: "a mesma fonte deve alimentar as três visões — não criar três
 * bancos ou estados paralelos"). Um item pode aparecer em mais de um balde
 * (ex.: hoje também faz parte da semana) — cada visão consulta o balde certo.
 */
export function classifyBusinessOfficeItems(
  items: BusinessOfficeFeedItem[],
  todayKey: string,
  timezone: string,
): { today: BusinessOfficeFeedItem[]; week: BusinessOfficeFeedItem[]; month: BusinessOfficeFeedItem[] } {
  const weekStart = startOfWeekKey(todayKey);
  const weekEnd = endOfWeekKey(todayKey);
  const monthPrefix = todayKey.slice(0, 7);

  const today: BusinessOfficeFeedItem[] = [];
  const week: BusinessOfficeFeedItem[] = [];
  const month: BusinessOfficeFeedItem[] = [];

  for (const item of items) {
    const refIso = item.dueAt ?? item.startsAt ?? item.completedAt;
    if (!refIso) continue;
    const key = toDateKey(refIso, timezone);
    if (key === todayKey) today.push(item);
    if (key >= weekStart && key <= weekEnd) week.push(item);
    if (key.startsWith(monthPrefix)) month.push(item);
  }

  return { today, week, month };
}

/** monthKey no formato "YYYY-MM". Usado para o balde de planejamento do próximo mês (Fase 15), a partir do MESMO array já buscado (janela ampla o suficiente para cobrir o mês seguinte). */
export function itemsForMonthPrefix(items: BusinessOfficeFeedItem[], monthKey: string): BusinessOfficeFeedItem[] {
  return items.filter((item) => {
    const refIso = item.dueAt ?? item.startsAt ?? item.completedAt;
    return !!refIso && refIso.startsWith(monthKey);
  });
}

export function nextMonthKey(todayKey: string): string {
  const [y, m] = todayKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + 1, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function isBusinessOfficeItemOverdue(item: BusinessOfficeFeedItem, nowIso: string): boolean {
  if (!item.dueAt || item.completedAt) return false;
  return new Date(item.dueAt).getTime() < new Date(nowIso).getTime();
}

/** Fechamento do mês: concluído dentro do mês. Planejamento: com prazo no mês seguinte. */
export function splitMonthClosureAndPlanning(
  monthItems: BusinessOfficeFeedItem[],
  nextMonthItems: BusinessOfficeFeedItem[],
): { closure: BusinessOfficeFeedItem[]; planning: BusinessOfficeFeedItem[] } {
  return {
    closure: monthItems.filter((i) => !!i.completedAt),
    planning: nextMonthItems,
  };
}
