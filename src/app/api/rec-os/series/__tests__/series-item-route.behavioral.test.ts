/**
 * Executar com: node --experimental-test-module-mocks --import ./.tmp/preload-ts-loader.mjs --test src/app/api/rec-os/series/__tests__/series-item-route.behavioral.test.ts
 * Prompt 18 (Creative Series Control & Asset Link Repair) — PATCH real
 * de src/app/api/rec-os/series/[seriesId]/items/[itemId]/route.ts
 * (fora da pasta com colchetes pelo mesmo motivo do teste irmão de
 * hidratação). Cobre a máquina de estado reescrita (P1-B) e o vínculo
 * real de asset via persistGeneratedSeriesItemAsset (P1-C).
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

function seriesFixture(clientId: string | null, itemStatus: string, visualAssetId: string | null = null) {
  return {
    series: { id: "series-1", clientId, contentId: null, campaignId: null, title: null, count: 3, placement: null, format: null, creativeDirection: null, status: "generating", createdBy: "user-1", createdAt: "x", updatedAt: "x" },
    items: [
      { id: "item-1", position: 1, role: "Peça 1", brief: "x", status: itemStatus, visualAssetId, image: null, error: null },
      { id: "item-2", position: 2, role: "Peça 2", brief: "x", status: "planned", visualAssetId: null, image: null, error: null },
    ],
  };
}

async function loadRouteWith(t: TestContext, opts: {
  hydrateResult?: unknown;
  statusUpdateResult?: boolean;
  persistResult?: unknown;
}) {
  let statusUpdateCalls = 0;
  let lastStatusUpdateInput: unknown = null;
  let persistCalls = 0;
  let lastPersistInput: unknown = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (t.mock.module as any)("@/lib/supabase/server", {
    exports: { createServerSupabaseClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) } }) },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (t.mock.module as any)("@/lib/rec-os/studio/series/repository", {
    exports: {
      getCreativeSeriesWithItems: async () => (opts.hydrateResult === undefined ? seriesFixture("company-a", "planned") : opts.hydrateResult),
      updateCreativeSeriesItemStatus: async (_db: unknown, _itemId: string, input: unknown) => {
        statusUpdateCalls++;
        lastStatusUpdateInput = input;
        return opts.statusUpdateResult ?? true;
      },
      recomputeSeriesStatus: async () => {},
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (t.mock.module as any)("@/lib/rec-os/studio/series/asset-persistence", {
    exports: {
      persistGeneratedSeriesItemAsset: async (_db: unknown, input: unknown) => {
        persistCalls++;
        lastPersistInput = input;
        return opts.persistResult ?? { ok: true, assetId: "asset-1", signedUrl: "https://signed/x.png" };
      },
    },
  });
  const mod = await import(`../[seriesId]/items/[itemId]/route.ts?t=${Date.now()}-${Math.random()}`);
  return {
    PATCH: mod.PATCH,
    getStatusUpdateCalls: () => statusUpdateCalls, getLastStatusUpdateInput: () => lastStatusUpdateInput,
    getPersistCalls: () => persistCalls, getLastPersistInput: () => lastPersistInput,
  };
}

test("[PATCH] status inválido -- 400, nunca chega no repository", async (t) => {
  const { PATCH, getStatusUpdateCalls } = await loadRouteWith(t, {});
  const res = await PATCH(patchReq({ status: "nao_existe" }), paramsFor("series-1", "item-1"));
  assert.equal(res.status, 400);
  assert.equal(getStatusUpdateCalls(), 0);
});

test("[PATCH] item de série de outra Company (RLS null) -- 404, nunca revela existência", async (t) => {
  const { PATCH, getStatusUpdateCalls } = await loadRouteWith(t, { hydrateResult: null });
  const res = await PATCH(patchReq({ status: "generating" }), paramsFor("series-outra-company", "item-1"));
  const body = await res.json();
  assert.equal(res.status, 404);
  assert.equal(body.code, "SERIES_ITEM_NOT_FOUND");
  assert.equal(getStatusUpdateCalls(), 0);
});

test("[PATCH] planned -> generating -- 200, permitido", async (t) => {
  const { PATCH, getStatusUpdateCalls, getLastStatusUpdateInput } = await loadRouteWith(t, { hydrateResult: seriesFixture("company-a", "planned") });
  const res = await PATCH(patchReq({ status: "generating" }), paramsFor("series-1", "item-1"));
  assert.equal(res.status, 200);
  assert.equal(getStatusUpdateCalls(), 1);
  assert.equal((getLastStatusUpdateInput() as { status: string }).status, "generating");
});

test("[PATCH] generating -> generating (item já em voo) -- 409, nunca reinicia", async (t) => {
  const { PATCH, getStatusUpdateCalls } = await loadRouteWith(t, { hydrateResult: seriesFixture("company-a", "generating") });
  const res = await PATCH(patchReq({ status: "generating" }), paramsFor("series-1", "item-1"));
  const body = await res.json();
  assert.equal(res.status, 409);
  assert.equal(body.code, "SERIES_ITEM_INVALID_TRANSITION");
  assert.equal(getStatusUpdateCalls(), 0);
});

test("[PATCH] cancelar item 'generating' (P1-B) -- 409, NUNCA cancela request em voo", async (t) => {
  const { PATCH, getStatusUpdateCalls } = await loadRouteWith(t, { hydrateResult: seriesFixture("company-a", "generating") });
  const res = await PATCH(patchReq({ status: "canceled" }), paramsFor("series-1", "item-1"));
  const body = await res.json();
  assert.equal(res.status, 409);
  assert.equal(body.code, "SERIES_ITEM_NOT_CANCELABLE");
  assert.equal(getStatusUpdateCalls(), 0);
});

test("[PATCH] cancelar item 'planned' -- 200, permitido", async (t) => {
  const { PATCH, getStatusUpdateCalls } = await loadRouteWith(t, { hydrateResult: seriesFixture("company-a", "planned") });
  const res = await PATCH(patchReq({ status: "canceled" }), paramsFor("series-1", "item-1"));
  assert.equal(res.status, 200);
  assert.equal(getStatusUpdateCalls(), 1);
});

test("[PATCH] reativar (error -> planned) -- 200, permitido", async (t) => {
  const { PATCH, getStatusUpdateCalls } = await loadRouteWith(t, { hydrateResult: seriesFixture("company-a", "error") });
  const res = await PATCH(patchReq({ status: "planned" }), paramsFor("series-1", "item-1"));
  assert.equal(res.status, 200);
  assert.equal(getStatusUpdateCalls(), 1);
});

test("[PATCH] ready -> planned -- 409, regenerate de item ready NUNCA passa por essa transição", async (t) => {
  const { PATCH, getStatusUpdateCalls } = await loadRouteWith(t, { hydrateResult: seriesFixture("company-a", "ready", "asset-old") });
  const res = await PATCH(patchReq({ status: "planned" }), paramsFor("series-1", "item-1"));
  const body = await res.json();
  assert.equal(res.status, 409);
  assert.equal(body.code, "SERIES_ITEM_INVALID_TRANSITION");
  assert.equal(getStatusUpdateCalls(), 0);
});

test("[PATCH][TEST 07] ready com imageDataUrl (Company-scoped) -- persistGeneratedSeriesItemAsset chamado, visual_asset_id devolvido, status=ready", async (t) => {
  const { PATCH, getPersistCalls, getLastPersistInput, getStatusUpdateCalls } = await loadRouteWith(t, { hydrateResult: seriesFixture("company-a", "generating") });
  const res = await PATCH(patchReq({ status: "ready", imageDataUrl: "data:image/png;base64,ZmFrZQ==" }), paramsFor("series-1", "item-1"));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.assetId, "asset-1");
  assert.equal(getPersistCalls(), 1, "asset link real acontece via persistGeneratedSeriesItemAsset, nunca um update solto de status");
  assert.equal(getStatusUpdateCalls(), 0, "quando o asset persiste com sucesso, updateCreativeSeriesItemStatus NUNCA é chamado duas vezes -- persistGeneratedSeriesItemAsset já marca ready");
  const input = getLastPersistInput() as { clientId: string; seriesItemId: string; previousAssetId: string | null };
  assert.equal(input.clientId, "company-a", "clientId vem da série já autorizada por RLS, nunca do body");
  assert.equal(input.seriesItemId, "item-1");
  assert.equal(input.previousAssetId, null, "sem asset anterior neste item");
});

test("[PATCH][TEST 12] regenerate com asset anterior -- previousAssetId repassado pro atomic swap", async (t) => {
  const { PATCH, getLastPersistInput } = await loadRouteWith(t, { hydrateResult: seriesFixture("company-a", "ready", "asset-old-1") });
  await PATCH(patchReq({ status: "ready", imageDataUrl: "data:image/png;base64,ZmFrZQ==" }), paramsFor("series-1", "item-1"));
  const input = getLastPersistInput() as { previousAssetId: string | null };
  assert.equal(input.previousAssetId, "asset-old-1", "asset anterior repassado pro atomic swap (remoção só depois do novo linkado)");
});

test("[PATCH][TEST 08] falha ao persistir asset (Company-scoped) -- item NUNCA termina ready, vira error explícito", async (t) => {
  const { PATCH, getStatusUpdateCalls, getLastStatusUpdateInput } = await loadRouteWith(t, {
    hydrateResult: seriesFixture("company-a", "generating"),
    persistResult: { ok: false, code: "UPLOAD_FAILED", error: "Armazenamento de assets indisponível neste ambiente." },
  });
  const res = await PATCH(patchReq({ status: "ready", imageDataUrl: "data:image/png;base64,ZmFrZQ==" }), paramsFor("series-1", "item-1"));
  const body = await res.json();
  assert.equal(res.status, 502);
  assert.equal(body.ok, false);
  assert.equal(getStatusUpdateCalls(), 1, "item marcado explicitamente");
  assert.equal((getLastStatusUpdateInput() as { status: string }).status, "error", "NUNCA fica 'ready' sem o vínculo real -- vira 'error' (Test 08)");
});

test("[PATCH] Free Mode (série sem clientId) -- nunca chama persistGeneratedSeriesItemAsset, mesmo com imageDataUrl", async (t) => {
  const freeSeries = seriesFixture(null, "generating");
  const { PATCH, getPersistCalls, getStatusUpdateCalls } = await loadRouteWith(t, { hydrateResult: freeSeries });
  const res = await PATCH(patchReq({ status: "ready", imageDataUrl: "data:image/png;base64,ZmFrZQ==" }), paramsFor("series-1", "item-1"));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.assetPersisted, false);
  assert.equal(getPersistCalls(), 0, "Free Mode nunca persiste asset (Fase 35)");
  assert.equal(getStatusUpdateCalls(), 1, "mas o status ainda vira ready via update simples");
});

test("[PATCH] ready sem imageDataUrl -- 400, nunca aceito", async (t) => {
  const { PATCH, getPersistCalls, getStatusUpdateCalls } = await loadRouteWith(t, { hydrateResult: seriesFixture("company-a", "generating") });
  const res = await PATCH(patchReq({ status: "ready" }), paramsFor("series-1", "item-1"));
  assert.equal(res.status, 400);
  assert.equal(getPersistCalls(), 0);
  assert.equal(getStatusUpdateCalls(), 0);
});

test("[PATCH] error com mensagem -- 200, persistido, imageDataUrl nunca exigido", async (t) => {
  const { PATCH, getLastStatusUpdateInput } = await loadRouteWith(t, { hydrateResult: seriesFixture("company-a", "generating") });
  const res = await PATCH(patchReq({ status: "error", errorMessage: "provider indisponível" }), paramsFor("series-1", "item-1"));
  assert.equal(res.status, 200);
  const input = getLastStatusUpdateInput() as { status: string; error: string };
  assert.equal(input.status, "error");
  assert.equal(input.error, "provider indisponível");
});

test("[PATCH] itemId não pertence à série -- 404, nunca atualiza item errado", async (t) => {
  const { PATCH, getStatusUpdateCalls } = await loadRouteWith(t, { hydrateResult: seriesFixture("company-a", "planned") });
  const res = await PATCH(patchReq({ status: "generating" }), paramsFor("series-1", "item-que-nao-existe-nesta-serie"));
  assert.equal(res.status, 404);
  assert.equal(getStatusUpdateCalls(), 0);
});

test("[PATCH] imageDataUrl gigante -- 400, nunca processado", async (t) => {
  const { PATCH, getPersistCalls } = await loadRouteWith(t, { hydrateResult: seriesFixture("company-a", "generating") });
  const huge = "data:image/png;base64," + "A".repeat(9_000_000);
  const res = await PATCH(patchReq({ status: "ready", imageDataUrl: huge }), paramsFor("series-1", "item-1"));
  assert.equal(res.status, 400);
  assert.equal(getPersistCalls(), 0);
});
