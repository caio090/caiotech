/**
 * Executar com: node --experimental-test-module-mocks --import ./.tmp/preload-ts-loader.mjs --test src/app/api/admin/clients/__tests__/archive-route.behavioral.test.ts
 * (arquivo fica FORA de [id]/ de propósito -- o runner de teste do Node
 * interpreta colchetes no caminho como glob, então um arquivo dentro de
 * uma pasta "[id]" nunca é descoberto por `--test`; a rota real ainda é
 * importada de dentro de [id]/ normalmente, só o arquivo de teste mora
 * um nível acima.)
 * Sprint Legacy Security Hardening V2 (PROMPT 04E, Fase 6/8/11/28-29):
 * chama o handler DELETE REAL de src/app/api/admin/clients/[id]/route.ts
 * (archive + logical-delete fallback + hard delete) -- mocka só as
 * dependências externas (Supabase session/admin client, proteção de
 * preview), nunca a lógica da própria rota. Prova comportamento real:
 * em todo caminho negado, a mutação privilegiada (admin.from("clients").
 * update/delete) NUNCA é chamada -- não basta o status code bater.
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
function req(url: string): any {
  return new Request(url, { method: "DELETE" });
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
  const mod = await import(`../[id]/route.ts?t=${Date.now()}-${Math.random()}`);
  return { DELETE: mod.DELETE, session: mocked, admin: adminMocked };
}

const ADMIN_A = { id: "admin-a", email: "admin-a@example.com" };
const COMPANY_A = "company-a";
const COMPANY_B = "company-b";

test("archive: admin autorizado (RPC sucede) -- caminho permitido, sem fallback", async (t) => {
  const { DELETE, admin } = await loadRouteWith(t, {
    user: ADMIN_A,
    profileRole: "admin",
    rpcResults: { admin_archive_clients: OK(1) },
  });
  const res = await DELETE(req(`http://x/api/admin/clients/${COMPANY_A}`), ctx(COMPANY_A));
  assert.equal(res.status, 200);
  assert.equal(admin.fromCalls.length, 0, "admin client nunca foi tocado -- RPC já resolveu");
});

test("archive: RPC nega autorização (cross-company) -- 403, fallback NUNCA chamado", async (t) => {
  const { DELETE, admin } = await loadRouteWith(t, {
    user: ADMIN_A,
    profileRole: "admin",
    rpcResults: { admin_archive_clients: DENIED, admin_delete_client: DENIED },
  });
  const res = await DELETE(req(`http://x/api/admin/clients/${COMPANY_B}`), ctx(COMPANY_B));
  const body = await res.json();
  assert.equal(res.status, 403);
  assert.equal(body.code, "AUTHORIZATION_DENIED");
  const privilegedUpdate = admin.fromCalls.filter((c) => c.table === "clients" && c.op === "update");
  assert.equal(privilegedUpdate.length, 0, "admin.from('clients').update NÃO foi chamado após negação -- FINAL, nunca fallback");
});

test("archive: erro de RPC desconhecido (não é negação, não é RPC ausente) -- fail closed, fallback NÃO chamado", async (t) => {
  const { DELETE, admin } = await loadRouteWith(t, {
    user: ADMIN_A,
    profileRole: "admin",
    rpcResults: { admin_archive_clients: UNKNOWN_DB_ERROR },
  });
  const res = await DELETE(req(`http://x/api/admin/clients/${COMPANY_A}`), ctx(COMPANY_A));
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.code, "UNKNOWN_DB_ERROR");
  assert.equal(admin.fromCalls.filter((c) => c.op === "update").length, 0, "erro desconhecido nunca tenta fallback -- só RPC_UNAVAILABLE pode");
});

test("archive: RPC indisponível (schema desatualizado) + autorização independente TRUE -- fallback técnico executa", async (t) => {
  const { DELETE, admin } = await loadRouteWith(t, {
    user: ADMIN_A,
    profileRole: "admin",
    rpcResults: {
      admin_archive_clients: RPC_MISSING,
      can_access_client: OK(true),
    },
    fromResults: { clients: { update: OK() } },
  });
  const res = await DELETE(req(`http://x/api/admin/clients/${COMPANY_A}`), ctx(COMPANY_A));
  assert.equal(res.status, 200);
  const privilegedUpdate = admin.fromCalls.filter((c) => c.table === "clients" && c.op === "update");
  assert.equal(privilegedUpdate.length, 1, "fallback técnico SÓ roda quando RPC_UNAVAILABLE confirmado E autorização independente = true (PROMPT 05G: fallback NUNCA tenta admin_delete_client como alternativa)");
  const payload = privilegedUpdate[0]?.payload as Record<string, unknown>;
  assert.equal("status" in payload, false, "archive nunca escreve status (PROMPT 05G, Regra 1)");
  assert.equal(payload.deleted_at, null);
});

test("archive: RPC indisponível + autorização independente FALSE -- nenhuma mutação, 403", async (t) => {
  const { DELETE, admin } = await loadRouteWith(t, {
    user: ADMIN_A,
    profileRole: "admin",
    rpcResults: {
      admin_archive_clients: RPC_MISSING,
      admin_delete_client: RPC_MISSING,
      can_access_client: OK(false),
    },
  });
  const res = await DELETE(req(`http://x/api/admin/clients/${COMPANY_B}`), ctx(COMPANY_B));
  assert.equal(res.status, 403);
  assert.equal(admin.fromCalls.filter((c) => c.op === "update").length, 0, "service_role disponível não implica autorização -- sem fallback quando independentemente negado");
});

test("archive: RPC indisponível + autorização independente NULL (RPC de verificação com erro) -- fail closed", async (t) => {
  const { DELETE, admin } = await loadRouteWith(t, {
    user: ADMIN_A,
    profileRole: "admin",
    rpcResults: {
      admin_archive_clients: RPC_MISSING,
      admin_delete_client: RPC_MISSING,
      can_access_client: { data: null, error: { message: "unexpected" } },
    },
  });
  const res = await DELETE(req(`http://x/api/admin/clients/${COMPANY_B}`), ctx(COMPANY_B));
  assert.equal(res.status, 403);
  assert.equal(admin.fromCalls.filter((c) => c.op === "update").length, 0, "erro na própria verificação de autorização -- fail closed, sem fallback");
});

test("archive: role sem permissão (não admin/super_admin) -- 403 antes de qualquer RPC", async (t) => {
  const { DELETE, session } = await loadRouteWith(t, {
    user: ADMIN_A,
    profileRole: "operacional",
  });
  const res = await DELETE(req(`http://x/api/admin/clients/${COMPANY_A}`), ctx(COMPANY_A));
  assert.equal(res.status, 403);
  const rpcCalled = session.rpcCalls.some((c) => c.fn.startsWith("admin_"));
  assert.equal(rpcCalled, false, "nenhuma RPC de mutação é sequer chamada quando o role já reprova");
});

test("hard delete: super_admin autorizado -- permitido, sem qualquer fallback (rota já não tinha bypass)", async (t) => {
  const { DELETE, admin } = await loadRouteWith(t, {
    user: ADMIN_A,
    profileRole: "super_admin",
    rpcResults: { admin_hard_delete_clients: OK(1) },
  });
  const res = await DELETE(req(`http://x/api/admin/clients/${COMPANY_A}?mode=hard`), ctx(COMPANY_A));
  assert.equal(res.status, 200);
  assert.equal(admin.fromCalls.length, 0);
});

test("hard delete: admin comum (não super_admin) -- 403 antes de qualquer RPC", async (t) => {
  const { DELETE, session } = await loadRouteWith(t, {
    user: ADMIN_A,
    profileRole: "admin",
  });
  const res = await DELETE(req(`http://x/api/admin/clients/${COMPANY_A}?mode=hard`), ctx(COMPANY_A));
  assert.equal(res.status, 403);
  assert.equal(session.rpcCalls.some((c) => c.fn === "admin_hard_delete_clients"), false);
});
