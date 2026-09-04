/**
 * Executar com: node --experimental-test-module-mocks --import ./.tmp/preload-ts-loader.mjs --test src/lib/ai/image-providers/__tests__/openai-images.behavioral.test.ts
 * Prompt 09 (Studio Image Provider Compatibility) — exercita
 * OpenAIImagesProvider.generate() ponta a ponta com o pacote "openai"
 * inteiro mockado (nunca rede real), provando o pipeline completo:
 * StudioImageRuntime -> adapter -> request válido -> resposta
 * normalizada. process.env.OPENAI_IMAGE_MODEL é lido em module-load
 * time pelo provider -- por isso cada teste reimporta o módulo depois
 * de ajustar a env var, com um query string único pra forçar reload.
 */
import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";

async function realPngBase64(): Promise<string> {
  const buf = await sharp({ create: { width: 4, height: 4, channels: 3, background: { r: 9, g: 9, b: 9 } } }).png().toBuffer();
  return buf.toString("base64");
}

/** Precisa ser a MESMA classe exposta como `OpenAI.APIError` no mock
 *  (ver FakeOpenAI abaixo) e usada pelos testes que simulam erro do
 *  SDK -- senão `instanceof OpenAI.APIError` dentro de
 *  openai-image-response.ts nunca reconheceria o erro simulado. */
class FakeAPIErrorBase extends Error {
  status?: number; code?: string | null; type?: string; param?: string | null; requestID?: string | null;
  constructor(message: string, fields: { status?: number; code?: string | null; type?: string; param?: string | null; requestID?: string | null } = {}) {
    super(message);
    Object.assign(this, fields);
  }
}

async function loadProviderWith(t: TestContext, opts: {
  model?: string;
  apiKey?: string;
  generateImpl?: (params: unknown, options?: unknown) => Promise<unknown>;
}) {
  const originalModel = process.env.OPENAI_IMAGE_MODEL;
  const originalKey = process.env.OPENAI_API_KEY;
  if (opts.model !== undefined) process.env.OPENAI_IMAGE_MODEL = opts.model; else delete process.env.OPENAI_IMAGE_MODEL;
  if (opts.apiKey !== undefined) process.env.OPENAI_API_KEY = opts.apiKey; else delete process.env.OPENAI_API_KEY;

  let capturedParams: unknown = null;
  let capturedOptions: unknown = null;
  class FakeOpenAI {
    images = {
      generate: async (params: unknown, options?: unknown) => {
        capturedParams = params;
        capturedOptions = options;
        if (opts.generateImpl) return opts.generateImpl(params, options);
        const b64 = await realPngBase64();
        return { created: 1, data: [{ b64_json: b64 }] };
      },
    };
    static APIError = FakeAPIErrorBase;
    constructor(_o: unknown) { void _o; }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (t.mock.module as any)("openai", { exports: { default: FakeOpenAI } });

  const mod = await import(`../openai-images.ts?t=${Date.now()}-${Math.random()}`);
  t.after(() => {
    if (originalModel === undefined) delete process.env.OPENAI_IMAGE_MODEL; else process.env.OPENAI_IMAGE_MODEL = originalModel;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey;
  });
  return { provider: mod.OpenAIImagesProvider, getCapturedParams: () => capturedParams, getCapturedOptions: () => capturedOptions };
}

test("[PRODUCTION_INCIDENT_OPENAI_RESPONSE_FORMAT] modelo GPT Image real -- request nunca contém response_format, resposta b64_json normalizada", async (t) => {
  const { provider, getCapturedParams } = await loadProviderWith(t, { model: "gpt-image-1", apiKey: "sk-test-fake-never-real" });
  assert.equal(provider.isAvailable(), true);
  const result = await provider.generate({ prompt: "cenário de teste", aspectRatio: "1:1", outputCount: 1 });
  assert.equal(result.success, true, "geração bem-sucedida");
  const params = getCapturedParams() as Record<string, unknown>;
  assert.equal("response_format" in params, false, "response_format NUNCA está no request enviado ao SDK -- causa raiz do incidente real de Production");
  assert.equal(params.model, "gpt-image-1");
  assert.ok(result.images?.[0]?.url.startsWith("data:image/png;base64,"), "b64_json normalizado corretamente pra data: URL");
});

test("modelo dall-e-3 (default sem OPENAI_IMAGE_MODEL configurada, exatamente o cenário do incidente real) -- também nunca envia response_format", async (t) => {
  const { provider, getCapturedParams } = await loadProviderWith(t, { apiKey: "sk-test-fake-never-real" }); // sem model -> usa o default "dall-e-3"
  const result = await provider.generate({ prompt: "x", aspectRatio: "16:9" });
  assert.equal(result.success, true);
  const params = getCapturedParams() as Record<string, unknown>;
  assert.equal(params.model, "dall-e-3", "confirma que o default real (sem env var) é dall-e-3 -- o modelo que realmente estava ativo no incidente de Production");
  assert.equal("response_format" in params, false, "dall-e-3 também nunca recebe response_format (decisão pós-incidente, ver openai-image-compat.ts)");
  assert.equal(params.n, 1, "n sempre 1 pro dall-e-3");
});

test("modelo dall-e-2 -- request legítimo continua funcionando (regressão: não perder suporte a DALL-E)", async (t) => {
  const { provider, getCapturedParams } = await loadProviderWith(t, { model: "dall-e-2", apiKey: "sk-test-fake-never-real" });
  const result = await provider.generate({ prompt: "x", aspectRatio: "1:1" });
  assert.equal(result.success, true);
  const params = getCapturedParams() as Record<string, unknown>;
  assert.equal(params.model, "dall-e-2");
  assert.equal(params.size, "1024x1024");
  assert.equal(params.quality, "standard");
});

test("sem OPENAI_API_KEY -- indisponível explicitamente, nunca tenta chamar o SDK", async (t) => {
  const { provider } = await loadProviderWith(t, { apiKey: "" });
  assert.equal(provider.isAvailable(), false);
  const result = await provider.generate({ prompt: "x" });
  assert.equal(result.success, false);
  assert.match(result.error ?? "", /não configurada/i);
});

test("timeout do provider -- AbortError vira mensagem segura de timeout, nunca lança", async (t) => {
  const { provider } = await loadProviderWith(t, {
    model: "gpt-image-1", apiKey: "sk-test-fake-never-real",
    generateImpl: async () => { const e = new Error("aborted"); e.name = "AbortError"; throw e; },
  });
  const result = await provider.generate({ prompt: "x" });
  assert.equal(result.success, false);
  assert.match(result.error ?? "", /tempo limite/i);
});

test("erro do provider (SDK APIError simulado) -- mensagem segura, nunca o texto bruto", async (t) => {
  const { provider } = await loadProviderWith(t, {
    model: "gpt-image-1", apiKey: "sk-test-fake-never-real",
    generateImpl: async () => {
      throw new FakeAPIErrorBase("segredo interno do provider, nunca deve vazar", { status: 400, code: "invalid_parameter", type: "invalid_request_error", param: "size", requestID: "req_123" });
    },
  });
  const result = await provider.generate({ prompt: "x" });
  assert.equal(result.success, false);
  assert.equal((result.error ?? "").includes("segredo interno"), false, "mensagem bruta do provider nunca vaza pro chamador");
  assert.match(result.error ?? "", /parâmetros inválidos/i, "erro 400 classificado corretamente via instanceof OpenAI.APIError (não caiu no fallback genérico)");
});

test("modelo desconhecido configurado -- falha explícita antes mesmo de chamar o SDK", async (t) => {
  const { provider, getCapturedParams } = await loadProviderWith(t, { model: "modelo-que-nao-existe", apiKey: "sk-test-fake-never-real" });
  const result = await provider.generate({ prompt: "x" });
  assert.equal(result.success, false);
  assert.equal(getCapturedParams(), null, "SDK nunca é chamado quando a família do modelo é desconhecida");
});

test("providerRaw carrega metadata não sensível (model/family/size/quality), nunca secret", async (t) => {
  const { provider } = await loadProviderWith(t, { model: "gpt-image-1", apiKey: "sk-test-fake-never-real" });
  const result = await provider.generate({ prompt: "x", aspectRatio: "1:1" });
  const raw = result.providerRaw as Record<string, unknown>;
  assert.equal(raw.model, "gpt-image-1");
  assert.equal(raw.family, "gpt_image");
  assert.equal(JSON.stringify(raw).includes("sk-test-fake-never-real"), false, "providerRaw nunca contém a API key");
});
