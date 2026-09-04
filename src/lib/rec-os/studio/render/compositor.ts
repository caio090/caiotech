/**
 * Sprint REC OS Studio Visual Engine (Prompt 01) — compositor
 * determinístico server-side (Sharp + overlays SVG via resvg-js).
 * Único arquivo do domínio Studio que importa `sharp`/`@resvg/resvg-js`.
 *
 * Responsabilidade: montar a peça final a partir de
 * (a) o background gerado pelo provider de IA (só cenário/entorno,
 *     nunca o ativo protegido -- ver image-runtime.ts),
 * (b) os ativos PROTEGIDOS (logo/produto) -- pixels originais nunca
 *     redesenhados, só reposicionados ("contain", sem crop/distorção),
 * (c) headline/CTA como texto determinístico (nunca depende do
 *     provider de imagem escrever a palavra certa).
 *
 * Nunca lança -- toda falha vira { ok: false, error }.
 */
import sharp from "sharp";
import type { Metadata, OverlayOptions } from "sharp";
import { Resvg } from "@resvg/resvg-js";
import { ensureStudioFontFiles } from "./fonts";
import { fitTextToBox } from "./text-fit";
import type { StudioRenderPlan, StudioTextLayer } from "./types";

// Buffer bruto (antes de base64) -- o transporte final é JSON com uma
// data: URL, que soma ~33% de overhead; mantido bem abaixo de limites
// comuns de payload de resposta em functions serverless.
const MAX_OUTPUT_BYTES = 4_000_000;
const JPEG_QUALITY = 85;

export interface ProtectedAssetBytes {
  assetId: string;
  bytes: Buffer;
}

export interface ComposeInput {
  backgroundBytes: Buffer;
  renderPlan: StudioRenderPlan;
  protectedAssetBytes: ProtectedAssetBytes[];
}

export type ComposeResult =
  | { ok: true; buffer: Buffer; width: number; height: number; mime: string }
  | { ok: false; error: string };

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function renderTextLayerPng(layer: StudioTextLayer, fontFiles: string[]): { buffer: Buffer; width: number; height: number } | null {
  const backdrop = layer.backdrop;
  const padX = backdrop?.paddingX ?? 16;
  const padY = backdrop?.paddingY ?? 12;
  const availableWidth = Math.max(10, layer.box.width - padX * 2);
  const availableHeight = Math.max(10, layer.box.height - padY * 2);

  const fit = fitTextToBox({
    text: layer.text,
    boxWidth: availableWidth,
    boxHeight: availableHeight,
    fontFamily: layer.fontFamily,
    fontWeight: layer.fontWeight,
    maxFontSize: layer.maxFontSize,
    minFontSize: layer.minFontSize,
    fontFiles,
  });
  if (fit.lines.length === 0) return null;

  const contentHeight = fit.lines.length * fit.lineHeight;
  const width = layer.box.width;
  const height = Math.min(layer.box.height, contentHeight + padY * 2) || layer.box.height;

  const tspans = fit.lines
    .map((line, i) => {
      const y = padY + fit.fontSize * 0.85 + i * fit.lineHeight;
      const x = layer.align === "center" ? width / 2 : layer.align === "right" ? width - padX : padX;
      const anchor = layer.align === "center" ? "middle" : layer.align === "right" ? "end" : "start";
      return `<text x="${x}" y="${y}" font-family="${escapeXml(layer.fontFamily)}" font-weight="${layer.fontWeight}" font-size="${fit.fontSize}" fill="${layer.color}" text-anchor="${anchor}">${escapeXml(line)}</text>`;
    })
    .join("");

  // Prompt 20 (Fase 27) -- SCRIM/PANEL continuam um retângulo sólido
  // (radius/opacity/padding decididos em render-plan.ts já dão a
  // variação visual); GRADIENT nunca é "caixa preta genérica" -- é um
  // degradê real transparente -> cor, direção coerente com a zona do
  // texto (topo->baixo quando a headline fica no topo, baixo->topo
  // quando fica embaixo -- aproximado aqui sempre por y1=0/y2=1, o
  // suficiente pro efeito real de fade sobre a cena).
  let defs = "";
  let backdropRect = "";
  if (backdrop) {
    if (backdrop.style === "gradient") {
      defs = `<defs><linearGradient id="textBackdropGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${backdrop.color}" stop-opacity="0" /><stop offset="100%" stop-color="${backdrop.color}" stop-opacity="${backdrop.opacity}" /></linearGradient></defs>`;
      backdropRect = `<rect x="0" y="0" width="${width}" height="${height}" fill="url(#textBackdropGradient)" />`;
    } else {
      backdropRect = `<rect x="0" y="0" width="${width}" height="${height}" rx="${backdrop.radius}" ry="${backdrop.radius}" fill="${backdrop.color}" fill-opacity="${backdrop.opacity}" />`;
    }
  }

  // Prompt 20 (Fase 28) -- ctaStyle UNDERLINE: um traço sob a última
  // linha de texto, nunca junto de um backdrop (mutuamente exclusivos
  // em render-plan.ts).
  const underlineEl = layer.underline
    ? (() => {
        const lastLineY = padY + fit.fontSize * 0.85 + (fit.lines.length - 1) * fit.lineHeight;
        const underlineY = lastLineY + fit.fontSize * 0.18;
        const x1 = layer.align === "center" ? width / 2 - availableWidth / 2 : layer.align === "right" ? padX : padX;
        const x2 = layer.align === "center" ? width / 2 + availableWidth / 2 : width - padX;
        return `<line x1="${x1}" y1="${underlineY}" x2="${x2}" y2="${underlineY}" stroke="${layer.underline.color}" stroke-width="${layer.underline.thickness}" />`;
      })()
    : "";

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${defs}${backdropRect}${tspans}${underlineEl}</svg>`;
  const resvg = new Resvg(svg, {
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: layer.fontFamily },
    background: "rgba(0,0,0,0)",
  });
  const rendered = resvg.render();
  return { buffer: rendered.asPng(), width: rendered.width, height: rendered.height };
}

export async function composeStudioVisual(input: ComposeInput): Promise<ComposeResult> {
  const { backgroundBytes, renderPlan, protectedAssetBytes } = input;
  const { canvas } = renderPlan;

  let backgroundMeta: Metadata;
  try {
    backgroundMeta = await sharp(backgroundBytes).metadata();
    if (!backgroundMeta.width || !backgroundMeta.height) throw new Error("dimensões inválidas");
  } catch {
    return { ok: false, error: "O background gerado não pôde ser decodificado como imagem válida." };
  }

  const composites: OverlayOptions[] = [];
  const fontFiles = ensureStudioFontFiles();

  for (const assetLayer of renderPlan.protectedAssets) {
    const found = protectedAssetBytes.find((a) => a.assetId === assetLayer.assetId);
    if (!found) continue;
    try {
      const resized = await sharp(found.bytes)
        .resize(assetLayer.box.width, assetLayer.box.height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      composites.push({ input: resized, left: assetLayer.box.x, top: assetLayer.box.y });
    } catch {
      // Ativo protegido não decodificável -- omitido desta camada, nunca derruba a geração inteira.
      continue;
    }
  }

  for (const textLayer of renderPlan.textLayers) {
    if (!textLayer.text.trim()) continue;
    const rendered = renderTextLayerPng(textLayer, fontFiles);
    if (!rendered) continue;
    composites.push({ input: rendered.buffer, left: textLayer.box.x, top: textLayer.box.y });
  }

  try {
    const base = await sharp(backgroundBytes)
      .resize(canvas.width, canvas.height, { fit: "cover" })
      .toBuffer();
    const finalBuffer = await sharp(base).composite(composites).jpeg({ quality: JPEG_QUALITY }).toBuffer();
    if (finalBuffer.length > MAX_OUTPUT_BYTES) {
      return { ok: false, error: "A imagem final excedeu o tamanho máximo permitido para transporte." };
    }
    const finalMeta = await sharp(finalBuffer).metadata();
    return {
      ok: true,
      buffer: finalBuffer,
      width: finalMeta.width ?? canvas.width,
      height: finalMeta.height ?? canvas.height,
      mime: "image/jpeg",
    };
  } catch (error) {
    console.warn("[studio/compositor] falha ao compor imagem final", { message: error instanceof Error ? error.message : "unknown" });
    return { ok: false, error: "Não foi possível compor a imagem final." };
  }
}
