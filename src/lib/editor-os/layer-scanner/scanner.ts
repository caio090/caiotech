import { runOcr } from "./ocr-provider";
import { groupWordsIntoLines } from "./region-grouper";
import { buildDetectedTextLayers } from "./layer-converter";
import { getLayerScanCapabilities } from "./capabilities";
import type { PixelSampler } from "./style-estimator";
import { LAYER_SCANNER_VERSION, type LayerScanRequest, type LayerScanResult } from "./types";

const MAX_IMAGE_DIMENSION_FOR_OCR = 4000;

/**
 * Fase 3/4 — top-level scan orchestration. Only text detection is real in
 * this sprint (Cenário C/D — no object segmentation provider exists in
 * this repository); "scanning_objects" is reported to the caller as a
 * stage that completes immediately with zero results, never fabricated.
 */
export async function scanImageForLayers(request: LayerScanRequest, sampler: PixelSampler | null): Promise<LayerScanResult> {
  const { sourceObjectId, imageElement, languages, onProgress, signal } = request;

  if (imageElement.naturalWidth <= 0 || imageElement.naturalHeight <= 0) {
    throw new Error("Imagem inválida ou corrompida — sem dimensões legíveis.");
  }
  if (imageElement.naturalWidth > MAX_IMAGE_DIMENSION_FOR_OCR || imageElement.naturalHeight > MAX_IMAGE_DIMENSION_FOR_OCR) {
    throw new Error(`Imagem maior que o limite de análise (${MAX_IMAGE_DIMENSION_FOR_OCR}px por lado).`);
  }

  onProgress?.("preparing", 0);
  if (signal?.aborted) throw new DOMException("Scan cancelled", "AbortError");

  onProgress?.("scanning_text", 0.1);
  const { words, sourceImageWidth, sourceImageHeight } = await runOcr(
    imageElement,
    languages,
    (p) => onProgress?.("scanning_text", 0.1 + p * 0.7),
    signal
  );

  const regions = groupWordsIntoLines(words);
  const layers = buildDetectedTextLayers(regions, sourceObjectId, sourceImageWidth, sourceImageHeight, sampler);

  // No object segmentation provider exists — this stage is honestly reported as a no-op, never a fabricated result.
  onProgress?.("scanning_objects", 0.85);
  if (signal?.aborted) throw new DOMException("Scan cancelled", "AbortError");

  onProgress?.("done", 1);

  return {
    sourceObjectId,
    sourceImageWidth,
    sourceImageHeight,
    capabilities: getLayerScanCapabilities(),
    layers,
    scannerVersion: LAYER_SCANNER_VERSION,
    scannedAt: new Date().toISOString(),
  };
}
