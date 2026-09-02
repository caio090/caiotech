/**
 * Executar com: node --experimental-test-module-mocks --import ./.tmp/preload-ts-loader.mjs --test src/lib/rec-os/studio/__tests__/create-studio-visual.structural.test.ts
 * Sprint REC OS Studio Image Generation MVP V0.3 / Prompt 01 (Studio
 * Visual Engine) — mocka ./execute, ./business-context,
 * ./image/image-runtime, ./render/reference-analysis,
 * ./render/asset-fetch e ./render/compositor para provar a
 * orquestração completa (texto -> referências -> background ->
 * render plan -> composição) sem tocar Supabase/OpenAI/Sharp de
 * verdade. render-plan.ts e data-url.ts (puros, sem I/O) rodam de
 * verdade.
 */
import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";

const FAKE_TEXT_OUTPUT = {
  briefReading: "x", creativeDirection: "x", conceptualBasis: "x", visualStructure: "x",
  visualGuidelines: "x", generationPrompt: "cenário gerado a partir do briefing", variations: [], adaptations: [],
  suggestedHeadline: "Headline sugerida", suggestedCta: null as string | null,
};

const FAKE_COMPOSE_RESULT = { ok: true as const, buffer: Buffer.from("fake-final-jpeg"), width: 1080, height: 1080, mime: "image/jpeg" };

async function loadOrchestratorWith(t: TestContext, opts: {
  textStatus?: string;
  businessContext?: unknown;
  imageResult?: unknown;
  composeResult?: unknown;
  onBuildBusinessContext?: (companyId: unknown) => void;
  onCompose?: (input: unknown) => void;
}) {
  let executeCalls = 0;
  let lastExecuteRequest: unknown = null;
  let imageCalls = 0;
  let lastImageRequest: unknown = null;

  const context = opts.businessContext ?? { company: null, identity: null, brand: null, market: null, products: null };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (t.mock.module as any)("../execute.ts", {
    exports: {
      executeStudioSkill: async (request: unknown) => {
        executeCalls++;
        lastExecuteRequest = request;
        if (opts.textStatus && opts.textStatus !== "completed") {
          return { skillId: "vidigal_png", skillVersion: "2.0.0", runtime: "openai_responses_api", status: opts.textStatus, output: null, warnings: [], error: { code: "STUDIO_AI_PROVIDER_UNAVAILABLE", message: "x" }, generatedAt: new Date().toISOString() };
        }
        return { skillId: "vidigal_png", skillVersion: "2.0.0", runtime: "openai_responses_api", status: "completed", output: FAKE_TEXT_OUTPUT, warnings: [], generatedAt: new Date().toISOString() };
      },
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (t.mock.module as any)("../business-context.ts", {
    exports: {
      buildStudioCreativeBusinessContext: async (_db: unknown, companyId: unknown) => {
        opts.onBuildBusinessContext?.(companyId);
        return context;
      },
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (t.mock.module as any)("../image/image-runtime.ts", {
    exports: {
      generateStudioImage: async (request: unknown) => {
        imageCalls++;
        lastImageRequest = request;
        return opts.imageResult ?? { status: "completed", providerId: "fake", image: { url: "data:image/png;base64,ZmFrZQ==", width: 1024, height: 1024 }, warnings: [], generatedAt: new Date().toISOString() };
      },
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (t.mock.module as any)("../render/reference-analysis.ts", {
    exports: { analyzeStudioReferences: async () => ({ rules: [], warnings: [] }) },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (t.mock.module as any)("../render/asset-fetch.ts", {
    exports: { fetchAssetSafely: async () => ({ ok: true, bytes: Buffer.from("fake-logo-bytes"), contentType: "image/png" }) },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (t.mock.module as any)("../render/compositor.ts", {
    exports: {
      composeStudioVisual: async (input: unknown) => {
        opts.onCompose?.(input);
        return opts.composeResult ?? FAKE_COMPOSE_RESULT;
      },
    },
  });

  const mod = await import(`../create-studio-visual.ts?t=${Date.now()}-${Math.random()}`);
  return {
    createStudioVisual: mod.createStudioVisual,
    getExecuteCalls: () => executeCalls, getLastExecuteRequest: () => lastExecuteRequest,
    getImageCalls: () => imageCalls, getLastImageRequest: () => lastImageRequest,
  };
}

test("[11/12] pipeline completo: texto alimenta o generationPrompt do image runtime, resultado final é a peça composta", async (t) => {
  const { createStudioVisual, getImageCalls, getLastImageRequest } = await loadOrchestratorWith(t, {});
  const result = await createStudioVisual({
    skillId: "vidigal_png", input: { freeformBrief: "teste", format: "feed_square" },
    companyId: null, companyName: null, assets: { references: [], protectedAssets: [] },
    db: {} as never,
  });
  assert.equal(result.text.status, "completed");
  assert.equal(getImageCalls(), 1, "image runtime (background) é chamado exatamente uma vez após o texto completar");
  const imgReq = getLastImageRequest() as { generationPrompt: string };
  assert.equal(imgReq.generationPrompt, FAKE_TEXT_OUTPUT.generationPrompt, "generationPrompt do texto chega intacto ao image runtime");
  assert.equal(result.image?.status, "completed");
  assert.equal(result.image?.image?.url, `data:${FAKE_COMPOSE_RESULT.mime};base64,${FAKE_COMPOSE_RESULT.buffer.toString("base64")}`, "a URL final devolvida é a peça COMPOSTA, nunca o background cru do provider");
  assert.equal(result.image?.renderPlan?.format, "feed_square");
});

test("texto não completou -- background e composição NUNCA são tentados", async (t) => {
  const { createStudioVisual, getImageCalls } = await loadOrchestratorWith(t, { textStatus: "failed" });
  const result = await createStudioVisual({
    skillId: "vidigal_png", input: { freeformBrief: "teste" },
    companyId: null, companyName: null, assets: { references: [], protectedAssets: [] },
    db: {} as never,
  });
  assert.equal(result.text.status, "failed");
  assert.equal(result.image, null, "image é null -- nunca tenta gerar/compor sobre uma direção que falhou");
  assert.equal(getImageCalls(), 0);
});

test("[16] logo oficial da Company é automaticamente adicionado como protected asset (role logo) e chega ao compositor", async (t) => {
  const businessContext = { company: { id: "c1", name: "Empresa A" }, identity: { brandName: "A", logoUrl: "https://cdn.example.com/logo.png", brandColors: null, visualStyle: null, visualReferences: null }, brand: null, market: null, products: null };
  let composeInput: unknown = null;
  const { createStudioVisual, getLastImageRequest } = await loadOrchestratorWith(t, { businessContext, onCompose: (input) => { composeInput = input; } });
  const result = await createStudioVisual({
    skillId: "vidigal_png", input: { freeformBrief: "teste" },
    companyId: "c1", companyName: "Empresa A", assets: { references: [], protectedAssets: [] },
    db: {} as never,
  });
  const imgReq = getLastImageRequest() as { protectedAssets: { url: string; kind: string; role?: string }[] };
  assert.equal(imgReq.protectedAssets.some((a) => a.url === "https://cdn.example.com/logo.png" && a.kind === "protected" && a.role === "logo"), true, "logo oficial entra automaticamente como protected/role logo, sem o usuário precisar marcar");
  const compose = composeInput as { protectedAssetBytes: { assetId: string }[] };
  assert.equal(compose.protectedAssetBytes.some((a) => a.assetId === "company-logo"), true, "bytes do logo oficial (buscados via fetch SSRF-safe) chegam ao compositor");
  assert.equal(result.image?.status, "completed");
});

test("[14] referências e protected assets enviados pelo usuário chegam intactos ao image runtime", async (t) => {
  const { createStudioVisual, getLastImageRequest } = await loadOrchestratorWith(t, {});
  const references = [{ id: "r1", label: "Ref 1", kind: "reference" as const, url: "data:image/png;base64,cmVm" }];
  const protectedAssets = [{ id: "p1", label: "Produto", kind: "protected" as const, url: "data:image/png;base64,cHJvZA==" }];
  await createStudioVisual({
    skillId: "vidigal_png", input: { freeformBrief: "teste" },
    companyId: null, companyName: null, assets: { references, protectedAssets },
    db: {} as never,
  });
  const imgReq = getLastImageRequest() as { references: unknown[]; protectedAssets: { id: string; role?: string }[] };
  assert.equal(imgReq.references.length, 1);
  assert.equal(imgReq.protectedAssets.some((a) => a.id === "p1" && a.role === "product"), true, "protected asset enviado pelo usuário recebe role \"product\" por padrão");
});

test("[3] free mode -- companyId null nunca vira Company fictícia no business context", async (t) => {
  let capturedCompanyId: unknown = "not-called";
  const { createStudioVisual } = await loadOrchestratorWith(t, { onBuildBusinessContext: (companyId) => { capturedCompanyId = companyId; } });
  await createStudioVisual({
    skillId: "vidigal_png", input: { freeformBrief: "teste" },
    companyId: null, companyName: null, assets: { references: [], protectedAssets: [] },
    db: {} as never,
  });
  assert.equal(capturedCompanyId, null, "companyId null é repassado como null -- nunca substituído por um valor inventado");
});

test("headline/cta explícitos do usuário são preservados exatamente -- nunca reescritos pela sugestão da Vidigal", async (t) => {
  let composeInput: unknown = null;
  const { createStudioVisual } = await loadOrchestratorWith(t, { onCompose: (input) => { composeInput = input; } });
  await createStudioVisual({
    skillId: "vidigal_png", input: { freeformBrief: "teste", headline: "Aberto até 4h", cta: "Peça já" },
    companyId: null, companyName: null, assets: { references: [], protectedAssets: [] },
    db: {} as never,
  });
  const compose = composeInput as { renderPlan: { textLayers: { role: string; text: string }[] } };
  const headlineLayer = compose.renderPlan.textLayers.find((l) => l.role === "headline");
  const ctaLayer = compose.renderPlan.textLayers.find((l) => l.role === "cta");
  assert.equal(headlineLayer?.text, "Aberto até 4h", "headline do usuário é usado ao pé da letra, nunca o suggestedHeadline da Vidigal");
  assert.equal(ctaLayer?.text, "Peça já", "cta do usuário é usado ao pé da letra");
});

test("sem headline/cta explícitos -- usa suggestedHeadline/suggestedCta da Vidigal", async (t) => {
  let composeInput: unknown = null;
  const { createStudioVisual } = await loadOrchestratorWith(t, { onCompose: (input) => { composeInput = input; } });
  await createStudioVisual({
    skillId: "vidigal_png", input: { freeformBrief: "teste" },
    companyId: null, companyName: null, assets: { references: [], protectedAssets: [] },
    db: {} as never,
  });
  const compose = composeInput as { renderPlan: { textLayers: { role: string; text: string }[] } };
  const headlineLayer = compose.renderPlan.textLayers.find((l) => l.role === "headline");
  assert.equal(headlineLayer?.text, FAKE_TEXT_OUTPUT.suggestedHeadline);
  assert.equal(compose.renderPlan.textLayers.some((l) => l.role === "cta"), false, "suggestedCta null -- nenhuma layer de CTA é criada");
});

test("composição falhou -- resultado final é failed com STUDIO_RENDER_FAILED, nunca uma imagem quebrada", async (t) => {
  const { createStudioVisual } = await loadOrchestratorWith(t, { composeResult: { ok: false, error: "falha de teste" } });
  const result = await createStudioVisual({
    skillId: "vidigal_png", input: { freeformBrief: "teste" },
    companyId: null, companyName: null, assets: { references: [], protectedAssets: [] },
    db: {} as never,
  });
  assert.equal(result.image?.status, "failed");
  assert.equal(result.image?.error?.code, "STUDIO_RENDER_FAILED");
  assert.equal(result.image?.image, null);
});
