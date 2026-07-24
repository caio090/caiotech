/**
 * Fase 8 do hotfix 1.0.4 — o QA da 1.0.3 não conseguiu comprovar pelo
 * navegador que os guards de mutação realmente bloqueiam. Este harness
 * prova isso via HTTP real, sem recriar nenhum endpoint público de teste
 * (a rota de demonstração /api/admin/workspaces/preview-mutation-check foi
 * removida no hotfix 1.0.2 e não volta): forja um token de preview válido
 * usando o MESMO resolvedor de chave que o servidor real usa
 * (getWorkspacePreviewSigningKey, em src/lib/workspaces/preview-session.ts),
 * e bate via HTTP nas 8 rotas mutáveis reais listadas no ticket. O proxy
 * (src/proxy.ts) bloqueia essas rotas com base só na validade criptográfica
 * do token — nunca consulta o Supabase — então nenhuma sessão autenticada é
 * necessária para provar o bloqueio.
 *
 * O que este harness comprova por rota:
 *   - HTTP 403 (nunca 500);
 *   - code === "WORKSPACE_PREVIEW_READ_ONLY";
 *   - a mensagem de erro é a string fixa e sanitizada do guard, nunca um
 *     detalhe de stack/banco;
 *   - a resposta chega rápido (< 1s) — evidência indireta de que o handler
 *     real (que faria round-trips ao Supabase, enviaria e-mail, chamaria a
 *     OlaClick, etc.) nunca foi alcançado, já que o proxy responde antes de
 *     a requisição chegar à rota.
 *
 * O que este harness NÃO comprova (precisa de sessão real de super_admin):
 *   que o guard por rota (assertWorkspaceMutationAllowed, a camada
 *   "verdadeira" — o proxy é só defesa em profundidade) também bloqueia,
 *   já que ele revalida usuário/papel/workspace no banco antes de decidir.
 *   Isso continua exigindo login real ou um framework de teste com mocks,
 *   nenhum dos dois disponível neste sandbox — ver
 *   docs/workspace-preview-security.md.
 *
 * Pré-requisito: servidor local rodando (`npm run dev`). Sem servidor em
 * BASE_URL, o teste avisa e sai com código 0 — não falha o pipeline por
 * falta de infraestrutura, mas também não finge ter testado.
 *
 *   node src/lib/workspaces/__tests__/mutation-guard-routes.e2e.test.ts
 */
(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createHmac } = require("crypto") as typeof import("crypto");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getWorkspacePreviewSigningKey } = require("../preview-session.ts") as typeof import("../preview-session");

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const COOKIE_NAME = "lokat_workspace_preview";
const READ_ONLY_CODE = "WORKSPACE_PREVIEW_READ_ONLY";
const READ_ONLY_MESSAGE = "Esta ação está indisponível no modo de visualização.";

interface ForgedPayload {
  uid: string; surface: string; workspaceId: string; parentWorkspaceId: string | null;
  isBlueprint: boolean; n: string; iat: number; exp: number; v: 1;
}

function forgeValidToken(): string {
  const payload: ForgedPayload = {
    uid: "e2e-test-uid", surface: "agency", workspaceId: "blueprint-agency-01",
    parentWorkspaceId: null, isBlueprint: true, n: "e2etestnonce000000000000",
    iat: Date.now(), exp: Date.now() + 60_000, v: 1,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", getWorkspacePreviewSigningKey()).update(data).digest("hex");
  return `${data}.${sig}`;
}

let passed = 0;
let failed = 0;
function assert(condition: boolean, label: string) {
  if (condition) { passed++; console.log(`  ok   - ${label}`); }
  else { failed++; console.error(`  FAIL - ${label}`); }
}

// As 8 rotas exigidas pela Fase 8 do ticket, exatamente como listadas.
const ROUTES = [
  "/api/admin/clients",
  "/api/admin/contentos/drafts",
  "/api/admin/contentos/actions/send-to-approval",
  "/api/admin/contentos/actions/send-to-production",
  "/api/team/invite/send-email",
  "/api/payments/manual-confirm",
  "/api/olaclick/connect",
  "/api/admin/reports/uploads",
];

async function main() {
  try {
    await fetch(BASE_URL, { signal: AbortSignal.timeout(3000) });
  } catch {
    console.log(`[test] mutation-guard-routes.e2e — no server reachable at ${BASE_URL}, skipping (not a failure, just no infra to test against)`);
    return;
  }

  console.log(`[test] mutation-guard-routes.e2e — running against ${BASE_URL}`);
  const token = forgeValidToken();

  for (const path of ROUTES) {
    const start = Date.now();
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      redirect: "manual",
      headers: { "Content-Type": "application/json", Cookie: `${COOKIE_NAME}=${token}` },
      body: "{}",
    });
    const elapsedMs = Date.now() - start;
    const body = await res.json().catch(() => null) as { error?: string; code?: string } | null;

    assert(res.status === 403, `${path} — returns HTTP 403 during an active preview`);
    assert(body?.code === READ_ONLY_CODE, `${path} — body.code is ${READ_ONLY_CODE}`);
    assert(body?.error === READ_ONLY_MESSAGE, `${path} — error message is the fixed sanitized string, not a stack/DB detail`);
    assert(elapsedMs < 1000, `${path} — responded in ${elapsedMs}ms (< 1s), consistent with the proxy blocking before the real handler runs`);
  }

  console.log(`\n[test] mutation-guard-routes.e2e — ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
})();
