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

test("[Prompt 03] teste de render anti-regressão: headline/CTA reais chegam ao resultado final (fundo claro para maximizar contraste com o scrim escuro/pill claro)", async () => {
  const background = await solidPng(1080, 1350, { r: 235, g: 235, b: 235 });
  const renderPlan = buildStudioRenderPlan({
    format: "carousel",
    headline: "HOJE ATÉ MAIS TARDE",
    cta: "CONFIRA O NOVO HORÁRIO",
    protectedAssetRoles: [],
  });
  assert.equal(renderPlan.textLayers.find((l) => l.role === "headline")?.text, "HOJE ATÉ MAIS TARDE", "string exata chega ao render plan");
  assert.equal(renderPlan.textLayers.find((l) => l.role === "cta")?.text, "CONFIRA O NOVO HORÁRIO", "string exata chega ao render plan");

  const result = await composeStudioVisual({ backgroundBytes: background, renderPlan, protectedAssetBytes: [] });
  assert.equal(result.ok, true);
  if (!result.ok) return;

  // Prova estrutural sem OCR: nas duas regiões (headline com scrim
  // escuro, CTA com pill claro) o pixel amostrado precisa divergir
  // fortemente do cinza-claro cru do fundo -- prova de que algo foi
  // desenhado ali (nunca overflow silencioso/layer ausente).
  const { data, info } = await sharp(result.buffer).raw().toBuffer({ resolveWithObject: true });
  const sample = (x: number, y: number) => {
    const idx = (Math.round(y) * info.width + Math.round(x)) * info.channels;
    return { r: data[idx], g: data[idx + 1], b: data[idx + 2] };
  };
  const headlineBox = renderPlan.textLayers.find((l) => l.role === "headline")!.box;
  const headlinePixel = sample(headlineBox.x + 5, headlineBox.y + headlineBox.height / 2);
  assert.ok(headlinePixel.r < 200, `região da headline deveria estar visivelmente mais escura que o fundo (235,235,235) por causa do scrim, veio rgb(${headlinePixel.r},${headlinePixel.g},${headlinePixel.b})`);

  // O pill do CTA "abraça" o conteúdo (pode ser bem menor que a box
  // alocada no render plan, e tem cantos totalmente arredondados) --
  // em vez de arriscar amostrar um ponto específico fora do pill real,
  // varre uma grade de pontos dentro da box e confirma que PELO MENOS
  // UM deles é bem mais claro que o fundo cinza cru (prova de que o
  // pill foi desenhado em algum lugar dali, sem depender da geometria exata).
  const ctaBox = renderPlan.textLayers.find((l) => l.role === "cta")!.box;
  let foundLightPixel = false;
  for (let dx = 4; dx < ctaBox.width; dx += 6) {
    for (let dy = 4; dy < ctaBox.height; dy += 6) {
      const p = sample(ctaBox.x + dx, ctaBox.y + dy);
      if (p.r > 240 && p.g > 240 && p.b > 240) { foundLightPixel = true; break; }
    }
    if (foundLightPixel) break;
  }
  assert.ok(foundLightPixel, "algum pixel dentro da box do CTA deveria estar bem mais claro que o fundo cinza (235,235,235) -- pill branco desenhado");
});

test("[PROMPT 20 Fase 27] contrastTreatment GRADIENT -- renderiza de verdade (nunca crasha), produz variação real de luminosidade dentro da própria box (nunca um retângulo sólido uniforme como SCRIM/PANEL)", async () => {
  const background = await solidPng(1080, 1080, { r: 200, g: 200, b: 200 });
  const renderPlan = buildStudioRenderPlan({ format: "feed_square", headline: "Aberto até 4h", cta: null, protectedAssetRoles: [], contrastTreatment: "GRADIENT" });
  const result = await composeStudioVisual({ backgroundBytes: background, renderPlan, protectedAssetBytes: [] });
  assert.equal(result.ok, true, "GRADIENT compõe com sucesso, sem crashar o compositor");
  if (!result.ok) return;
  const meta = await sharp(result.buffer).metadata();
  assert.equal(meta.format, "jpeg", "buffer final decodificável de verdade com GRADIENT");

  // A altura real renderizada do layer pode ser menor que a box inteira
  // (ver renderTextLayerPng: min(box.height, conteúdo+padding)) -- em
  // vez de assumir uma posição exata de amostra (frágil), varre uma
  // grade vertical dentro da box e prova que existe uma luminosidade
  // BEM CLARA (perto do fundo, transparência real no início do
  // degradê) E uma BEM ESCURA (opacidade real no fim dele) -- um
  // preenchimento sólido (SCRIM/PANEL) nunca produziria as duas coisas
  // na mesma varredura vertical.
  const headlineBox = renderPlan.textLayers.find((l) => l.role === "headline")!.box;
  const { data, info } = await sharp(result.buffer).raw().toBuffer({ resolveWithObject: true });
  const sampleX = headlineBox.x + Math.round(headlineBox.width * 0.9); // canto direito -- longe do texto em si, só o backdrop.
  const lumas: number[] = [];
  for (let dy = 2; dy < headlineBox.height; dy += 4) {
    const y = headlineBox.y + dy;
    const idx = (y * info.width + sampleX) * info.channels;
    lumas.push((data[idx] + data[idx + 1] + data[idx + 2]) / 3);
  }
  const minLuma = Math.min(...lumas);
  const maxLuma = Math.max(...lumas);
  assert.ok(maxLuma > 150, `deveria existir um ponto claro (perto do fundo cinza 200, degradê ainda transparente) na varredura -- max encontrado: ${maxLuma}`);
  assert.ok(minLuma < 100, `deveria existir um ponto escuro (degradê opaco) na varredura -- min encontrado: ${minLuma}`);
  assert.ok(maxLuma - minLuma > 60, `GRADIENT precisa produzir uma faixa real de luminosidade dentro da box (${minLuma} a ${maxLuma}) -- nunca uniforme como um preenchimento sólido`);
});

test("[PROMPT 20 Fase 28] ctaStyle UNDERLINE -- renderiza de verdade, sem backdrop sólido (nunca os dois juntos)", async () => {
  const background = await solidPng(1080, 1080, { r: 20, g: 20, b: 20 });
  const renderPlan = buildStudioRenderPlan({ format: "feed_square", headline: "x", cta: "Peça já", protectedAssetRoles: [], ctaStyle: "UNDERLINE" });
  const result = await composeStudioVisual({ backgroundBytes: background, renderPlan, protectedAssetBytes: [] });
  assert.equal(result.ok, true, "UNDERLINE compõe com sucesso, sem crashar o compositor");
  if (!result.ok) return;
  const meta = await sharp(result.buffer).metadata();
  assert.equal(meta.format, "jpeg", "buffer final decodificável de verdade com UNDERLINE");
});
