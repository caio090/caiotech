/**
 * Executar com: node --import ./.tmp/preload-ts-loader.mjs scripts/qa/studio-native-runtime-smoke.ts
 * (ou `npm run qa:studio-native` -- ver package.json)
 *
 * Prompt 07 (Studio Linux Runtime Fix) — PRODUCTION_INCIDENT_SHARP_LIBVIPS_MISSING.
 *
 * Prova, de verdade (nunca mockado), que o runtime nativo do Studio
 * funciona NO PROCESSO NODE ATUAL: Sharp abre e toca libvips de fato
 * (não só `require.resolve`), Resvg renderiza texto de verdade, e o
 * compositor REAL do Studio (render/compositor.ts) produz uma peça
 * final decodificável com o ativo protegido e o texto determinístico
 * presentes.
 *
 * Este é o script que a CI Linux (Prompt 07, Fase 15) executa depois
 * de `npm ci` num runner ubuntu-latest -- é isso que teria pego o
 * incidente de Production (ERR_DLOPEN_FAILED, libvips-cpp.so ausente)
 * ANTES do deploy, se já existisse.
 *
 * Nunca loga env/secrets -- só metadata técnica não sensível
 * (platform/arch/versões).
 */
import sharp from "sharp";
import { Resvg } from "@resvg/resvg-js";
import { composeStudioVisual } from "../../src/lib/rec-os/studio/render/compositor";
import { buildStudioRenderPlan } from "../../src/lib/rec-os/studio/render/render-plan";
import { ensureStudioFontFiles, STUDIO_FONT_FAMILY_DISPLAY } from "../../src/lib/rec-os/studio/render/fonts";

let failed = false;
function step(label: string, ok: boolean, detail?: string) {
  const mark = ok ? "PASS" : "FAIL";
  console.log(`[${mark}] ${label}${detail ? ` -- ${detail}` : ""}`);
  if (!ok) failed = true;
}
function fatal(label: string, error: unknown): never {
  console.error(`[FAIL] ${label} -- exceção inesperada:`, error instanceof Error ? error.message : error);
  process.exit(1);
}

async function solidPng(width: number, height: number, rgb: { r: number; g: number; b: number }): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: rgb } }).png().toBuffer();
}

async function main() {
  console.log("=== 0. Metadata do ambiente (nunca secrets) ===");
  console.log("process.platform:", process.platform);
  console.log("process.arch:", process.arch);
  console.log("node version:", process.version);

  console.log("");
  console.log("=== 1. Sharp: import real ===");
  step("sharp importado", typeof sharp === "function");

  console.log("");
  console.log("=== 2. Sharp: versões (toca o binding nativo) ===");
  let vipsVersion = "";
  let sharpVersion = "";
  try {
    vipsVersion = sharp.versions.vips ?? "";
    sharpVersion = sharp.versions.sharp ?? "";
    step("sharp.versions.vips presente", Boolean(vipsVersion), vipsVersion);
    step("sharp.versions.sharp presente", Boolean(sharpVersion), sharpVersion);
  } catch (error) {
    fatal("sharp.versions (binding nativo)", error);
  }

  console.log("");
  console.log("=== 3. Sharp: cria imagem, decodifica, resize, composite, output JPEG (toca libvips de verdade) ===");
  let jpegBuffer: Buffer;
  try {
    const base = await solidPng(400, 400, { r: 10, g: 10, b: 200 });
    const overlay = await solidPng(100, 100, { r: 255, g: 0, b: 0 });
    const resized = await sharp(base).resize(200, 200).toBuffer();
    const composed = await sharp(resized).composite([{ input: overlay, left: 20, top: 20 }]).jpeg({ quality: 85 }).toBuffer();
    jpegBuffer = composed;
    step("sharp: create -> resize -> composite -> jpeg", true, `${composed.length} bytes`);
  } catch (error) {
    fatal("operação real de imagem via Sharp (libvips)", error);
    return;
  }

  console.log("");
  console.log("=== 4. Sharp: decodifica o próprio output e confirma metadata (dlopen realmente funcionou) ===");
  try {
    const meta = await sharp(jpegBuffer).metadata();
    step("output decodificável", meta.format === "jpeg", `format=${meta.format} ${meta.width}x${meta.height}`);
    step("dimensões corretas", meta.width === 200 && meta.height === 200);
  } catch (error) {
    fatal("decodificação do próprio output (prova de que libvips-cpp carregou de verdade)", error);
  }

  console.log("");
  console.log("=== 5. Resvg: import real + render de texto ===");
  let resvgBuffer: Buffer;
  try {
    const fontFiles = ensureStudioFontFiles();
    const svg = `<svg width="300" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="white"/><text x="10" y="60" font-family="${STUDIO_FONT_FAMILY_DISPLAY}" font-size="40" fill="black">Studio OK</text></svg>`;
    const resvg = new Resvg(svg, { font: { fontFiles, loadSystemFonts: false, defaultFontFamily: STUDIO_FONT_FAMILY_DISPLAY } });
    resvgBuffer = resvg.render().asPng();
    step("resvg: render de SVG com fonte real produziu PNG", resvgBuffer.length > 0, `${resvgBuffer.length} bytes`);
  } catch (error) {
    fatal("render real via @resvg/resvg-js", error);
    return;
  }
  try {
    const meta = await sharp(resvgBuffer).metadata();
    step("output do resvg é um PNG decodificável", meta.format === "png");
  } catch (error) {
    fatal("decodificação do PNG produzido pelo resvg", error);
  }

  console.log("");
  console.log("=== 6. Compositor REAL do Studio: background + ativo protegido + headline + CTA ===");
  try {
    const background = await solidPng(1080, 1350, { r: 235, g: 235, b: 235 });
    const logo = await solidPng(200, 200, { r: 255, g: 0, b: 0 });
    const renderPlan = buildStudioRenderPlan({
      format: "carousel",
      headline: "HOJE ATÉ MAIS TARDE",
      cta: "CONFIRA O NOVO HORÁRIO",
      protectedAssetRoles: [{ assetId: "logo-1", role: "logo" }],
    });
    const result = await composeStudioVisual({
      backgroundBytes: background,
      renderPlan,
      protectedAssetBytes: [{ assetId: "logo-1", bytes: logo }],
    });
    if (!result.ok) {
      step("compositor real produziu resultado ok:true", false, result.error);
    } else {
      step("compositor real produziu resultado ok:true", true);
      step("mime correto", result.mime === "image/jpeg", result.mime);
      step("dimensões batem com o canvas do formato", result.width === renderPlan.canvas.width && result.height === renderPlan.canvas.height);

      const meta = await sharp(result.buffer).metadata();
      step("buffer final é decodificável de verdade", meta.format === "jpeg");

      // Prova de que o logo (ativo protegido) está presente -- amostra o
      // centro do slot dele e confirma que não é o fundo cinza cru.
      const logoBox = renderPlan.protectedAssets.find((a) => a.role === "logo")!.box;
      const { data, info } = await sharp(result.buffer).raw().toBuffer({ resolveWithObject: true });
      const cx = Math.round(logoBox.x + logoBox.width / 2);
      const cy = Math.round(logoBox.y + logoBox.height / 2);
      const idx = (cy * info.width + cx) * info.channels;
      const [r, g, b] = [data[idx], data[idx + 1], data[idx + 2]];
      step("ativo protegido (logo) presente no resultado final", r > 180 && g < 80 && b < 80, `rgb(${r},${g},${b})`);

      // Prova de que a headline foi desenhada -- região da headline
      // deveria estar mais escura que o fundo cru (235,235,235) por
      // causa do scrim.
      const headlineBox = renderPlan.textLayers.find((l) => l.role === "headline")!.box;
      const hx = headlineBox.x + 5;
      const hy = headlineBox.y + Math.round(headlineBox.height / 2);
      const hIdx = (hy * info.width + hx) * info.channels;
      step("headline layer renderizada (scrim visível)", data[hIdx] < 200, `r=${data[hIdx]}`);
    }
  } catch (error) {
    fatal("pipeline real do compositor do Studio", error);
  }

  console.log("");
  if (failed) {
    console.error("=== RESULTADO: FAIL -- runtime nativo do Studio NÃO está operacional neste ambiente ===");
    process.exit(1);
  }
  console.log("=== RESULTADO: PASS -- Sharp + libvips + Resvg + compositor do Studio operacionais de verdade ===");
}

void main();
