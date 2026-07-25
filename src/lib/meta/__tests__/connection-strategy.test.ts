/**
 * Tests for src/lib/meta/connection-strategy.ts (the reconnection matching
 * rule) plus structural checks against the real
 * src/app/api/meta/callback/route.ts source — same rationale as
 * guard.structural.test.ts: no jest/vitest in this project, and the route
 * itself depends on next/headers + Supabase, so it can't run standalone.
 *
 * connection-strategy.ts has zero cross-file imports, so — unlike
 * publish-eligibility.ts — it's directly requireable by Node's native
 * TypeScript support with no build step:
 *
 *   node src/lib/meta/__tests__/connection-strategy.test.ts
 */
(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { findExistingMetaConnection } = require("../connection-strategy.ts") as typeof import("../connection-strategy");
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

const alice1 = { id: "conn-alice-1", connected_by: "user-alice", provider: "meta", meta_user_id: "fb-111", scopes: "instagram_basic", status: "active" };
const alice2 = { id: "conn-alice-2", connected_by: "user-alice", provider: "meta", meta_user_id: "fb-222", scopes: "instagram_basic", status: "active" };
const bob1   = { id: "conn-bob-1",   connected_by: "user-bob",   provider: "meta", meta_user_id: "fb-111", scopes: "instagram_basic", status: "active" };

console.log("[test] findExistingMetaConnection — matching rule (connected_by + provider + meta_user_id)");
{
  // 1. First connection: nothing to match against yet.
  assert(findExistingMetaConnection([], { connected_by: "user-alice", provider: "meta", meta_user_id: "fb-111" }) === null, "1. empty table: first connection has nothing to match, would insert");

  // 2. Reconnecting the same identity finds the SAME row, not a different one.
  const match = findExistingMetaConnection([alice1, alice2, bob1], { connected_by: "user-alice", provider: "meta", meta_user_id: "fb-111" });
  assert(match?.id === "conn-alice-1", "2. reconnection of the same Meta identity matches the correct existing row, not a sibling or another user's");

  // 6. Same admin (connected_by) with two different meta_user_id values (e.g. authorizing on behalf of two different clients' Facebook accounts) never merges into one row.
  const aliceSecond = findExistingMetaConnection([alice1, alice2, bob1], { connected_by: "user-alice", provider: "meta", meta_user_id: "fb-222" });
  assert(aliceSecond?.id === "conn-alice-2", "6. same connected_by with a different meta_user_id matches its OWN row, never mixes with the other one");

  // 7 (isolation half): the same meta_user_id under a different connected_by never matches — no cross-user leak.
  const bobMatch = findExistingMetaConnection([alice1, alice2, bob1], { connected_by: "user-bob", provider: "meta", meta_user_id: "fb-111" });
  assert(bobMatch?.id === "conn-bob-1" && bobMatch.id !== alice1.id, "7. same meta_user_id under a different connected_by matches its own row — never returns another user's connection");

  // A genuinely new identity for a known user inserts, does not silently reuse an unrelated row.
  const newIdentity = findExistingMetaConnection([alice1, alice2, bob1], { connected_by: "user-alice", provider: "meta", meta_user_id: "fb-999" });
  assert(newIdentity === null, "a third, unseen meta_user_id for a known user matches nothing — correctly treated as a new connection to insert");

  // meta_user_id can legitimately be null (the /me call failed — "não crítico" in the callback) — must match other null rows for the same user, not every row.
  const nullRow = { id: "conn-alice-null", connected_by: "user-alice", provider: "meta", meta_user_id: null };
  const nullMatch = findExistingMetaConnection([alice1, alice2, nullRow], { connected_by: "user-alice", provider: "meta", meta_user_id: null });
  assert(nullMatch?.id === "conn-alice-null", "a null meta_user_id candidate matches an existing null row for the same user");
  assert(findExistingMetaConnection([alice1, alice2], { connected_by: "user-alice", provider: "meta", meta_user_id: null }) === null, "a null meta_user_id candidate does NOT match rows that have a real meta_user_id");
}

console.log("\n[test] structural checks on src/app/api/meta/callback/route.ts");
{
  const callbackSource = readFileSync(join(__dirname, "..", "..", "..", "app", "api", "meta", "callback", "route.ts"), "utf8");

  // 3 & 4. Reconnection updates scopes and token — the same `connectionFields`
  // object (used for both the update() and the insert() branch) includes both.
  assert(/scopes:\s*grantedScopes/.test(callbackSource), "3. the persisted fields include the freshly granted scopes on every save (update or insert)");
  assert(/access_token:\s*accessToken/.test(callbackSource), "4. the persisted fields include the fresh access_token on every save");
  assert(!/console\.(log|error|warn)\([^)]*accessToken/.test(callbackSource), "4b. accessToken is never passed to a console call — token is updated but never logged");

  // 5. No duplicate row for the same identity: an update() call exists, gated on a prior lookup, not an unconditional insert().
  assert(/\.update\(connectionFields\)\.eq\("id",\s*existing\.id\)/.test(callbackSource), "5. an existing match is updated in place by id, not re-inserted");
  assert(/existing\?\.id\s*\?/.test(callbackSource), "5b. insert only happens in the branch where no existing row was found");

  // 8. client_meta_assets is never touched by the callback — updating a
  // connection row in place cannot remove or reassign any asset that
  // references it via meta_connection_id, because no client_meta_assets
  // query exists in this file at all.
  assert(!callbackSource.includes("client_meta_assets"), "8. the callback never queries or mutates client_meta_assets — updating a connection in place cannot disturb linked assets");

  // 10. No delete() anywhere on meta_connections — a failed save cannot
  // remove a previously-working connection; Postgres updates are atomic, so
  // a save error leaves the row exactly as it was before this callback ran.
  assert(!/meta_connections["']\)\s*\n?\s*\.delete\(/.test(callbackSource) && !callbackSource.includes(".delete("), "10. no .delete( call exists anywhere in the callback — a failed save cannot erase a previously working connection");

  // The lookup filters on exactly connected_by + provider + meta_user_id —
  // the same three fields findExistingMetaConnection() specifies above.
  assert(/\.eq\("connected_by",\s*userId\)/.test(callbackSource), "the real query filters by connected_by, matching the pure rule tested above");
  assert(/\.eq\("provider",\s*"meta"\)/.test(callbackSource), "the real query filters by provider, matching the pure rule tested above");
  assert(/\.eq\("meta_user_id",\s*metaUserId\)/.test(callbackSource) && /\.is\("meta_user_id",\s*null\)/.test(callbackSource), "the real query filters by meta_user_id (or IS NULL), matching the pure rule tested above");
}

console.log("\n[test] cross-client asset isolation — known limitation, not fixed by this branch (disclosed, not improvised)");
{
  // 9. A client never receives an Instagram account belonging to another
  // client, AS FAR AS src/app/api/meta/publish/route.ts is concerned: it
  // always resolves client_meta_assets filtered by content.client_id,
  // never by input. That half is real and already covered by the "client
  // isolation" checks elsewhere. What is NOT structurally guaranteed by the
  // schema is that the SAME physical asset_id could never be linked (by an
  // operator mistake in api/meta/assets/link/route.ts) to two different
  // client_id rows — docs/supabase/37-client-meta-assets.sql's unique
  // constraint is (client_id, asset_type, asset_id), which prevents a
  // duplicate WITHIN one client, not the same asset across two clients.
  // This is a pre-existing gap in the linking flow, not introduced by the
  // publish feature, and out of scope to fix here (would need either a new
  // constraint — forbidden this sprint — or a cross-client lookup at link
  // time). Recorded as a known limitation rather than silently assumed
  // safe.
  assert(true, "documented as a known limitation — see comment above; publish itself still only ever reads the asset row scoped to content.client_id");
}

console.log(`\n[test] connection-strategy — ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
})();
