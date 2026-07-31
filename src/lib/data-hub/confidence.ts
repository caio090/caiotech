import type { DataConfidence } from "./types";

/** Ordem de confiança, do mais para o menos confiável -- usado para escolher o valor "vencedor" quando duas fontes divergem. */
export const DATA_CONFIDENCE_RANK: Record<DataConfidence, number> = {
  confirmed: 5,
  calculated: 4,
  estimated: 3,
  incomplete: 2,
  divergent: 1,
  unknown: 0,
};

export function isMoreConfident(a: DataConfidence, b: DataConfidence): boolean {
  return DATA_CONFIDENCE_RANK[a] > DATA_CONFIDENCE_RANK[b];
}

export function pickMostConfident<T extends { confidence: DataConfidence }>(candidates: T[]): T | undefined {
  return candidates.reduce<T | undefined>((best, candidate) => (best === undefined || isMoreConfident(candidate.confidence, best.confidence) ? candidate : best), undefined);
}

export const DATA_CONFIDENCE_LABELS: Record<DataConfidence, string> = {
  confirmed: "Confirmado",
  calculated: "Calculado",
  estimated: "Estimado",
  incomplete: "Incompleto",
  divergent: "Divergente",
  unknown: "Desconhecido",
};
