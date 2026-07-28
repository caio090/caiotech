import { COMMAND_CENTER_ALERTS, COMMAND_CENTER_METRICS, PRODUCT_CATALOG_FIXTURES } from "./fixtures";
import type { BusinessInsightResponse, BusinessInsightSnapshot, CommandCenterMetric } from "./types";

export function buildBusinessInsightSnapshot(question: string): BusinessInsightSnapshot {
  return { companyLabel: "Empresa demonstrativa", period: "Junho de 2026", archetype: "food_service", metrics: COMMAND_CENTER_METRICS.map((metric) => ({ id: metric.id, value: metric.value, unit: metric.trace.unit })), targets: [{ metricId: "cmv_actual", value: 32 }, { metricId: "reserve_days", value: 30 }], sources: [...new Set(COMMAND_CENTER_METRICS.map((metric) => metric.source))], coverage: .92, trends: ["CMV real aumentou no período", "Pedidos cresceram"], missingData: ["Descontos por produto", "Perdas operacionais completas"], alerts: COMMAND_CENTER_ALERTS.map((alert) => alert.title), aggregatedProducts: [{ quadrant: "Estrela", count: 1 }, { quadrant: "Muito vendido, mas deixa pouco resultado", count: 1 }, { quadrant: "Baixo desempenho", count: 1 }], stock: { valueCents: COMMAND_CENTER_METRICS.find((metric) => metric.id === "stock_value")?.value ?? 0, lowItems: 2 }, cash: { balanceCents: COMMAND_CENTER_METRICS.find((metric) => metric.id === "cash_balance")?.value ?? 0, reserveDays: 18 }, question: question.slice(0, 500) };
}

export function validateInsightMetricReferences(response: BusinessInsightResponse, metrics: CommandCenterMetric[] = COMMAND_CENTER_METRICS): boolean {
  const ids = new Set(metrics.map((metric) => metric.id));
  const referenced = [...response.metricReferences, ...response.findings.flatMap((finding) => finding.metricIds), ...response.hypotheses.flatMap((hypothesis) => hypothesis.evidenceMetricIds)];
  return referenced.every((id) => ids.has(id));
}

export function localDeterministicExplanation(metricId = "cmv_gap"): string {
  const metric = COMMAND_CENTER_METRICS.find((item) => item.id === metricId);
  if (!metric) return "Indicador não encontrado na base demonstrativa.";
  return `${metric.label}: ${metric.formattedValue}. ${metric.tooltip}. Fonte: ${metric.source}. Consulte “Como calculamos” para conferir os valores usados.`;
}

export function productMatches(item: typeof PRODUCT_CATALOG_FIXTURES[number], query: string, filter: "all" | "complete" | "attention"): boolean {
  const normalized = query.trim().toLocaleLowerCase("pt-BR");
  const matchesText = !normalized || [item.name, item.category, item.code].some((value) => value.toLocaleLowerCase("pt-BR").includes(normalized));
  if (!matchesText) return false;
  if (filter === "complete") return item.technicalSheet.completeness === "complete" && item.externalMapping.state === "linked";
  if (filter === "attention") return item.alerts.length > 0;
  return true;
}

