import type { LayerGroupingLimits } from "./types";

/** Raw word-level OCR output — shape kept provider-agnostic even though tesseract.js is the only provider today. */
export interface RawOcrWord {
  text: string;
  /** 0–100 from tesseract.js — converted to 0–1 by the caller before this module sees it. */
  confidence: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface GroupedTextRegion {
  text: string;
  confidence: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  wordCount: number;
}

export const DEFAULT_GROUPING_LIMITS: LayerGroupingLimits = {
  maxHorizontalGapPx: 40,
  maxVerticalGapPx: 12,
  minConfidence: 0,
  minHeightPx: 8,
  maxOverlapRatio: 0.5,
};

/**
 * Fase 7 — groups words into line-level regions instead of one layer per
 * letter/word, without merging text that belongs to visually separate
 * blocks (cards, columns). Deliberately stops at line-level grouping (not
 * full paragraph/block clustering): merging multiple lines into a single
 * paragraph risks exactly the failure mode the ticket warns against
 * ("não juntar textos de cards diferentes") when two unrelated text blocks
 * happen to sit close vertically. Each output region is one line — safe,
 * predictable, and still far coarser than one layer per word.
 */
export function groupWordsIntoLines(words: RawOcrWord[], limits: LayerGroupingLimits = DEFAULT_GROUPING_LIMITS): GroupedTextRegion[] {
  const usable = words.filter((w) => w.text.trim().length > 0 && (w.y1 - w.y0) >= limits.minHeightPx);
  if (usable.length === 0) return [];

  const sorted = [...usable].sort((a, b) => {
    const centerYA = (a.y0 + a.y1) / 2;
    const centerYB = (b.y0 + b.y1) / 2;
    if (Math.abs(centerYA - centerYB) > limits.maxVerticalGapPx) return centerYA - centerYB;
    return a.x0 - b.x0;
  });

  const lines: RawOcrWord[][] = [];
  for (const word of sorted) {
    const centerY = (word.y0 + word.y1) / 2;
    const line = lines.find((candidate) => {
      const last = candidate[candidate.length - 1];
      const lastCenterY = (last.y0 + last.y1) / 2;
      const verticalGap = Math.abs(centerY - lastCenterY);
      const horizontalGap = word.x0 - last.x1;
      return verticalGap <= limits.maxVerticalGapPx && horizontalGap <= limits.maxHorizontalGapPx && horizontalGap > -((last.x1 - last.x0) * limits.maxOverlapRatio);
    });
    if (line) line.push(word);
    else lines.push([word]);
  }

  return lines.map((line) => {
    const sortedLine = [...line].sort((a, b) => a.x0 - b.x0);
    const text = sortedLine.map((w) => w.text).join(" ").trim();
    const x0 = Math.min(...sortedLine.map((w) => w.x0));
    const y0 = Math.min(...sortedLine.map((w) => w.y0));
    const x1 = Math.max(...sortedLine.map((w) => w.x1));
    const y1 = Math.max(...sortedLine.map((w) => w.y1));
    const avgConfidence = sortedLine.reduce((sum, w) => sum + w.confidence, 0) / sortedLine.length;
    return {
      text,
      confidence: avgConfidence,
      boundingBox: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 },
      wordCount: sortedLine.length,
    };
  }).filter((region) => region.confidence >= limits.minConfidence && region.text.length > 0);
}
