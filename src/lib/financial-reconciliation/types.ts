/** Fase 22: contratos e funções puras de conciliação financeira -- sem persistência, sem motor duplicado (consome o mesmo ReportSourceData de src/lib/reports/view-modes.ts quando aplicável). */

export type FinancialFieldSource = "declared" | "bank_statement" | "gateway_report" | "manual_entry";

export type FinancialDeductionType = "fee" | "commission" | "split" | "retention" | "tax" | "discount" | "refund" | "chargeback";

export interface FinancialDeduction {
  type: FinancialDeductionType;
  amount: number;
  source: FinancialFieldSource;
}

export interface FinancialSettlement {
  grossAmount: number;
  deductions: FinancialDeduction[];
  netAmount: number;
}

export interface FinancialDifference {
  expected: number;
  actual: number;
  difference: number;
  percentageDifference: number | null;
}

export interface FinancialReconciliationInput {
  grossAmount: number;
  deductions: FinancialDeduction[];
  expectedNet: number;
  actualNet: number;
}

export interface FinancialReconciliationResult {
  settlement: FinancialSettlement;
  difference: FinancialDifference;
  deductionsByType: Record<FinancialDeductionType, number>;
}
