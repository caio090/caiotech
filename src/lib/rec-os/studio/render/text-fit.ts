/**
 * Sprint REC OS Studio Visual Engine (Prompt 01) — quebra de linha e
 * ajuste de tamanho de fonte MEDIDOS DE VERDADE via @resvg/resvg-js
 * (Resvg#getBBox), não por heurística de largura média de caractere.
 * Precisa disto porque não existe canvas 2D/DOM no servidor -- este é
 * o mesmo motor que depois renderiza a camada de texto final, então a
 * medição usa exatamente a mesma fonte/peso que o resultado real.
 *
 * Nunca trunca/descarta palavras do headline/CTA (Fase "Texto precisa
 * permanecer legível... não inventar palavras"): se mesmo no
 * minFontSize o texto não couber na altura da box, o resultado ainda
 * é devolvido (a box pode ficar visualmente mais alta que o previsto
 * -- decisão do chamador clampar contra o canvas).
 */
import { Resvg } from "@resvg/resvg-js";

export interface TextFitResult {
  fontSize: number;
  lines: string[];
  lineHeight: number;
}

const LINE_HEIGHT_FACTOR = 1.22;
const FONT_SIZE_STEP = 2;
const MAX_WORDS_SAFETY = 200;

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function measureLineWidth(text: string, fontSize: number, fontFamily: string, fontWeight: number, fontFiles: string[]): number {
  if (!text.trim()) return 0;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg"><text x="0" y="${fontSize}" font-family="${escapeXml(fontFamily)}" font-weight="${fontWeight}" font-size="${fontSize}">${escapeXml(text)}</text></svg>`;
  const resvg = new Resvg(svg, { font: { fontFiles, loadSystemFonts: false, defaultFontFamily: fontFamily } });
  const bbox = resvg.getBBox();
  return bbox ? bbox.width : text.length * fontSize * 0.55;
}

function wrapAtFontSize(text: string, maxWidth: number, fontSize: number, fontFamily: string, fontWeight: number, fontFiles: string[]): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean).slice(0, MAX_WORDS_SAFETY);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    const width = measureLineWidth(candidate, fontSize, fontFamily, fontWeight, fontFiles);
    if (width <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Encontra o maior fontSize (entre min/max) cujo texto quebrado cabe
 * na box informada; nunca lança, sempre devolve um resultado usável.
 */
export function fitTextToBox(params: {
  text: string;
  boxWidth: number;
  boxHeight: number;
  fontFamily: string;
  fontWeight: number;
  maxFontSize: number;
  minFontSize: number;
  fontFiles: string[];
}): TextFitResult {
  const { text, boxWidth, boxHeight, fontFamily, fontWeight, maxFontSize, minFontSize, fontFiles } = params;
  let best: TextFitResult | null = null;
  for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize -= FONT_SIZE_STEP) {
    const lines = wrapAtFontSize(text, boxWidth, fontSize, fontFamily, fontWeight, fontFiles);
    const lineHeight = Math.round(fontSize * LINE_HEIGHT_FACTOR);
    const totalHeight = lines.length * lineHeight;
    const result: TextFitResult = { fontSize, lines, lineHeight };
    best = result;
    if (totalHeight <= boxHeight) return result;
  }
  // Nem no tamanho mínimo coube na altura -- devolve o último cálculo
  // (minFontSize) mesmo assim, nunca descarta texto.
  return best ?? { fontSize: minFontSize, lines: wrapAtFontSize(text, boxWidth, minFontSize, fontFamily, fontWeight, fontFiles), lineHeight: Math.round(minFontSize * LINE_HEIGHT_FACTOR) };
}
