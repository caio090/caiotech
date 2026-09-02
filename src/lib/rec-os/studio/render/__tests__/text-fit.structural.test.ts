/**
 * Executar com: node --experimental-test-module-mocks --import ./.tmp/preload-ts-loader.mjs --test src/lib/rec-os/studio/render/__tests__/text-fit.structural.test.ts
 * Prompt 01 (Studio Visual Engine) — fitTextToBox mede de verdade via
 * resvg-js (fonte real embutida), nunca por heurística de largura
 * média. Garante a regra "nunca trunca/descarta palavras".
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fitTextToBox } from "../text-fit";
import { ensureStudioFontFiles, STUDIO_FONT_FAMILY_DISPLAY } from "../fonts";

const fontFiles = ensureStudioFontFiles();

function wordCount(lines: string[]): number {
  return lines.join(" ").trim().split(/\s+/).filter(Boolean).length;
}

test("texto curto cabe numa linha só no fontSize máximo", () => {
  const result = fitTextToBox({
    text: "Aberto até 4h", boxWidth: 900, boxHeight: 200,
    fontFamily: STUDIO_FONT_FAMILY_DISPLAY, fontWeight: 700, maxFontSize: 64, minFontSize: 20, fontFiles,
  });
  assert.equal(result.lines.length, 1);
  assert.equal(result.fontSize, 64);
  assert.equal(result.lines[0], "Aberto até 4h");
});

test("texto longo quebra em múltiplas linhas sem perder nenhuma palavra", () => {
  const text = "Combo especial hoje com desconto de trinta por cento em todos os lanches da casa até meia-noite";
  const result = fitTextToBox({
    text, boxWidth: 400, boxHeight: 500,
    fontFamily: STUDIO_FONT_FAMILY_DISPLAY, fontWeight: 700, maxFontSize: 40, minFontSize: 16, fontFiles,
  });
  assert.ok(result.lines.length > 1, "texto longo em box estreita quebra em mais de uma linha");
  assert.equal(wordCount(result.lines), text.split(/\s+/).length, "nenhuma palavra é descartada na quebra de linha");
});

test("box muito baixa força reduzir o fontSize até o mínimo, mas nunca descarta texto", () => {
  const text = "Uma headline razoavelmente longa para forçar redução de fonte";
  const result = fitTextToBox({
    text, boxWidth: 300, boxHeight: 40,
    fontFamily: STUDIO_FONT_FAMILY_DISPLAY, fontWeight: 700, maxFontSize: 80, minFontSize: 18, fontFiles,
  });
  assert.ok(result.fontSize <= 80 && result.fontSize >= 18, "fontSize final está dentro do intervalo min/max");
  assert.equal(wordCount(result.lines), text.split(/\s+/).length, "mesmo sem caber perfeitamente na altura, nenhuma palavra é descartada");
});

test("texto vazio devolve zero linhas (chamador decide não desenhar a layer)", () => {
  const result = fitTextToBox({
    text: "   ", boxWidth: 400, boxHeight: 200,
    fontFamily: STUDIO_FONT_FAMILY_DISPLAY, fontWeight: 700, maxFontSize: 40, minFontSize: 16, fontFiles,
  });
  assert.equal(result.lines.length, 0);
});

test("nunca lança mesmo com fontFiles vazio (degrada para fallback do resvg)", () => {
  assert.doesNotThrow(() => {
    fitTextToBox({ text: "Teste", boxWidth: 300, boxHeight: 100, fontFamily: "Fonte Inexistente", fontWeight: 400, maxFontSize: 30, minFontSize: 14, fontFiles: [] });
  });
});
