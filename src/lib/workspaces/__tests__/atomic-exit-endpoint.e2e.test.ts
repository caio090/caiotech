/**
 * Hotfix 1.0.10 — real HTTP proof of POST /api/admin/workspaces/preview/exit
 * for the paths reachable WITHOUT a real authenticated super_admin session
 * (no SUPABASE_SERVICE_ROLE_KEY available locally — the same disclosed,
 * accepted gap documented in mutation-guard-routes.e2e.test.ts and
 * preview-session.test.ts). What this proves, against a real running
 * server, is exactly the safety property Fase 4 of the ticket cares about
 * most: an unauthenticated or unauthorized call must NEVER clear the
 * cookie and must NEVER pretend an exit happened.
 *
 * The full authorized round-trip (real super_admin session → 303 →
 * Set-Cookie deletion → dashboard without the banner) is proven at the
 * unit level instead, against the real Response objects the same code
 * path builds — see atomic-exit.test.ts. That test exercises the exact
 * same buildAtomicExitRedirect() this route calls on the success branch;
 * only the Supabase authorization gate itself remains unverified by an
 * automated test in this sandbox.
 *
 * Pré-requisito: servidor local rodando (`npm run dev`). Sem servidor em
 * BASE_URL, o teste avisa e sai com código 0 — mesma convenção do resto do
 * projeto.
 *
 *   node src/lib/workspaces/__tests__/atomic-exit-endpoint.e2e.test.ts
 */
(function () {
const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const EXIT_PATH = "/api/admin/workspaces/preview/exit";

let passed = 0;
let failed = 0;
function assert(condition: boolean, label: string) {
  if (condition) { passed++; console.log(`  ok   - ${label}`); }
  else { failed++; console.error(`  FAIL - ${label}`); }
}

async function main() {
  try {
    await fetch(BASE_URL, { signal: AbortSignal.timeout(3000) });
  } catch {
    console.log(`[test] atomic-exit-endpoint.e2e — no server reachable at ${BASE_URL}, skipping (not a failure, just no infra to test against)`);
    return;
  }

  console.log(`[test] atomic-exit-endpoint.e2e — running against ${BASE_URL}`);

  // No session cookie at all — the realistic case for this sandbox and
  // also a real production scenario (expired/absent session).
  const noSessionRes = await fetch(`${BASE_URL}${EXIT_PATH}`, {
    method: "POST",
    redirect: "manual",
  });
  assert(noSessionRes.status === 303, "POST without a session — HTTP 303 (a real redirect, never a bare failure)");
  const noSessionLocation = noSessionRes.headers.get("location") ?? "";
  assert(noSessionLocation.endsWith("/login"), `POST without a session — Location ends with /login (got ${noSessionLocation})`);
  assert(!noSessionRes.headers.get("set-cookie"), "POST without a session — NO Set-Cookie header (unauthenticated call never touches the preview cookie)");
  assert(noSessionRes.headers.get("cache-control") === "no-store", "POST without a session — Cache-Control: no-store present");

  // Same call, but carrying an obviously-forged/garbage preview cookie —
  // still must not authenticate the caller (this endpoint's auth gate is
  // Supabase getCurrentUser(), independent of the preview token entirely).
  const garbageCookieRes = await fetch(`${BASE_URL}${EXIT_PATH}`, {
    method: "POST",
    redirect: "manual",
    headers: { Cookie: "lokat_workspace_preview=not-a-real-token.deadbeef" },
  });
  assert(garbageCookieRes.status === 303, "POST with a garbage preview cookie but no Supabase session — still HTTP 303");
  assert(!garbageCookieRes.headers.get("set-cookie"), "POST with a garbage preview cookie but no Supabase session — still NO Set-Cookie (the preview token alone can't authorize an exit)");

  // GET must not exist on this route at all — only a real document POST
  // may ever end a preview.
  const getRes = await fetch(`${BASE_URL}${EXIT_PATH}`, { method: "GET", redirect: "manual" });
  assert(getRes.status === 405, `GET ${EXIT_PATH} — HTTP 405 (method not allowed), got ${getRes.status}`);
  assert(!getRes.headers.get("set-cookie"), "GET — NO Set-Cookie header (GET can never delete the cookie)");

  console.log(`\n[test] atomic-exit-endpoint.e2e — ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void main();
})();
