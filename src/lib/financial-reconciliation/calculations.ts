import type { FinancialDeduction, FinancialDeductionType, FinancialDifference, FinancialReconciliationInput, FinancialReconciliationResult, FinancialSettlement } from "./types";

const ALL_DEDUCTION_TYPES: FinancialDeductionType[] = ["fee", "commission", "split", "retention", "tax", "discount", "refund", "chargeback"];

/** Soma por tipo -- fee, commission e split nunca são somados juntos de forma implícita, cada um mantém seu próprio total (regra explícita do ticket: "não misturar split com taxa"). */
export function sumDeductionsByType(deductions: FinancialDeduction[]): Record<FinancialDeductionType, number> {
  const totals = Object.fromEntries(ALL_DEDUCTION_TYPES.map((type) => [type, 0])) as Record<FinancialDeductionType, number>;
  for (const deduction of deductions) totals[deduction.type] += deduction.amount;
  return totals;
}

export function buildFinancialSettlement(grossAmount: number, deductions: FinancialDeduction[]): FinancialSettlement {
  const totalDeductions = deductions.reduce((sum, deduction) => sum + deduction.amount, 0);
  return { grossAmount, deductions, netAmount: grossAmount - totalDeductions };
}

/**
 * Nunca retorna NaN/Infinity: se expected for 0, percentageDifference vem
 * null (não calculável), não Infinity. Taxa ausente nunca é tratada como
 * zero confirmado -- ausência de deduções é apenas "nenhuma deduzida ainda
 * registrada", não uma confirmação de valor zero.
 */
export function calculateFinancialDifference(expected: number, actual: number): FinancialDifference {
  const difference = actual - expected;
  const percentageDifference = expected !== 0 ? (difference / expected) * 100 : null;
  return { expected, actual, difference, percentageDifference: percentageDifference !== null && Number.isFinite(percentageDifference) ? percentageDifference : null };
}

export function reconcile(input: FinancialReconciliationInput): FinancialReconciliationResult {
  const settlement = buildFinancialSettlement(input.grossAmount, input.deductions);
  const difference = calculateFinancialDifference(input.expectedNet, input.actualNet);
  const deductionsByType = sumDeductionsByType(input.deductions);
  return { settlement, difference, deductionsByType };
}
