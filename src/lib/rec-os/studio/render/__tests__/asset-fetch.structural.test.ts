/**
 * Executar com: node --experimental-test-module-mocks --import ./.tmp/preload-ts-loader.mjs --test src/lib/rec-os/studio/render/__tests__/asset-fetch.structural.test.ts
 * Prompt 01 (Studio Visual Engine) — threat pass de fetchAssetSafely:
 * SSRF (localhost/IP privado/link-local/metadata service), esquema
 * não-https, Content-Type não-imagem, tamanho excedido, timeout.
 * Nunca faz uma requisição de rede real -- `global.fetch` é
 * substituído por um stub controlado em cada teste.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchAssetSafely } from "../asset-fetch";

const originalFetch = global.fetch;

function withFetchStub<T>(stub: typeof fetch, run: () => Promise<T>): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).fetch = stub;
  return run().finally(() => {
    global.fetch = originalFetch;
  });
}

test("rejeita URL com esquema não-https (http)", async () => {
  const result = await fetchAssetSafely("http://example.com/logo.png");
  assert.equal(result.ok, false);
  assert.match(result.error ?? "", /https/i);
});

test("rejeita URL malformada", async () => {
  const result = await fetchAssetSafely("not a url");
  assert.equal(result.ok, false);
});

test("rejeita localhost explicitamente", async () => {
  const result = await fetchAssetSafely("https://localhost/logo.png");
  assert.equal(result.ok, false);
});

test("rejeita IP loopback (127.0.0.1)", async () => {
  const result = await fetchAssetSafely("https://127.0.0.1/logo.png");
  assert.equal(result.ok, false);
});

test("rejeita IP privado classe A (10.x.x.x)", async () => {
  const result = await fetchAssetSafely("https://10.0.0.5/logo.png");
  assert.equal(result.ok, false);
});

test("rejeita IP privado classe C (192.168.x.x)", async () => {
  const result = await fetchAssetSafely("https://192.168.1.1/logo.png");
  assert.equal(result.ok, false);
});

test("rejeita metadata service da cloud (169.254.169.254)", async () => {
  const result = await fetchAssetSafely("https://169.254.169.254/latest/meta-data/");
  assert.equal(result.ok, false);
});

test("rejeita Content-Type que não é imagem conhecida", async () => {
  await withFetchStub(
    (async () => new Response("<html></html>", { status: 200, headers: { "content-type": "text/html" } })) as unknown as typeof fetch,
    async () => {
      const result = await fetchAssetSafely("https://203.0.113.10/not-an-image");
      assert.equal(result.ok, false);
      assert.match(result.error ?? "", /Tipo de conteúdo/);
    },
  );
});

test("rejeita asset acima do tamanho máximo (Content-Length)", async () => {
  await withFetchStub(
    (async () => new Response(new Uint8Array(10), { status: 200, headers: { "content-type": "image/png", "content-length": String(50_000_000) } })) as unknown as typeof fetch,
    async () => {
      const result = await fetchAssetSafely("https://203.0.113.10/huge.png");
      assert.equal(result.ok, false);
      assert.match(result.error ?? "", /tamanho máximo/);
    },
  );
});

test("aceita imagem https pública válida dentro do limite", async () => {
  const bytes = new Uint8Array([1, 2, 3, 4]);
  await withFetchStub(
    (async () => new Response(bytes, { status: 200, headers: { "content-type": "image/png", "content-length": String(bytes.length) } })) as unknown as typeof fetch,
    async () => {
      const result = await fetchAssetSafely("https://203.0.113.10/logo.png");
      assert.equal(result.ok, true);
      assert.equal(result.bytes?.length, 4);
      assert.equal(result.contentType, "image/png");
    },
  );
});

test("propaga falha HTTP como erro explícito, nunca lança", async () => {
  await withFetchStub(
    (async () => new Response("not found", { status: 404 })) as unknown as typeof fetch,
    async () => {
      const result = await fetchAssetSafely("https://203.0.113.10/missing.png");
      assert.equal(result.ok, false);
      assert.match(result.error ?? "", /404/);
    },
  );
});

test("exceção de rede vira erro explícito, nunca lança", async () => {
  await withFetchStub(
    (async () => { throw new Error("network down"); }) as unknown as typeof fetch,
    async () => {
      const result = await fetchAssetSafely("https://203.0.113.10/logo.png");
      assert.equal(result.ok, false);
    },
  );
});
