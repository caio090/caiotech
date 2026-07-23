import type { GroupedTextRegion } from "./region-grouper";
import type { StyleEstimate } from "./types";

/** Same fallback family CanvasEditor itself defaults new text elements to — never a fabricated "original" font name. */
export const FALLBACK_FONT_FAMILY = "Inter, sans-serif";

export interface PixelSampler {
  /** Returns the average RGB over the given region of the ORIGINAL image, or null if it can't be read (e.g. tainted canvas). */
  sampleAverageColor(x: number, y: number, width: number, height: number): { r: number; g: number; b: number } | null;
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Fase 11 — never claims to recover the original font. Font family is
 * always the safe fallback; size comes from the detected region's own
 * height (a real, measured signal); weight is intentionally left "normal"
 * — there is no reliable signal for bold/regular at line-grouping
 * granularity, and guessing would be exactly the kind of fabricated
 * certainty this sprint must avoid. Alignment is a geometric heuristic
 * (how centered the line is relative to the source image), not a
 * confident recovery of the author's original choice.
 */
export function estimateTextStyle(region: GroupedTextRegion, sourceImageWidth: number, sampler: PixelSampler | null): StyleEstimate {
  const fontSizePx = Math.max(8, Math.round(region.boundingBox.height * 0.8));

  const sampled = sampler?.sampleAverageColor(region.boundingBox.x, region.boundingBox.y, region.boundingBox.width, region.boundingBox.height) ?? null;
  const color = sampled ? rgbToHex(sampled.r, sampled.g, sampled.b) : "#000000";

  const regionCenterX = region.boundingBox.x + region.boundingBox.width / 2;
  const imageCenterX = sourceImageWidth / 2;
  const offsetRatio = sourceImageWidth > 0 ? Math.abs(regionCenterX - imageCenterX) / sourceImageWidth : 1;
  const rightEdgeRatio = sourceImageWidth > 0 ? (region.boundingBox.x + region.boundingBox.width) / sourceImageWidth : 0;
  const textAlign: StyleEstimate["textAlign"] = offsetRatio < 0.06 ? "center" : rightEdgeRatio > 0.85 ? "right" : "left";

  return {
    fontSizePx,
    fontFamily: FALLBACK_FONT_FAMILY,
    fontWeight: "normal",
    italic: false,
    color,
    textAlign,
    isEstimate: true,
  };
}
