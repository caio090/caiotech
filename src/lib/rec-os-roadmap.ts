/**
 * Sprint REC OS 3.0.1.1 (Fase 5) — fonte canônica única do Roadmap de
 * Produção. As quatro visualizações (Quadro/Lista/Linha do tempo/
 * Calendário) leem exatamente o array produzido aqui — nenhuma delas tem
 * fixture própria. Este módulo é puro (sem import de Supabase) para ser
 * testável pelo harness `.tmp/run-ts-test.cjs`; a busca real nas tabelas
 * fica em `src/lib/rec-os-roadmap-data.ts`.
 */
import { resolveMacroStage, REC_OS_STATUS_ALIASES, type RecOsMacroStage } from "./rec-os-workflow/types";

export type RoadmapApprovalState = "aguardando" | "aprovado" | "alteracao_solicitada" | "reprovado" | null;

export interface RecOsRoadmapItem {
  id: string;
  workspaceId: string;
  clientId: string;
  clientName: string | null;
  campaignId: string | null;
  contentId: string;
  title: string;
  format: string | null;
  channel: string | null;
  canonicalStatus: string;
  workflowStage: RecOsMacroStage | "agendar_publicar" | null;
  responsibleId: string | null;
  responsibleName: string | null;
  dueAt: string | null;
  priority: "alta" | "media" | "baixa" | null;
  approvalState: RoadmapApprovalState;
  blocked: boolean;
  blockReason: string | null;
  nextAction: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Deriva um texto honesto de "próxima ação" a partir do status canônico já
 * persistido — nunca inventa um campo novo no banco, apenas rotula o que já
 * existe (mesmo padrão de STATUS_LABEL usado em producao/page.tsx).
 */
export function nextActionForStatus(status: string, blocked: boolean): string {
  if (blocked) return "Aplicar alteração solicitada pelo cliente";
  const MAP: Record<string, string> = {
    ideia: "Completar briefing",
    briefing: "Definir aplicação e formato",
    roteiro: "Finalizar roteiro",
    producao: "Concluir produção",
    em_producao: "Concluir produção",
    edicao: "Finalizar edição",
    revisao_interna: "Aprovar internamente",
    enviado_aprovacao: "Aguardar aprovação do cliente",
    alteracao_solicitada: "Aplicar alteração solicitada",
    aprovado: "Definir visual final e agendar",
    pronto_para_agendar: "Definir data no calendário",
    agendado: "Aguardar data de publicação",
    publicado: "Registrar resultados",
    reprovado: "Revisar direcionamento com o cliente",
  };
  return MAP[status] ?? "Definir próxima etapa";
}

export interface ContentItemRow {
  id: string;
  client_id: string;
  title: string | null;
  type: string | null;
  channel: string | null;
  status: string | null;
  scheduled_date: string | null;
  responsible_id: string | null;
  created_at: string;
  clients?: { company_name?: string | null } | null;
  profiles?: { name?: string | null } | null;
}

export interface TaskRow {
  content_item_id: string | null;
  assigned_to: string | null;
  due_date: string | null;
}

export interface ApprovalRow {
  content_id: string | null;
  status: string | null;
  created_at: string | null;
}

/** Nenhuma coluna real de campanha/prioridade existe em content_items — nunca inventadas (campaignId e priority ficam null). */
export function mapContentRowToRoadmapItem(
  row: ContentItemRow,
  task: TaskRow | null,
  approval: ApprovalRow | null,
): RecOsRoadmapItem {
  const status = row.status ?? "ideia";
  const blocked = status === "alteracao_solicitada" || status === "reprovado";
  return {
    id: row.id,
    workspaceId: row.client_id,
    clientId: row.client_id,
    clientName: row.clients?.company_name ?? null,
    campaignId: null,
    contentId: row.id,
    title: row.title ?? "Sem título",
    format: row.type ?? null,
    channel: row.channel ?? null,
    canonicalStatus: status,
    workflowStage: resolveMacroStage(status),
    responsibleId: row.responsible_id ?? task?.assigned_to ?? null,
    responsibleName: row.profiles?.name ?? null,
    dueAt: task?.due_date ?? row.scheduled_date ?? null,
    priority: null,
    approvalState: (approval?.status as RoadmapApprovalState) ?? null,
    blocked,
    blockReason: status === "alteracao_solicitada"
      ? "Alteração solicitada pelo cliente"
      : status === "reprovado"
        ? "Reprovado — aguardando novo direcionamento"
        : null,
    nextAction: nextActionForStatus(status, blocked),
    createdAt: row.created_at,
    updatedAt: row.created_at,
  };
}

// ── Filtros (Fase 10) — um único shape de filtro consumido por todas as visões ──

export interface RoadmapFilters {
  status: string[];
  format: string[];
  channel: string[];
  responsibleId: string[];
  approvalState: string[];
  month: string | null; // "YYYY-MM"
  overdueOnly: boolean;
}

export const EMPTY_ROADMAP_FILTERS: RoadmapFilters = {
  status: [], format: [], channel: [], responsibleId: [], approvalState: [], month: null, overdueOnly: false,
};

export function isRoadmapItemOverdue(item: RecOsRoadmapItem, nowIso: string): boolean {
  if (!item.dueAt) return false;
  if (item.canonicalStatus === "publicado") return false;
  return new Date(item.dueAt).getTime() < new Date(nowIso).getTime();
}

/** Mesma função usada pelas 4 visualizações — garante contagem/IDs idênticos entre elas (Fase 5). */
export function filterRoadmapItems(items: RecOsRoadmapItem[], filters: RoadmapFilters, nowIso: string): RecOsRoadmapItem[] {
  return items.filter((item) => {
    if (filters.status.length > 0 && !filters.status.includes(item.canonicalStatus)) return false;
    if (filters.format.length > 0 && (!item.format || !filters.format.includes(item.format))) return false;
    if (filters.channel.length > 0 && (!item.channel || !filters.channel.includes(item.channel))) return false;
    if (filters.responsibleId.length > 0 && (!item.responsibleId || !filters.responsibleId.includes(item.responsibleId))) return false;
    if (filters.approvalState.length > 0 && (!item.approvalState || !filters.approvalState.includes(item.approvalState))) return false;
    if (filters.month) {
      if (!item.dueAt) return false;
      const itemMonth = item.dueAt.slice(0, 7);
      if (itemMonth !== filters.month) return false;
    }
    if (filters.overdueOnly && !isRoadmapItemOverdue(item, nowIso)) return false;
    return true;
  });
}

// ── Quadro (Fase 6) — colunas são agrupamentos VISUAIS, nunca um status novo ──

export type KanbanColumnId = "radar" | "criar" | "produzir" | "revisar" | "aprovar" | "visual_final" | "agendar" | "publicado";

export const KANBAN_COLUMNS: { id: KanbanColumnId; label: string; statuses: string[] }[] = [
  { id: "radar", label: "Radar", statuses: [] },
  { id: "criar", label: "Criar", statuses: ["ideia", "briefing", "roteiro"] },
  { id: "produzir", label: "Produzir", statuses: ["producao", "em_producao", "edicao"] },
  { id: "revisar", label: "Revisar", statuses: ["revisao_interna"] },
  { id: "aprovar", label: "Aprovar", statuses: ["enviado_aprovacao", "alteracao_solicitada", "reprovado"] },
  { id: "visual_final", label: "Visual Final", statuses: ["aprovado", "pronto_para_agendar"] },
  { id: "agendar", label: "Agendar", statuses: ["agendado"] },
  { id: "publicado", label: "Publicado", statuses: ["publicado"] },
];

/**
 * Sprint QA Fix 3.0.2.5 (CI-PRODUCT-ROADMAP-KANBAN-001) — resolve aliases
 * legados (ex.: "ajuste" -> "alteracao_solicitada") antes de procurar a
 * coluna, exatamente como resolveMacroStage() já faz. Sem isso, itens com
 * um status alias (real em produção, ver src/app/admin/contentos/producao/page.tsx)
 * eram silenciosamente omitidos do Quadro enquanto continuavam aparecendo
 * em Lista/Linha do tempo/Calendário — a causa confirmada da divergência
 * de contagem entre as visões.
 */
export function kanbanColumnForStatus(status: string): KanbanColumnId | null {
  const canonical = REC_OS_STATUS_ALIASES[status] ?? status;
  const col = KANBAN_COLUMNS.find((c) => c.statuses.includes(canonical));
  return col?.id ?? null;
}

export function groupRoadmapItemsByKanbanColumn(items: RecOsRoadmapItem[]): Record<KanbanColumnId, RecOsRoadmapItem[]> {
  const result = Object.fromEntries(KANBAN_COLUMNS.map((c) => [c.id, [] as RecOsRoadmapItem[]])) as Record<KanbanColumnId, RecOsRoadmapItem[]>;
  for (const item of items) {
    const col = kanbanColumnForStatus(item.canonicalStatus);
    if (col) result[col].push(item);
  }
  return result;
}

// ── Linha do tempo (Fase 8) ──────────────────────────────────────────────────

export type TimelineGranularity = "dia" | "semana" | "mes";

export interface TimelineBucket {
  key: string;
  label: string;
  items: RecOsRoadmapItem[];
}

const NO_DATE_BUCKET_KEY = "sem_data";
export const NO_DATE_LABEL = "Sem data definida";

function isoWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((date.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function bucketRoadmapItemsForTimeline(items: RecOsRoadmapItem[], granularity: TimelineGranularity): TimelineBucket[] {
  const buckets = new Map<string, TimelineBucket>();
  for (const item of items) {
    let key: string;
    let label: string;
    if (!item.dueAt) {
      key = NO_DATE_BUCKET_KEY;
      label = NO_DATE_LABEL;
    } else {
      const d = new Date(item.dueAt);
      if (granularity === "dia") {
        key = item.dueAt.slice(0, 10);
        label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Fortaleza" });
      } else if (granularity === "semana") {
        key = isoWeekKey(d);
        label = `Semana ${key.split("-W")[1]} · ${key.split("-W")[0]}`;
      } else {
        key = item.dueAt.slice(0, 7);
        label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "America/Fortaleza" });
      }
    }
    if (!buckets.has(key)) buckets.set(key, { key, label, items: [] });
    buckets.get(key)!.items.push(item);
  }
  const entries = [...buckets.values()];
  entries.sort((a, b) => {
    if (a.key === NO_DATE_BUCKET_KEY) return 1;
    if (b.key === NO_DATE_BUCKET_KEY) return -1;
    return a.key.localeCompare(b.key);
  });
  return entries;
}

// ── Calendário do Roadmap (Fase 9) ───────────────────────────────────────────

export function roadmapItemsForMonth(items: RecOsRoadmapItem[], month: string): RecOsRoadmapItem[] {
  return items.filter((item) => !!item.dueAt && item.dueAt.slice(0, 7) === month);
}
