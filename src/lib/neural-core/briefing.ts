/**
 * Sprint Gota Neural Foundation V1 (Fase 54-55) — Business Briefing.
 * Nenhuma busca de dado real; builder puro sobre dados já recebidos
 * (mesmo padrão de `BusinessOfficeFeedItem`, src/lib/business-office/types.ts,
 * que já normaliza várias fontes num único array).
 */

export type BusinessBriefingItemKind =
  | "work_item" | "deadline" | "approval" | "calendar" | "crm_follow_up"
  | "campaign_signal" | "financial_signal" | "integration_health"
  | "data_quality" | "project_blocker";

/** Fase 55 — sinais determinísticos, nunca um score de IA. */
export type BriefingPrioritySignal =
  | "overdue" | "deadline" | "blocker" | "approval_waiting" | "revenue_impact"
  | "risk" | "dependency" | "data_quality" | "connection_health";

export interface BusinessBriefingItem {
  id: string;
  companyId: string;
  kind: BusinessBriefingItemKind;
  title: string;
  signals: BriefingPrioritySignal[];
  dueAt?: string;
}

export interface BusinessBriefing {
  companyId: string;
  generatedAt: string;
  items: BusinessBriefingItem[];
}

/** Pesos fixos e documentados -- nunca ocultos, nunca "aprendidos". */
const SIGNAL_WEIGHT: Record<BriefingPrioritySignal, number> = {
  overdue: 100,
  blocker: 90,
  approval_waiting: 80,
  dependency: 70,
  revenue_impact: 60,
  risk: 50,
  deadline: 40,
  connection_health: 30,
  data_quality: 20,
};

function itemScore(item: BusinessBriefingItem): number {
  return item.signals.reduce((sum, s) => sum + SIGNAL_WEIGHT[s], 0);
}

/** Fase 21 (brief anterior) — ordenação determinística por sinais visíveis, nunca prioridade "misteriosa". Empate desfeito por id (estável). */
export function orderBriefingItems(items: BusinessBriefingItem[]): BusinessBriefingItem[] {
  return [...items].sort((a, b) => itemScore(b) - itemScore(a) || a.id.localeCompare(b.id));
}

export function buildBusinessBriefing(companyId: string, generatedAt: string, items: BusinessBriefingItem[]): BusinessBriefing {
  return { companyId, generatedAt, items: orderBriefingItems(items) };
}
