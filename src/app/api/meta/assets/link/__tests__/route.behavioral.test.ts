/**
 * Executar com: node --experimental-test-module-mocks --import ./.tmp/preload-ts-loader.mjs --test src/app/api/meta/assets/link/__tests__/route.behavioral.test.ts
 * Sprint Legacy Security Hardening V2 (PROMPT 04E, Fase 9/11/28-29):
 * chama o handler DELETE REAL de src/app/api/meta/assets/link/route.ts.
 * Prova que nenhum caminho negado (cross-company, not_found, lookup
 * error, client_id ausente, autorização false) chega a deletar --
 * "service_role disponível" nunca é interpretado como autorização.
 */
import { test, mock, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { makeMockSupabaseClient, OK } from "../../../../../../lib/supabase/__tests__/test-helpers/mock-supabase.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(mock.module as any)("@/lib/workspaces/assert-not-preview", {
  exports: {
    withMutationProtection: (handler: (...args: unknown[]) => unknown) => handler,
    assertWorkspaceMutationAllowed: async () => null,
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function req(id?: string): any {
  const url = id ? `http://x/api/meta/assets/link?id=${id}` : "http://x/api/meta/assets/link";
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
const ASSET_ID = "asset-1";

function deleteCalls(m: { fromCalls: { table: string; op: string }[] }) {
  return m.fromCalls.filter((c) => c.table === "client_meta_assets" && c.op === "delete");
}

test("meta delete: lookup própria Company + autorizado -- permitido", async (t) => {
  const { DELETE, admin } = await loadRouteWith(t, {
    user: ADMIN_A,
    profileRole: "admin",
    rpcResults: { can_access_client: OK(true) },
    fromResults: {
      client_meta_assets: { select: OK({ client_id: "company-a" }), delete: OK() },
    },
  });
  const res = await DELETE(req(ASSET_ID));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.equal(deleteCalls(admin).length, 1);
});

test("meta delete: cross-company (can_access_client=false) -- 403, DELETE NUNCA chamado", async (t) => {
  const { DELETE, admin, session } = await loadRouteWith(t, {
    user: ADMIN_A,
    profileRole: "admin",
    rpcResults: { can_access_client: OK(false) },
    fromResults: {
      client_meta_assets: { select: OK({ client_id: "company-b" }) },
    },
  });
  const res = await DELETE(req(ASSET_ID));
  const body = await res.json();
  assert.equal(res.status, 403);
  assert.equal(body.reason, "forbidden");
  assert.equal(deleteCalls(admin).length, 0);
  assert.equal(deleteCalls(session).length, 0);
});

test("meta delete: registro não encontrado (lookup vazio) -- 404, NUNCA prossegue para delete", async (t) => {
  const { DELETE, admin, session } = await loadRouteWith(t, {
    user: ADMIN_A,
    profileRole: "admin",
    fromResults: { client_meta_assets: { select: OK(null) } },
  });
  const res = await DELETE(req(ASSET_ID));
  const body = await res.json();
  assert.equal(res.status, 404);
  assert.equal(body.reason, "not_found");
  assert.equal(deleteCalls(admin).length + deleteCalls(session).length, 0, "lookup vazio nunca é tratado como autorização implícita");
});

test("meta delete: client_id ausente no registro -- fail closed, 403", async (t) => {
  const { DELETE, admin, session } = await loadRouteWith(t, {
    user: ADMIN_A,
    profileRole: "admin",
    fromResults: { client_meta_assets: { select: OK({ client_id: null }) } },
  });
  const res = await DELETE(req(ASSET_ID));
  const body = await res.json();
  assert.equal(res.status, 403);
  assert.equal(body.reason, "forbidden");
  assert.equal(deleteCalls(admin).length + deleteCalls(session).length, 0);
});

test("meta delete: erro no lookup -- fail closed, 500, NUNCA prossegue para delete", async (t) => {
  const { DELETE, admin, session } = await loadRouteWith(t, {
    user: ADMIN_A,
    profileRole: "admin",
    fromResults: { client_meta_assets: { select: { data: null, error: { message: "db down" } } } },
  });
  const res = await DELETE(req(ASSET_ID));
  const body = await res.json();
  assert.equal(res.status, 500);
  assert.equal(body.reason, "lookup_failed");
  assert.equal(deleteCalls(admin).length + deleteCalls(session).length, 0, "erro de lookup nunca autoriza implicitamente");
});

test("meta delete: id ausente na query -- 400, sem qualquer lookup/delete", async (t) => {
  const { DELETE, session } = await loadRouteWith(t, {
    user: ADMIN_A,
    profileRole: "admin",
  });
  const res = await DELETE(req());
  assert.equal(res.status, 400);
  assert.equal(session.fromCalls.filter((c) => c.table === "client_meta_assets").length, 0);
});

test("meta delete: role sem permissão -- 403 antes de qualquer lookup", async (t) => {
  const { DELETE, session } = await loadRouteWith(t, {
    user: ADMIN_A,
    profileRole: "operacional",
  });
  const res = await DELETE(req(ASSET_ID));
  assert.equal(res.status, 403);
  assert.equal(session.fromCalls.filter((c) => c.table === "client_meta_assets").length, 0, "role reprovado antes de qualquer lookup de client_meta_assets");
});
