import type { ReportInsight, ReportPaymentMethod, ReportTimeBucket, ReportWeekday } from "./types";
import { weekdayLabel } from "./time-analysis";
import { safeDivide } from "@/lib/motor-lokat/money";

/**
 * Every function here is a pure, deterministic rule — no LLM, no
 * inference beyond the arithmetic shown. Each rule only fires when its
 * inputs are actually present; a rule never states a causal claim ("por
 * quê") that the data doesn't support — only what happened and a factual
 * next action.
 */

let insightCounter = 0;
function makeInsight(partial: Omit<ReportInsight, "id">): ReportInsight {
  insightCounter += 1;
  return { id: `insight-${insightCounter}`, ...partial };
}

export function insightBestHour(buckets: ReportTimeBucket[]): ReportInsight | null {
  if (buckets.length === 0) return null;
  const best = buckets.reduce((a, b) => (b.orders > a.orders ? b : a), buckets[0]);
  if (best.orders === 0) return null;
  return makeInsight({
    whatHappened: `O movimento se concentra entre ${best.hourStart}h e ${best.hourStart + best.granularityHours}h, com ${best.orders} pedido${best.orders !== 1 ? "s" : ""}.`,
    whyItMatters: "Saber o horário de pico ajuda a dimensionar equipe e estoque para esse intervalo.",
    estimatedImpact: null,
    nextAction: "Confirmar se a equipe e o estoque estão dimensionados para esse horário.",
    severity: "info",
  });
}

export function insightWorstHour(buckets: ReportTimeBucket[]): ReportInsight | null {
  const withOrders = buckets.filter((b) => b.orders > 0);
  if (withOrders.length < 2) return null;
  const worst = withOrders.reduce((a, b) => (b.orders < a.orders ? b : a), withOrders[0]);
  return makeInsight({
    whatHappened: `O intervalo entre ${worst.hourStart}h e ${worst.hourStart + worst.granularityHours}h teve o menor volume do período (${worst.orders} pedido${worst.orders !== 1 ? "s" : ""}).`,
    whyItMatters: "Horários fracos são uma oportunidade para promoções direcionadas ou ajuste de equipe.",
    estimatedImpact: null,
    nextAction: "Avaliar uma promoção ou combo específico para esse horário.",
    severity: "opportunity",
  });
}

export function insightBestWeekday(buckets: ReportWeekday[]): ReportInsight | null {
  if (buckets.length === 0) return null;
  const best = buckets.reduce((a, b) => (b.orders > a.orders ? b : a), buckets[0]);
  if (best.orders === 0) return null;
  return makeInsight({
    whatHappened: `${weekdayLabel(best.weekday)} concentra a maior quantidade de pedidos da semana (${best.orders}).`,
    whyItMatters: "Esse é o dia que mais precisa de capacidade operacional e estoque disponível.",
    estimatedImpact: null,
    nextAction: "Garantir estoque e equipe completos nesse dia.",
    severity: "info",
  });
}

export function insightPaymentConcentration(methods: ReportPaymentMethod[]): ReportInsight | null {
  const withShare = methods.filter((m) => m.shareOfTotal !== null);
  if (withShare.length === 0) return null;
  const top = withShare.reduce((a, b) => ((b.shareOfTotal ?? 0) > (a.shareOfTotal ?? 0) ? b : a), withShare[0]);
  if (!top.shareOfTotal || top.shareOfTotal < 0.4) return null;
  return makeInsight({
    whatHappened: `${top.label} é a forma de pagamento mais usada no período, com ${(top.shareOfTotal * 100).toFixed(0)}% do faturamento.`,
    whyItMatters: "Alta concentração em um único meio de pagamento aumenta a dependência das taxas e prazos daquele meio.",
    estimatedImpact: null,
    nextAction: "Conferir a taxa efetiva desse meio de pagamento na aba de conciliação.",
    severity: "info",
  });
}

export function insightTicketChange(currentAvgCents: number | null, previousAvgCents: number | null): ReportInsight | null {
  if (currentAvgCents === null || previousAvgCents === null || previousAvgCents === 0) return null;
  const change = safeDivide(currentAvgCents - previousAvgCents, previousAvgCents);
  if (change === null || Math.abs(change) < 0.03) return null;
  const direction = change > 0 ? "aumentou" : "caiu";
  return makeInsight({
    whatHappened: `O ticket médio ${direction} ${(Math.abs(change) * 100).toFixed(0)}% em relação ao período anterior.`,
    whyItMatters: change > 0
      ? "O ticket subiu, mas isso só confirma mais margem se o custo por pedido não tiver subido na mesma proporção."
      : "Uma queda no ticket médio pode indicar mudança no mix de produtos ou mais pedidos pequenos.",
    estimatedImpact: null,
    nextAction: change > 0
      ? "Comparar com o custo do produto para confirmar se a margem também melhorou."
      : "Revisar o mix de produtos vendidos no período.",
    severity: "info",
  });
}

export function insightOrderGrowth(currentOrders: number, previousOrders: number): ReportInsight | null {
  if (previousOrders === 0) return null;
  const change = safeDivide(currentOrders - previousOrders, previousOrders);
  if (change === null || Math.abs(change) < 0.05) return null;
  const direction = change > 0 ? "cresceu" : "caiu";
  return makeInsight({
    whatHappened: `O volume de pedidos ${direction} ${(Math.abs(change) * 100).toFixed(0)}% em relação ao período anterior.`,
    whyItMatters: change > 0 ? "Mais pedidos podem exigir mais capacidade operacional." : "Queda no volume merece atenção antes de virar tendência.",
    estimatedImpact: null,
    nextAction: change > 0 ? "Verificar se a operação suporta o novo volume." : "Investigar a causa antes do próximo período.",
    severity: change > 0 ? "info" : "attention",
  });
}

export function insightMissingData(missingLabels: string[]): ReportInsight | null {
  if (missingLabels.length === 0) return null;
  return makeInsight({
    whatHappened: `${missingLabels.length} indicador${missingLabels.length !== 1 ? "es" : ""} ainda sem dado disponível: ${missingLabels.join(", ")}.`,
    whyItMatters: "Indicadores ausentes não aparecem como zero — aparecem como indisponíveis, para não sugerir um resultado que não existe.",
    estimatedImpact: null,
    nextAction: "Conectar a fonte correspondente ou importar um arquivo com esses dados.",
    severity: "attention",
  });
}
