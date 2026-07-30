import type { BusinessMetricValue, MetricPeriod } from "@/lib/data-quality/types";

/**
 * Raw, pre-classification revenue inputs for a period. Any field can be
 * `null` when that component genuinely isn't available -- calculations must
 * degrade to a partial formula instead of silently treating it as zero
 * (Fase 8).
 */
export interface RevenueRawInputs {
  /** Sum of order items before discounts, in integer cents. */
  grossItemsAmountCents: number | null;
  discountsAmountCents: number | null;
  /** Amount from cancelled/refunded orders that must be excluded from realized revenue. */
  cancelledAmountCents: number | null;
  /** Known platform/delivery/service fees, in integer cents. */
  feesAmountCents: number | null;
  validOrderCount: number | null;
}

/** Faturamento realizado, vendas brutas, receita após taxas and their supporting breakdown for a single period. */
export interface RevenuePeriodSummary {
  period: MetricPeriod;
  grossSales: BusinessMetricValue;
  discounts: BusinessMetricValue;
  cancellations: BusinessMetricValue;
  fees: BusinessMetricValue;
  realizedRevenue: BusinessMetricValue;
  revenueAfterFees: BusinessMetricValue;
  averageTicket: BusinessMetricValue;
  validOrders: BusinessMetricValue;
}

export type ComparisonDirection = "up" | "down" | "flat" | "not_comparable";

export interface PeriodComparison {
  currentValue: number | null;
  previousValue: number | null;
  absoluteDifference: number | null;
  /** 0-1 fraction, or null when not comparable (e.g. previous value is 0 or missing). */
  percentageDifference: number | null;
  direction: ComparisonDirection;
  comparable: boolean;
  previousPeriod: MetricPeriod;
}
