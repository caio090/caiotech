/**
 * REC OS PAID TRAFFIC PLANNER V1 FOUNDATION — orquestrador. Recebe o
 * diagnóstico e o plano do Growth Planner (rec-os-growth), NUNCA cria
 * estratégia própria: `context` vem de `diagnostic.company`, `objective`
 * vem de `growthPlan.objective` -- ambos apenas ecoados, nunca
 * reinterpretados. Canal/campanha/público/orçamento/criativos/conversão
 * só existem quando o usuário informa; nada aqui é inferido a partir do
 * Growth Plan além do objetivo.
 *
 * Fluxo (regra da missão): Growth Planner → Paid Traffic Planner →
 * Campaign Planner (missão futura própria) → Execution (missão futura
 * própria). Esta função é o único ponto de entrada do 2º elo.
 */
import type { GrowthDiagnosticInput, GrowthPlanOutput, GrowthDiagnosticAudience } from "@/lib/rec-os-growth/types";
import type {
  PaidTrafficPlan,
  PaidTrafficChannel,
  PaidTrafficCampaignType,
  PaidTrafficBudget,
  ConversionGoal,
} from "./types";

export interface PaidTrafficPlanInput {
  channel: PaidTrafficChannel[];
  campaignType: PaidTrafficCampaignType;
  audience?: GrowthDiagnosticAudience;
  budget?: PaidTrafficBudget;
  creativeRequirements?: string[];
  conversionEvent?: ConversionGoal;
}

export function buildPaidTrafficPlanFromGrowthPlan(
  diagnostic: GrowthDiagnosticInput,
  growthPlan: GrowthPlanOutput,
  input: PaidTrafficPlanInput,
): PaidTrafficPlan {
  return {
    context: diagnostic.company,
    objective: growthPlan.objective,
    channel: input.channel,
    campaignType: input.campaignType,
    audience: input.audience ?? diagnostic.audience,
    budget: input.budget,
    creativeRequirements: input.creativeRequirements ?? [],
    conversionEvent: input.conversionEvent,
    status: "planned",
    honestNotice: "Paid Traffic Planner ainda é fundação (tipos + estrutura) -- nenhuma integração com Meta Ads/Google Ads, nenhuma publicação, nenhum cálculo de ROI ou promessa de resultado. Este plano é só uma estrutura organizada, não uma campanha real.",
  };
}
