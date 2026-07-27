/**
 * Assembles every derived number the Financeiro tab needs from the single
 * central demo state (entries + reserve config) — Fase 16: nothing here
 * duplicates a fixture, everything is computed from CASH_FLOW_ENTRIES_FIXTURES
 * via the pure functions in calculations.ts.
 */

import {
  calculateCashFlowByPeriod, calculateCashProjection, calculateClosingCashBalance,
  calculateEssentialMonthlyOutflow, calculateExpenseComposition, calculateNetCashFlow,
  calculateOpenReceivablesPayables, calculatePlannedVsActual, calculateRealizedTotals,
  calculateTopOutflows, calculateWorkingCapitalCalendar, categoryLabel, buildCashReserveSummary,
} from "./calculations";
import type { CashFlowByPeriodPoint } from "./calculations";
import type {
  CashFlowEntry, CashFlowProjection, CashReserveConfig, CashReserveSummary,
  ExpenseCompositionSlice, TopOutflowEntry, VarianceResult, WorkingCapitalSummary,
} from "./types";

export interface FinanceDashboardData {
  currentBalance: number;
  netCashFlow: number;
  inflows: number;
  outflows: number;
  receivables: number;
  payables: number;
  nextRiskDate: string | null;
  reserve: CashReserveSummary;
  monthlyPoints: CashFlowByPeriodPoint[];
  projection: CashFlowProjection;
  revenueVariance: VarianceResult;
  expenseVariance: VarianceResult;
  expenseComposition: ExpenseCompositionSlice[];
  topOutflows: TopOutflowEntry[];
  periodLabel: string;
}

function sumByStatus(entries: CashFlowEntry[], direction: "inflow" | "outflow", statuses: CashFlowEntry["status"][], startDate: string, endDate: string, onlyEssential = false): number {
  let total = 0;
  for (const e of entries) {
    if (e.direction !== direction || !statuses.includes(e.status)) continue;
    if (onlyEssential && !e.isEssential) continue;
    const dateForEntry = e.effectiveDate ?? e.dueDate;
    if (dateForEntry >= startDate && dateForEntry <= endDate) total += e.amount;
  }
  return total;
}

export function buildFinanceDashboardData(
  entries: CashFlowEntry[],
  reserveConfig: CashReserveConfig,
  openingBalance: number,
  openingBalanceDateIso: string,
  todayIso: string,
  periodStart: string,
  periodEnd: string,
  periodLabel: string
): FinanceDashboardData {
  const currentBalance = calculateClosingCashBalance(openingBalance, entries, openingBalanceDateIso, todayIso);
  const netCashFlow = calculateNetCashFlow(entries, periodStart, periodEnd);
  const { inflows, outflows } = calculateRealizedTotals(entries, periodStart, periodEnd);
  const { receivables, payables } = calculateOpenReceivablesPayables(entries);

  const essentialMonthlyOutflow = calculateEssentialMonthlyOutflow(entries, periodStart, periodEnd);
  const reserve = buildCashReserveSummary(currentBalance, reserveConfig, essentialMonthlyOutflow);

  const monthlyPoints = calculateCashFlowByPeriod(openingBalance, entries, openingBalanceDateIso, periodEnd);
  const projection = calculateCashProjection(currentBalance, entries, todayIso, [30, 60, 90]);
  const workingCapitalPeek = calculateWorkingCapitalCalendar(currentBalance, entries, todayIso, 90);

  const plannedRevenue = sumByStatus(entries, "inflow", ["planned", "pending"], periodStart, periodEnd);
  const actualRevenue = sumByStatus(entries, "inflow", ["received"], periodStart, periodEnd);
  const revenueVariance = calculatePlannedVsActual(plannedRevenue, actualRevenue, "inflow");

  const plannedExpense = sumByStatus(entries, "outflow", ["planned", "pending", "overdue"], periodStart, periodEnd, true);
  const actualExpense = sumByStatus(entries, "outflow", ["paid"], periodStart, periodEnd, true);
  const hasUnresolvedIssue = entries.some((e) => e.isEssential && e.direction === "outflow" && e.status === "overdue" && e.dueDate >= periodStart && e.dueDate <= periodEnd);
  const expenseVariance = calculatePlannedVsActual(plannedExpense, actualExpense, "outflow", hasUnresolvedIssue);

  return {
    currentBalance,
    netCashFlow,
    inflows,
    outflows,
    receivables,
    payables,
    nextRiskDate: workingCapitalPeek.firstNegativeDate ?? projection.firstNegativeDate,
    reserve,
    monthlyPoints,
    projection,
    revenueVariance,
    expenseVariance,
    expenseComposition: calculateExpenseComposition(entries, periodStart, periodEnd),
    topOutflows: calculateTopOutflows(entries, periodStart, periodEnd),
    periodLabel,
  };
}

export function essentialCategoryLabels(config: CashReserveConfig): string[] {
  return config.essentialCategories.map(categoryLabel);
}

const ALL_CATEGORIES: CashFlowEntry["category"][] = [
  "vendas", "recebiveis_cartao", "aporte_socio", "outras_receitas", "insumos", "folha_pagamento",
  "aluguel", "energia_agua", "marketing", "impostos", "taxas_maquininha", "manutencao", "emprestimo",
  "investimento", "outras_despesas",
];

export function excludedCategoryLabels(config: CashReserveConfig): string[] {
  return ALL_CATEGORIES.filter((c) => !config.essentialCategories.includes(c)).map(categoryLabel);
}

export { calculateWorkingCapitalCalendar };
export type { WorkingCapitalSummary };
