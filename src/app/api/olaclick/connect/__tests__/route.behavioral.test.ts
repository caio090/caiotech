/**
 * Executar com: node --experimental-test-module-mocks --import ./.tmp/preload-ts-loader.mjs --test src/app/api/olaclick/connect/__tests__/route.behavioral.test.ts
 * Sprint Legacy Security Hardening V2 (PROMPT 04E, Fase 10/11/28-29):
 * chama o handler DELETE REAL de src/app/api/olaclick/connect/route.ts.
 * Mesma matriz do Meta DELETE. Nota (Fase 10): client_read_own_olaclick
 * é uma RLS policy separada do portal do cliente (SELECT direto,
 * documentada no rollback) -- não é exercida por esta rota admin (que
 * sempre passa por can_access_client), então não há nada a testar aqui
 * sobre ela além de confirmar que este DELETE nunca depende dela.
 */
import { test, mock, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { makeMockSupabaseClient, OK } from "../../../../../lib/supabase/__tests__/test-helpers/mock-supabase.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(mock.module as any)("@/lib/workspaces/assert-not-preview", {
  exports: {
    withMutationProtection: (handler: (...args: unknown[]) => unknown) => handler,
    assertWorkspaceMutationAllowed: async () => null,
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function req(id?: string): any {
  const url = id ? `http://x/api/olaclick/connect?id=${id}` : "http://x/api/olaclick/connect";
  return new Request(url, { method: "DELETE" });
}

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
  const mod = await import(`../route.ts?t=${Date.now()}-${Math.random()}`);
  return { DELETE: mod.DELETE, session: mocked, admin: adminMocked };
}

const ADMIN_A = { id: "admin-a", email: "admin-a@example.com" };
const CONN_ID = "conn-1";

function deleteCalls(m: { fromCalls: { table: string; op: string }[] }) {
  return m.fromCalls.filter((c) => c.table === "olaclick_connections" && c.op === "delete");
}

test("olaclick delete: lookup própria Company + autorizado -- permitido", async (t) => {
  const { DELETE, admin } = await loadRouteWith(t, {
    user: ADMIN_A,
    profileRole: "admin",
    rpcResults: { can_access_client: OK(true) },
    fromResults: {
      olaclick_connections: { select: OK({ client_id: "company-a" }), delete: OK() },
    },
  });
  const res = await DELETE(req(CONN_ID));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.equal(deleteCalls(admin).length, 1);
});

test("olaclick delete: cross-company (can_access_client=false) -- 403, DELETE NUNCA chamado", async (t) => {
  const { DELETE, admin, session } = await loadRouteWith(t, {
    user: ADMIN_A,
    profileRole: "admin",
    rpcResults: { can_access_client: OK(false) },
    fromResults: { olaclick_connections: { select: OK({ client_id: "company-b" }) } },
  });
  const res = await DELETE(req(CONN_ID));
  const body = await res.json();
  assert.equal(res.status, 403);
  assert.equal(body.reason, "forbidden");
  assert.equal(deleteCalls(admin).length + deleteCalls(session).length, 0);
});

test("olaclick delete: registro não encontrado -- 404, NUNCA prossegue para delete", async (t) => {
  const { DELETE, admin, session } = await loadRouteWith(t, {
    user: ADMIN_A,
    profileRole: "admin",
    fromResults: { olaclick_connections: { select: OK(null) } },
  });
  const res = await DELETE(req(CONN_ID));
  const body = await res.json();
  assert.equal(res.status, 404);
  assert.equal(body.reason, "not_found");
  assert.equal(deleteCalls(admin).length + deleteCalls(session).length, 0);
});

test("olaclick delete: client_id ausente -- fail closed, 403", async (t) => {
  const { DELETE, admin, session } = await loadRouteWith(t, {
    user: ADMIN_A,
    profileRole: "admin",
    fromResults: { olaclick_connections: { select: OK({ client_id: null }) } },
  });
  const res = await DELETE(req(CONN_ID));
  const body = await res.json();
  assert.equal(res.status, 403);
  assert.equal(body.reason, "forbidden");
  assert.equal(deleteCalls(admin).length + deleteCalls(session).length, 0);
});

test("olaclick delete: erro no lookup -- fail closed, NUNCA prossegue para delete", async (t) => {
  const { DELETE, admin, session } = await loadRouteWith(t, {
    user: ADMIN_A,
    profileRole: "admin",
    fromResults: { olaclick_connections: { select: { data: null, error: { message: "db down" } } } },
  });
  const res = await DELETE(req(CONN_ID));
  assert.notEqual(res.status, 200);
  assert.equal(deleteCalls(admin).length + deleteCalls(session).length, 0, "erro de lookup nunca autoriza implicitamente");
});

test("olaclick delete: id ausente na query -- 400, sem qualquer lookup/delete", async (t) => {
  const { DELETE, session } = await loadRouteWith(t, {
    user: ADMIN_A,
    profileRole: "admin",
  });
  const res = await DELETE(req());
  assert.equal(res.status, 400);
  assert.equal(session.fromCalls.filter((c) => c.table === "olaclick_connections").length, 0);
});

test("olaclick delete: role sem permissão -- 403 antes de qualquer lookup", async (t) => {
  const { DELETE, session } = await loadRouteWith(t, {
    user: ADMIN_A,
    profileRole: "operacional",
  });
  const res = await DELETE(req(CONN_ID));
  assert.equal(res.status, 403);
  assert.equal(session.fromCalls.filter((c) => c.table === "olaclick_connections").length, 0);
});
