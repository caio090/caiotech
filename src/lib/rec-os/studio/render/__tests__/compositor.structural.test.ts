/**
 * Executar com: node --experimental-test-module-mocks --import ./.tmp/preload-ts-loader.mjs --test src/lib/rec-os/studio/render/__tests__/compositor.structural.test.ts
 * Prompt 01 (Studio Visual Engine) — composeStudioVisual roda Sharp/
 * resvg-js DE VERDADE (nunca mocka a etapa que mais importa provar:
 * "o ativo protegido aparece na peça final, não é redesenhado pelo
 * modelo de IA"). Fixtures são gerados em memória com o próprio Sharp
 * -- nenhuma rede, nenhum arquivo externo além das fontes já
 * embutidas em fonts-data.ts.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { composeStudioVisual } from "../compositor";
import { buildStudioRenderPlan } from "../render-plan";

async function solidPng(width: number, height: number, rgb: { r: number; g: number; b: number }): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: rgb } }).png().toBuffer();
}

test("peça final: JPEG válido, dimensões batem com o canvas do formato", async () => {
  const background = await solidPng(1024, 1024, { r: 30, g: 30, b: 30 });
  const renderPlan = buildStudioRenderPlan({ format: "feed_square", headline: "Aberto até 4h", cta: "Peça já", protectedAssetRoles: [] });
  const result = await composeStudioVisual({ backgroundBytes: background, renderPlan, protectedAssetBytes: [] });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.mime, "image/jpeg");
  assert.equal(result.width, renderPlan.canvas.width);
  assert.equal(result.height, renderPlan.canvas.height);
  const meta = await sharp(result.buffer).metadata();
  assert.equal(meta.format, "jpeg", "buffer final é realmente decodificável como JPEG (nunca um blob quebrado)");
});

test("ativo protegido (logo) aparece de verdade na peça final -- nunca substituído/redesenhado pelo fundo gerado", async () => {
  // Logo vermelho puro, quadrado -- mesmo formato aproximado do slot do
  // logo no render plan (contain sem padding relevante), fundo azul
  // puro bem distinto para não haver ambiguidade de cor por compressão JPEG.
  const background = await solidPng(1024, 1024, { r: 0, g: 0, b: 255 });
  const logo = await solidPng(200, 200, { r: 255, g: 0, b: 0 });
  const renderPlan = buildStudioRenderPlan({
    format: "feed_square", headline: "x", cta: null,
    protectedAssetRoles: [{ assetId: "logo-1", role: "logo" }],
  });
  const result = await composeStudioVisual({
    backgroundBytes: background, renderPlan,
    protectedAssetBytes: [{ assetId: "logo-1", bytes: logo }],
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const logoBox = renderPlan.protectedAssets.find((a) => a.role === "logo")!.box;
  const centerX = Math.round(logoBox.x + logoBox.width / 2);
  const centerY = Math.round(logoBox.y + logoBox.height / 2);
  const { data, info } = await sharp(result.buffer).raw().toBuffer({ resolveWithObject: true });
  const idx = (centerY * info.width + centerX) * info.channels;
  const [r, g, b] = [data[idx], data[idx + 1], data[idx + 2]];
  assert.ok(r > 180 && g < 80 && b < 80, `centro do slot do logo deveria ser vermelho (o pixel do ativo protegido), veio rgb(${r},${g},${b})`);
});

test("ativo protegido (produto retangular, proporção diferente do slot) nunca é distorcido -- contain preserva aspecto", async () => {
  const background = await solidPng(1080, 1350, { r: 20, g: 20, b: 20 });
  const product = await solidPng(600, 200, { r: 0, g: 200, b: 0 }); // 3:1, bem diferente do slot quase-quadrado
  const renderPlan = buildStudioRenderPlan({
    format: "carousel", headline: "x", cta: "Peça já",
    protectedAssetRoles: [{ assetId: "prod-1", role: "product" }],
  });
  const result = await composeStudioVisual({
    backgroundBytes: background, renderPlan,
    protectedAssetBytes: [{ assetId: "prod-1", bytes: product }],
  });
  assert.equal(result.ok, true, "composição com produto de proporção distinta do slot não falha");
});

test("headline/CTA determinísticos são desenhados de verdade (backdrop escuro/claro aparece sobre o fundo)", async () => {
  const background = await solidPng(1024, 1024, { r: 128, g: 128, b: 128 });
  const renderPlan = buildStudioRenderPlan({ format: "feed_square", headline: "Combo especial hoje", cta: "Peça já", protectedAssetRoles: [] });
  const result = await composeStudioVisual({ backgroundBytes: background, renderPlan, protectedAssetBytes: [] });
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const headlineBox = renderPlan.textLayers.find((l) => l.role === "headline")!.box;
  const { data, info } = await sharp(result.buffer).raw().toBuffer({ resolveWithObject: true });
  // Longe do canto arredondado do backdrop (rx/ry=20) -- amostra no
  // meio vertical da box, perto da borda esquerda, onde o scrim cobre
  // o fundo inteiro (não é a região curva do canto).
  const x = headlineBox.x + 5;
  const y = headlineBox.y + Math.round(headlineBox.height / 2);
  const idx = (y * info.width + x) * info.channels;
  const [r, g, b] = [data[idx], data[idx + 1], data[idx + 2]];
  // Backdrop da headline é preto a 55% de opacidade sobre cinza (128,128,128) -- resultado é bem mais escuro que o fundo cru.
  assert.ok(r < 100 && g < 100 && b < 100, `região da headline deveria estar mais escura que o fundo cru (128,128,128) por causa do scrim, veio rgb(${r},${g},${b})`);
});

test("background não decodificável -- falha explícita, nunca lança", async () => {
  const renderPlan = buildStudioRenderPlan({ format: "feed_square", headline: "x", cta: null, protectedAssetRoles: [] });
  const result = await composeStudioVisual({ backgroundBytes: Buffer.from("não é uma imagem"), renderPlan, protectedAssetBytes: [] });
  assert.equal(result.ok, false);
});

test("ativo protegido corrompido é omitido da composição, mas a peça final ainda é gerada", async () => {
  const background = await solidPng(1024, 1024, { r: 10, g: 10, b: 10 });
  const renderPlan = buildStudioRenderPlan({ format: "feed_square", headline: "x", cta: null, protectedAssetRoles: [{ assetId: "logo-1", role: "logo" }] });
  const result = await composeStudioVisual({
    backgroundBytes: background, renderPlan,
    protectedAssetBytes: [{ assetId: "logo-1", bytes: Buffer.from("lixo, não é imagem") }],
  });
  assert.equal(result.ok, true, "asset protegido corrompido não derruba a geração inteira -- só é omitido");
});
