import type { DataFieldMapping } from "./types";

/** Aplica um mapeamento de campos simples (renomear chave, sem transformação real de valor nesta sprint). */
export function applyFieldMapping(record: Record<string, unknown>, mappings: DataFieldMapping[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const mapping of mappings) {
    if (mapping.sourceField in record) result[mapping.targetField] = record[mapping.sourceField];
  }
  return result;
}

export function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeDecimalString(value: string): number | null {
  const cleaned = value.trim().replace(/\./g, "").replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}
