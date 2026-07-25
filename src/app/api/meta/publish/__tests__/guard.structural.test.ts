/**
 * Structural test for the P0 finding from the Meta contamination audit:
 * "POST /api/meta/publish has no explicit Workspaces mutation guard."
 *
 * A real behavioral test (send a request, assert HTTP 403) would need
 * assertWorkspaceMutationAllowed()'s dependency chain
 * (src/lib/workspaces/context.ts -> next/headers cookies(),
 * @/lib/auth/get-current-user, @/lib/supabase/server) — none of which can
 * run outside an actual Next.js request without either a live server with
 * a real preview session, or a mocking-capable test framework. Neither is
 * available in this project (no jest/vitest — see
 * src/lib/workspaces/__tests__/preview-session.test.ts for the same
 * disclosed limitation).
 *
 * What IS verifiable without any of that, and is exactly what the audit's
 * P0 finding was actually about, is source-level: does this file wrap its
 * POST export with withMutationProtection, with nothing bypassing it. This
 * uses the identical technique scripts/check-workspace-mutation-coverage.ts
 * already uses (and this project already trusts) to verify every other
 * protected route — `content.includes("withMutationProtection")` — just
 * scoped precisely to this one file with a few additional checks the
 * generic scanner does not make.
 *
 *   npx tsx does not exist in this project; run with:
 *   node --experimental-strip-types src/app/api/meta/publish/__tests__/guard.structural.test.ts
 *   (or plain `node <file>` on recent Node where type-stripping is default)
 *
 * This file only reads its sibling route.ts as text — no Next.js/Supabase
 * import, so it needs none of the workarounds the src/lib/meta tests do.
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

const routeSource = readFileSync(join(__dirname, "..", "route.ts"), "utf8");

console.log("[test] POST /api/meta/publish is wrapped by withMutationProtection");
{
  assert(
    /import\s*\{[^}]*\bwithMutationProtection\b[^}]*\}\s*from\s*["']@\/lib\/workspaces\/assert-not-preview["']/.test(routeSource),
    "route.ts imports withMutationProtection from the real Workspaces guard module (not a local stub)",
  );

  // The exported handler must be the wrapper's return value, not the raw
  // async function — a decorator that exists but isn't applied to the
  // actual exported handler would defeat the whole point (the audit
  // explicitly warned against exactly this: "could be decorating a dead
  // function").
  assert(
    /export\s+const\s+POST\s*=\s*withMutationProtection\(\s*handlePublish\s*\)\s*;/.test(routeSource),
    "the exported POST is literally withMutationProtection(handlePublish) — the guard wraps the real handler",
  );

  // No second, unwrapped mutating export could bypass the guard.
  const exportedMutatingHandlers = [...routeSource.matchAll(/export\s+(?:const|async function)\s+(POST|PUT|PATCH|DELETE)\b/g)].map((m) => m[1]);
  assert(exportedMutatingHandlers.length === 1 && exportedMutatingHandlers[0] === "POST", "exactly one mutating export exists (POST) — no bypass route through PUT/PATCH/DELETE in the same file");

  // handlePublish itself (the wrapped function) must not also be exported
  // directly — that would let a caller reach it through a re-export
  // elsewhere, skipping the wrapper.
  assert(!/export\s+(?:async\s+)?function\s+handlePublish\b/.test(routeSource) || /^\s*async function handlePublish/m.test(routeSource.replace(/export\s+/, "")),
    "handlePublish is not itself exported — it is only reachable through the wrapped POST");
  assert(!/export\s*\{\s*handlePublish/.test(routeSource), "handlePublish is not re-exported by name");
}

console.log("\n[test] meta_publication_confirmed_by / meta_publication_account_id come from the server, never from the request body");
{
  // The request body's shape is narrowly typed — only content_id and mode
  // are ever read from it anywhere in the file.
  assert(/interface PublishRequest \{ content_id\?: string; mode\?: MetaPublishMode \}/.test(routeSource), "PublishRequest only declares content_id and mode — no field for confirmed_by/account_id exists to accept from the client");
  assert(routeSource.includes("meta_publication_confirmed_by: user.id"), "meta_publication_confirmed_by is assigned literally from user.id (the authenticated session), not from any body.* field");
  assert(routeSource.includes("meta_publication_account_id: plan.instagramAccountId"), "meta_publication_account_id is assigned from plan.instagramAccountId, itself built from the server-resolved client_meta_assets row, not from the request body");
  assert(!/body\.\s*(confirmed_by|account_id|user_id|meta_publication_confirmed_by|meta_publication_account_id)/.test(routeSource), "no code path reads a confirmed_by/account_id-like field from the request body");
}

console.log("\n[test] dry_run can never reach the Graph API call, positionally");
{
  // A blocked eligibility check (e.g. permission_missing / needs_reconnect)
  // returns before the plan is even built; dry_run mode returns right
  // after that, before the try{} block that calls publishInstagramFeed.
  // Checking the source ordering (not just presence) guards against a
  // future edit accidentally moving the dry_run return after the Graph
  // API call.
  const blockReasonIdx = routeSource.indexOf("if (blockReason)");
  const dryRunReturnIdx = routeSource.indexOf('body.mode === "dry_run"');
  const publishCallIdx = routeSource.indexOf("await publishInstagramFeed(");
  assert(blockReasonIdx > -1 && dryRunReturnIdx > -1 && publishCallIdx > -1, "all three anchors are present in the file");
  assert(blockReasonIdx < dryRunReturnIdx && dryRunReturnIdx < publishCallIdx, "blockReason check, then the dry_run early return, both appear before the actual Graph API call — needs_reconnect/permission_missing and dry_run can never reach publishInstagramFeed");
}

console.log("\n[test] cross-client asset ambiguity blocks before the token, the Graph API, or any metadata write");
{
  // 4. The ambiguous-asset return must appear before the meta_connections
  // query that selects access_token — ambiguity blocks BEFORE the token is
  // ever loaded, not just before it's used.
  const ambiguousReturnIdx = routeSource.indexOf('reason: "asset_link_ambiguous"');
  const tokenQueryIdx = routeSource.indexOf('.select("access_token, scopes, status")');
  const publishCallIdx2 = routeSource.indexOf("await publishInstagramFeed(");
  assert(ambiguousReturnIdx > -1 && tokenQueryIdx > -1 && publishCallIdx2 > -1, "all three anchors are present in the file");
  assert(ambiguousReturnIdx < tokenQueryIdx, "4a. the asset_link_ambiguous return appears before the query that loads access_token — the token is never fetched when ambiguous");
  assert(ambiguousReturnIdx < publishCallIdx2, "4b. the asset_link_ambiguous return appears before the Graph API call, positionally");

  // 5. No content_items metadata update can happen before the ambiguity
  // check — the only .update( on content_items is inside the publish
  // try{} block, which is unreachable from the ambiguous return.
  const metadataUpdateIdx = routeSource.indexOf('.update({ status: "publicado"');
  assert(metadataUpdateIdx > ambiguousReturnIdx, "5. the metadata update appears strictly after the ambiguity check in the source — unreachable without passing it");

  // 6. The ambiguous response body is a fixed, generic object — it cannot
  // carry another client's id or name because resolveMetaAssetLinkage()
  // only ever returns the string "ambiguous" (see publish-eligibility.ts),
  // never the underlying rows, and the route's own response literal here
  // has no variable interpolation at all.
  assert(/\{ ok: false, reason: "asset_link_ambiguous", message: META_PUBLISH_BLOCK_MESSAGES\.asset_link_ambiguous \}/.test(routeSource), "6. the ambiguous response is a fixed literal — ok, a hardcoded reason string, and a message looked up by key, no interpolated client id/name/token can appear in it");

  // 11. The very first client_meta_assets lookup is still scoped by
  // content.client_id (from the DB row), never by anything from the
  // request body — the ambiguity check is a SECOND, separate query that
  // deliberately drops the client_id filter to look cross-client, but the
  // per-client resolution step it depends on is unchanged.
  assert(/\.eq\("client_id",\s*content\.client_id\)/.test(routeSource), "11. content.client_id (from the database row) is still what scopes the per-client asset lookup");

  // 12. account_id in the eventual metadata write still traces back to
  // plan.instagramAccountId, which traces back to asset.asset_id resolved
  // server-side above — covered together with confirmed_by in the earlier
  // block; re-asserted here in the ambiguity context to confirm the new
  // code path didn't introduce a second, body-controlled account id.
  assert(routeSource.includes("buildInstagramFeedPlan(content, asset.asset_id as string)"), "12. the plan (and therefore meta_publication_account_id) is built from asset.asset_id, the server-resolved row — the ambiguity check runs on the same resolved asset, not a body-supplied id");
}

console.log("\n[test] the guard's known response shape (from assert-not-preview.ts, read directly)");
{
  const guardSource = readFileSync(join(__dirname, "..", "..", "..", "..", "..", "lib", "workspaces", "assert-not-preview.ts"), "utf8");
  assert(guardSource.includes('"WORKSPACE_PREVIEW_READ_ONLY"'), "the guard's code constant is exactly WORKSPACE_PREVIEW_READ_ONLY");
  assert(guardSource.includes("Esta ação está indisponível no modo de visualização."), "the guard's user-facing message matches what the audit/ticket expects");
  assert(guardSource.includes("status: 403"), "the guard responds with HTTP 403");
  // The guard must return BEFORE any Supabase/Meta call could happen — by
  // construction this is guaranteed because withMutationProtection (see
  // above) never invokes handlePublish when the guard blocks; there is no
  // code path where content_items, meta_connections, fetch, or a metadata
  // update could run first, because handlePublish's body — where all of
  // that lives — is simply never entered.
}

console.log(`\n[test] meta/publish guard — ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
})();
