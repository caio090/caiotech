/**
 * Ad-hoc test for resolveEffectiveUserRole() (src/lib/access-control.ts) —
 * the canonical role resolver introduced in Sprint Workspaces 1.0.7, shared
 * by src/proxy.ts, the login redirect, and src/app/admin/layout.tsx.
 *
 * No jest/vitest in this project — plain Node script, same convention as
 * src/lib/workspaces/__tests__/preview-session.test.ts. access-control.ts
 * has zero imports, so it's directly requireable by Node's native
 * TypeScript support without any build step.
 *
 *   node src/lib/__tests__/access-control-role.test.ts
 */
(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const accessControl = require("../access-control.ts") as typeof import("../access-control");
const { resolveEffectiveUserRole, VALID_ROLES } = accessControl;

let passed = 0;
let failed = 0;
function assert(condition: boolean, label: string) {
  if (condition) { passed++; console.log(`  ok   - ${label}`); }
  else { failed++; console.error(`  FAIL - ${label}`); }
}

console.log("[test] resolveEffectiveUserRole — precedence and validation");
{
  // 1. profile.role super_admin resolves super_admin.
  assert(
    resolveEffectiveUserRole({ profileRole: "super_admin", userMetadataRole: null, appMetadataRole: null }) === "super_admin",
    "1. profile.role = super_admin resolves to super_admin",
  );

  // 2. profile.role null + user_metadata.role super_admin resolves super_admin.
  assert(
    resolveEffectiveUserRole({ profileRole: null, userMetadataRole: "super_admin", appMetadataRole: null }) === "super_admin",
    "2. null profile.role falls back to user_metadata.role = super_admin",
  );

  // 3. profile.role null + app_metadata.role super_admin resolves super_admin.
  assert(
    resolveEffectiveUserRole({ profileRole: null, userMetadataRole: null, appMetadataRole: "super_admin" }) === "super_admin",
    "3. null profile.role and user_metadata.role fall back to app_metadata.role = super_admin",
  );

  // 4. profile.role inválido não promove usuário — an unrecognized string
  // is skipped, not trusted, even though it was non-null.
  assert(
    resolveEffectiveUserRole({ profileRole: "owner-of-everything", userMetadataRole: "admin", appMetadataRole: null }) === "admin",
    "4. an invalid profile.role value is skipped (never promotes), falling through to the next valid candidate",
  );
  assert(
    resolveEffectiveUserRole({ profileRole: "owner-of-everything", userMetadataRole: null, appMetadataRole: null }) === null,
    "4b. when every candidate is invalid, the result is null — never a guessed role",
  );

  // 5. metadata inválida não promove usuário — same guarantee for the
  // metadata-sourced candidates, not just profile.role.
  assert(
    resolveEffectiveUserRole({ profileRole: null, userMetadataRole: "hacker_admin", appMetadataRole: "super_admin" }) === "super_admin",
    "5. an invalid user_metadata.role value is skipped, falling through to a valid app_metadata.role",
  );

  // Precedence order is strictly profile -> user_metadata -> app_metadata.
  assert(
    resolveEffectiveUserRole({ profileRole: "operacional", userMetadataRole: "super_admin", appMetadataRole: "super_admin" }) === "operacional",
    "profile.role wins over user_metadata/app_metadata even when they disagree — precedence is profile first",
  );

  // Every canonical role is accepted; VALID_ROLES is derived from ROLE_HOME, not hardcoded twice.
  assert(VALID_ROLES.has("super_admin") && VALID_ROLES.has("cliente") && VALID_ROLES.has("operacional"), "VALID_ROLES contains the real role vocabulary (derived from ROLE_HOME)");
  assert(!VALID_ROLES.has("superadmin") && !VALID_ROLES.has("Super Admin"), "VALID_ROLES does not silently include casing/spacing variants nobody defined");

  // Whitespace hygiene (not name-based inference) is fine; case is not altered.
  assert(resolveEffectiveUserRole({ profileRole: "  super_admin  ", userMetadataRole: null, appMetadataRole: null }) === "super_admin", "incidental surrounding whitespace is trimmed, not treated as a different role");
  assert(resolveEffectiveUserRole({ profileRole: "Super_Admin", userMetadataRole: null, appMetadataRole: null }) === null, "a differently-cased value is NOT coerced/guessed into super_admin — no name-based inference");

  // null/undefined/empty-string inputs never throw and never resolve to a role.
  assert(resolveEffectiveUserRole({}) === null, "no sources at all resolves to null, never throws");
  assert(resolveEffectiveUserRole({ profileRole: "", userMetadataRole: "", appMetadataRole: "" }) === null, "empty strings are treated as absent, not as a role");
}

console.log(`\n[test] access-control role resolver — ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
})();
