/**
 * REC OS PAID TRAFFIC PLANNER V1 FOUNDATION — contratos do módulo que
 * responde "como vamos distribuir investimento e aquisição?"
 * (rec_os_paid_traffic_planner). Nunca responde "qual estratégia
 * devemos executar" (rec_os_growth_planner -- recebido como input,
 * nunca recriado aqui) nem "como organizar campanhas/criativos"
 * (rec_os_campaign_planner, missão futura própria). Fundação apenas:
 * tipos + builder honesto, nenhuma chamada de API (Meta/Google), nenhum
 * gerenciador de anúncios, nenhum cálculo de ROI.
 */
import type { GrowthDiagnosticCompany, GrowthDiagnosticAudience, GrowthObjective } from "@/lib/rec-os-growth/types";

// Catálogo próprio, deliberadamente distinto de GrowthChannel
// (rec-os-growth/types.ts, canal de alto nível considerado no
// planejamento estratégico) -- aqui é o canal PAGO específico em que a
// mídia seria veiculada.
export const PAID_TRAFFIC_CHANNELS = ["meta_ads", "google_ads", "organic_support"] as const;
export type PaidTrafficChannel = (typeof PAID_TRAFFIC_CHANNELS)[number];

export const PAID_TRAFFIC_CAMPAIGN_TYPES = ["aquisicao", "remarketing", "posicionamento"] as const;
export type PaidTrafficCampaignType = (typeof PAID_TRAFFIC_CAMPAIGN_TYPES)[number];

export const CONVERSION_GOALS = ["whatsapp_message", "lead_capture", "purchase", "store_visit"] as const;
export type ConversionGoal = (typeof CONVERSION_GOALS)[number];

/** Nenhum cálculo de ROI/projeção mora aqui -- isso é rec_os_projection_engine (rec-os-growth/projection-engine-contract.ts), consumido à parte quando necessário, nunca reimplementado. */
export interface PaidTrafficBudget {
  dailyBudget?: number;
  monthlyBudget?: number;
  /** Duração planejada em dias -- descritivo, nunca um cálculo de retorno. */
  investmentPeriodDays?: number;
}

export type PaidTrafficPlanStatus = "planned";

/**
 * `context`/`audience` nunca são redefinidos aqui -- reusam exatamente
 * os tipos de rec-os-growth (mesma regra de "não duplicar contexto" já
 * aplicada ao Growth Planner). `objective` idem: vem do GrowthPlan
 * recebido, nunca recriado (ver planner.ts -- "nunca criar estratégia
 * própria").
 */
export interface PaidTrafficPlan {
  context: GrowthDiagnosticCompany;
  objective: GrowthObjective;
  channel: PaidTrafficChannel[];
  campaignType: PaidTrafficCampaignType;
  audience?: GrowthDiagnosticAudience;
  budget?: PaidTrafficBudget;
  creativeRequirements: string[];
  conversionEvent?: ConversionGoal;
  status: PaidTrafficPlanStatus;
  /** Nunca omitido -- "não calcular ROI, não prometer venda" (regra da missão). */
  honestNotice: string;
}
