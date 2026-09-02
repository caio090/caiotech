/**
 * Executar com: node --experimental-test-module-mocks --import ./.tmp/preload-ts-loader.mjs --test src/lib/rec-os/studio/__tests__/create-studio-visual.structural.test.ts
 * Sprint REC OS Studio Image Generation MVP V0.3 — mocka ./execute,
 * ./image/image-runtime e ./business-context para provar a
 * orquestração real (texto -> imagem) sem tocar Supabase/OpenAI.
 */
import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";

const FAKE_TEXT_OUTPUT = {
  briefReading: "x", creativeDirection: "x", conceptualBasis: "x", visualStructure: "x",
  visualGuidelines: "x", generationPrompt: "cenário gerado a partir do briefing", variations: [], adaptations: [],
};

async function loadOrchestratorWith(t: TestContext, opts: {
  textStatus?: string;
  businessContext?: unknown;
  imageResult?: unknown;
  onBuildBusinessContext?: (companyId: unknown) => void;
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

  const mod = await import(`../create-studio-visual.ts?t=${Date.now()}-${Math.random()}`);
  return { createStudioVisual: mod.createStudioVisual, getExecuteCalls: () => executeCalls, getLastExecuteRequest: () => lastExecuteRequest, getImageCalls: () => imageCalls, getLastImageRequest: () => lastImageRequest };
}

test("[11/12] pipeline completo: texto alimenta o generationPrompt do image runtime", async (t) => {
  const { createStudioVisual, getImageCalls, getLastImageRequest } = await loadOrchestratorWith(t, {});
  const result = await createStudioVisual({
    skillId: "vidigal_png", input: { freeformBrief: "teste", format: "feed_square" },
    companyId: null, companyName: null, assets: { references: [], protectedAssets: [] },
    db: {} as never,
  });
  assert.equal(result.text.status, "completed");
  assert.equal(getImageCalls(), 1, "image runtime é chamado exatamente uma vez após o texto completar");
  const imgReq = getLastImageRequest() as { generationPrompt: string };
  assert.equal(imgReq.generationPrompt, FAKE_TEXT_OUTPUT.generationPrompt, "generationPrompt do texto chega intacto ao image runtime");
  assert.equal(result.image?.status, "completed");
});

test("texto não completou -- imagem NUNCA é tentada", async (t) => {
  const { createStudioVisual, getImageCalls } = await loadOrchestratorWith(t, { textStatus: "failed" });
  const result = await createStudioVisual({
    skillId: "vidigal_png", input: { freeformBrief: "teste" },
    companyId: null, companyName: null, assets: { references: [], protectedAssets: [] },
    db: {} as never,
  });
  assert.equal(result.text.status, "failed");
  assert.equal(result.image, null, "image é null -- nunca tenta gerar imagem sobre uma direção que falhou");
  assert.equal(getImageCalls(), 0);
});

test("[16] logo oficial da Company é automaticamente adicionado como protected asset", async (t) => {
  const businessContext = { company: { id: "c1", name: "Empresa A" }, identity: { brandName: "A", logoUrl: "https://cdn.example.com/logo.png", brandColors: null, visualStyle: null, visualReferences: null }, brand: null, market: null, products: null };
  const { createStudioVisual, getLastImageRequest } = await loadOrchestratorWith(t, { businessContext });
  await createStudioVisual({
    skillId: "vidigal_png", input: { freeformBrief: "teste" },
    companyId: "c1", companyName: "Empresa A", assets: { references: [], protectedAssets: [] },
    db: {} as never,
  });
  const imgReq = getLastImageRequest() as { protectedAssets: { url: string; kind: string }[] };
  assert.equal(imgReq.protectedAssets.some((a) => a.url === "https://cdn.example.com/logo.png" && a.kind === "protected"), true, "logo oficial entra automaticamente como protected, sem o usuário precisar marcar");
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
  const imgReq = getLastImageRequest() as { references: unknown[]; protectedAssets: { id: string }[] };
  assert.equal(imgReq.references.length, 1);
  assert.equal(imgReq.protectedAssets.some((a) => a.id === "p1"), true);
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
