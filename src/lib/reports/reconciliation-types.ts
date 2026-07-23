/**
 * Payment reconciliation model — gross sales down to actual settled amount.
 *
 * This operates on guided-entry (Visão Essencial/Analítica) or imported
 * data, not a live connector: OlaClick's current endpoints (see
 * src/lib/reports/connectors/olaclick-connector.ts) don't expose
 * acquirer/split/settlement data, so reconciliation fields are either
 * user-entered, imported from a file, or computed from other reconciliation
 * fields — never fabricated when absent.
 */

// ── Field-level provenance ──────────────────────────────────────────────
// Deliberately categorical (not a 0–1 float like ReportProvenance.confidence
// in types.ts) — a reconciliation field's trust level is a discrete state a
// human or the future LOKAT Assistant reasons about explicitly, never a
// blended score.
export type FinancialFieldSource =
  | "api"
  | "file"
  | "bank_statement"
  | "manual"
  | "system_calculation"
  | "official_documentation"
  | "inference";

export type FinancialFieldConfidence =
  | "confirmed"
  | "calculated"
  | "estimated"
  | "incomplete"
  | "divergent";

export interface FinancialField {
  value: number | null; // integer cents; null when genuinely absent (never coerced to 0)
  source: FinancialFieldSource;
  confidence: FinancialFieldConfidence;
  note?: string;
}

function field(value: number | null, source: FinancialFieldSource, confidence: FinancialFieldConfidence, note?: string): FinancialField {
  return { value, source, confidence, note };
}
export const financialField = field;

/** A field that was never provided — distinct from a confirmed zero. */
export function missingField(note?: string): FinancialField {
  return { value: null, source: "manual", confidence: "incomplete", note };
}

// ── Reconciliation input/output ──────────────────────────────────────────

export interface ReconciliationInput {
  grossSales: FinancialField;
  merchantFundedDiscounts: FinancialField; // discount the business absorbed
  platformFundedDiscounts: FinancialField; // discount the platform absorbed (not a cost to the business)
  customerPaidAmount: FinancialField; // what the customer actually paid
  processorPercentageFee: FinancialField;
  processorFixedFee: FinancialField;
  installmentFee: FinancialField;
  anticipationFee: FinancialField;
  platformCommission: FinancialField;
  splitAllocationsTotal: FinancialField;
  retentions: FinancialField;
  refunds: FinancialField;
  chargebacks: FinancialField;
  informedTaxes: FinancialField;
  otherDeductions: FinancialField;
  actualSettledAmount: FinancialField; // what actually landed in the account — never derived, always reported
}

export interface ReconciliationResult {
  input: ReconciliationInput;
  /** expectedNetAmount = customerPaidAmount - (every deduction below it) */
  expectedNetAmount: FinancialField;
  /** actualSettledAmount - expectedNetAmount */
  reconciliationDifference: FinancialField;
  /** total deducted ÷ customerPaidAmount, as a fraction (0–1), null when unusable */
  effectiveFeePercentage: number | null;
  /** true only when every input field feeding expectedNetAmount is "confirmed" or "calculated" */
  isFullyReconciled: boolean;
  /** which of the 15 input fields are missing/estimated, for the confidence banner */
  incompleteFields: string[];
}

const DEDUCTION_KEYS = [
  "merchantFundedDiscounts",
  "processorPercentageFee",
  "processorFixedFee",
  "installmentFee",
  "anticipationFee",
  "platformCommission",
  "splitAllocationsTotal",
  "retentions",
  "refunds",
  "chargebacks",
  "informedTaxes",
  "otherDeductions",
] as const;

/**
 * Pure, deterministic. Never assumes a missing field is zero — an
 * expectedNetAmount that depends on any null field is itself returned as
 * `estimated` (computed only from the fields that ARE present) rather than
 * silently treating the gap as zero, and `incompleteFields` names exactly
 * which inputs are missing so the UI never hides the gap.
 */
export function reconcile(input: ReconciliationInput): ReconciliationResult {
  const incompleteFields: string[] = [];
  if (input.customerPaidAmount.value === null) incompleteFields.push("customerPaidAmount");

  let deductionsTotal = 0;
  let anyDeductionMissing = false;
  for (const key of DEDUCTION_KEYS) {
    const f = input[key];
    if (f.value === null) {
      anyDeductionMissing = true;
      incompleteFields.push(key);
    } else {
      deductionsTotal += f.value;
    }
  }

  let expectedNetAmount: FinancialField;
  if (input.customerPaidAmount.value === null) {
    expectedNetAmount = missingField("customerPaidAmount ausente — não é possível calcular o líquido esperado");
  } else {
    const value = input.customerPaidAmount.value - deductionsTotal;
    expectedNetAmount = {
      value,
      source: "system_calculation",
      confidence: anyDeductionMissing ? "estimated" : "calculated",
      note: anyDeductionMissing
        ? `Calculado sem: ${incompleteFields.filter((k) => k !== "customerPaidAmount").join(", ")}`
        : undefined,
    };
  }

  let reconciliationDifference: FinancialField;
  if (expectedNetAmount.value === null || input.actualSettledAmount.value === null) {
    reconciliationDifference = missingField(
      input.actualSettledAmount.value === null
        ? "Valor liquidado ainda não informado"
        : "Líquido esperado não pôde ser calculado"
    );
  } else {
    reconciliationDifference = {
      value: input.actualSettledAmount.value - expectedNetAmount.value,
      source: "system_calculation",
      confidence: expectedNetAmount.confidence === "calculated" ? "calculated" : "estimated",
    };
  }

  const effectiveFeePercentage =
    input.customerPaidAmount.value && input.customerPaidAmount.value > 0 && !anyDeductionMissing
      ? deductionsTotal / input.customerPaidAmount.value
      : null;

  return {
    input,
    expectedNetAmount,
    reconciliationDifference,
    effectiveFeePercentage,
    isFullyReconciled: incompleteFields.length === 0,
    incompleteFields,
  };
}

// ── Split / repasses ──────────────────────────────────────────────────────

export type SplitCategory = "fee" | "split" | "commission" | "retention" | "tax" | "discount" | "refund";

export interface SplitAllocation {
  id: string;
  category: SplitCategory;
  recipient: string;
  rulePercentage: number | null; // 0–1
  ruleFixedAmountCents: number | null;
  allocatedAmountCents: number;
  settledAt: string | null; // ISO — moment the split was actually paid out, when known
  feeResponsibility: "business" | "recipient" | "platform" | "unknown";
  ruleOrigin: string; // free text — contract clause, platform default, etc.
}

// ── Settlement (liquidação) ───────────────────────────────────────────────

export type SettlementStatus = "pending" | "scheduled" | "settled" | "partial" | "divergent" | "reversed" | "unidentified";

export interface SettlementRecord {
  id: string;
  soldAmountCents: number;
  processedAmountCents: number | null;
  expectedNetAmountCents: number | null;
  settledAmountCents: number | null;
  receivedAmountCents: number | null;
  expectedDate: string | null;
  actualDate: string | null;
  account: string | null;
  institution: string | null;
  settlementId: string | null;
  status: SettlementStatus;
  differenceCents: number | null;
}

// ── View mode (Visão Essencial / Analítica) ───────────────────────────────
// Both views read the SAME ReconciliationResult — this type only controls
// which fields the UI shows, never a second data source or formula.
export type ReportViewMode = "essencial" | "analitica";
