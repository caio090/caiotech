import type { LayerBoundingBox } from "./types";

/**
 * Fase 8 — maps a bounding box detected in the ORIGINAL image's pixel space
 * (0..naturalWidth, 0..naturalHeight) into the coordinate space CanvasEditor
 * actually uses for `EditorElement` (x/y/w/h/rot, always in the preset's
 * internal pixel space — e.g. 1080x1080 — never in on-screen/client pixels).
 *
 * What this codebase's EditorElement model does and does NOT have, verified
 * by reading CanvasEditor.tsx directly:
 * - No separate scaleX/scaleY: an image element's effective scale is simply
 *   w / naturalWidth and h / naturalHeight.
 * - Rotation (`rot`, degrees) is applied around the element's own center,
 *   exactly as CanvasEditor's own `worldCorners()` does — this mirrors that
 *   formula so a converted layer rotates in sync with its source image.
 * - No flipX/flipY field exists on EditorElement — flipping isn't part of
 *   this model, so it is intentionally not handled here.
 * - No crop offsets (cropX/cropY) exist either — an image element always
 *   shows the whole source image scaled to w/h.
 * - Zoom does NOT enter this calculation at all: CanvasEditor keeps
 *   `elements` coordinates in the preset's fixed internal pixel space
 *   (canvas.width/height) regardless of display zoom — zoom only changes
 *   `canvas.style.width/height` for on-screen display via
 *   `getDisplayScale()`. There is nothing for this mapper to compensate
 *   for; verified by reading CanvasEditor.tsx's canvas-sizing effect.
 */

export interface ImageElementGeometry {
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
}

export interface MappedElementGeometry {
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
}

function rotateAroundCenter(cx: number, cy: number, localX: number, localY: number, halfW: number, halfH: number, rad: number): [number, number] {
  const dx = localX - halfW;
  const dy = localY - halfH;
  return [
    cx + dx * Math.cos(rad) - dy * Math.sin(rad),
    cy + dx * Math.sin(rad) + dy * Math.cos(rad),
  ];
}

export function mapImageRegionToCanvasElement(
  imageEl: ImageElementGeometry,
  sourceImageWidth: number,
  sourceImageHeight: number,
  bbox: LayerBoundingBox
): MappedElementGeometry {
  if (sourceImageWidth <= 0 || sourceImageHeight <= 0) {
    throw new Error("mapImageRegionToCanvasElement: sourceImageWidth/sourceImageHeight must be > 0");
  }

  const scaleX = imageEl.w / sourceImageWidth;
  const scaleY = imageEl.h / sourceImageHeight;

  const localCenterX = (bbox.x + bbox.width / 2) * scaleX;
  const localCenterY = (bbox.y + bbox.height / 2) * scaleY;

  const cx = imageEl.x + imageEl.w / 2;
  const cy = imageEl.y + imageEl.h / 2;
  const rad = (imageEl.rot * Math.PI) / 180;

  const [worldCenterX, worldCenterY] = rotateAroundCenter(cx, cy, localCenterX, localCenterY, imageEl.w / 2, imageEl.h / 2, rad);

  const w = bbox.width * scaleX;
  const h = bbox.height * scaleY;

  return {
    x: worldCenterX - w / 2,
    y: worldCenterY - h / 2,
    w,
    h,
    rot: imageEl.rot,
  };
}
