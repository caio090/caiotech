/**
 * Fase 20 do hotfix 1.0.2 — harness de teste de ponta a ponta para a
 * defesa em profundidade do proxy (src/proxy.ts) contra o namespace de
 * rotas mutáveis, SEM depender da rota de demonstração removida na Fase 3
 * (/api/admin/workspaces/preview-mutation-check).
 *
 * Não precisa de login real: forja um token de preview válido usando o
 * MESMO caminho de código que o servidor real usa
 * (getWorkspacePreviewSigningKey), então bate via HTTP numa rota mutável
 * real já protegida (/api/admin/clients). O proxy bloqueia com base só na
 * validade do token — nunca consulta o Supabase — então este teste prova
 * o comportamento do proxy sem precisar de uma sessão autenticada.
 *
 * Não cobre (precisa de sessão real de super_admin): o guard por rota
 * (assertWorkspaceMutationAllowed), que revalida usuário/papel/workspace no
 * banco antes de decidir — ver docs/workspace-preview-security.md.
 *
 * Pré-requisito: um servidor local rodando (`npm run dev`). Se não houver
 * servidor em BASE_URL, o teste avisa e sai com código 0 (não falha o
 * pipeline por falta de infraestrutura — mas também não finge ter testado).
 *
 *   node src/lib/workspaces/__tests__/proxy-guard.e2e.test.ts
 *   BASE_URL=http://127.0.0.1:3100 node src/lib/workspaces/__tests__/proxy-guard.e2e.test.ts
 */
// Wrapped in an IIFE for the same reason as preview-session.test.ts: no
// import/export means tsc treats this as a global script, and its top-level
// names would otherwise collide with that sibling file.
(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createHmac } = require("crypto") as typeof import("crypto");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getWorkspacePreviewSigningKey } = require("../preview-session.ts") as typeof import("../preview-session");

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const COOKIE_NAME = "lokat_workspace_preview";

interface ForgedPayload {
  uid: string; surface: string; workspaceId: string; parentWorkspaceId: string | null;
  isBlueprint: boolean; n: string; iat: number; exp: number; v: 1;
}

function sign(data: string): string {
  return createHmac("sha256", getWorkspacePreviewSigningKey()).update(data).digest("hex");
}

function forgeToken(overrides: Partial<ForgedPayload> = {}): string {
  const payload: ForgedPayload = {
    uid: "e2e-test-uid", surface: "agency", workspaceId: "blueprint-agency-01",
    parentWorkspaceId: null, isBlueprint: true, n: "e2etestnonce000000000000",
    iat: Date.now(), exp: Date.now() + 60_000, v: 1,
    ...overrides,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data)}`;
}

let passed = 0;
let failed = 0;
function assert(condition: boolean, label: string) {
  if (condition) { passed++; console.log(`  ok   - ${label}`); }
  else { failed++; console.error(`  FAIL - ${label}`); }
}

async function request(method: string, path: string, cookie?: string): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    method,
    redirect: "manual",
    headers: {
      ...(cookie ? { Cookie: `${COOKIE_NAME}=${cookie}` } : {}),
      ...(method === "POST" || method === "PATCH" || method === "PUT" ? { "Content-Type": "application/json" } : {}),
    },
    body: method === "POST" || method === "PATCH" || method === "PUT" ? "{}" : undefined,
  });
}

async function main() {
  try {
    await fetch(BASE_URL, { signal: AbortSignal.timeout(3000) });
  } catch {
    console.log(`[test] proxy-guard.e2e — no server reachable at ${BASE_URL}, skipping (not a failure, just no infra to test against)`);
    return;
  }

  console.log(`[test] proxy-guard.e2e — running against ${BASE_URL}`);

  const validToken = forgeToken();
  const expiredToken = forgeToken({ iat: Date.now() - 3 * 3600_000, exp: Date.now() - 60_000 });

  {
    const res = await request("POST", "/api/admin/clients", validToken);
    const body = await res.json().catch(() => null) as { code?: string } | null;
    assert(res.status === 403, "POST to a protected namespace with a valid preview cookie returns 403");
    assert(body?.code === "WORKSPACE_PREVIEW_READ_ONLY", "403 body carries the WORKSPACE_PREVIEW_READ_ONLY code");
  }

  {
    const res = await request("POST", "/api/admin/clients");
    assert(res.status !== 403, "POST without any preview cookie is not blocked by the proxy layer");
  }

  {
    const res = await request("GET", "/api/admin/clients", validToken);
    assert(res.status !== 403, "GET is never blocked by the proxy layer, even with a valid preview cookie");
  }

  {
    const res = await request("OPTIONS", "/api/admin/clients", validToken);
    assert(res.status !== 403, "OPTIONS is never blocked by the proxy layer");
  }

  {
    const res = await request("DELETE", "/api/admin/workspaces/preview", validToken);
    assert(res.status !== 403, "DELETE to the preview exit endpoint itself is never blocked (explicit exemption)");
  }

  {
    const res = await request("POST", "/api/billing/coupons/validate", validToken);
    assert(res.status !== 403, "POST to the documented read-only coupon-validate exemption is never blocked");
  }

  {
    const res = await request("POST", "/api/admin/clients", expiredToken);
    assert(res.status !== 403, "an expired preview cookie does not trigger the proxy block");
  }

  {
    const res = await request("POST", "/api/admin/clients", "garbage.notavalidtoken");
    assert(res.status !== 500, "a malformed preview cookie never causes a 500 (fails safe, not crashes)");
    assert(res.status !== 403, "a malformed preview cookie is never treated as an active preview");
  }

  console.log(`\n[test] proxy-guard.e2e — ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
})();
