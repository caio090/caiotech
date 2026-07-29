import type { MetricPeriod } from "@/lib/data-quality/types";
import type { RevenueRawInputs } from "./types";

/**
 * Single source of truth for the demo revenue numbers, shared by the Visão
 * Geral hero card and the Financeiro / Faturamento panel so both always show
 * the same figures. Kept intentionally consistent with the existing
 * "Vendas realizadas" fixture in business-command-center/fixtures.ts
 * (10.000.000 centavos) -- this is the same number, now decomposed.
 */
export const REVENUE_PERIOD_FIXTURE: MetricPeriod = { start: "2026-06-01", end: "2026-06-30", label: "Junho de 2026" };

export const REVENUE_RAW_INPUTS_FIXTURE: RevenueRawInputs = {
  grossItemsAmountCents: 10_500_000,
  discountsAmountCents: 300_000,
  cancelledAmountCents: 200_000,
  feesAmountCents: 450_000,
  validOrderCount: 248,
};

export const REVENUE_PREVIOUS_RAW_INPUTS_FIXTURE: RevenueRawInputs = {
  grossItemsAmountCents: 9_680_000,
  discountsAmountCents: 260_000,
  cancelledAmountCents: 190_000,
  feesAmountCents: 410_000,
  validOrderCount: 236,
};

export const REVENUE_SOURCE_LABEL_FIXTURE = ["Exemplo simulado"];
export const REVENUE_CALCULATED_AT_FIXTURE = "2026-07-01T09:00:00.000Z";
