/**
 * Executar com: node --experimental-test-module-mocks --import ./.tmp/preload-ts-loader.mjs --test src/app/api/admin/clients/__tests__/restore-route.behavioral.test.ts
 * (fora de [id]/ pelo mesmo motivo do archive-route.behavioral.test.ts:
 * `node --test` interpreta colchetes no caminho como glob.)
 * Sprint Legacy Security Hardening V2 (PROMPT 04E, Fase 7/11/28-29):
 * chama o handler POST REAL de
 * src/app/api/admin/clients/[id]/restore/route.ts.
 */
import { test, mock, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { makeMockSupabaseClient, DENIED, RPC_MISSING, UNKNOWN_DB_ERROR, OK } from "../../../../../lib/supabase/__tests__/test-helpers/mock-supabase.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(mock.module as any)("@/lib/workspaces/assert-not-preview", {
  exports: {
    withMutationProtection: (handler: (...args: unknown[]) => unknown) => handler,
    assertWorkspaceMutationAllowed: async () => null,
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function req(): any {
  return new Request("http://x/api/admin/clients/x/restore", { method: "POST" });
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

async function loadRouteWith(t: TestContext, opts: Parameters<typeof makeMockSupabaseClient>[0]) {
  const mocked = makeMockSupabaseClient(opts);
  const adminMocked = makeMockSupabaseClient(opts);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (t.mock.module as any)("@/lib/supabase/server", {
    exports: {
      createServerSupabaseClient: async () => mocked.client,
      createSupabaseAdminClient: () => adminMocked.client,
      createRequiredSupabaseAdminClient: () => adminMocked.client,
      hasSupabaseServiceRoleKey: () => true,
    },
  });
  const mod = await import(`../[id]/restore/route.ts?t=${Date.now()}-${Math.random()}`);
  return { POST: mod.POST, session: mocked, admin: adminMocked };
}

const ADMIN_A = { id: "admin-a", email: "admin-a@example.com" };
const COMPANY_A = "company-a";
const COMPANY_B = "company-b";

test("restore: admin autorizado (RPC sucede) -- permitido, sem fallback", async (t) => {
  const { POST, admin } = await loadRouteWith(t, {
    user: ADMIN_A,
    profileRole: "admin",
    rpcResults: { admin_restore_client: OK(true) },
  });
  const res = await POST(req(), ctx(COMPANY_A));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.restored, true);
  assert.equal(admin.fromCalls.length, 0);
});

test("restore: RPC nega autorização (cross-company) -- 403, fallback NUNCA chamado", async (t) => {
  const { POST, admin } = await loadRouteWith(t, {
    user: ADMIN_A,
    profileRole: "admin",
    rpcResults: { admin_restore_client: DENIED },
  });
  const res = await POST(req(), ctx(COMPANY_B));
  const body = await res.json();
  assert.equal(res.status, 403);
  assert.equal(body.code, "AUTHORIZATION_DENIED");
  assert.equal(admin.fromCalls.filter((c) => c.op === "update").length, 0, "negação é FINAL -- admin.from('clients').update NÃO chamado");
});

test("restore: erro de RPC desconhecido -- fail closed, fallback NÃO chamado", async (t) => {
  const { POST, admin } = await loadRouteWith(t, {
    user: ADMIN_A,
    profileRole: "admin",
    rpcResults: { admin_restore_client: UNKNOWN_DB_ERROR },
  });
  const res = await POST(req(), ctx(COMPANY_A));
  assert.equal(res.status, 400);
  assert.equal(admin.fromCalls.filter((c) => c.op === "update").length, 0);
});

test("restore: RPC indisponível + autorização independente TRUE -- fallback técnico executa (não estava na lixeira, status preservado)", async (t) => {
  const { POST, admin } = await loadRouteWith(t, {
    user: ADMIN_A,
    profileRole: "admin",
    rpcResults: { admin_restore_client: RPC_MISSING, can_access_client: OK(true) },
    fromResults: { clients: { select: OK({ deleted_at: null }), update: OK() } },
  });
  const res = await POST(req(), ctx(COMPANY_A));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.restored, true);
  const updateCalls = admin.fromCalls.filter((c) => c.op === "update");
  assert.equal(updateCalls.length, 1);
  const payload = updateCalls[0]?.payload as Record<string, unknown>;
  assert.equal("status" in payload, false, "não veio da lixeira -- status não deve ser tocado");
  assert.equal(payload.archived_at, null);
  assert.equal(payload.deleted_at, null);
});

test("restore: RPC indisponível + autorização independente TRUE -- fallback técnico executa (estava na lixeira, status volta para onboarding)", async (t) => {
  const { POST, admin } = await loadRouteWith(t, {
    user: ADMIN_A,
    profileRole: "admin",
    rpcResults: { admin_restore_client: RPC_MISSING, can_access_client: OK(true) },
    fromResults: { clients: { select: OK({ deleted_at: "2026-08-01T00:00:00.000Z" }), update: OK() } },
  });
  const res = await POST(req(), ctx(COMPANY_A));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.restored, true);
  const updateCalls = admin.fromCalls.filter((c) => c.op === "update");
  assert.equal(updateCalls.length, 1);
  const payload = updateCalls[0]?.payload as Record<string, unknown>;
  assert.equal(payload.status, "onboarding", "veio da lixeira -- status conservador onboarding, nunca adivinhado");
  assert.equal(payload.archived_at, null);
  assert.equal(payload.deleted_at, null);
});

test("restore: RPC indisponível + autorização independente TRUE -- registro não encontrado no lookup -- 404, sem mutação", async (t) => {
  const { POST, admin } = await loadRouteWith(t, {
    user: ADMIN_A,
    profileRole: "admin",
    rpcResults: { admin_restore_client: RPC_MISSING, can_access_client: OK(true) },
    fromResults: { clients: { select: OK(null) } },
  });
  const res = await POST(req(), ctx(COMPANY_A));
  assert.equal(res.status, 404);
  assert.equal(admin.fromCalls.filter((c) => c.op === "update").length, 0);
});

test("restore: RPC indisponível + autorização independente FALSE -- nenhuma mutação, 403", async (t) => {
  const { POST, admin } = await loadRouteWith(t, {
    user: ADMIN_A,
    profileRole: "admin",
    rpcResults: { admin_restore_client: RPC_MISSING, can_access_client: OK(false) },
  });
  const res = await POST(req(), ctx(COMPANY_B));
  assert.equal(res.status, 403);
  assert.equal(admin.fromCalls.filter((c) => c.op === "update").length, 0, "service_role disponível não implica autorização");
});

test("restore: RPC indisponível + autorização independente com erro (null) -- fail closed", async (t) => {
  const { POST, admin } = await loadRouteWith(t, {
    user: ADMIN_A,
    profileRole: "admin",
    rpcResults: { admin_restore_client: RPC_MISSING, can_access_client: { data: null, error: { message: "boom" } } },
  });
  const res = await POST(req(), ctx(COMPANY_B));
  assert.equal(res.status, 403);
  assert.equal(admin.fromCalls.filter((c) => c.op === "update").length, 0);
});

test("restore: role sem permissão -- 403 antes de qualquer RPC", async (t) => {
  const { POST, session } = await loadRouteWith(t, {
    user: ADMIN_A,
    profileRole: "operacional",
  });
  const res = await POST(req(), ctx(COMPANY_A));
  assert.equal(res.status, 403);
  assert.equal(session.rpcCalls.some((c) => c.fn === "admin_restore_client"), false);
});
