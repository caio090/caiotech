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

  console.log(`\n[result] ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
