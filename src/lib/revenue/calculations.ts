import { formatCents } from "@/lib/motor-lokat/money";
import { buildMetric } from "@/lib/data-quality/classification";
import type { BusinessMetricValue, DataClassification, MetricPeriod } from "@/lib/data-quality/types";
import type { ComparisonDirection, PeriodComparison, RevenuePeriodSummary, RevenueRawInputs } from "./types";

function parseISODate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const ONE_DAY_MS = 86_400_000;

function daysBetweenInclusive(startISO: string, endISO: string): number {
  return Math.round((parseISODate(endISO).getTime() - parseISODate(startISO).getTime()) / ONE_DAY_MS) + 1;
}

function isFullCalendarMonth(startISO: string, endISO: string): boolean {
  const start = parseISODate(startISO);
  const end = parseISODate(endISO);
  const lastDayOfMonth = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
  return start.getUTCDate() === 1 && end.getTime() === lastDayOfMonth.getTime();
}

/**
 * Fase 7: "período atual vs período imediatamente anterior de mesma duração",
 * with an explicit exception for full calendar months (compared against the
 * full previous calendar month, not just N days back).
 */
export function resolvePreviousPeriod(period: MetricPeriod): MetricPeriod {
  const start = parseISODate(period.start);
  if (isFullCalendarMonth(period.start, period.end)) {
    const previousMonthEnd = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 0));
    const previousMonthStart = new Date(Date.UTC(previousMonthEnd.getUTCFullYear(), previousMonthEnd.getUTCMonth(), 1));
    return {
      start: toISODate(previousMonthStart),
      end: toISODate(previousMonthEnd),
      label: `Mês anterior (${previousMonthStart.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })})`,
    };
  }
  const durationDays = daysBetweenInclusive(period.start, period.end);
  const previousEnd = new Date(start.getTime() - ONE_DAY_MS);
  const previousStart = new Date(previousEnd.getTime() - (durationDays - 1) * ONE_DAY_MS);
  return { start: toISODate(previousStart), end: toISODate(previousEnd), label: `${durationDays} dias imediatamente anteriores` };
}

/** Fase 7: never divides by zero; `comparable` gates whether percentageDifference/direction-by-percent can be shown. */
export function comparePeriods(currentValue: number | null, previousValue: number | null, previousPeriod: MetricPeriod): PeriodComparison {
  if (currentValue === null || previousValue === null) {
    return { currentValue, previousValue, absoluteDifference: null, percentageDifference: null, direction: "not_comparable", comparable: false, previousPeriod };
  }
  const absoluteDifference = currentValue - previousValue;
  const direction: ComparisonDirection = absoluteDifference > 0 ? "up" : absoluteDifference < 0 ? "down" : "flat";
  if (previousValue === 0) {
    return { currentValue, previousValue, absoluteDifference, percentageDifference: null, direction, comparable: false, previousPeriod };
  }
  return { currentValue, previousValue, absoluteDifference, percentageDifference: absoluteDifference / previousValue, direction, comparable: true, previousPeriod };
}

function currencyMetric(args: { metricId: string; label: string; cents: number | null; period: MetricPeriod; classification: DataClassification; calculatedAt: string; sourceLabels: string[]; expression: string; inputs: Array<{ label: string; value: number | null; source: string }>; limitations?: string[] }): BusinessMetricValue {
  const isPartial = args.inputs.some((input) => input.value === null);
  return buildMetric({
    metricId: args.metricId,
    label: args.label,
    value: args.cents,
    formattedValue: args.cents === null ? "Indisponível" : formatCents(args.cents),
    unit: "BRL",
    period: args.period,
    dataClassification: args.cents === null ? "UNAVAILABLE" : args.classification,
    sourceLabels: args.sourceLabels,
    calculatedAt: args.calculatedAt,
    formulaTrace: { expression: args.expression, isPartial, inputs: args.inputs.map((input) => ({ label: input.label, value: input.value, unit: "centavos", source: input.source })) },
    limitations: args.limitations ?? (isPartial ? ["Um ou mais componentes da fórmula não estão disponíveis; o valor mostrado é parcial."] : []),
  });
}

/**
 * Fase 8: Faturamento realizado = vendas brutas - descontos - cancelamentos.
 * Receita operacional após taxas = faturamento realizado - taxas.
 * Never assumes a missing component is zero; marks the derived value UNAVAILABLE
 * only when the whole computation can't proceed (no gross sales at all).
 */
export function calculateRevenueSummary(inputs: RevenueRawInputs, period: MetricPeriod, classification: DataClassification, calculatedAt: string, sourceLabels: string[]): RevenuePeriodSummary {
  const { grossItemsAmountCents, discountsAmountCents, cancelledAmountCents, feesAmountCents, validOrderCount } = inputs;

  const grossSales = currencyMetric({ metricId: "revenue_gross_sales", label: "Vendas brutas", cents: grossItemsAmountCents, period, classification, calculatedAt, sourceLabels, expression: "Σ itens antes dos descontos", inputs: [{ label: "Itens vendidos", value: grossItemsAmountCents, source: sourceLabels[0] ?? "desconhecida" }] });
  const discounts = currencyMetric({ metricId: "revenue_discounts", label: "Descontos", cents: discountsAmountCents, period, classification, calculatedAt, sourceLabels, expression: "Σ descontos aplicados aos pedidos", inputs: [{ label: "Descontos", value: discountsAmountCents, source: sourceLabels[0] ?? "desconhecida" }] });
  const cancellations = currencyMetric({ metricId: "revenue_cancellations", label: "Cancelamentos e estornos", cents: cancelledAmountCents, period, classification, calculatedAt, sourceLabels, expression: "Σ valor de pedidos cancelados/estornados", inputs: [{ label: "Cancelamentos", value: cancelledAmountCents, source: sourceLabels[0] ?? "desconhecida" }] });
  const fees = currencyMetric({ metricId: "revenue_fees", label: "Taxas", cents: feesAmountCents, period, classification, calculatedAt, sourceLabels, expression: "Σ taxas de plataforma/entrega/serviço conhecidas", inputs: [{ label: "Taxas", value: feesAmountCents, source: sourceLabels[0] ?? "desconhecida" }] });

  const realizedRevenueCents = grossItemsAmountCents === null ? null : grossItemsAmountCents - (discountsAmountCents ?? 0) - (cancelledAmountCents ?? 0);
  const realizedRevenue = currencyMetric({
    metricId: "revenue_realized", label: "Faturamento realizado", cents: realizedRevenueCents, period, classification, calculatedAt, sourceLabels,
    expression: "vendas brutas − descontos − cancelamentos",
    inputs: [{ label: "Vendas brutas", value: grossItemsAmountCents, source: sourceLabels[0] ?? "desconhecida" }, { label: "Descontos", value: discountsAmountCents, source: sourceLabels[0] ?? "desconhecida" }, { label: "Cancelamentos", value: cancelledAmountCents, source: sourceLabels[0] ?? "desconhecida" }],
    limitations: grossItemsAmountCents === null ? ["Vendas brutas indisponíveis; não é possível calcular o faturamento realizado."] : discountsAmountCents === null || cancelledAmountCents === null ? ["Descontos ou cancelamentos indisponíveis; o faturamento realizado mostrado é uma fórmula parcial (assume 0 apenas na exibição, não substitui o dado ausente)."] : [],
  });

  const revenueAfterFeesCents = realizedRevenueCents === null ? null : realizedRevenueCents - (feesAmountCents ?? 0);
  const revenueAfterFees = currencyMetric({
    metricId: "revenue_after_fees", label: "Receita operacional após taxas", cents: revenueAfterFeesCents, period, classification, calculatedAt, sourceLabels,
    expression: "faturamento realizado − taxas",
    inputs: [{ label: "Faturamento realizado", value: realizedRevenueCents, source: sourceLabels[0] ?? "desconhecida" }, { label: "Taxas", value: feesAmountCents, source: sourceLabels[0] ?? "desconhecida" }],
    limitations: realizedRevenueCents === null ? ["Faturamento realizado indisponível."] : feesAmountCents === null ? ["Taxas indisponíveis; a receita após taxas mostrada é uma fórmula parcial."] : [],
  });

  const validOrders = buildMetric({
    metricId: "revenue_valid_orders", label: "Pedidos válidos", value: validOrderCount, formattedValue: validOrderCount === null ? "Indisponível" : validOrderCount.toLocaleString("pt-BR"), unit: "pedidos", period,
    dataClassification: validOrderCount === null ? "UNAVAILABLE" : classification, sourceLabels, calculatedAt,
    formulaTrace: { expression: "contagem de pedidos concluídos, excluindo cancelados", isPartial: false, inputs: [] },
  });

  const averageTicketCents = realizedRevenueCents === null || validOrderCount === null || validOrderCount === 0 ? null : Math.round(realizedRevenueCents / validOrderCount);
  const averageTicket = currencyMetric({
    metricId: "revenue_average_ticket", label: "Ticket médio", cents: averageTicketCents, period, classification, calculatedAt, sourceLabels,
    expression: "faturamento realizado ÷ pedidos válidos",
    inputs: [{ label: "Faturamento realizado", value: realizedRevenueCents, source: sourceLabels[0] ?? "desconhecida" }, { label: "Pedidos válidos", value: validOrderCount, source: sourceLabels[0] ?? "desconhecida" }],
    limitations: validOrderCount === 0 ? ["Nenhum pedido válido no período; ticket médio não pôde ser calculado."] : [],
  });

  return { period, grossSales, discounts, cancellations, fees, realizedRevenue, revenueAfterFees, averageTicket, validOrders };
}
