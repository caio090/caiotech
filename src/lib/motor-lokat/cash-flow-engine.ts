import { safeDivide } from "./money";
import type { CashFlowInput, CashFlowResult } from "./types";

export function calculateCashFlow(input: CashFlowInput): CashFlowResult {
  const {
    openingBalance, expectedInflows, realizedInflows, expectedOutflows, realizedOutflows,
    receivables, payables, currentReserve, desiredReserveMonths, averageMonthlyOutflow,
  } = input;

  const projectedBalance = openingBalance + expectedInflows - expectedOutflows + receivables - payables;
  const realizedBalance = openingBalance + realizedInflows - realizedOutflows;
  const difference = realizedBalance - projectedBalance;

  const suggestedWorkingCapital = Math.round(averageMonthlyOutflow * desiredReserveMonths);

  const coverageMonths = averageMonthlyOutflow > 0
    ? safeDivide(currentReserve, averageMonthlyOutflow)
    : null;

  let risk: CashFlowResult["risk"] = "insuficiente";
  if (coverageMonths !== null) {
    if (coverageMonths >= desiredReserveMonths) risk = "baixo";
    else if (coverageMonths >= desiredReserveMonths / 2) risk = "atencao";
    else risk = "alto";
  }

  return {
    projectedBalance,
    realizedBalance,
    difference,
    suggestedWorkingCapital,
    coverageMonths,
    risk,
  };
}
