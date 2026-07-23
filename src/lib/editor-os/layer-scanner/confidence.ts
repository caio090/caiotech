import type { DetectedLayer, LayerConfidence } from "./types";

/** Below this, a region stays in the review list but starts unchecked (Fase 7). */
export const DEFAULT_MIN_CONFIDENCE_FOR_AUTO_SELECT = 0.6;

export type ConfidenceBucket = "alta" | "media" | "baixa";

export function bucketConfidence(confidence: LayerConfidence): ConfidenceBucket {
  if (confidence >= 0.8) return "alta";
  if (confidence >= DEFAULT_MIN_CONFIDENCE_FOR_AUTO_SELECT) return "media";
  return "baixa";
}

/** Fase 7 — low-confidence regions stay available for review but unchecked by default. */
export function shouldPreselectLayer(layer: DetectedLayer): boolean {
  return layer.confidence >= DEFAULT_MIN_CONFIDENCE_FOR_AUTO_SELECT && layer.canConvert;
}

export function confidenceLabel(confidence: LayerConfidence): string {
  const pct = Math.round(confidence * 100);
  const bucket = bucketConfidence(confidence);
  const bucketLabel = bucket === "alta" ? "Confiança alta" : bucket === "media" ? "Confiança média" : "Confiança baixa";
  return `${bucketLabel} (${pct}%)`;
}
