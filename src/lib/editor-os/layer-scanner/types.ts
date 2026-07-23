/**
 * EditorOS layer scanner — shared types (Sprint EditorOS 1.0).
 *
 * IMPORTANT: this codebase's canvas is a hand-rolled native HTML5 <canvas>
 * 2D renderer (src/app/admin/contentos/editor-os/CanvasEditor.tsx), not
 * Fabric.js — no canvas library is installed in this project. Every type
 * here is designed around the real `EditorElement` model (x/y/w/h/rot/z,
 * type: "text" | "image" | "rect") instead of Fabric's IText/FabricImage.
 *
 * A flattened PNG has no original layer information — everything this
 * module produces is a detection + estimate, never a perfect recovery.
 * detection → estimate → human review → conversion.
 */

export type LayerScanCapabilityId = "text_detection" | "object_segmentation" | "background_cleanup";

export interface LayerScanCapability {
  id: LayerScanCapabilityId;
  available: boolean;
  /** Why it is or isn't available — always shown to the user, never silently assumed. */
  reason: string;
  /** "experimental" narrows availability further than a plain boolean (e.g. background cleanup only for near-uniform regions). */
  status: "available" | "experimental" | "planned";
}

export type DetectedLayerKind = "text" | "image" | "shape" | "logo" | "icon" | "background" | "unknown";

export interface LayerBoundingBox {
  /** All in the ORIGINAL image's pixel space (natural width/height), never screen/client pixels. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayerPolygon {
  /** Optional — only populated when a detector produces a real polygon, never fabricated from a bounding box. */
  points: Array<{ x: number; y: number }>;
}

export type LayerConfidence = number; // 0–1, never a fabricated fixed value

export interface StyleEstimate {
  fontSizePx: number;
  fontFamily: string;
  fontWeight: "normal" | "bold";
  italic: boolean;
  color: string;
  textAlign: "left" | "center" | "right";
  /** Always true here — this codebase never has the original font, only a fallback + estimate. */
  isEstimate: true;
}

interface DetectedLayerBase {
  id: string;
  kind: DetectedLayerKind;
  label: string;
  confidence: LayerConfidence;
  boundingBox: LayerBoundingBox;
  polygon?: LayerPolygon;
  /** The EditorElement.id of the source raster image this was detected from. */
  sourceObjectId: string;
  sourceImageWidth: number;
  sourceImageHeight: number;
  canConvert: boolean;
  canRemoveFromBackground: boolean;
  /** Always populated with at least one entry — a detection is never presented as limitation-free. */
  limitations: string[];
  metadata: Record<string, string>;
}

export interface DetectedTextLayer extends DetectedLayerBase {
  kind: "text";
  text: string;
  styleEstimate: StyleEstimate;
}

export interface DetectedImageLayer extends DetectedLayerBase {
  kind: "image" | "logo" | "icon" | "background";
}

export interface DetectedShapeLayer extends DetectedLayerBase {
  kind: "shape";
}

export interface DetectedUnknownLayer extends DetectedLayerBase {
  kind: "unknown";
}

export type DetectedLayer = DetectedTextLayer | DetectedImageLayer | DetectedShapeLayer | DetectedUnknownLayer;

export interface LayerScanRequest {
  sourceObjectId: string;
  /** The raster's natural pixel data — the scanner reads real pixels, never a screenshot of the page/viewport. */
  imageElement: HTMLImageElement;
  languages: Array<"por" | "eng">;
  onProgress?: (stage: LayerScanStage, progress: number) => void;
  signal?: AbortSignal;
}

export type LayerScanStage =
  | "preparing"
  | "scanning_text"
  | "scanning_objects"
  | "done";

export interface LayerScanResult {
  sourceObjectId: string;
  sourceImageWidth: number;
  sourceImageHeight: number;
  capabilities: LayerScanCapability[];
  layers: DetectedLayer[];
  scannerVersion: string;
  scannedAt: string;
}

export interface LayerGroupingLimits {
  maxHorizontalGapPx: number;
  maxVerticalGapPx: number;
  minConfidence: number;
  minHeightPx: number;
  maxOverlapRatio: number;
}

export interface LayerConversionOptions {
  approvedLayerIds: string[];
  /** Per-layer corrected text, keyed by DetectedLayer.id — always reviewed before conversion, per Fase 9. */
  textOverrides: Record<string, string>;
  backgroundRemovalMode: "overlay_only" | "solid_background_cleanup";
}

export type BackgroundCleanupMode = "overlay_only" | "solid_background_cleanup" | "requires_inpainting";

export interface BackgroundCleanupResult {
  mode: BackgroundCleanupMode;
  eligible: boolean;
  reason: string;
  /** Only present when mode === "solid_background_cleanup" and eligible — a data URL for the generated patch. */
  patchDataUrl?: string;
  sampledColor?: string;
  variance?: number;
}

/** Bump whenever the detection/conversion algorithm changes in a way that could affect previously-scanned drafts. */
export const LAYER_SCANNER_VERSION = "1.0.0";

/**
 * Module-scope id generator (Date.now()/Math.random() only ever run inside
 * event handlers / async scan functions that call this — never during
 * render) — same pattern as generateId() in Meu Negócio's _shared.tsx and
 * uid() in CanvasEditor.tsx itself.
 */
export function generateScanId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
