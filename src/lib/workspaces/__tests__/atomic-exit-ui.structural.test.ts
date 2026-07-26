/**
 * Hotfix 1.0.10 — structural regression test for the atomic exit UI.
 *
 * Production QA of 1.0.9 found the real P1: workspace-preview-banner.tsx's
 * own "Sair da visualização" button (the control actually visible and
 * clicked throughout an active preview) was never touched by 1.0.9 — only
 * the separate "Painel ADM" button (workspace-exit-button.tsx) was fixed.
 * The banner's button still ran `await fetch(DELETE)` inside a `finally`-
 * guarded `router.push()`: the exact bug 1.0.9 believed it had eliminated.
 * Two independent, drifted exit code paths were the real root cause, not
 * (only) a cookie race.
 *
 * Both controls now submit a real <form method="post"> to the same
 * dedicated endpoint (POST /api/admin/workspaces/preview/exit), which
 * deletes the cookie and issues an HTTP 303 on the exact same response
 * (src/lib/workspaces/atomic-exit.ts) — no fetch, no DELETE, no router,
 * no window.location anywhere in either component's exit path anymore.
 *
 *   node src/lib/workspaces/__tests__/atomic-exit-ui.structural.test.ts
 */
(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { readFileSync } = require("fs") as typeof import("fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { join } = require("path") as typeof import("path");

let passed = 0;
let failed = 0;
function assert(condition: boolean, label: string) {
  if (condition) { passed++; console.log(`  ok   - ${label}`); }
  else { failed++; console.error(`  FAIL - ${label}`); }
}

const componentsDir = join(__dirname, "..", "..", "..", "components", "workspaces");
const exitButtonSourceRaw = readFileSync(join(componentsDir, "workspace-exit-button.tsx"), "utf8");
const bannerSourceRaw = readFileSync(join(componentsDir, "workspace-preview-banner.tsx"), "utf8");
const exitRouteSourceRaw = readFileSync(join(__dirname, "..", "..", "..", "app", "api", "admin", "workspaces", "preview", "exit", "route.ts"), "utf8");
const atomicExitLibSourceRaw = readFileSync(join(__dirname, "..", "atomic-exit.ts"), "utf8");

// Every file in this sprint carries prose comments explaining what the
// *previous* buggy code used to do ("still ran DELETE via fetch() inside a
// finally-guarded router.push()", etc.) — exactly the kind of explanatory
// text that makes a blunt substring/count check on absence unreliable, the
// same lesson preview-navigation-sync.structural.test.ts already applies
// via precise import regexes. Here the fix is more general: strip both
// comment forms before running any "this code is ABSENT" or "exactly one
// of X" assertion, so only real code is inspected. Positive "this snippet
// IS present" assertions still use the raw source (harmless either way).
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

const exitButtonSource = exitButtonSourceRaw;
const bannerSource = bannerSourceRaw;
const exitRouteSource = exitRouteSourceRaw;
const atomicExitLibSource = atomicExitLibSourceRaw;
const exitButtonCode = stripComments(exitButtonSourceRaw);
const bannerCode = stripComments(bannerSourceRaw);

const EXIT_ACTION = "/api/admin/workspaces/preview/exit";
const FORM_TAG = /<form\s+method="post"\s+action=\{?["']?\/?api\/admin\/workspaces\/preview\/exit["']?\}?/;

function countOccurrences(source: string, needle: string): number {
  return source.split(needle).length - 1;
}

console.log("[test] both components submit a real <form> to the atomic exit endpoint");
{
  assert(exitButtonSource.includes(`const EXIT_ACTION = "${EXIT_ACTION}"`), "workspace-exit-button.tsx defines EXIT_ACTION pointing at the atomic exit endpoint");
  assert(bannerSource.includes(`const EXIT_ACTION = "${EXIT_ACTION}"`), "workspace-preview-banner.tsx defines EXIT_ACTION pointing at the atomic exit endpoint");
  assert(FORM_TAG.test(exitButtonSource) || /<form\s*\n?\s*method="post"\s*\n?\s*action=\{EXIT_ACTION\}/.test(exitButtonSource), "workspace-exit-button.tsx renders <form method=\"post\" action={EXIT_ACTION}>");
  assert(/<form\s*\n?\s*method="post"\s*\n?\s*action=\{EXIT_ACTION\}/.test(bannerSource), "workspace-preview-banner.tsx renders <form method=\"post\" action={EXIT_ACTION}>");
  assert(countOccurrences(exitButtonCode, "<form") === 1, "workspace-exit-button.tsx has exactly one <form> in actual code");
  assert(countOccurrences(bannerCode, "<form") === 1, "workspace-preview-banner.tsx has exactly one <form> in actual code (the docstring's own example doesn't count)");
}

console.log("\n[test] neither exit control uses fetch, DELETE, router navigation, or window.location");
{
  assert(!exitButtonCode.includes("fetch("), "workspace-exit-button.tsx makes no fetch() call in actual code");
  assert(!exitButtonCode.includes('"DELETE"'), "workspace-exit-button.tsx never references the DELETE method in actual code");
  assert(!/import\s*\{[^}]*useRouter[^}]*\}\s*from\s*"next\/navigation"/.test(exitButtonSource), "workspace-exit-button.tsx no longer imports useRouter at all");
  assert(!exitButtonCode.includes("window.location"), "workspace-exit-button.tsx never calls window.location.assign/replace in actual code — the form submission IS the navigation");
  assert(!exitButtonCode.includes("finally"), "workspace-exit-button.tsx has no finally block in actual code — there is no async exit logic left to guard");

  assert(!bannerCode.includes('method: "DELETE"'), "workspace-preview-banner.tsx no longer fetches DELETE /api/admin/workspaces/preview in actual code");
  assert(!bannerCode.includes("window.location"), "workspace-preview-banner.tsx never calls window.location.assign/replace for exit in actual code");
  assert(!bannerCode.includes("finally"), "workspace-preview-banner.tsx has no finally block anywhere in actual code — the exact 1.0.9-era bug is structurally impossible now");
  assert(!/async function exit\(\)/.test(bannerCode), "workspace-preview-banner.tsx's old async exit() function is gone entirely from actual code");
}

console.log("\n[test] workspace-preview-banner.tsx still legitimately uses useRouter for the bfcache pageshow handler only");
{
  assert(/import\s*\{[^}]*useRouter[^}]*\}\s*from\s*"next\/navigation"/.test(bannerSource), "workspace-preview-banner.tsx still imports useRouter (needed for the pageshow/bfcache refresh, unrelated to exit)");
  assert(bannerCode.includes("router.refresh()"), "the ONLY router call left in the banner is router.refresh() inside the pageshow handler");
  assert(!bannerCode.includes("router.push"), "workspace-preview-banner.tsx never calls router.push in actual code");
  assert(!bannerCode.includes("router.replace"), "workspace-preview-banner.tsx never calls router.replace in actual code");
}

console.log("\n[test] duplicate-submit guard and overlay copy on both controls");
{
  assert(exitButtonSource.includes("onSubmit={() => setExiting(true)}"), "workspace-exit-button.tsx sets exiting=true on submit (disables the button for a second click)");
  assert(exitButtonSource.includes("disabled={exiting}"), "workspace-exit-button.tsx's submit button is disabled while exiting");
  assert(exitButtonSource.includes("Saindo da visualização"), "workspace-exit-button.tsx shows \"Saindo da visualização…\" while exiting");

  assert(bannerSource.includes("onSubmit={() => setExiting(true)}"), "workspace-preview-banner.tsx sets exiting=true on submit");
  assert(bannerSource.includes("disabled={exiting}"), "workspace-preview-banner.tsx's submit button is disabled while exiting");
  assert(bannerSource.includes("Saindo…"), "workspace-preview-banner.tsx shows a busy label (\"Saindo…\") while exiting");
}

console.log("\n[test] the atomic exit endpoint: failure paths never touch the cookie, success path uses the atomic builder, no GET handler exists");
{
  assert(!/export\s+(async\s+)?function\s+GET/.test(exitRouteSource), "no GET handler is exported — GET can never reach this route's logic at all (falls through to Next.js's own 405)");
  assert(exitRouteSource.includes("buildSafeRedirect(req.url, WORKSPACE_PREVIEW_EXIT_LOGIN_DESTINATION)"), "unauthenticated requests get buildSafeRedirect to /login — never the atomic cookie-clearing builder");
  assert(exitRouteSource.includes("buildSafeRedirect(req.url, WORKSPACE_PREVIEW_EXIT_DESTINATION)"), "non-super_admin requests get buildSafeRedirect to /admin/dashboard — never the atomic cookie-clearing builder");
  assert(exitRouteSource.includes("buildAtomicExitRedirect(req.url, WORKSPACE_PREVIEW_COOKIE)"), "only the fully authorized branch calls buildAtomicExitRedirect (the one function that deletes the cookie)");

  // Order matters: both failure checks (auth, then role) must appear BEFORE
  // the atomic builder call, so neither can be bypassed on the way to it.
  const userCheckIdx = exitRouteSource.indexOf("if (!user)");
  const roleCheckIdx = exitRouteSource.indexOf('profile.role !== "super_admin"');
  const atomicCallIdx = exitRouteSource.indexOf("buildAtomicExitRedirect(req.url, WORKSPACE_PREVIEW_COOKIE)");
  assert(userCheckIdx > -1 && roleCheckIdx > userCheckIdx && atomicCallIdx > roleCheckIdx, "the authentication check, then the super_admin role check, both run strictly before the atomic cookie-clearing builder is ever called");
}

console.log("\n[test] the atomic-exit.ts library: cookie deletion and the redirect are the same Response, safe redirect never sets Set-Cookie");
{
  const safeRedirectBody = atomicExitLibSource.slice(
    atomicExitLibSource.indexOf("export function buildSafeRedirect"),
    atomicExitLibSource.indexOf("export function buildAtomicExitRedirect")
  );
  assert(!safeRedirectBody.includes("Set-Cookie"), "buildSafeRedirect's body never references Set-Cookie — the failure path is structurally incapable of touching the cookie");

  const atomicBody = atomicExitLibSource.slice(atomicExitLibSource.indexOf("export function buildAtomicExitRedirect"));
  assert(atomicBody.includes("Location"), "buildAtomicExitRedirect sets a Location header");
  assert(atomicBody.includes('"Set-Cookie": serializePreviewExitCookie(cookieName)'), "buildAtomicExitRedirect sets Set-Cookie on the exact same response object as Location — one Response, one atomic transaction");
  assert(atomicExitLibSource.includes("HttpOnly"), "the serialized deletion cookie includes HttpOnly, matching the cookie's original attributes");
  assert(atomicExitLibSource.includes("SameSite=Lax"), "the serialized deletion cookie includes SameSite=Lax, matching the cookie's original attributes");
  assert(atomicExitLibSource.includes("Max-Age=0"), "the serialized deletion cookie includes Max-Age=0 (immediate expiry)");
  assert(atomicExitLibSource.includes('Path="/"') || atomicExitLibSource.includes('"Path=/"'), "the serialized deletion cookie includes Path=/, matching the cookie's original attributes");
}

console.log("\n[test] no forbidden pattern anywhere in the exit surfaces (setTimeout, reload, cache-buster)");
{
  for (const [label, src] of [["workspace-exit-button.tsx", exitButtonSource], ["workspace-preview-banner.tsx", bannerSource], ["exit/route.ts", exitRouteSource], ["atomic-exit.ts", atomicExitLibSource]] as const) {
    assert(!src.includes("setTimeout"), `${label} — no setTimeout anywhere`);
    assert(!src.includes("location.reload"), `${label} — no window.location.reload anywhere`);
    assert(!/Math\.random\(\)/.test(src), `${label} — no random query-param/cache-buster generation`);
  }
}

console.log(`\n[test] atomic-exit-ui — ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
})();
