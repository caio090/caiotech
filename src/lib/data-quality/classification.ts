import type { BusinessMetricValue, DataClassification, FormulaTrace, MetricPeriod, ConfidenceLevel, ReconciliationStatus } from "./types";

/**
 * Derives the classification of a metric computed FROM other classified
 * inputs (Fase 11 — "mistura de dados"): a value must never read as more
 * trustworthy than its worst input.
 *
 * - No inputs, or all UNAVAILABLE -> UNAVAILABLE.
 * - Any SIMULATED/ESTIMATED input mixed with anything else -> ESTIMATED
 *   (e.g. real revenue + simulated product mix = estimated CMV).
 * - All present inputs SIMULATED -> SIMULATED.
 * - Otherwise (only REAL_ or CALCULATED inputs) -> CALCULATED: a formula
 *   applied to real facts is a computed number, not itself a "real" fact.
 */
export function deriveDerivedClassification(inputs: DataClassification[]): DataClassification {
  const present = inputs.filter((classification) => classification !== "UNAVAILABLE");
  if (present.length === 0) return "UNAVAILABLE";
  const hasSimulatedOrEstimated = present.some((classification) => classification === "SIMULATED" || classification === "ESTIMATED");
  if (hasSimulatedOrEstimated) return present.every((classification) => classification === "SIMULATED") ? "SIMULATED" : "ESTIMATED";
  return "CALCULATED";
}

export function buildMetric(input: {
  metricId: string;
  label: string;
  value: number | null;
  formattedValue: string;
  unit: string;
  period: MetricPeriod;
  dataClassification: DataClassification;
  sourceIds?: string[];
  sourceLabels?: string[];
  coveragePercentage?: number | null;
  confidenceLevel?: ConfidenceLevel;
  calculatedAt: string;
  formulaTrace: FormulaTrace;
  includedRecords?: number | null;
  excludedRecords?: number | null;
  limitations?: string[];
  reconciliationStatus?: ReconciliationStatus;
}): BusinessMetricValue {
  return {
    metricId: input.metricId,
    label: input.label,
    value: input.value,
    formattedValue: input.formattedValue,
    unit: input.unit,
    period: input.period,
    dataClassification: input.dataClassification,
    sourceIds: input.sourceIds ?? [],
    sourceLabels: input.sourceLabels ?? [],
    coveragePercentage: input.coveragePercentage ?? null,
    confidenceLevel: input.confidenceLevel ?? "medium",
    calculatedAt: input.calculatedAt,
    formulaTrace: input.formulaTrace,
    includedRecords: input.includedRecords ?? null,
    excludedRecords: input.excludedRecords ?? null,
    limitations: input.limitations ?? [],
    reconciliationStatus: input.reconciliationStatus ?? "not_applicable",
  };
}
