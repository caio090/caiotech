/**
 * Ad-hoc test for the preview session token (Fase 18 do hotfix 1.0.1).
 *
 * No test framework is installed in this project (no jest/vitest in
 * package.json) — this file follows the same pattern used for the Sprint
 * Workspaces 1.0 capability-registry checks: a dependency-free script that
 * imports the REAL production module and asserts against its actual
 * behavior. Node 24's native TypeScript support runs it directly, no build
 * step required:
 *
 *   node src/lib/workspaces/__tests__/preview-session.test.ts
 *
 * Scope: this file only covers src/lib/workspaces/preview-session.ts, the
 * one module in this sprint's new code with zero Next.js/Supabase
 * dependencies — everything else that touches cookies(), getCurrentUser(),
 * or the Supabase client (context.ts, assert-not-preview.ts, the
 * preview/route.ts handlers) needs either a running server with a real
 * authenticated super_admin session, or a mocking-capable test framework,
 * neither of which is available in this sandbox. That gap is disclosed in
 * the sprint's final report rather than faked here.
 */
// Deliberately CommonJS-only (no `import` statement anywhere in this file):
// an `import` — even `import type` — makes Node's module-type sniffer treat
// this file as ESM, which then requires explicit ".ts" extensions that tsc
// itself rejects without `allowImportingTsExtensions`. `require` keeps the
// file readable by both tsc (as a plain relative specifier) and by Node's
// native TS-stripping runtime (as CommonJS, package.json's default).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createHmac } = require("crypto") as typeof import("crypto");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createPreviewSessionToken, verifyPreviewSessionToken } = require("../preview-session.ts") as typeof import("../preview-session");

// Structural copy of PreviewSessionPayload for forging test tokens — kept
// local (not imported) for the same CJS/ESM-sniffing reason as above.
interface TestPayload {
  uid: string;
  surface: string;
  workspaceId: string;
  parentWorkspaceId: string | null;
  isBlueprint: boolean;
  n: string;
  iat: number;
  exp: number;
  v: 1;
}

process.env.META_APP_SECRET = "adhoc-test-secret-do-not-use-in-prod";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
    console.log(`  ok   - ${label}`);
  } else {
    failed++;
    console.error(`  FAIL - ${label}`);
  }
}

function forgeToken(payload: TestPayload, secret: string): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(data).digest("hex");
  return `${data}.${sig}`;
}

console.log("[test] preview-session.ts — valid round-trip");
{
  const token = createPreviewSessionToken({
    uid: "user-1",
    surface: "direct_business",
    workspaceId: "client-abc",
    parentWorkspaceId: null,
    isBlueprint: false,
  });
  const result = verifyPreviewSessionToken(token);
  assert(result.ok === true, "valid token verifies as ok");
  if (result.ok) {
    assert(result.payload.uid === "user-1", "payload.uid round-trips");
    assert(result.payload.surface === "direct_business", "payload.surface round-trips");
    assert(result.payload.workspaceId === "client-abc", "payload.workspaceId round-trips");
    assert(result.payload.isBlueprint === false, "payload.isBlueprint round-trips");
    assert(!("readOnly" in result.payload), "payload never carries a readOnly field to tamper with");
  }
}

console.log("[test] preview-session.ts — tampered payload segment is rejected");
{
  const token = createPreviewSessionToken({
    uid: "user-1",
    surface: "agency",
    workspaceId: "agency-1",
    parentWorkspaceId: null,
    isBlueprint: false,
  });
  const [data, sig] = token.split(".");
  const decoded = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as TestPayload;
  const tamperedPayload = { ...decoded, workspaceId: "someone-elses-workspace" };
  const tamperedData = Buffer.from(JSON.stringify(tamperedPayload)).toString("base64url");
  const tamperedToken = `${tamperedData}.${sig}`;
  const result = verifyPreviewSessionToken(tamperedToken);
  assert(result.ok === false, "payload tampering is rejected");
  assert(!result.ok && result.reason === "invalid_signature", "tampered payload yields invalid_signature, not a crash");
}

console.log("[test] preview-session.ts — tampered signature is rejected");
{
  const token = createPreviewSessionToken({
    uid: "user-1",
    surface: "agency_client",
    workspaceId: "client-1",
    parentWorkspaceId: "agency-1",
    isBlueprint: false,
  });
  const [data] = token.split(".");
  const tamperedToken = `${data}.${"0".repeat(64)}`;
  const result = verifyPreviewSessionToken(tamperedToken);
  assert(result.ok === false, "forged signature is rejected");
  assert(!result.ok && result.reason === "invalid_signature", "forged signature yields invalid_signature");
}

console.log("[test] preview-session.ts — malformed token never throws, never grants access");
{
  const cases = [null, undefined, "", "no-dot-in-here", "a.b.c", "..", "not-base64url!!.deadbeef"];
  for (const c of cases) {
    let threw = false;
    let result: ReturnType<typeof verifyPreviewSessionToken> | null = null;
    try {
      result = verifyPreviewSessionToken(c as string | null | undefined);
    } catch {
      threw = true;
    }
    assert(!threw, `malformed input ${JSON.stringify(c)} does not throw`);
    assert(!!result && result.ok === false, `malformed input ${JSON.stringify(c)} is rejected, not granted`);
  }
}

console.log("[test] preview-session.ts — expired token is rejected but readable for audit logging");
{
  const secret = process.env.META_APP_SECRET!;
  const expiredPayload: TestPayload = {
    uid: "user-2",
    surface: "direct_business",
    workspaceId: "client-xyz",
    parentWorkspaceId: null,
    isBlueprint: false,
    n: "deadbeefdeadbeefdeadbeef",
    iat: Date.now() - 3 * 60 * 60 * 1000,
    exp: Date.now() - 60 * 1000, // expired 1 minute ago
    v: 1,
  };
  const expiredToken = forgeToken(expiredPayload, secret);
  const result = verifyPreviewSessionToken(expiredToken);
  assert(result.ok === false, "expired token is rejected (ok: false)");
  assert(!result.ok && result.reason === "expired", "expired token reports reason: expired");
  assert(
    !result.ok && result.reason === "expired" && result.payload.uid === "user-2",
    "expired token still exposes its (signature-verified) payload for audit logging only"
  );
}

console.log("[test] preview-session.ts — blueprint tokens carry isBlueprint through unchanged");
{
  const token = createPreviewSessionToken({
    uid: "user-3",
    surface: "agency",
    workspaceId: "blueprint-agency-01",
    parentWorkspaceId: null,
    isBlueprint: true,
  });
  const result = verifyPreviewSessionToken(token);
  assert(result.ok === true && result.payload.isBlueprint === true, "blueprint flag survives sign/verify round-trip");
}

console.log(`\n[test] preview-session.ts — ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
