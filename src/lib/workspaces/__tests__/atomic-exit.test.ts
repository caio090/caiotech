/**
 * Hotfix 1.0.10 — real behavioral test of the atomic exit response builders
 * (src/lib/workspaces/atomic-exit.ts). This is NOT a structural/string test:
 * it imports the actual production module (which is deliberately import-free
 * — see its own docstring — so it runs standalone under Node's native
 * TypeScript support with no resolution issues) and inspects the REAL
 * standard Response object the code builds: status, Location header,
 * Cache-Control, Pragma, and the exact Set-Cookie string.
 *
 * Scope: this file proves the atomic transaction itself — cookie deletion
 * and the 303 land in one response, with the exact attributes the cookie
 * was created with, and the failure path never touches the cookie at all.
 * It does NOT exercise the route handler's Supabase/getCurrentUser()
 * authorization branch — that still needs a real authenticated super_admin
 * session (no SUPABASE_SERVICE_ROLE_KEY available locally), the same
 * disclosed, accepted gap as every other Supabase-dependent path in this
 * sprint's test suite (see preview-session.test.ts's own docstring). The
 * sibling atomic-exit-endpoint.e2e.test.ts covers what IS reachable over
 * real HTTP without a session: the unauthenticated failure path.
 *
 *   node src/lib/workspaces/__tests__/atomic-exit.test.ts
 */
(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const atomicExit = require("../atomic-exit.ts") as typeof import("../atomic-exit");
const {
  buildAtomicExitRedirect,
  buildSafeRedirect,
  WORKSPACE_PREVIEW_EXIT_DESTINATION,
  WORKSPACE_PREVIEW_EXIT_LOGIN_DESTINATION,
} = atomicExit;

let passed = 0;
let failed = 0;
function assert(condition: boolean, label: string) {
  if (condition) { passed++; console.log(`  ok   - ${label}`); }
  else { failed++; console.error(`  FAIL - ${label}`); }
}

function parseSetCookie(raw: string | null): Record<string, string | true> {
  if (!raw) return {};
  const parts = raw.split(";").map((p) => p.trim());
  const out: Record<string, string | true> = {};
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq < 0) { out[part.toLowerCase()] = true; continue; }
    out[part.slice(0, eq).toLowerCase()] = part.slice(eq + 1);
  }
  return out;
}

const BASE = "http://127.0.0.1:3000/api/admin/workspaces/preview/exit";
const COOKIE_NAME = "lokat_workspace_preview";

function testAtomicSuccessResponse() {
  const res = buildAtomicExitRedirect(BASE, COOKIE_NAME);

  assert(res.status === 303, "buildAtomicExitRedirect — status is HTTP 303 (See Other, correct for a POST-then-redirect)");
  assert(res.headers.get("location") === `http://127.0.0.1:3000${WORKSPACE_PREVIEW_EXIT_DESTINATION}`, "buildAtomicExitRedirect — Location is /admin/dashboard");
  assert(res.headers.get("cache-control") === "no-store", "buildAtomicExitRedirect — Cache-Control: no-store present");
  assert(res.headers.get("pragma") === "no-cache", "buildAtomicExitRedirect — Pragma: no-cache present");

  const rawCookie = res.headers.get("set-cookie");
  assert(!!rawCookie, "buildAtomicExitRedirect — Set-Cookie IS present (cookie deletion and the 303 are the same response)");
  const cookie = parseSetCookie(rawCookie);
  assert(rawCookie!.startsWith("lokat_workspace_preview="), "buildAtomicExitRedirect — Set-Cookie targets the exact cookie name used at creation");
  assert(cookie["max-age"] === "0", "buildAtomicExitRedirect — Max-Age=0 (immediate expiry)");
  assert(cookie["path"] === "/", "buildAtomicExitRedirect — Path=/ matches the cookie set at creation");
  assert(cookie["httponly"] === true, "buildAtomicExitRedirect — HttpOnly present, matches creation");
  assert((cookie["samesite"] as string)?.toLowerCase() === "lax", "buildAtomicExitRedirect — SameSite=Lax present, matches creation");
}

function testSafeRedirectNeverTouchesCookie() {
  const loginRes = buildSafeRedirect(BASE, WORKSPACE_PREVIEW_EXIT_LOGIN_DESTINATION);
  assert(loginRes.status === 303, "buildSafeRedirect(login) — status is 303");
  assert(loginRes.headers.get("location") === `http://127.0.0.1:3000${WORKSPACE_PREVIEW_EXIT_LOGIN_DESTINATION}`, "buildSafeRedirect(login) — Location is /login");
  assert(loginRes.headers.get("cache-control") === "no-store", "buildSafeRedirect(login) — Cache-Control: no-store present");
  assert(!loginRes.headers.get("set-cookie"), "buildSafeRedirect(login) — NO Set-Cookie header at all (unauthorized never touches the cookie)");

  const dashboardRes = buildSafeRedirect(BASE, WORKSPACE_PREVIEW_EXIT_DESTINATION);
  assert(dashboardRes.status === 303, "buildSafeRedirect(dashboard) — status is 303");
  assert(!dashboardRes.headers.get("set-cookie"), "buildSafeRedirect(dashboard) — NO Set-Cookie header at all (demoted-role path never touches the cookie either)");
}

function testResponsesAreIndependentInstances() {
  const a = buildAtomicExitRedirect(BASE, COOKIE_NAME);
  const b = buildAtomicExitRedirect(BASE, COOKIE_NAME);
  assert(a !== b, "buildAtomicExitRedirect — each call returns a fresh response instance (no shared mutable state across requests)");
}

testAtomicSuccessResponse();
testSafeRedirectNeverTouchesCookie();
testResponsesAreIndependentInstances();

console.log(`\n[test] atomic-exit — ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
})();
