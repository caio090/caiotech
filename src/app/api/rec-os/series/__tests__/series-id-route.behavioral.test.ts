/**
 * Executar com: node --experimental-test-module-mocks --import ./.tmp/preload-ts-loader.mjs --test src/app/api/rec-os/series/__tests__/series-id-route.behavioral.test.ts
 * Prompt 16 (REC OS Persistence Completion) — GET de hidratação de uma
 * série (handler real de src/app/api/rec-os/series/[seriesId]/route.ts
 * -- este teste vive fora da pasta [seriesId] porque o test runner do
 * Node não descobre arquivos dentro de diretórios com colchetes via
 * --test glob; o import relativo aponta pro handler real do mesmo jeito).
 * RLS (via client da sessão, mockado aqui) é a autorização real -- este
 * teste prova que o handler nunca revela se um id existe quando o
 * repository devolve null (cross-company/não encontrado tratados
 * igual, mesmo 404 genérico).
 */
import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";

function req() {
  return new Request("http://x/api/rec-os/series/series-1");
}

async function loadRouteWith(t: TestContext, hydrateResult: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (t.mock.module as any)("@/lib/supabase/server", { exports: { createServerSupabaseClient: async () => ({}) } });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (t.mock.module as any)("@/lib/rec-os/studio/series/repository", {
    exports: { getCreativeSeriesWithItems: async () => hydrateResult },
  });
  const mod = await import(`../[seriesId]/route.ts?t=${Date.now()}-${Math.random()}`);
  return { GET: mod.GET };
}

test("[GET] série encontrada (autorizada por RLS) -- 200, devolve series+items", async (t) => {
  const { GET } = await loadRouteWith(t, { series: { id: "series-1", count: 3 }, items: [{ id: "item-1" }] });
  const res = await GET(req(), { params: Promise.resolve({ seriesId: "series-1" }) });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.series.series.id, "series-1");
});

test("[GET] série de outra Company/inexistente -- 404 genérico, nunca revela qual dos dois casos", async (t) => {
  const { GET } = await loadRouteWith(t, null);
  const res = await GET(req(), { params: Promise.resolve({ seriesId: "series-de-outra-company" }) });
  const body = await res.json();
  assert.equal(res.status, 404);
  assert.equal(body.code, "SERIES_NOT_FOUND");
});
