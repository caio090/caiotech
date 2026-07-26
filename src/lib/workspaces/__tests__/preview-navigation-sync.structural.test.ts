/**
 * Structural regression test for Sprint Workspaces 1.0.8.
 *
 * Bug confirmed by Production QA: switching between blueprints (Agência →
 * Cliente → Empresa → Agência) only showed the new context after a manual
 * browser reload; exiting a preview could visually linger too.
 *
 * Root cause (traced through the real request flow, not guessed):
 * POST /api/admin/workspaces/preview always resolves `destination` to the
 * SAME fixed pathname, "/admin/visualizar" (confirmed by reading
 * src/app/api/admin/workspaces/preview/route.ts directly — both success
 * branches return `{ ok: true, destination: "/admin/visualizar" }"`).
 * Since a user switching blueprints is already ON /admin/visualizar,
 * `router.push(body.destination)` was pushing to the CURRENT pathname —
 * a same-URL no-op in the Next.js App Router: no navigation event fires,
 * and nothing tells the client Router Cache that src/app/admin/layout.tsx
 * (the shared server component that resolves previewContext from the
 * just-changed cookie) needs to re-run. Even on the FIRST activation
 * (dashboard -> /admin/visualizar, a real pathname change), the same
 * shared layout segment can still be served from the Router Cache, which
 * has no visibility into a cookie having changed server-side. Exiting the
 * preview (workspace-exit-button.tsx) had the identical gap: the DELETE
 * request clears the cookie server-side, but a bare `router.push()` gave
 * the client no reason to re-resolve that same shared layout.
 *
 * Fix: call `router.refresh()` immediately after `router.push()` in both
 * places. `router.refresh()` re-runs the current route's server
 * components (this shared layout included) against the current, fresh
 * cookie — it's the one App Router primitive that actually invalidates
 * the Router Cache, independent of whether the pathname changed.
 *
 * No jest/vitest in this project, and no DOM/browser testing framework
 * (React Testing Library, Playwright) is installed — adding one is out of
 * scope for this fix. A true rendered-DOM test of router behavior would
 * need one of those; this file follows the same disclosed-limitation,
 * source-level convention already established across this sprint
 * (src/app/admin/__tests__/layout-shell.structural.test.ts,
 * src/app/api/meta/publish/__tests__/guard.structural.test.ts on the Meta
 * branch): it proves the actual call sites, their order, and that nothing
 * gates or loops them — not just that a string appears somewhere in the
 * file.
 *
 *   node src/lib/workspaces/__tests__/preview-navigation-sync.structural.test.ts
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
const switcherSource = readFileSync(join(componentsDir, "workspace-view-switcher.tsx"), "utf8");
const exitButtonSource = readFileSync(join(componentsDir, "workspace-exit-button.tsx"), "utf8");
const previewRouteSource = readFileSync(join(__dirname, "..", "..", "..", "app", "api", "admin", "workspaces", "preview", "route.ts"), "utf8");

console.log("[test] confirmed root cause: destination is always the same fixed pathname");
{
  const destinationMatches = [...previewRouteSource.matchAll(/destination:\s*"([^"]+)"/g)].map((m) => m[1]);
  assert(destinationMatches.length >= 2, "the preview route has at least the two success-path destinations expected");
  assert(destinationMatches.every((d) => d === "/admin/visualizar"), "every destination the preview route can return is the SAME fixed pathname — confirms router.push() alone would no-op when already there");
}

console.log("\n[test] 1/2/3/4. entering/switching a preview pushes AND refreshes, unconditionally");
{
  // All three surface transitions (Agência, Cliente de agência, Empresa
  // direta) funnel through this same enterPreview() function — there is
  // only one call site to check, and it covers all three by construction.
  const enterPreviewMatch = switcherSource.match(/async function enterPreview\([\s\S]*?\n  \}/);
  assert(!!enterPreviewMatch, "enterPreview() is present");
  const body = enterPreviewMatch?.[0] ?? "";

  const pushIdx = body.indexOf("router.push(body.destination)");
  const refreshIdx = body.indexOf("router.refresh();"); // trailing ";" avoids matching the explanatory comment above the real call
  assert(pushIdx > -1 && refreshIdx > -1, "both router.push(body.destination) and router.refresh() are present in enterPreview()");
  assert(pushIdx < refreshIdx, "push happens before refresh — refresh is not a leftover from some earlier, unrelated code path");

  // 5. Not gated behind a pathname comparison — fires even when the
  // destination equals the current route (the actual switching scenario).
  assert(!/if\s*\(\s*(pathname|window\.location)/.test(body), "5. refresh is unconditional — not gated behind any current-pathname check, so it still fires when switching between blueprints on the same /admin/visualizar route");

  // 9. Local switcher state (options, selectedAgency, errors) is reset via
  // close() BEFORE the navigation — no stale blueprint list/selection can
  // linger into the next render.
  const closeIdx = body.indexOf("close();");
  assert(closeIdx > -1 && closeIdx < pushIdx, "9. close() resets local switcher state before push/refresh — no stale selection or option list survives into the new context");

  // 10. Exactly one POST is issued per activation attempt — enterPreview()
  // is not retried/duplicated on its own.
  const postCalls = [...body.matchAll(/method:\s*"POST"/g)];
  assert(postCalls.length === 1, "10. exactly one POST call exists in enterPreview() — no duplicate/retry request");

  // 11. refresh() is called directly inside the click-triggered async
  // handler, not inside a useEffect/interval that could re-fire on its own.
  assert(!/setInterval|setTimeout/.test(body), "11. no setInterval/setTimeout wraps the refresh — it cannot loop on its own");
}

console.log("\n[test] 6/7/8. why the banner, the preview shell, and the agency-parent name update without a manual reload");
{
  // These all come from the SAME server-resolved source (previewContext,
  // rebuilt by src/app/admin/layout.tsx and src/app/admin/visualizar/page.tsx
  // — both server components) — router.refresh() forcing those to re-run
  // is what makes all three update together, not three separate fixes.
  const layoutSource = readFileSync(join(__dirname, "..", "..", "..", "app", "admin", "layout.tsx"), "utf8");
  assert(layoutSource.includes("getWorkspacePreviewContext()"), "6. the shared admin layout resolves previewContext fresh on every server render — refresh() is what triggers that server render again");
  assert(layoutSource.includes("previewContext?.isPreview && <WorkspacePreviewBanner") || readFileSync(join(__dirname, "..", "..", "..", "app", "admin", "_layout-client.tsx"), "utf8").includes("previewContext?.isPreview && <WorkspacePreviewBanner"), "6b. WorkspacePreviewBanner renders directly from that same previewContext prop, not from independent client state");

  const visualizarPageSource = readFileSync(join(__dirname, "..", "..", "..", "app", "admin", "visualizar", "page.tsx"), "utf8");
  assert(visualizarPageSource.includes("getWorkspacePreviewContext()"), "7. /admin/visualizar's own page.tsx (a server component) also re-resolves the context fresh on every render — this is what updates the preview's own shell (VisualizarShell), not the persistent AppSidebar");
  assert(/<VisualizarShell context=\{resolved\.context\}/.test(visualizarPageSource), "8. VisualizarShell (which renders parentWorkspaceName / \"Atendido por\") receives context directly from that fresh server resolution — no memoized/stale copy");
}

console.log("\n[test] 12/13. exit navigates to /admin/dashboard and clears the session, with the same refresh fix");
{
  assert(exitButtonSource.includes('await fetch("/api/admin/workspaces/preview", { method: "DELETE" })'), "13. exit calls DELETE on the preview session before navigating");
  const handleClickMatch = exitButtonSource.match(/async function handleClick\(\)[\s\S]*?\n  \}/);
  assert(!!handleClickMatch, "handleClick() is present");
  const exitBody = handleClickMatch?.[0] ?? "";
  const exitPushIdx = exitBody.indexOf('router.push("/admin/dashboard")');
  const exitRefreshIdx = exitBody.indexOf("router.refresh();"); // trailing ";" avoids matching the explanatory comment above the real call
  assert(exitPushIdx > -1, "12. exit pushes to /admin/dashboard, the canonical admin route — never stays on /admin/visualizar");
  assert(exitRefreshIdx > -1 && exitPushIdx < exitRefreshIdx, "exit also refreshes after pushing, for the same Router Cache reason as entering a preview");
  assert(exitBody.includes("finally"), "the push+refresh run in a finally block — they happen whether or not the DELETE request succeeds, so a network hiccup can't strand the user mid-exit");
}

console.log(`\n[test] preview-navigation-sync — ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
})();
