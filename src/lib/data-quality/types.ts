/**
 * Canonical, cross-sector data-quality model for "Meu Negócio". Every metric
 * shown anywhere (Visão geral, Financeiro, CMV, Produtos, Estoque...) should
 * eventually carry a BusinessMetricValue instead of a bare number, so the UI
 * always knows and can disclose whether a value is real, calculated,
 * estimated or simulated. This supersedes sector-local provenance models
 * (e.g. the narrower DataProvenance in src/lib/finance/data-source.ts) —
 * new metrics should use this one; migrating existing sectors is a separate,
 * deliberately deferred effort (see docs/HANDOFF.md).
 */

export type DataClassification =
  | "REAL_SYNCED"
  | "REAL_IMPORTED"
  | "REAL_MANUAL"
  | "CALCULATED"
  | "ESTIMATED"
  | "SIMULATED"
  | "UNAVAILABLE";

export const DATA_CLASSIFICATION_LABEL: Record<DataClassification, string> = {
  REAL_SYNCED: "Real sincronizado",
  REAL_IMPORTED: "Real importado",
  REAL_MANUAL: "Real informado",
  CALCULATED: "Calculado",
  ESTIMATED: "Estimado",
  SIMULATED: "Simulado",
  UNAVAILABLE: "Indisponível",
};

/** REAL_SYNCED, REAL_IMPORTED and REAL_MANUAL are all "real" in the sense that they trace back to something that actually happened, as opposed to a calculation or a demo fixture. */
export const REAL_CLASSIFICATIONS: ReadonlySet<DataClassification> = new Set(["REAL_SYNCED", "REAL_IMPORTED", "REAL_MANUAL"]);

export function isRealClassification(classification: DataClassification): boolean {
  return REAL_CLASSIFICATIONS.has(classification);
}

export type ConfidenceLevel = "high" | "medium" | "low" | "insufficient";

export type ReconciliationStatus =
  /** Only one source exists for this metric; nothing to reconcile against. */
  | "not_applicable"
  /** Multiple sources exist and agree (or only one was actually used). */
  | "single_source"
  /** Multiple real sources were compared and matched within tolerance. */
  | "reconciled"
  /** Multiple real sources disagree and a human has not resolved it yet. */
  | "diverging"
  /** A human resolution is required before this value can be trusted. */
  | "pending_confirmation";

export interface FormulaTraceInput {
  label: string;
  value: number | null;
  unit: string;
  source: string;
}

export interface FormulaTrace {
  /** Human-readable expression, e.g. "vendas brutas - descontos - cancelamentos". */
  expression: string;
  /** True when one or more terms of the formula could not be resolved (shown instead of silently assuming zero). */
  isPartial: boolean;
  inputs: FormulaTraceInput[];
}

export interface MetricPeriod {
  start: string;
  end: string;
  label: string;
}

/**
 * The shared shape every business metric should carry. Deliberately verbose:
 * a bare formatted string is not enough to answer "can I trust this number?".
 */
export interface BusinessMetricValue {
  metricId: string;
  label: string;
  value: number | null;
  formattedValue: string;
  unit: string;
  period: MetricPeriod;
  dataClassification: DataClassification;
  sourceIds: string[];
  sourceLabels: string[];
  /** 0-1, or null when coverage itself is unknown (distinct from 0% coverage). */
  coveragePercentage: number | null;
  confidenceLevel: ConfidenceLevel;
  calculatedAt: string;
  formulaTrace: FormulaTrace;
  includedRecords: number | null;
  excludedRecords: number | null;
  limitations: string[];
  reconciliationStatus: ReconciliationStatus;
}
