import type { GroupedTextRegion } from "./region-grouper";
import type { PixelSampler } from "./style-estimator";
import { estimateTextStyle } from "./style-estimator";
import { mapImageRegionToCanvasElement, type ImageElementGeometry } from "./coordinate-mapper";
import { generateScanId, LAYER_SCANNER_VERSION } from "./types";
import type { DetectedTextLayer, LayerConversionOptions } from "./types";
import type { EditorElement } from "@/app/admin/contentos/editor-os/CanvasEditor";

/** Fase 3/7 — builds the review-ready DetectedTextLayer list from grouped OCR regions. Never claims a region is text with certainty above its own OCR confidence. */
export function buildDetectedTextLayers(
  regions: GroupedTextRegion[],
  sourceObjectId: string,
  sourceImageWidth: number,
  sourceImageHeight: number,
  sampler: PixelSampler | null
): DetectedTextLayer[] {
  return regions.map((region) => {
    const styleEstimate = estimateTextStyle(region, sourceImageWidth, sampler);
    const limitations = [
      "Fonte original não recuperada — usando fallback e estimativa de tamanho/cor.",
      "Posição e tamanho são aproximados a partir da imagem achatada.",
    ];
    if (region.confidence < 0.6) limitations.push("Confiança baixa — revise o texto antes de converter.");

    return {
      id: generateScanId("layer-text"),
      kind: "text",
      label: region.text.length > 40 ? `${region.text.slice(0, 40)}…` : region.text,
      confidence: region.confidence,
      boundingBox: region.boundingBox,
      sourceObjectId,
      sourceImageWidth,
      sourceImageHeight,
      text: region.text,
      styleEstimate,
      canConvert: true,
      canRemoveFromBackground: true,
      limitations,
      metadata: { wordCount: String(region.wordCount) },
    };
  });
}

/**
 * Fase 10 — converts one approved DetectedTextLayer into a real
 * EditorElement (type: "text"), positioned in the source image's on-canvas
 * geometry via mapImageRegionToCanvasElement. The caller is responsible for
 * assigning `z` (depends on the live elements array length at call time)
 * and for pushing exactly one history snapshot for the whole batch (Fase 17
 * — scan + convert is one undo step, not one per layer).
 */
export function convertTextLayerToEditorElement(
  layer: DetectedTextLayer,
  imageEl: ImageElementGeometry,
  options: LayerConversionOptions,
  scanResultId: string
): Omit<EditorElement, "z"> {
  const geometry = mapImageRegionToCanvasElement(imageEl, layer.sourceImageWidth, layer.sourceImageHeight, layer.boundingBox);
  const text = options.textOverrides[layer.id] ?? layer.text;

  return {
    id: generateScanId("el-scan"),
    type: "text",
    x: geometry.x,
    y: geometry.y,
    w: geometry.w,
    h: geometry.h,
    rot: geometry.rot,
    text,
    fontSize: layer.styleEstimate.fontSizePx,
    fontFamily: layer.styleEstimate.fontFamily,
    textColor: layer.styleEstimate.color,
    bold: layer.styleEstimate.fontWeight === "bold",
    italic: layer.styleEstimate.italic,
    textAlign: layer.styleEstimate.textAlign,
    editorOsSource: "layer_scan",
    scannerVersion: LAYER_SCANNER_VERSION,
    sourceObjectId: layer.sourceObjectId,
    scanResultId,
    scanConfidence: layer.confidence,
    originalScannedText: layer.text,
    backgroundRemovalMode: options.backgroundRemovalMode,
  };
}
