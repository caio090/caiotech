/**
 * Sprint REC OS Studio Visual Engine (Prompt 01) — construção do
 * StudioRenderPlan. Determinístico, sem chamada de IA extra (evita um
 * segundo custo pago por geração e o risco de coordenadas alucinadas
 * por um LLM) -- layout por template fixo, com toda geometria
 * clampada contra o canvas antes de sair daqui (Fase "Clamp
 * obrigatório: x/y/width/height/fontSize/opacity/rotation").
 *
 * Hierarquia aplicada (mesma ordem já documentada em instructions.ts):
 * 1º produto/cena -- o canvas inteiro é a cena gerada; um asset
 *    PROTECTED de papel "product" ganha um card dedicado numa faixa
 *    central, sem cortar/distorcer o original (sempre "contain").
 * 2º headline -- faixa TOP ou BOTTOM (Prompt 20: decidida pela Vidigal
 *    via headlineZone, nunca sempre fixa embaixo), com tratamento de
 *    contraste real (Prompt 20 Fase 27), sem depender de cor de marca
 *    que não temos garantia de conseguir interpretar aqui.
 * 3º CTA -- abaixo/ao lado da headline conforme o ctaStyle (Prompt 20
 *    Fase 28), nunca compete com ela.
 * 4º logo -- canto oposto à faixa de texto, pequeno/discreto.
 */
import type { DesignFormat } from "@/lib/providers/shared/types";
import { STUDIO_FONT_FAMILY_DISPLAY } from "./fonts";
import type {
  StudioCanvasSize,
  StudioProtectedAssetRole,
  StudioRenderPlan,
  StudioRenderRect,
  StudioSafeZone,
  StudioTextLayer,
} from "./types";
import type { VidigalContrastTreatment, VidigalCtaStyle, VidigalHeadlineZone } from "../skills/vidigal-png/output";

/** Mesma aproximação de proporção já usada em image-runtime.ts
 *  (FORMAT_TO_ASPECT_RATIO) -- nunca inventa uma proporção nova. */
const CANVAS_BY_FORMAT: Record<DesignFormat, StudioCanvasSize> = {
  feed_square: { width: 1080, height: 1080 },
  story_vertical: { width: 1080, height: 1920 },
  carousel: { width: 1080, height: 1350 },
  banner: { width: 1080, height: 565 },
  ad: { width: 1080, height: 565 },
  thumbnail: { width: 1080, height: 608 },
  outdoor: { width: 1080, height: 608 },
  presentation: { width: 1080, height: 608 },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampRect(rect: StudioRenderRect, canvas: StudioCanvasSize): StudioRenderRect {
  const width = clamp(rect.width, 1, canvas.width);
  const height = clamp(rect.height, 1, canvas.height);
  const x = clamp(rect.x, 0, canvas.width - width);
  const y = clamp(rect.y, 0, canvas.height - height);
  return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
}

export interface BuildRenderPlanInput {
  format: DesignFormat;
  headline: string;
  cta: string | null;
  protectedAssetRoles: { assetId: string; role: StudioProtectedAssetRole }[];
  /** Prompt 20 -- decididos pela Vidigal (VisualCompositionPlan). Ausentes = comportamento anterior ao Prompt 20 (BOTTOM/SCRIM/PILL), nunca quebra chamadores antigos. */
  headlineZone?: VidigalHeadlineZone;
  contrastTreatment?: VidigalContrastTreatment;
  ctaStyle?: VidigalCtaStyle;
}

/** Prompt 20 (Fase 27) -- backdrop real por tratamento, nunca "caixa preta genérica sempre". PANEL é mais compacto/opaco (hug ao texto); GRADIENT usa fade real (ver compositor.ts); SCRIM é a faixa ampla de sempre. */
function buildHeadlineBackdrop(treatment: VidigalContrastTreatment): NonNullable<StudioTextLayer["backdrop"]> {
  switch (treatment) {
    case "PANEL":
      return { color: "#000000", opacity: 0.78, radius: 16, paddingX: 20, paddingY: 16 };
    case "GRADIENT":
      return { color: "#000000", opacity: 0.75, radius: 0, paddingX: 24, paddingY: 18, style: "gradient" };
    case "SCRIM":
    default:
      return { color: "#000000", opacity: 0.55, radius: 20, paddingX: 24, paddingY: 18 };
  }
}

export function buildStudioRenderPlan(input: BuildRenderPlanInput): StudioRenderPlan {
  const canvas = CANVAS_BY_FORMAT[input.format] ?? CANVAS_BY_FORMAT.feed_square;
  const renderWarnings: string[] = [];
  const headlineZone: VidigalHeadlineZone = input.headlineZone ?? "BOTTOM";
  const contrastTreatment: VidigalContrastTreatment = input.contrastTreatment ?? "SCRIM";
  const ctaStyle: VidigalCtaStyle = input.ctaStyle ?? "PILL";

  const safeMargin = Math.round(clamp(Math.min(canvas.width, canvas.height) * 0.05, 24, 64));
  const safeZone: StudioSafeZone = { top: safeMargin, right: safeMargin, bottom: safeMargin, left: safeMargin };

  const focalArea = clampRect({ x: 0, y: 0, width: canvas.width, height: canvas.height }, canvas);

  // Faixa de texto -- TOP (logo abaixo da margem de segurança) ou
  // BOTTOM (padrão histórico). Logo migra pro canto OPOSTO à faixa de
  // texto -- nunca colide com ela (Prompt 20 Fase 20: "não colocar
  // produto/rosto atrás da headline" vale igualmente pro logo).
  const textBandHeight = Math.round(canvas.height * (input.cta ? 0.3 : 0.22));
  const textBandTop = headlineZone === "TOP" ? safeMargin : canvas.height - safeMargin - textBandHeight;
  const textBandWidth = canvas.width - safeMargin * 2;

  const logoRole = input.protectedAssetRoles.find((a) => a.role === "logo");
  const logoSize = Math.round(clamp(Math.min(canvas.width, canvas.height) * 0.11, 56, 160));
  const logoTop = headlineZone === "TOP" ? canvas.height - safeMargin - logoSize : safeMargin;
  const protectedAssets: StudioRenderPlan["protectedAssets"] = [];
  if (logoRole) {
    protectedAssets.push({
      assetId: logoRole.assetId,
      role: "logo",
      box: clampRect({ x: canvas.width - safeMargin - logoSize, y: logoTop, width: logoSize, height: logoSize }, canvas),
    });
  }

  // Produto protegido -- card central, sempre no espaço ENTRE a faixa
  // de texto e o logo, qualquer que seja a zona escolhida.
  const productRole = input.protectedAssetRoles.find((a) => a.role === "product");
  if (productRole) {
    const productTop = headlineZone === "TOP"
      ? textBandTop + textBandHeight + safeMargin
      : safeMargin + (logoRole ? logoSize + safeMargin : 0);
    const productBottom = headlineZone === "TOP"
      ? logoTop - safeMargin
      : textBandTop - safeMargin;
    if (productBottom - productTop > 80) {
      protectedAssets.push({
        assetId: productRole.assetId,
        role: "product",
        box: clampRect({ x: safeMargin, y: productTop, width: textBandWidth, height: productBottom - productTop }, canvas),
      });
    } else {
      renderWarnings.push("Espaço vertical insuficiente neste formato para o card do produto protegido sem sobrepor a faixa de texto -- produto omitido nesta peça.");
    }
  }

  const textLayers: StudioTextLayer[] = [];
  const headlineHeight = Math.round(textBandHeight * (input.cta ? 0.62 : 1));
  const headlineBox = clampRect({ x: safeMargin, y: textBandTop, width: textBandWidth, height: headlineHeight }, canvas);
  const headlineMax = Math.round(clamp(headlineBox.height * 0.42, 22, 96));
  textLayers.push({
    role: "headline",
    text: input.headline,
    box: headlineBox,
    fontFamily: STUDIO_FONT_FAMILY_DISPLAY,
    fontWeight: 700,
    maxFontSize: headlineMax,
    minFontSize: Math.min(20, headlineMax),
    color: "#FFFFFF",
    align: "left",
    backdrop: buildHeadlineBackdrop(contrastTreatment),
  });

  if (input.cta) {
    const gap = Math.round(safeMargin * 0.4);
    const ctaTop = headlineBox.y + headlineBox.height + gap;
    const ctaHeight = Math.max(40, canvas.height - safeMargin - ctaTop);
    const ctaWidth = Math.min(textBandWidth, Math.round(canvas.width * (ctaStyle === "SMALL_BLOCK" ? 0.4 : 0.55)));
    const ctaBox = clampRect({ x: safeMargin, y: ctaTop, width: ctaWidth, height: ctaHeight }, canvas);
    // Prompt 20 (Fase 28) -- CTA nunca compete com a headline: teto
    // proporcionalmente menor que o da headline em todos os estilos, e
    // cada estilo tem um tratamento visual realmente distinto (nunca
    // sempre pill), Vidigal escolhe via ctaStyle.
    const ctaMax = Math.round(clamp(ctaBox.height * 0.5, 16, 44));
    textLayers.push({
      role: "cta",
      text: input.cta,
      box: ctaBox,
      fontFamily: STUDIO_FONT_FAMILY_DISPLAY,
      fontWeight: 600,
      maxFontSize: ctaMax,
      minFontSize: Math.min(16, ctaMax),
      color: ctaStyle === "UNDERLINE" ? "#FFFFFF" : "#111111",
      align: ctaStyle === "UNDERLINE" ? "left" : "center",
      backdrop: ctaStyle === "PILL"
        ? { color: "#FFFFFF", opacity: 0.95, radius: ctaBox.height / 2, paddingX: 20, paddingY: 10 }
        : ctaStyle === "LABEL"
        ? { color: "#FFFFFF", opacity: 0.95, radius: 4, paddingX: 16, paddingY: 8 }
        : ctaStyle === "SMALL_BLOCK"
        ? { color: "#FFFFFF", opacity: 1, radius: 0, paddingX: 14, paddingY: 8 }
        : undefined, // UNDERLINE -- sem backdrop, ver `underline` abaixo.
      underline: ctaStyle === "UNDERLINE" ? { color: "#FFFFFF", thickness: 2 } : undefined,
    });
  }

  return { format: input.format, canvas, safeZone, focalArea, textLayers, protectedAssets, renderWarnings };
}
