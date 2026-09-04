/**
 * Executar com: node --experimental-test-module-mocks --import ./.tmp/preload-ts-loader.mjs --test src/app/api/rec-os/feed-dna/__tests__/feed-dna-route.behavioral.test.ts
 * Prompt 16 (REC OS Persistence Completion) — chama os handlers GET/PUT
 * REAIS de src/app/api/rec-os/feed-dna/route.ts, mockando só
 * resolveCompanyContext(), o client Supabase e o repository de feed-dna
 * (testado à parte em feed-dna.structural.test.ts).
 */
import { test, mock, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(mock.module as any)("@/lib/workspaces/assert-not-preview", {
  exports: { withMutationProtection: (handler: (...args: unknown[]) => unknown) => handler },
});

function getReq(clientId: string | null) {
  const url = clientId ? `http://x/api/rec-os/feed-dna?client_id=${clientId}` : "http://x/api/rec-os/feed-dna";
  return new NextRequest(url);
}
function putReq(body: unknown) {
  return new NextRequest("http://x/api/rec-os/feed-dna", { method: "PUT", body: JSON.stringify(body) });
}

async function loadRouteWith(t: TestContext, opts: {
  resolution?: { valid: boolean; reason?: string; context: { companyId: string; companyName: string | null; workspaceId: string | null; readOnly?: boolean } | null };
  currentUser?: { id: string } | null;
  resolveResult?: unknown;
  saveResult?: unknown;
}) {
  let saveCalls = 0;
  let lastSaveInput: unknown = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (t.mock.module as any)("@/lib/company-context/resolve", {
    exports: { resolveCompanyContext: async () => opts.resolution ?? { valid: false, reason: "not_authenticated", context: null } },
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
  (t.mock.module as any)("@/lib/rec-os/social-profile/feed-dna", {
    exports: {
      resolveFeedDnaProfile: async () => opts.resolveResult ?? { status: "unset", companyId: "company-a" },
      saveManualFeedDna: async (_db: unknown, input: unknown) => {
        saveCalls++;
        lastSaveInput = input;
        return opts.saveResult ?? { ok: true, profile: { id: "fdna-1", companyId: "company-a", patternType: "ALTERNATING", userOverride: true, source: "manual" } };
      },
    },
  });
  const mod = await import(`../route.ts?t=${Date.now()}-${Math.random()}`);
  return { GET: mod.GET, PUT: mod.PUT, getSaveCalls: () => saveCalls, getLastSaveInput: () => lastSaveInput };
}

test("[GET] sem client_id -- 400, nunca resolve", async (t) => {
  const { GET } = await loadRouteWith(t, {});
  const res = await GET(getReq(null));
  assert.equal(res.status, 400);
});

test("[GET] company autorizada -- 200, devolve o resultado do resolver", async (t) => {
  const { GET } = await loadRouteWith(t, {
    resolution: { valid: true, context: { companyId: "company-a", companyName: "A", workspaceId: "ws-1" } },
    resolveResult: { status: "resolved", profile: { id: "fdna-1", companyId: "company-a", patternType: "CHECKERBOARD" } },
  });
  const res = await GET(getReq("company-a"));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.result.status, "resolved");
  assert.equal(body.result.profile.patternType, "CHECKERBOARD");
});

test("[GET] cross-company negado -- 403, código explícito", async (t) => {
  const { GET } = await loadRouteWith(t, { resolution: { valid: false, reason: "role_not_supported", context: null } });
  const res = await GET(getReq("company-b"));
  const body = await res.json();
  assert.equal(res.status, 403);
  assert.equal(body.code, "FEED_DNA_UNAUTHORIZED");
});

test("[GET] sem sessão -- 401", async (t) => {
  const { GET } = await loadRouteWith(t, { resolution: { valid: false, reason: "not_authenticated", context: null } });
  const res = await GET(getReq("company-a"));
  assert.equal(res.status, 401);
});

test("[PUT] patternType inválido -- 400, saveManualFeedDna nunca chamado", async (t) => {
  const { PUT, getSaveCalls } = await loadRouteWith(t, { resolution: { valid: true, context: { companyId: "company-a", companyName: "A", workspaceId: "ws-1" } } });
  const res = await PUT(putReq({ clientId: "company-a", patternType: "NAO_EXISTE" }));
  assert.equal(res.status, 400);
  assert.equal(getSaveCalls(), 0);
});

test("[PUT] company autorizada -- 200, saveManualFeedDna chamado com companyId JÁ RESOLVIDO (nunca o bruto do input) e updatedBy do usuário real", async (t) => {
  const { PUT, getSaveCalls, getLastSaveInput } = await loadRouteWith(t, {
    resolution: { valid: true, context: { companyId: "company-a-resolvido", companyName: "A", workspaceId: "ws-1" } },
    currentUser: { id: "user-real-1" },
  });
  const res = await PUT(putReq({ clientId: "company-b-nunca-confiavel", patternType: "ALTERNATING", dominantPalette: ["#111"] }));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.equal(getSaveCalls(), 1);
  const input = getLastSaveInput() as { companyId: string; updatedBy: string };
  assert.equal(input.companyId, "company-a-resolvido", "companyId vem do resolver autorizado, nunca do body bruto do cliente");
  assert.equal(input.updatedBy, "user-real-1", "updatedBy vem da sessão real, nunca do body");
});

test("[PUT] cross-company negado -- 403, saveManualFeedDna nunca chamado", async (t) => {
  const { PUT, getSaveCalls } = await loadRouteWith(t, { resolution: { valid: false, reason: "role_not_supported", context: null } });
  const res = await PUT(putReq({ clientId: "company-b", patternType: "FREE" }));
  const body = await res.json();
  assert.equal(res.status, 403);
  assert.equal(body.code, "FEED_DNA_UNAUTHORIZED");
  assert.equal(getSaveCalls(), 0);
});

test("[PUT] contexto readOnly (preview) -- 403, nunca grava", async (t) => {
  const { PUT, getSaveCalls } = await loadRouteWith(t, {
    resolution: { valid: true, context: { companyId: "company-a", companyName: "A", workspaceId: "ws-1", readOnly: true } },
  });
  const res = await PUT(putReq({ clientId: "company-a", patternType: "FREE" }));
  const body = await res.json();
  assert.equal(res.status, 403);
  assert.equal(body.code, "FEED_DNA_READ_ONLY");
  assert.equal(getSaveCalls(), 0);
});

test("[PUT] sem sessão -- 401, saveManualFeedDna nunca chamado", async (t) => {
  const { PUT, getSaveCalls } = await loadRouteWith(t, { resolution: { valid: false, reason: "not_authenticated", context: null } });
  const res = await PUT(putReq({ clientId: "company-a", patternType: "FREE" }));
  assert.equal(res.status, 401);
  assert.equal(getSaveCalls(), 0);
});

test("[PUT] tabela ainda não configurada -- 503, mensagem sanitizada repassada", async (t) => {
  const { PUT } = await loadRouteWith(t, {
    resolution: { valid: true, context: { companyId: "company-a", companyName: "A", workspaceId: "ws-1" } },
    saveResult: { ok: false, code: "FEED_DNA_STORAGE_NOT_CONFIGURED", error: "O armazenamento de Feed DNA ainda não foi configurado neste ambiente." },
  });
  const res = await PUT(putReq({ clientId: "company-a", patternType: "FREE" }));
  const body = await res.json();
  assert.equal(res.status, 503);
  assert.equal(body.code, "FEED_DNA_STORAGE_NOT_CONFIGURED");
});
