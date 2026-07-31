import type { DataQualityIssue, DataQualityStatus } from "./types";

/** Deriva um status agregado a partir de uma lista de issues -- regra determinística, sem heurística difusa. */
export function resolveAggregateQuality(issues: DataQualityIssue[]): DataQualityStatus {
  if (issues.length === 0) return "valid";
  if (issues.some((issue) => issue.status === "blocked")) return "blocked";
  if (issues.some((issue) => issue.status === "invalid")) return "invalid";
  if (issues.some((issue) => issue.status === "inconsistent")) return "inconsistent";
  if (issues.some((issue) => issue.status === "duplicate")) return "duplicate";
  if (issues.some((issue) => issue.status === "missing_fields")) return "missing_fields";
  if (issues.some((issue) => issue.status === "processing")) return "processing";
  return "partial";
}

export function buildMissingFieldIssue(field: string): DataQualityIssue {
  return { field, status: "missing_fields", message: `Campo obrigatório ausente: ${field}` };
}

export const DATA_QUALITY_LABELS: Record<DataQualityStatus, string> = {
  valid: "Válido",
  partial: "Parcial",
  invalid: "Inválido",
  missing_fields: "Campos ausentes",
  duplicate: "Duplicado",
  inconsistent: "Inconsistente",
  processing: "Processando",
  blocked: "Bloqueado",
};
