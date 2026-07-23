import type { BackgroundCleanupResult, LayerBoundingBox } from "./types";

export interface RgbSample {
  r: number;
  g: number;
  b: number;
}

/**
 * Fase 13 — a background is only eligible for the experimental solid-color
 * cleanup when it is close to uniform. Above this, it's treated as a photo,
 * gradient, texture or illustration and left untouched (requires_inpainting)
 * — this sprint never attempts automatic cleanup on those.
 */
export const MAX_VARIANCE_FOR_SOLID_CLEANUP = 300;

export function computeAverageColor(samples: RgbSample[]): RgbSample {
  if (samples.length === 0) return { r: 0, g: 0, b: 0 };
  const sum = samples.reduce((acc, s) => ({ r: acc.r + s.r, g: acc.g + s.g, b: acc.b + s.b }), { r: 0, g: 0, b: 0 });
  return { r: sum.r / samples.length, g: sum.g / samples.length, b: sum.b / samples.length };
}

/** Mean squared distance from the average color — a simple, testable proxy for "is this background uniform enough". */
export function computeColorVariance(samples: RgbSample[]): number {
  if (samples.length === 0) return Number.POSITIVE_INFINITY;
  const avg = computeAverageColor(samples);
  const sumSq = samples.reduce((acc, s) => {
    const dr = s.r - avg.r, dg = s.g - avg.g, db = s.b - avg.b;
    return acc + (dr * dr + dg * dg + db * db) / 3;
  }, 0);
  return sumSq / samples.length;
}

function rgbToHex({ r, g, b }: RgbSample): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Pure decision logic — never touches the DOM, fully unit-testable. Actual
 * pixel compositing (generateSolidCleanupPatch below) is DOM-dependent and
 * can only run in a browser.
 */
export function evaluateBackgroundCleanup(ringSamples: RgbSample[]): BackgroundCleanupResult {
  if (ringSamples.length === 0) {
    return { mode: "requires_inpainting", eligible: false, reason: "Não foi possível amostrar pixels ao redor da região." };
  }
  const variance = computeColorVariance(ringSamples);
  if (variance > MAX_VARIANCE_FOR_SOLID_CLEANUP) {
    return {
      mode: "requires_inpainting",
      eligible: false,
      reason: "Fundo com variação de cor alta (foto, gradiente, textura ou ilustração) — exige reconstrução avançada não implementada nesta sprint.",
      variance,
    };
  }
  const avg = computeAverageColor(ringSamples);
  return {
    mode: "solid_background_cleanup",
    eligible: true,
    reason: "Fundo aproximadamente uniforme — limpeza sólida experimental disponível.",
    sampledColor: rgbToHex(avg),
    variance,
  };
}

/**
 * Fase 13 — generates a feathered solid-color patch covering the region
 * (plus padding) using a radial-gradient alpha mask, so the edges blend
 * instead of leaving a hard rectangle. Browser-only (uses document/canvas);
 * not unit-testable outside a DOM, unlike the eligibility logic above.
 */
export function generateSolidCleanupPatch(bbox: LayerBoundingBox, colorHex: string, paddingPx: number): string {
  const canvas = document.createElement("canvas");
  const width = bbox.width + paddingPx * 2;
  const height = bbox.height + paddingPx * 2;
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const innerR = Math.min(bbox.width, bbox.height) / 2;
  const outerR = Math.max(canvas.width, canvas.height) / 2;
  const gradient = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
  gradient.addColorStop(0, colorHex);
  gradient.addColorStop(1, `${colorHex}00`);

  ctx.fillStyle = colorHex;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/png");
}
