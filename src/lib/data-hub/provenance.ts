import type { DataConfidence, DataProvenance, DataQualityStatus } from "./types";

export interface BuildDataProvenanceInput {
  sourceId: string;
  origin: string;
  confidence: DataConfidence;
  quality: DataQualityStatus;
  collectedAt?: string;
  responsible?: string;
  importBatchId?: string;
  externalId?: string;
  transformationApplied?: string;
  originalValue?: string;
  normalizedValue?: string;
  now?: () => Date;
}

/**
 * Única função que constroi DataProvenance -- nunca montar o objeto à mão em
 * um componente. Fase 9: proveniência nunca é autorização (não decide quem
 * pode ver o dado) e nunca guarda segredo/payload completo, só metadados.
 */
export function buildDataProvenance(input: BuildDataProvenanceInput): DataProvenance {
  const now = (input.now ?? (() => new Date()))().toISOString();
  return {
    sourceId: input.sourceId,
    origin: input.origin,
    collectedAt: input.collectedAt ?? now,
    updatedAt: now,
    confidence: input.confidence,
    quality: input.quality,
    responsible: input.responsible,
    importBatchId: input.importBatchId,
    externalId: input.externalId,
    transformationApplied: input.transformationApplied,
    originalValue: input.originalValue,
    normalizedValue: input.normalizedValue,
  };
}
