/**
 * Executar com: node --experimental-test-module-mocks --import ./.tmp/preload-ts-loader.mjs --test src/app/api/rec-os/series/__tests__/series-route.behavioral.test.ts
 * Prompt 16 (REC OS Persistence Completion) — chama os handlers
 * POST/GET REAIS de src/app/api/rec-os/series/route.ts, mockando
 * resolveCompanyContext(), getCurrentUser(), o client Supabase e o
 * repository de séries (testado quanto a shape SQL via Supabase MCP
 * read-only nesta sprint).
 */
import { test, mock, type TestContext } from "node:test";
import assert from "node:assert/strict";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(mock.module as any)("@/lib/workspaces/assert-not-preview", {
  exports: { withMutationProtection: (handler: (...args: unknown[]) => unknown) => handler },
});

function postReq(body: unknown) {
  return new Request("http://x/api/rec-os/series", { method: "POST", body: JSON.stringify(body) });
}
function getReq(qs: string) {
  return new Request(`http://x/api/rec-os/series${qs}`);
}

async function loadRouteWith(t: TestContext, opts: {
  resolution?: { valid: boolean; reason?: string; context: { companyId: string; companyName: string | null; workspaceId: string | null; readOnly?: boolean } | null };
  currentUser?: { id: string } | null;
  createResult?: unknown;
  recentResult?: unknown;
}) {
  let createCalls = 0;
  let lastCreateInput: unknown = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (t.mock.module as any)("@/lib/company-context/resolve", {
    exports: { resolveCompanyContext: async () => opts.resolution ?? { valid: false, reason: "not_authenticated", context: null } },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (t.mock.module as any)("@/lib/auth/get-current-user", {
    exports: { getCurrentUser: async () => (opts.currentUser === undefined ? { id: "user-1" } : opts.currentUser) },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (t.mock.module as any)("@/lib/supabase/server", {
    exports: {
      createServerSupabaseClient: async () => ({
        auth: { getUser: async () => ({ data: { user: opts.currentUser === undefined ? { id: "user-1" } : opts.currentUser } }) },
      }),
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (t.mock.module as any)("@/lib/rec-os/studio/series/repository", {
    exports: {
      createCreativeSeries: async (_db: unknown, input: unknown) => {
        createCalls++;
        lastCreateInput = input;
        return opts.createResult ?? { ok: true, series: { series: { id: "series-1", count: 3 }, items: [{ id: "item-1", position: 1, role: "Peça 1", brief: "x", status: "planned", image: null, error: null }] } };
      },
      findRecentCreativeSeries: async () => opts.recentResult ?? null,
    },
  });
  const mod = await import(`../route.ts?t=${Date.now()}-${Math.random()}`);
  return { POST: mod.POST, GET: mod.GET, getCreateCalls: () => createCalls, getLastCreateInput: () => lastCreateInput };
}

test("[POST] Company Mode autorizado -- 200, createCreativeSeries chamado com clientId JÁ RESOLVIDO (nunca o bruto do body)", async (t) => {
  const { POST, getCreateCalls, getLastCreateInput } = await loadRouteWith(t, {
    resolution: { valid: true, context: { companyId: "company-real", companyName: "A", workspaceId: "ws-1" } },
  });
  const res = await POST(postReq({ clientId: "company-fake-nunca-confiavel", freeformBrief: "brief", count: 6 }));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.equal(getCreateCalls(), 1);
  const input = getLastCreateInput() as { clientId: string; itemBriefs: unknown[] };
  assert.equal(input.clientId, "company-real", "clientId vem do resolver autorizado, nunca do body bruto");
  assert.equal(input.itemBriefs.length, 6, "6 itens preparados pra 6 rows independentes, nunca 1 mosaico");
});

test("[POST] cross-company negado -- 403, createCreativeSeries NUNCA chamado", async (t) => {
  const { POST, getCreateCalls } = await loadRouteWith(t, { resolution: { valid: false, reason: "role_not_supported", context: null } });
  const res = await POST(postReq({ clientId: "company-b", freeformBrief: "brief", count: 3 }));
  const body = await res.json();
  assert.equal(res.status, 403);
  assert.equal(body.code, "SERIES_UNAUTHORIZED");
  assert.equal(getCreateCalls(), 0);
});

test("[POST] Free Mode -- usuário autenticado, sem clientId -- 200, clientId enviado ao repository é null (owner = created_by)", async (t) => {
  const { POST, getLastCreateInput } = await loadRouteWith(t, { currentUser: { id: "user-free-1" } });
  const res = await POST(postReq({ freeformBrief: "brief", count: 1 }));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  const input = getLastCreateInput() as { clientId: string | null; createdBy: string };
  assert.equal(input.clientId, null, "Free Mode nunca cria Company fictícia");
  assert.equal(input.createdBy, "user-free-1", "owner é o próprio usuário");
});

test("[POST] Free Mode sem sessão -- 401, createCreativeSeries nunca chamado", async (t) => {
  const { POST, getCreateCalls } = await loadRouteWith(t, { currentUser: null });
  const res = await POST(postReq({ freeformBrief: "brief", count: 1 }));
  assert.equal((await res.json()).ok, false);
  assert.equal(res.status, 401);
  assert.equal(getCreateCalls(), 0);
});

test("[POST] count inválido -- 400, nunca chega no repository", async (t) => {
  const { POST, getCreateCalls } = await loadRouteWith(t, { currentUser: { id: "user-1" } });
  for (const count of [2, 4, 0, -1, 100]) {
    const res = await POST(postReq({ freeformBrief: "brief", count }));
    assert.equal(res.status, 400, `count=${count} deve ser rejeitado`);
  }
  assert.equal(getCreateCalls(), 0);
});

test("[POST] freeformBrief vazio -- 400", async (t) => {
  const { POST } = await loadRouteWith(t, { currentUser: { id: "user-1" } });
  const res = await POST(postReq({ freeformBrief: "   ", count: 3 }));
  assert.equal(res.status, 400);
});

test("[POST] contexto readOnly (preview) -- 403, nunca cria série", async (t) => {
  const { POST, getCreateCalls } = await loadRouteWith(t, {
    resolution: { valid: true, context: { companyId: "company-a", companyName: "A", workspaceId: "ws-1", readOnly: true } },
  });
  const res = await POST(postReq({ clientId: "company-a", freeformBrief: "brief", count: 3 }));
  const body = await res.json();
  assert.equal(res.status, 403);
  assert.equal(body.code, "SERIES_READ_ONLY");
  assert.equal(getCreateCalls(), 0);
});

test("[POST] falha de atomicidade no repository -- 500, erro explícito repassado", async (t) => {
  const { POST } = await loadRouteWith(t, {
    currentUser: { id: "user-1" },
    createResult: { ok: false, error: "Não foi possível criar os itens da série agora." },
  });
  const res = await POST(postReq({ freeformBrief: "brief", count: 6 }));
  const body = await res.json();
  assert.equal(res.status, 500);
  assert.equal(body.code, "SERIES_CREATE_FAILED");
});

test("[GET] Company Mode -- cross-company negado, findRecentCreativeSeries nunca chamado implicitamente exposto", async (t) => {
  const { GET } = await loadRouteWith(t, { resolution: { valid: false, reason: "role_not_supported", context: null } });
  const res = await GET(getReq("?client_id=company-b"));
  const body = await res.json();
  assert.equal(res.status, 403);
  assert.equal(body.code, "SERIES_UNAUTHORIZED");
});

test("[GET] Free Mode sem sessão -- 401", async (t) => {
  const { GET } = await loadRouteWith(t, { currentUser: null });
  const res = await GET(getReq(""));
  assert.equal(res.status, 401);
});

test("[GET] série recente encontrada -- 200, devolve a série", async (t) => {
  const { GET } = await loadRouteWith(t, {
    currentUser: { id: "user-1" },
    recentResult: { series: { id: "series-1", count: 3 }, items: [] },
  });
  const res = await GET(getReq(""));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.series.series.id, "series-1");
});
