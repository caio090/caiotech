/**
 * Structural regression test for Workspaces preview ACTIVATION navigation
 * only. History: 1.0.8 introduced router.push()+router.refresh() to fix a
 * P1 (blueprint switches needed a manual reload). 1.0.9 replaced both with
 * a single window.location.assign(), gated on a validated 2xx response.
 *
 * Hotfix 1.0.10 — scope note: this file used to also cover
 * workspace-exit-button.tsx's exit flow, but that flow no longer uses
 * client-side JavaScript navigation at all (see
 * atomic-exit-ui.structural.test.ts) — exit is now a real HTML <form
 * method="post"> submission to a dedicated atomic endpoint. Activation
 * (entering a preview) is unaffected by the 1.0.10 ticket and keeps its
 * 1.0.9 shape unchanged; this file is trimmed to that scope so it doesn't
 * assert on code that no longer exists.
 *
 * No jest/vitest in this project, and no DOM/browser testing framework
 * is installed — this follows the same disclosed-limitation, source-level
 * convention as the rest of this sprint: it proves the actual call sites,
 * their order, and that nothing gates or loops them — not just that a
 * string appears somewhere in the file.
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
const previewRouteSource = readFileSync(join(__dirname, "..", "..", "..", "app", "api", "admin", "workspaces", "preview", "route.ts"), "utf8");

function extractFunctionBody(source: string, signature: RegExp): string {
  const startMatch = source.match(signature);
  if (!startMatch || startMatch.index === undefined) return "";
  // Balance braces from the function's opening "{" to find its true end —
  // robust against nested blocks with their own closing braces at the
  // same indentation, unlike a naive "first \n  }" regex.
  const openBraceIdx = source.indexOf("{", startMatch.index);
  let depth = 0;
  for (let i = openBraceIdx; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) return source.slice(startMatch.index, i + 1);
    }
  }
  return source.slice(startMatch.index);
}

const enterPreviewBody = extractFunctionBody(switcherSource, /async function enterPreview\(/);

console.log("[test] confirmed root cause: destination is always the same fixed pathname");
{
  const destinationMatches = [...previewRouteSource.matchAll(/destination:\s*"([^"]+)"/g)].map((m) => m[1]);
  assert(destinationMatches.length >= 2, "the preview route has at least the two success-path destinations expected");
  assert(destinationMatches.every((d) => d === "/admin/visualizar"), "every destination the preview route can return is the SAME fixed pathname");
}

console.log("\n[test] router.push/router.refresh are gone from the activation flow");
{
  // (workspace-view-switcher.tsx's comments legitimately still mention
  // "router.push()"/"router.refresh()" in prose, explaining what the
  // *previous* hotfix did and why it wasn't enough — a plain string search
  // for those substrings would incorrectly flag that prose as leftover
  // code, hence the import-statement regex instead.)
  assert(!/import\s*\{[^}]*useRouter[^}]*\}\s*from\s*"next\/navigation"/.test(switcherSource), "workspace-view-switcher.tsx no longer imports useRouter — no router.push/router.refresh call can exist without it");
}

console.log("\n[test] activation: one POST, disabled while in flight, location.assign exactly once on success");
{
  assert(enterPreviewBody.length > 0, "enterPreview() is present");
  assert(/if\s*\(entering\)\s*return;/.test(enterPreviewBody), "enterPreview() returns immediately if already entering — a second click cannot fire a second POST");
  const postCalls = [...enterPreviewBody.matchAll(/method:\s*"POST"/g)];
  assert(postCalls.length === 1, "exactly one POST call exists in enterPreview()");

  const assignCalls = [...enterPreviewBody.matchAll(/window\.location\.assign\(/g)];
  assert(assignCalls.length === 1, "exactly one window.location.assign(...) call exists in enterPreview()");

  // The assign call must be inside the success branch (gated on res.ok +
  // body.ok + the validated destination), not unconditional.
  const successBranchMatch = enterPreviewBody.match(/if \(res\.ok && body\?\.ok === true && body\.destination === PREVIEW_DESTINATION\) \{[\s\S]*?window\.location\.assign\(body\.destination\);/);
  assert(!!successBranchMatch, "window.location.assign is gated behind res.ok, body.ok === true, AND a destination equality check — not called unconditionally");

  // Error paths (bad response, thrown exception) must never reach assign.
  const catchBlock = enterPreviewBody.match(/\} catch \{[\s\S]*?\n  \}$/)?.[0] ?? enterPreviewBody.slice(enterPreviewBody.indexOf("} catch"));
  assert(!catchBlock.includes("window.location.assign"), "the catch block (network/thrown errors) never calls window.location.assign");
  const afterSuccessBranch = enterPreviewBody.slice((successBranchMatch ? enterPreviewBody.indexOf(successBranchMatch[0]) + successBranchMatch[0].length : 0));
  assert(!afterSuccessBranch.includes("window.location.assign"), "no other window.location.assign call exists outside the validated success branch — an invalid/malformed response cannot navigate");

  // Button/options are disabled while entering — the render only shows
  // selectable options when NOT entering (existing !entering gate).
  assert(switcherSource.includes("!entering && optionsState"), "option buttons are only rendered when not currently entering — no new click can fire mid-request");

  // The overlay copy required by the 1.0.9 ticket.
  assert(switcherSource.includes("Trocando ambiente"), "the \"Trocando ambiente...\" overlay text is present");
}

console.log("\n[test] Cache-Control: no-store on both POST and DELETE; cookie stays HttpOnly");
{
  const noStoreCount = [...previewRouteSource.matchAll(/res\.headers\.set\("Cache-Control",\s*"no-store"\)/g)].length;
  assert(noStoreCount === 3, `Cache-Control: no-store is set on all 3 success responses (blueprint POST, real-workspace POST, DELETE) — found ${noStoreCount}`);
  const httpOnlyCount = [...previewRouteSource.matchAll(/httpOnly:\s*true/g)].length;
  assert(httpOnlyCount === 3, "the cookie is still set/cleared with httpOnly: true in all 3 places — Cache-Control is additive, the cookie's own security attributes are untouched");
}

console.log(`\n[test] preview-navigation-sync — ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
})();
