/**
 * Executar com: node --experimental-test-module-mocks --import ./.tmp/preload-ts-loader.mjs --test src/lib/rec-os/studio/render/__tests__/reference-analysis.structural.test.ts
 * Prompt 01 (Studio Visual Engine) — mocka o pacote "openai" inteiro
 * (nunca rede real). Best-effort: falha/indisponibilidade nunca lança,
 * sempre degrada para warning com `rules: []`.
 */
import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";

const FAKE_FIELDS = {
  composition: "centralizada", density: "baixa", contrast: "alto", lighting: "dramática", mood: "urbano",
  spatialRelations: "produto à esquerda, texto à direita", typographicBehavior: "bold condensado",
  negativeSpaceUsage: "generoso no topo", rhythm: "assimétrico", approximatePalette: ["#111111", "#F5F5F5"],
  photographicTreatment: "alto contraste, grão sutil",
};

async function loadWith(t: TestContext, opts: { create: (params: unknown) => Promise<{ output_text: string }> }) {
  class FakeOpenAI {
    responses = { create: opts.create };
    constructor(_o: unknown) { void _o; }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (t.mock.module as any)("openai", { exports: { default: FakeOpenAI } });
  return import(`../reference-analysis.ts?t=${Date.now()}-${Math.random()}`);
}

test("sem referências -- nunca chama o provider, rules vazio", async (t) => {
  let calls = 0;
  const mod = await loadWith(t, { create: async () => { calls++; return { output_text: "{}" }; } });
  const result = await mod.analyzeStudioReferences([]);
  assert.deepEqual(result.rules, []);
  assert.deepEqual(result.warnings, []);
  assert.equal(calls, 0, "nenhuma chamada é feita quando não há referências anexadas");
});

test("sem OPENAI_API_KEY configurada -- warning explícito, nunca chama o provider", async (t) => {
  const original = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  let calls = 0;
  const mod = await loadWith(t, { create: async () => { calls++; return { output_text: "{}" }; } });
  const result = await mod.analyzeStudioReferences([{ url: "data:image/png;base64,cmVm", label: "Ref 1" }]);
  assert.equal(calls, 0);
  assert.equal(result.rules.length, 0);
  assert.ok(result.warnings.some((w: string) => w.includes("não influenciaram")));
  if (original) process.env.OPENAI_API_KEY = original;
});

test("análise bem-sucedida devolve regras extraídas (achatadas em texto), nunca a imagem", async (t) => {
  process.env.OPENAI_API_KEY = "sk-test-fake-never-real";
  const mod = await loadWith(t, { create: async () => ({ output_text: JSON.stringify(FAKE_FIELDS) }) });
  const result = await mod.analyzeStudioReferences([{ url: "data:image/png;base64,cmVm", label: "Ref 1" }]);
  assert.equal(result.rules.length, 1);
  assert.match(result.rules[0], /composição: centralizada/);
  assert.match(result.rules[0], /paleta aproximada: #111111, #F5F5F5/);
  delete process.env.OPENAI_API_KEY;
});

test("falha do provider numa referência vira warning, nunca lança, nunca bloqueia as demais", async (t) => {
  process.env.OPENAI_API_KEY = "sk-test-fake-never-real";
  let call = 0;
  const mod = await loadWith(t, {
    create: async () => {
      call++;
      if (call === 1) throw new Error("provider indisponível");
      return { output_text: JSON.stringify(FAKE_FIELDS) };
    },
  });
  const result = await mod.analyzeStudioReferences([
    { url: "data:image/png;base64,cmVm", label: "Ref com falha" },
    { url: "data:image/png;base64,cmVm", label: "Ref ok" },
  ]);
  assert.equal(result.rules.length, 1, "só a referência que teve sucesso entra em rules");
  assert.ok(result.warnings.some((w: string) => w.includes("Ref com falha")));
  delete process.env.OPENAI_API_KEY;
});

test("limita a análise às 2 primeiras referências -- warning explícito sobre o corte", async (t) => {
  process.env.OPENAI_API_KEY = "sk-test-fake-never-real";
  let calls = 0;
  const mod = await loadWith(t, { create: async () => { calls++; return { output_text: JSON.stringify(FAKE_FIELDS) }; } });
  const result = await mod.analyzeStudioReferences([
    { url: "data:image/png;base64,cmVm", label: "Ref 1" },
    { url: "data:image/png;base64,cmVm", label: "Ref 2" },
    { url: "data:image/png;base64,cmVm", label: "Ref 3" },
  ]);
  assert.equal(calls, 2, "no máximo 2 chamadas ao provider por geração");
  assert.equal(result.rules.length, 2);
  assert.ok(result.warnings.some((w: string) => w.includes("primeiras referências")));
  delete process.env.OPENAI_API_KEY;
});
