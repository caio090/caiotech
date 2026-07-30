/**
 * Hotfix 1.0.11 — real behavioral test of the proxy's mutation-guard
 * decision logic (src/lib/workspaces/mutation-guard-runtime.ts). This is
 * NOT a string-match test: it imports the actual production module
 * (deliberately import-free, so it runs standalone under Node's native
 * TypeScript support — the same reasoning as atomic-exit.ts) and executes
 * the exact functions src/proxy.ts calls at request time.
 *
 * Root cause under test: hotfix 1.0.10 added POST /api/admin/workspaces
 * /preview/exit but never added it to the proxy's runtime exemption
 * check — only to the OFFLINE mutation-inventory script, which has zero
 * effect on the live proxy. The proxy blocked the exit endpoint's own
 * POST with 403 WORKSPACE_PREVIEW_READ_ONLY before the request ever
 * reached the route handler.
 *
 *   node src/lib/workspaces/__tests__/mutation-guard-runtime.test.ts
 */
(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const guardRuntime = require("../mutation-guard-runtime.ts") as typeof import("../mutation-guard-runtime");
const {
  isWorkspacePreviewControlMutation,
  shouldBlockMutationInPreview,
  WORKSPACE_PREVIEW_EXIT_MUTATION_PATH,
} = guardRuntime;

let passed = 0;
let failed = 0;
function assert(condition: boolean, label: string) {
  if (condition) { passed++; console.log(`  ok   - ${label}`); }
  else { failed++; console.error(`  FAIL - ${label}`); }
}

console.log(`[test] WORKSPACE_PREVIEW_EXIT_MUTATION_PATH is the exact expected pathname`);
assert(WORKSPACE_PREVIEW_EXIT_MUTATION_PATH === "/api/admin/workspaces/preview/exit", "the exempt path constant matches the real route exactly");

console.log("\n[test] Fase 5 — isWorkspacePreviewControlMutation: exhaustive allow/deny matrix");
{
  // DEVE PERMITIR
  assert(isWorkspacePreviewControlMutation({ method: "POST", pathname: "/api/admin/workspaces/preview/exit" }) === true,
    "ALLOW: POST /api/admin/workspaces/preview/exit");

  // NÃO DEVE PERMITIR — trailing slash deliberately NOT accepted (no
  // established reason a real client ever sends one; the <form action>
  // is the literal string with no trailing slash).
  assert(isWorkspacePreviewControlMutation({ method: "POST", pathname: "/api/admin/workspaces/preview/exit/" }) === false,
    "DENY: POST /api/admin/workspaces/preview/exit/ (trailing slash not deliberately accepted)");

  const wrongMethods = ["GET", "DELETE", "PUT", "PATCH", "HEAD", "OPTIONS"];
  for (const method of wrongMethods) {
    assert(isWorkspacePreviewControlMutation({ method, pathname: "/api/admin/workspaces/preview/exit" }) === false,
      `DENY: ${method} /api/admin/workspaces/preview/exit (only POST is exempt)`);
  }

  const wrongPaths = [
    "/api/admin/workspaces/preview",
    "/api/admin/workspaces/preview/exit-fake",
    "/api/admin/workspaces/preview/exit/other",
    "/api/admin/contentos/drafts",
    "/api/admin/workspaces/anything",
    "/api/admin/workspaces/preview/exit%2Fother",
    "",
    "/API/ADMIN/WORKSPACES/PREVIEW/EXIT",
    "/api/admin/workspaces/preview/exi",
    "/api/admin/workspaces/preview/exitt",
  ];
  for (const pathname of wrongPaths) {
    assert(isWorkspacePreviewControlMutation({ method: "POST", pathname }) === false,
      `DENY: POST ${JSON.stringify(pathname)} (near-miss or unrelated path, no prefix/substring match allowed)`);
  }
}

console.log("\n[test] Fase 6 — shouldBlockMutationInPreview: real guard decision scenarios");
{
  // Cenário A — preview ativo + POST de saída: NÃO deve bloquear.
  assert(
    shouldBlockMutationInPreview({ method: "POST", pathname: "/api/admin/workspaces/preview/exit", hasValidPreviewToken: true }) === false,
    "Cenário A: preview ativo + POST /preview/exit — guard NÃO bloqueia (request alcançaria o handler)"
  );

  // Cenário B — preview ativo + POST /api/admin/contentos/drafts: DEVE bloquear.
  assert(
    shouldBlockMutationInPreview({ method: "POST", pathname: "/api/admin/contentos/drafts", hasValidPreviewToken: true }) === true,
    "Cenário B: preview ativo + POST /api/admin/contentos/drafts — guard BLOQUEIA (handler empresarial não alcançado)"
  );

  // Cenário C — preview ativo + outra rota mutável qualquer: DEVE bloquear.
  const otherMutableRoutes = [
    "/api/admin/clients", "/api/team/invite/send-email", "/api/payments/manual-confirm",
    "/api/olaclick/connect", "/api/meta/connect", "/api/billing/checkout", "/api/ai/briefing",
  ];
  for (const pathname of otherMutableRoutes) {
    assert(
      shouldBlockMutationInPreview({ method: "POST", pathname, hasValidPreviewToken: true }) === true,
      `Cenário C: preview ativo + POST ${pathname} — guard BLOQUEIA`
    );
  }

  // Cenário D — sem preview ativo + rota empresarial: comportamento normal, sem bloqueio indevido.
  assert(
    shouldBlockMutationInPreview({ method: "POST", pathname: "/api/admin/contentos/drafts", hasValidPreviewToken: false }) === false,
    "Cenário D: sem preview ativo + POST /api/admin/contentos/drafts — guard NÃO interfere"
  );

  // Sem preview ativo, a saída também nunca é bloqueada (é irrelevante, mas deve continuar não-bloqueada).
  assert(
    shouldBlockMutationInPreview({ method: "POST", pathname: "/api/admin/workspaces/preview/exit", hasValidPreviewToken: false }) === false,
    "sem preview ativo + POST /preview/exit — nunca bloqueado (não há preview para encerrar, mas o guard não deveria nem tentar)"
  );

  // A rota antiga de entrada/saída continua exempta para POST e DELETE.
  assert(
    shouldBlockMutationInPreview({ method: "POST", pathname: "/api/admin/workspaces/preview", hasValidPreviewToken: true }) === false,
    "a rota antiga /api/admin/workspaces/preview continua exempta para POST (ativação)"
  );
  assert(
    shouldBlockMutationInPreview({ method: "DELETE", pathname: "/api/admin/workspaces/preview", hasValidPreviewToken: true }) === false,
    "a rota antiga /api/admin/workspaces/preview continua exempta para DELETE (limpeza best-effort)"
  );

  // Mas DELETE/PUT/PATCH na rota NOVA continuam bloqueados — só POST é exceção lá.
  for (const method of ["DELETE", "PUT", "PATCH"]) {
    assert(
      shouldBlockMutationInPreview({ method, pathname: "/api/admin/workspaces/preview/exit", hasValidPreviewToken: true }) === true,
      `${method} /api/admin/workspaces/preview/exit continua BLOQUEADO — só POST é a exceção exata`
    );
  }

  // GET nunca é avaliado por este guard (não é um método mutante) — sempre false.
  assert(
    shouldBlockMutationInPreview({ method: "GET", pathname: "/api/admin/contentos/drafts", hasValidPreviewToken: true }) === false,
    "GET nunca é bloqueado por este guard (não está em MUTATING_METHODS) — 405 fica a cargo do próprio handler/roteador"
  );

  // Namespace não-mutável nunca é bloqueado, mesmo com preview ativo.
  assert(
    shouldBlockMutationInPreview({ method: "POST", pathname: "/api/nao-mapeado/qualquer", hasValidPreviewToken: true }) === false,
    "namespace fora de MUTABLE_API_NAMESPACES nunca é avaliado pelo guard"
  );
}

console.log("\n[test] src/proxy.ts delegates to this module instead of an inline copy (prevents this exact class of drift from recurring)");
{
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { readFileSync } = require("fs") as typeof import("fs");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { join } = require("path") as typeof import("path");
  const proxySource: string = readFileSync(join(__dirname, "..", "..", "..", "proxy.ts"), "utf8");

  assert(/import\s*\{[^}]*shouldBlockMutationInPreview[^}]*\}\s*from\s*"@\/lib\/workspaces\/mutation-guard-runtime"/.test(proxySource),
    "proxy.ts imports shouldBlockMutationInPreview from mutation-guard-runtime.ts");
  assert(proxySource.includes("shouldBlockMutationInPreview({"), "proxy.ts actually calls shouldBlockMutationInPreview() for its guard decision");
  assert(!/const\s+MUTATION_GUARD_EXEMPT_PATHS\s*=/.test(proxySource), "proxy.ts no longer defines its own local MUTATION_GUARD_EXEMPT_PATHS (single source of truth)");
  assert(!/const\s+MUTABLE_API_NAMESPACES\s*=/.test(proxySource), "proxy.ts no longer defines its own local MUTABLE_API_NAMESPACES (single source of truth)");
}

console.log(`\n[test] mutation-guard-runtime — ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
})();
