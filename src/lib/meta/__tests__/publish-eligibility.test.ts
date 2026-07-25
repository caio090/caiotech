/**
 * Ad-hoc test for src/lib/meta/publish-eligibility.ts — the single shared
 * status/connection/format contract used by both the publish route and
 * (indirectly, via the messages it returns) the frontend button.
 *
 * No jest/vitest in this project (see src/lib/workspaces/__tests__ for the
 * same convention) and installing one is out of scope for this fix. This
 * file's dependency chain (publish-eligibility.ts -> supabase/types.ts)
 * uses ordinary extensionless relative imports, which Node's native
 * TS-stripping cannot resolve directly (unlike Node/CJS resolution, it
 * requires an explicit extension on relative specifiers). Rather than
 * adding a source-level ".ts" extension (which would need
 * allowImportingTsExtensions in the app's real tsconfig.json, changing a
 * project-wide compiler contract just for a test runner), this and
 * publishing.test.ts are compiled to plain CommonJS by the TypeScript
 * compiler already in devDependencies, via the isolated
 * tsconfig.meta-tests.json (does not touch/extend the app's tsconfig.json
 * or the Next.js build):
 *
 *   npm run test:meta
 *
 * That script runs `tsc --project tsconfig.meta-tests.json` (output to
 * .tmp/meta-tests-build/) and then plain `node` on the compiled output.
 */
(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const eligibility = require("../publish-eligibility") as typeof import("../publish-eligibility");
const {
  isMetaPublishableDbStatus,
  resolveMetaContentFormat,
  resolveMetaConnectionState,
  resolveMetaAssetLinkage,
  resolveMetaPublishBlockReason,
} = eligibility;

let passed = 0;
let failed = 0;
function assert(condition: boolean, label: string) {
  if (condition) { passed++; console.log(`  ok   - ${label}`); }
  else { failed++; console.error(`  FAIL - ${label}`); }
}

console.log("[test] isMetaPublishableDbStatus — mirrors dbStatusToUi's \"approved\" bucket");
{
  assert(isMetaPublishableDbStatus("aprovado") === true, "aprovado is publishable");
  assert(isMetaPublishableDbStatus("agendado") === true, "agendado is publishable");
  assert(isMetaPublishableDbStatus("pronto_para_agendar") === false, "pronto_para_agendar is NOT publishable (no UI path reaches it — the P1 the audit flagged)");
  assert(isMetaPublishableDbStatus("ideia") === false, "ideia is not publishable");
  assert(isMetaPublishableDbStatus("publicado") === false, "publicado is not publishable (already published, not re-publishable via this gate)");
  assert(isMetaPublishableDbStatus("reprovado") === false, "reprovado is not publishable");
  assert(isMetaPublishableDbStatus("nonexistent_status") === false, "unknown status falls back to non-publishable, never throws");
}

console.log("\n[test] resolveMetaContentFormat — Feed image only, Stories/Reels/carousel blocked");
{
  assert(resolveMetaContentFormat({ type: "feed", carousel_pages_count: null }) === "feed_image", "type=feed is feed_image");
  assert(resolveMetaContentFormat({ type: "FEED", carousel_pages_count: undefined }) === "feed_image", "type match is case-insensitive");
  assert(resolveMetaContentFormat({ type: "post", carousel_pages_count: 0 }) === "feed_image", "type=post is treated as feed_image");
  assert(resolveMetaContentFormat({ type: "story", carousel_pages_count: null }) === "unsupported_format", "story is blocked");
  assert(resolveMetaContentFormat({ type: "reels", carousel_pages_count: null }) === "unsupported_format", "reels is blocked");
  assert(resolveMetaContentFormat({ type: "carrossel", carousel_pages_count: null }) === "unsupported_format", "carrossel (pt) is blocked");
  assert(resolveMetaContentFormat({ type: "carousel", carousel_pages_count: null }) === "unsupported_format", "carousel (en) is blocked");
  assert(resolveMetaContentFormat({ type: "feed", carousel_pages_count: 3 }) === "unsupported_format", "type=feed with carousel_pages_count > 1 is still blocked (multi-page overrides the type label)");
  assert(resolveMetaContentFormat({ type: null, carousel_pages_count: null }) === "unsupported_format", "null type is blocked, never assumed to be feed");
}

console.log("\n[test] resolveMetaConnectionState");
{
  assert(resolveMetaConnectionState(null) === "not_connected", "null connection is not_connected");
  assert(resolveMetaConnectionState({ status: "expired", scopes: "instagram_content_publish" }) === "not_connected", "non-active status is not_connected even with the right scope");
  assert(resolveMetaConnectionState({ status: "active", scopes: "instagram_basic,pages_show_list" }) === "needs_reconnect", "active but missing instagram_content_publish needs_reconnect");
  assert(resolveMetaConnectionState({ status: "active", scopes: null }) === "needs_reconnect", "active with null scopes needs_reconnect");
  assert(resolveMetaConnectionState({ status: "active", scopes: "instagram_basic,instagram_content_publish" }) === "ready", "active with the scope present is ready");
}

console.log("\n[test] resolveMetaAssetLinkage — cross-client ambiguity by distinct client_id count");
{
  // 3. Same asset_id linked to two different client_id rows.
  assert(resolveMetaAssetLinkage([{ client_id: "client-a" }, { client_id: "client-b" }]) === "ambiguous", "3. the same asset linked to two distinct clients is ambiguous");
  // exclusive: one distinct client.
  assert(resolveMetaAssetLinkage([{ client_id: "client-a" }]) === "exclusive", "one row, one client: exclusive");
  // not_found: no rows at all.
  assert(resolveMetaAssetLinkage([]) === "not_found", "no rows at all: not_found");
  // 8. Same client with duplicate rows for the same asset must NOT be
  // flagged ambiguous — a Set of client_id collapses the duplicates to one.
  assert(resolveMetaAssetLinkage([{ client_id: "client-a" }, { client_id: "client-a" }]) === "exclusive", "8. duplicate rows for the SAME client collapse to one distinct client — not a false ambiguity");
  // 7. Ambiguity is per asset_id — two different assets for the same admin/user stay independent (nothing here mixes them; this just documents that resolveMetaAssetLinkage only ever sees rows already filtered to one asset_id, so two different assets never appear in the same call).
  assert(resolveMetaAssetLinkage([{ client_id: "client-a" }]) === "exclusive" && resolveMetaAssetLinkage([{ client_id: "client-c" }]) === "exclusive", "7. two independent asset_id lookups (as the route does, one query per asset_id) never interfere with each other");
}

console.log("\n[test] resolveMetaPublishBlockReason — ordering matches what a user needs to fix first");
{
  const base = {
    dbStatus: "aprovado",
    alreadyPublished: false,
    format: "feed_image" as const,
    hasMediaUrl: true,
    hasInstagramAsset: true,
    assetLinkage: "exclusive" as const,
    connectionState: "ready" as const,
  };
  // 1 & 2. Exclusive asset with everything else in order is fully eligible
  // — the same null result is what lets dry_run proceed AND what the
  // publish branch checks before actually calling the Graph API.
  assert(resolveMetaPublishBlockReason(base) === null, "1&2. an exclusive asset with everything else ready returns null — both dry_run and the publish path are clear to proceed");
  assert(resolveMetaPublishBlockReason({ ...base, alreadyPublished: true }) === "already_published", "already_published wins over every other check");
  assert(resolveMetaPublishBlockReason({ ...base, dbStatus: "ideia" }) === "not_approved", "wrong status blocks before format/media/connection are even considered");
  assert(resolveMetaPublishBlockReason({ ...base, format: "unsupported_format" }) === "unsupported_format", "unsupported format blocks before asset/media/connection");
  // 10. No asset linked at all keeps today's existing error, regardless of
  // assetLinkage (which would independently read "not_found" here too).
  assert(resolveMetaPublishBlockReason({ ...base, hasInstagramAsset: false, assetLinkage: "not_found" }) === "instagram_not_linked", "10. no Instagram asset linked at all keeps the pre-existing instagram_not_linked error");
  // 3 (via the shared gate). Ambiguous blocks before media/connection are even considered.
  assert(resolveMetaPublishBlockReason({ ...base, assetLinkage: "ambiguous" }) === "asset_link_ambiguous", "3b. an ambiguous asset link blocks with asset_link_ambiguous, checked before media/connection");
  assert(resolveMetaPublishBlockReason({ ...base, assetLinkage: "ambiguous", hasMediaUrl: false, connectionState: "not_connected" }) === "asset_link_ambiguous", "ambiguity wins even when media AND connection are also broken — it's still the reported reason");
  assert(resolveMetaPublishBlockReason({ ...base, hasMediaUrl: false }) === "invalid_media", "missing media URL blocks before connection state (asset is exclusive, so this is reached)");
  // 9. An inactive/disconnected connection still blocks even when the asset link itself is exclusive (not ambiguous) — ambiguity detection doesn't accidentally short-circuit this existing check.
  assert(resolveMetaPublishBlockReason({ ...base, connectionState: "not_connected" }) === "connection_inactive", "9. no active connection blocks even for an exclusive asset");
  assert(resolveMetaPublishBlockReason({ ...base, connectionState: "needs_reconnect" }) === "permission_missing", "connection without the new scope blocks with a reconnect-specific reason");
}

console.log(`\n[test] publish-eligibility.ts — ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
})();
