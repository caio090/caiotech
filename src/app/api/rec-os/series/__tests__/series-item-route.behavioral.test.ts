/**
 * Executar com: node --experimental-test-module-mocks --import ./.tmp/preload-ts-loader.mjs --test src/app/api/rec-os/series/__tests__/series-item-route.behavioral.test.ts
 * Prompt 16 (REC OS Persistence Completion) — PATCH real de
 * src/app/api/rec-os/series/[seriesId]/items/[itemId]/route.ts
 * (fora da pasta com colchetes pelo mesmo motivo do teste irmão de
 * hidratação -- --test do Node não descobre arquivos dentro de
 * diretórios com colchetes).
 */
import { test, mock, type TestContext } from "node:test";
import assert from "node:assert/strict";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(mock.module as any)("@/lib/workspaces/assert-not-preview", {
  exports: { withMutationProtection: (handler: (...args: unknown[]) => unknown) => handler },
});

function patchReq(body: unknown) {
  return new Request("http://x/api/rec-os/series/series-1/items/item-1", { method: "PATCH", body: JSON.stringify(body) });
}
function paramsFor(seriesId: string, itemId: string) {
  return { params: Promise.resolve({ seriesId, itemId }) };
}

const BASE_SERIES = {
  series: { id: "series-1", clientId: "company-a", contentId: null, campaignId: null, title: null, count: 3, placement: null, format: null, creativeDirection: null, status: "generating", createdBy: "user-1", createdAt: "x", updatedAt: "x" },
  items: [
    { id: "item-1", position: 1, role: "Peça 1", brief: "x", status: "planned", image: null, error: null },
    { id: "item-2", position: 2, role: "Peça 2", brief: "x", status: "generating", image: null, error: null },
  ],
};

async function loadRouteWith(t: TestContext, opts: {
  hydrateResult?: unknown;
  updateResult?: boolean;
  persistResult?: unknown;
}) {
  let updateCalls = 0;
  let lastUpdateInput: unknown = null;
  let persistCalls = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (t.mock.module as any)("@/lib/supabase/server", {
    exports: { createServerSupabaseClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) } }) },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (t.mock.module as any)("@/lib/rec-os/studio/series/repository", {
    exports: {
      getCreativeSeriesWithItems: async () => (opts.hydrateResult === undefined ? BASE_SERIES : opts.hydrateResult),
      updateCreativeSeriesItem: async (_db: unknown, _itemId: string, input: unknown) => {
        updateCalls++;
        lastUpdateInput = input;
        return opts.updateResult ?? true;
      },
      recomputeSeriesStatus: async () => {},
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (t.mock.module as any)("@/lib/rec-os/studio/series/asset-persistence", {
    exports: {
      persistSeriesItemAsset: async () => { persistCalls++; return opts.persistResult ?? { persisted: true, assetId: "asset-1", signedUrl: "https://signed/x.png", width: 1080, height: 1080 }; },
    },
  });
  const mod = await import(`../[seriesId]/items/[itemId]/route.ts?t=${Date.now()}-${Math.random()}`);
  return { PATCH: mod.PATCH, getUpdateCalls: () => updateCalls, getLastUpdateInput: () => lastUpdateInput, getPersistCalls: () => persistCalls };
}

test("[PATCH] status inválido -- 400, nunca chega no repository", async (t) => {
  const { PATCH, getUpdateCalls } = await loadRouteWith(t, {});
  const res = await PATCH(patchReq({ status: "nao_existe" }), paramsFor("series-1", "item-1"));
  assert.equal(res.status, 400);
  assert.equal(getUpdateCalls(), 0);
});

test("[PATCH] item de série de outra Company (RLS null) -- 404, nunca revela existência", async (t) => {
  const { PATCH, getUpdateCalls } = await loadRouteWith(t, { hydrateResult: null });
  const res = await PATCH(patchReq({ status: "generating" }), paramsFor("series-outra-company", "item-1"));
  const body = await res.json();
  assert.equal(res.status, 404);
  assert.equal(body.code, "SERIES_ITEM_NOT_FOUND");
  assert.equal(getUpdateCalls(), 0);
});

test("[PATCH] itemId não pertence à série -- 404, nunca atualiza item errado", async (t) => {
  const { PATCH, getUpdateCalls } = await loadRouteWith(t, {});
  const res = await PATCH(patchReq({ status: "generating" }), paramsFor("series-1", "item-que-nao-existe-nesta-serie"));
  assert.equal(res.status, 404);
  assert.equal(getUpdateCalls(), 0);
});

test("[PATCH] transição planned -> generating -- 200, updateCreativeSeriesItem chamado sem asset", async (t) => {
  const { PATCH, getUpdateCalls, getLastUpdateInput } = await loadRouteWith(t, {});
  const res = await PATCH(patchReq({ status: "generating" }), paramsFor("series-1", "item-1"));
  assert.equal(res.status, 200);
  assert.equal(getUpdateCalls(), 1);
  const input = getLastUpdateInput() as { status: string; assetUrl: string | null };
  assert.equal(input.status, "generating");
  assert.equal(input.assetUrl, null);
});

test("[PATCH] transição -> ready com imageDataUrl (Company-scoped) -- persiste asset de verdade, assetPersisted:true", async (t) => {
  const { PATCH, getPersistCalls, getLastUpdateInput } = await loadRouteWith(t, {});
  const res = await PATCH(patchReq({ status: "ready", imageDataUrl: "data:image/png;base64,ZmFrZQ==" }), paramsFor("series-1", "item-1"));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.assetPersisted, true);
  assert.equal(getPersistCalls(), 1, "persistSeriesItemAsset chamado quando a série é Company-scoped e status é ready com imagem");
  const input = getLastUpdateInput() as { assetUrl: string | null };
  assert.equal(input.assetUrl, "https://signed/x.png");
});

test("[PATCH] bucket ainda não configurado (SQL 93 pendente) -- item ainda fica 'ready', mas sem asset, nunca grava base64", async (t) => {
  const { PATCH, getLastUpdateInput } = await loadRouteWith(t, { persistResult: { persisted: false, reason: "Armazenamento de assets ainda não configurado neste ambiente." } });
  const res = await PATCH(patchReq({ status: "ready", imageDataUrl: "data:image/png;base64,ZmFrZQ==" }), paramsFor("series-1", "item-1"));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.assetPersisted, false);
  const input = getLastUpdateInput() as { status: string; assetUrl: string | null };
  assert.equal(input.status, "ready", "item ainda vira ready -- geração funcionou, só o asset não sobrevive ao refresh ainda");
  assert.equal(input.assetUrl, null, "nunca grava base64/data: URL como fallback (Fase 34)");
});

test("[PATCH] cancelar item 'generating' -- 409, nunca cancela request em voo", async (t) => {
  const { PATCH, getUpdateCalls } = await loadRouteWith(t, {});
  const res = await PATCH(patchReq({ status: "canceled" }), paramsFor("series-1", "item-2")); // item-2 está 'generating' no fixture
  const body = await res.json();
  assert.equal(res.status, 409);
  assert.equal(body.code, "SERIES_ITEM_NOT_CANCELABLE");
  assert.equal(getUpdateCalls(), 0);
});

test("[PATCH] cancelar item 'planned' -- 200, permitido", async (t) => {
  const { PATCH, getUpdateCalls } = await loadRouteWith(t, {});
  const res = await PATCH(patchReq({ status: "canceled" }), paramsFor("series-1", "item-1")); // item-1 está 'planned'
  assert.equal(res.status, 200);
  assert.equal(getUpdateCalls(), 1);
});

test("[PATCH] Free Mode (série sem clientId) -- nunca tenta persistir asset, mesmo com imageDataUrl", async (t) => {
  const freeSeries = { series: { ...BASE_SERIES.series, clientId: null }, items: BASE_SERIES.items };
  const { PATCH, getPersistCalls } = await loadRouteWith(t, { hydrateResult: freeSeries });
  const res = await PATCH(patchReq({ status: "ready", imageDataUrl: "data:image/png;base64,ZmFrZQ==" }), paramsFor("series-1", "item-1"));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.assetPersisted, false);
  assert.equal(getPersistCalls(), 0, "Free Mode nunca persiste asset (Fase 35: ephemeral + download por design)");
});

test("[PATCH] imageDataUrl gigante -- 400, nunca processado", async (t) => {
  const { PATCH, getUpdateCalls } = await loadRouteWith(t, {});
  const huge = "data:image/png;base64," + "A".repeat(9_000_000);
  const res = await PATCH(patchReq({ status: "ready", imageDataUrl: huge }), paramsFor("series-1", "item-1"));
  assert.equal(res.status, 400);
  assert.equal(getUpdateCalls(), 0);
});
