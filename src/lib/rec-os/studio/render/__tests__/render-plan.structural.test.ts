/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/rec-os/studio/render/__tests__/render-plan.structural.test.ts
 * Prompt 01 (Studio Visual Engine) — buildStudioRenderPlan é puro
 * (sem I/O), então roda com o custom assert já usado em
 * business-context.structural.test.ts.
 */
import { buildStudioRenderPlan } from "../render-plan";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

function inBounds(rect: { x: number; y: number; width: number; height: number }, canvas: { width: number; height: number }): boolean {
  return rect.x >= 0 && rect.y >= 0 && rect.width > 0 && rect.height > 0 && rect.x + rect.width <= canvas.width && rect.y + rect.height <= canvas.height;
}

async function main() {
  console.log("[test] canvas por formato -- nunca distorce (proporção real do formato)");
  {
    const plan1 = buildStudioRenderPlan({ format: "feed_square", headline: "x", cta: null, protectedAssetRoles: [] });
    assert(plan1.canvas.width === plan1.canvas.height, "feed_square é quadrado");
    const plan2 = buildStudioRenderPlan({ format: "story_vertical", headline: "x", cta: null, protectedAssetRoles: [] });
    assert(plan2.canvas.height > plan2.canvas.width, "story_vertical é vertical (9:16)");
    const plan3 = buildStudioRenderPlan({ format: "carousel", headline: "x", cta: null, protectedAssetRoles: [] });
    assert(plan3.canvas.height > plan3.canvas.width && plan3.canvas.height < plan2.canvas.height, "carousel (4:5) é vertical mas menos que 9:16");
  }

  console.log("[test] toda geometria fica clampada dentro do canvas (x/y/width/height)");
  {
    for (const format of ["feed_square", "story_vertical", "carousel", "banner", "ad", "thumbnail", "outdoor", "presentation"] as const) {
      const plan = buildStudioRenderPlan({
        format, headline: "Headline bem longa para forçar múltiplas linhas de texto no layout", cta: "Chamada para ação",
        protectedAssetRoles: [{ assetId: "logo-1", role: "logo" }, { assetId: "prod-1", role: "product" }],
      });
      assert(inBounds(plan.focalArea, plan.canvas), `${format}: focalArea dentro do canvas`);
      for (const layer of plan.textLayers) assert(inBounds(layer.box, plan.canvas), `${format}: box da layer "${layer.role}" dentro do canvas`);
      for (const asset of plan.protectedAssets) assert(inBounds(asset.box, plan.canvas), `${format}: box do ativo protegido "${asset.role}" dentro do canvas`);
    }
  }

  console.log("[test] hierarquia -- logo sempre pequeno/discreto (canto), nunca dominante");
  {
    const plan = buildStudioRenderPlan({ format: "feed_square", headline: "x", cta: null, protectedAssetRoles: [{ assetId: "logo-1", role: "logo" }] });
    const logo = plan.protectedAssets.find((a) => a.role === "logo")!;
    assert(logo.box.width < plan.canvas.width * 0.2, "logo ocupa menos de 20% da largura do canvas");
    assert(logo.box.height < plan.canvas.height * 0.2, "logo ocupa menos de 20% da altura do canvas");
  }

  console.log("[test] CTA só existe quando cta não é null; sem CTA, headline ganha mais espaço");
  {
    const withCta = buildStudioRenderPlan({ format: "feed_square", headline: "x", cta: "Peça já", protectedAssetRoles: [] });
    const withoutCta = buildStudioRenderPlan({ format: "feed_square", headline: "x", cta: null, protectedAssetRoles: [] });
    assert(withCta.textLayers.some((l) => l.role === "cta"), "layer de CTA existe quando cta é fornecido");
    assert(!withoutCta.textLayers.some((l) => l.role === "cta"), "nenhuma layer de CTA quando cta é null");
    const headlineWith = withCta.textLayers.find((l) => l.role === "headline")!;
    const headlineWithout = withoutCta.textLayers.find((l) => l.role === "headline")!;
    assert(headlineWithout.box.height >= headlineWith.box.height, "headline sem CTA reserva altura igual ou maior");
  }

  console.log("[test] texto da headline/cta é preservado ao pé da letra no render plan");
  {
    const plan = buildStudioRenderPlan({ format: "feed_square", headline: "Aberto até 4h", cta: "Peça já", protectedAssetRoles: [] });
    assert(plan.textLayers.find((l) => l.role === "headline")?.text === "Aberto até 4h", "headline não é alterada pelo render plan");
    assert(plan.textLayers.find((l) => l.role === "cta")?.text === "Peça já", "cta não é alterada pelo render plan");
  }

  console.log("[test] formato desconhecido nunca quebra -- cai para feed_square (fallback seguro)");
  {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plan = buildStudioRenderPlan({ format: "unknown_format" as any, headline: "x", cta: null, protectedAssetRoles: [] });
    assert(plan.canvas.width === plan.canvas.height, "formato desconhecido usa o canvas default (feed_square)");
  }

  console.log("[test] [PROMPT 20] headlineZone TOP -- faixa de texto migra pro topo, logo migra pro canto oposto (nunca colide)");
  {
    const bottom = buildStudioRenderPlan({ format: "feed_square", headline: "x", cta: null, protectedAssetRoles: [{ assetId: "logo-1", role: "logo" }], headlineZone: "BOTTOM" });
    const top = buildStudioRenderPlan({ format: "feed_square", headline: "x", cta: null, protectedAssetRoles: [{ assetId: "logo-1", role: "logo" }], headlineZone: "TOP" });
    const headlineBottom = bottom.textLayers.find((l) => l.role === "headline")!;
    const headlineTop = top.textLayers.find((l) => l.role === "headline")!;
    const logoBottom = bottom.protectedAssets.find((a) => a.role === "logo")!;
    const logoTop = top.protectedAssets.find((a) => a.role === "logo")!;
    assert(headlineTop.box.y < bottom.canvas.height / 2, "headlineZone TOP -- faixa de texto fica na metade superior");
    assert(headlineBottom.box.y > bottom.canvas.height / 2, "headlineZone BOTTOM (default) -- faixa de texto fica na metade inferior");
    assert(logoTop.box.y > top.canvas.height / 2, "logo migra pro canto INFERIOR quando a headline ocupa o topo -- nunca colide com o texto");
    assert(logoBottom.box.y < bottom.canvas.height / 2, "logo fica no canto SUPERIOR quando a headline ocupa a base (comportamento histórico preservado)");
  }

  console.log("[test] [PROMPT 20 Fase 27] contrastTreatment -- SCRIM/PANEL/GRADIENT produzem tratamentos REALMENTE diferentes, nunca 'caixa preta genérica sempre'");
  {
    const scrim = buildStudioRenderPlan({ format: "feed_square", headline: "x", cta: null, protectedAssetRoles: [], contrastTreatment: "SCRIM" }).textLayers.find((l) => l.role === "headline")!;
    const panel = buildStudioRenderPlan({ format: "feed_square", headline: "x", cta: null, protectedAssetRoles: [], contrastTreatment: "PANEL" }).textLayers.find((l) => l.role === "headline")!;
    const gradient = buildStudioRenderPlan({ format: "feed_square", headline: "x", cta: null, protectedAssetRoles: [], contrastTreatment: "GRADIENT" }).textLayers.find((l) => l.role === "headline")!;
    assert(scrim.backdrop?.style === undefined, "SCRIM é preenchimento sólido (sem style -- compositor trata como solid)");
    assert(panel.backdrop!.opacity > scrim.backdrop!.opacity, "PANEL é mais opaco/compacto que SCRIM -- hug real ao texto, não a mesma faixa ampla");
    assert(gradient.backdrop?.style === "gradient", "GRADIENT usa um degradê real (compositor.ts), nunca um retângulo sólido");
    assert(!(scrim.backdrop!.radius === panel.backdrop!.radius && scrim.backdrop!.opacity === panel.backdrop!.opacity), "SCRIM e PANEL nunca ficam pixel-a-pixel idênticos");
  }

  console.log("[test] [PROMPT 20 Fase 28] ctaStyle -- PILL/LABEL/UNDERLINE/SMALL_BLOCK são tratamentos visuais distintos, Vidigal escolhe");
  {
    const withStyle = (style: "PILL" | "LABEL" | "UNDERLINE" | "SMALL_BLOCK") =>
      buildStudioRenderPlan({ format: "feed_square", headline: "x", cta: "Peça já", protectedAssetRoles: [], ctaStyle: style }).textLayers.find((l) => l.role === "cta")!;
    const pill = withStyle("PILL");
    const label = withStyle("LABEL");
    const underline = withStyle("UNDERLINE");
    const smallBlock = withStyle("SMALL_BLOCK");
    assert(pill.backdrop!.radius > label.backdrop!.radius, "PILL é totalmente arredondado, LABEL é um retângulo quase reto -- radius bem diferente");
    assert(underline.backdrop === undefined && underline.underline !== undefined, "UNDERLINE nunca tem backdrop -- só o traço (nunca os dois juntos)");
    assert(smallBlock.backdrop!.radius === 0, "SMALL_BLOCK é um bloco reto, sem arredondamento");
    assert(pill.maxFontSize <= (buildStudioRenderPlan({ format: "feed_square", headline: "x", cta: "Peça já", protectedAssetRoles: [] }).textLayers.find((l) => l.role === "headline")!.maxFontSize), "CTA nunca maior que a headline em nenhum estilo (hierarquia, Fase 28)");
  }

  console.log(`\n[result] ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
