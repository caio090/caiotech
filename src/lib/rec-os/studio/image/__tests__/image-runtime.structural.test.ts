/**
 * Executar com: node --experimental-test-module-mocks --import ./.tmp/preload-ts-loader.mjs --test src/lib/rec-os/studio/image/__tests__/image-runtime.structural.test.ts
 * Sprint REC OS Studio Image Generation MVP V0.3 — mocka
 * @/lib/ai/image-providers inteiro (nunca chama Gemini/OpenAI de
 * verdade) para exercitar o Studio Image Runtime real.
 */
import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import type { StudioImageAsset } from "../types";

const root = process.cwd();

function fakeProvider(overrides: Partial<{
  available: boolean;
  generate: (input: unknown) => Promise<{ success: boolean; images?: { url: string; width: number; height: number }[]; error?: string }>;
}> = {}) {
  return {
    id: "fake-provider",
    label: "Fake Provider",
    isAvailable: () => overrides.available ?? true,
    generate: overrides.generate ?? (async () => ({ success: true, images: [{ url: "data:image/png;base64,ZmFrZQ==", width: 1024, height: 1024 }] })),
  };
}

async function loadRuntimeWith(t: TestContext, opts: { provider: ReturnType<typeof fakeProvider> | null }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (t.mock.module as any)("@/lib/ai/image-providers", {
    exports: {
      getActiveProvider: () => opts.provider,
      isAiImageAvailable: () => !!opts.provider?.isAvailable(),
      activeProviderLabel: () => opts.provider?.label ?? "Nenhum provedor configurado",
    },
  });
  return import(`../image-runtime.ts?t=${Date.now()}-${Math.random()}`);
}

test("[9] StudioImageRuntime existe -- getStudioImageCapabilities/generateStudioImage exportados", async (t) => {
  const mod = await loadRuntimeWith(t, { provider: fakeProvider() });
  assert.equal(typeof mod.getStudioImageCapabilities, "function");
  assert.equal(typeof mod.generateStudioImage, "function");
});

test("[13] imagem mock de provider retorna resultado válido (completed)", async (t) => {
  const mod = await loadRuntimeWith(t, { provider: fakeProvider() });
  const result = await mod.generateStudioImage({ generationPrompt: "cenário de teste", format: "feed_square", references: [], protectedAssets: [] });
  assert.equal(result.status, "completed");
  assert.equal(result.providerId, "fake-provider");
  assert.equal(result.image?.url, "data:image/png;base64,ZmFrZQ==");
});

test("[18] provider unavailable é tratado -- runtime_unavailable, nunca lança", async (t) => {
  const mod = await loadRuntimeWith(t, { provider: null });
  const result = await mod.generateStudioImage({ generationPrompt: "x", format: "feed_square", references: [], protectedAssets: [] });
  assert.equal(result.status, "runtime_unavailable");
  assert.equal(result.error?.code, "STUDIO_IMAGE_PROVIDER_UNAVAILABLE");
  assert.equal(result.image, null);
});

console.log("[test] 19 — timeout é tratado (verificação estrutural -- um timeout real de 45s não roda em teste)");
{
  const content = fs.readFileSync(path.join(root, "src/lib/rec-os/studio/image/image-runtime.ts"), "utf8");
  assert(/new AbortController\(\)/.test(content), "usa AbortController para limitar a chamada ao provider");
  assert(/setTimeout\(\(\) => controller\.abort\(\), IMAGE_GENERATION_TIMEOUT_MS\)/.test(content), "timeout finito configurado (IMAGE_GENERATION_TIMEOUT_MS)");
  assert(/clearTimeout\(timer\)/.test(content), "timer sempre limpo no finally -- nunca vaza um timer pendente");
  assert(/error\.name === "AbortError"/.test(content), "trata explicitamente o erro de abort -- nunca deixa a exceção escapar sem tratamento");
}

test("[15/17] protected assets nunca chegam ao provider.generate() -- só o prompt de texto", async (t) => {
  let capturedInput: unknown = null;
  const provider = fakeProvider({
    generate: async (input) => { capturedInput = input; return { success: true, images: [{ url: "data:image/png;base64,ZmFrZQ==", width: 1024, height: 1024 }] }; },
  });
  const mod = await loadRuntimeWith(t, { provider });
  const protectedAssets: StudioImageAsset[] = [{ id: "logo-1", label: "Logo oficial", kind: "protected", url: "data:image/png;base64,bG9nbw==" }];
  const references: StudioImageAsset[] = [{ id: "ref-1", label: "Referência", kind: "reference", url: "data:image/png;base64,cmVm" }];
  const result = await mod.generateStudioImage({ generationPrompt: "cenário de teste", format: "feed_square", references, protectedAssets });

  assert.equal(JSON.stringify(capturedInput).includes("logo-1"), false, "id do asset protegido nunca aparece no input enviado ao provider");
  assert.equal(JSON.stringify(capturedInput).includes("ref-1"), false, "id do asset de referência nunca aparece no input enviado ao provider");
  assert.equal((capturedInput as { prompt: string }).prompt, "cenário de teste", "só o generationPrompt (texto) é enviado ao provider");
  assert.equal(result.warnings.some((w: string) => w.includes("protegido")), true, "warning explícito sobre o(s) asset(s) protegido(s) -- nunca alterado em silêncio");
  assert.equal(result.warnings.some((w: string) => w.toLowerCase().includes("referência")), true, "warning explícito sobre a(s) referência(s) não influenciar(em) a geração");
});

test("[29] formatos: todos os 8 DesignFormat têm mapeamento de aspect ratio, sem distorcer", async (t) => {
  const captured: string[] = [];
  const provider = fakeProvider({
    generate: async (input) => { captured.push((input as { aspectRatio: string }).aspectRatio); return { success: true, images: [{ url: "data:image/png;base64,ZmFrZQ==", width: 1, height: 1 }] }; },
  });
  const mod = await loadRuntimeWith(t, { provider });
  const formats = ["feed_square", "story_vertical", "carousel", "banner", "ad", "thumbnail", "outdoor", "presentation"];
  for (const format of formats) {
    await mod.generateStudioImage({ generationPrompt: "x", format, references: [], protectedAssets: [] });
  }
  assert.equal(captured.length, formats.length, "todos os 8 formatos produziram uma chamada real ao provider");
  assert.equal(captured.every((ar) => ["1:1", "9:16", "16:9", "4:5", "1.91:1"].includes(ar)), true, "todo aspect ratio enviado é um valor real suportado pelo provider (ImageAspectRatio), nunca um valor inventado");
});

test("[21] segredo nunca aparece no resultado (JSON completo)", async (t) => {
  const fakeSecret = "sk-fake-image-secret-should-never-leak";
  process.env.AI_IMAGE_PROVIDER_TEST_SECRET_MARKER = fakeSecret; // nunca lido pelo runtime -- só garante que, se algo vazasse env, o teste pegaria
  const mod = await loadRuntimeWith(t, { provider: fakeProvider() });
  const result = await mod.generateStudioImage({ generationPrompt: "x", format: "feed_square", references: [], protectedAssets: [] });
  assert.equal(JSON.stringify(result).includes(fakeSecret), false);
  delete process.env.AI_IMAGE_PROVIDER_TEST_SECRET_MARKER;
});

console.log("[test] 10 — resolvido server-side (nenhuma diretiva 'use client')");
{
  const content = fs.readFileSync(path.join(root, "src/lib/rec-os/studio/image/image-runtime.ts"), "utf8");
  assert(!/"use client"/.test(content), "image-runtime.ts nunca é client component -- resolvido só no servidor");
}

console.log("[test] 24 — nenhum image provider importado pela skill Vidigal");
{
  const skillFiles = [
    "src/lib/rec-os/studio/skills/vidigal-png/manifest.ts",
    "src/lib/rec-os/studio/skills/vidigal-png/input.ts",
    "src/lib/rec-os/studio/skills/vidigal-png/output.ts",
    "src/lib/rec-os/studio/skills/vidigal-png/instructions.ts",
    "src/lib/rec-os/studio/skills/vidigal-png/neural-executor.ts",
  ];
  for (const file of skillFiles) {
    const content = fs.readFileSync(path.join(root, file), "utf8");
    assert(!/image-providers|getActiveProvider|generateStudioImage/.test(content), `${file}: nunca importa/referencia o runtime ou os providers de imagem`);
  }
}
