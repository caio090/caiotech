/**
 * Structural regression test for the admin Super Admin shell — covers both
 * Sprint Workspaces 1.0.6 and 1.0.7.
 *
 * 1.0.6 found that "Painel ADM" / "Visualizar como" never appearing for a
 * genuine Super Admin was NOT a wrong shell or an orphaned component —
 * WorkspaceViewSwitcher was always correctly imported and wired into the
 * one real admin layout. The actual bug was that
 * src/app/admin/_layout-client.tsx resolved role from profiles.role alone,
 * client-side, with no fallback and an early return on a null profile row
 * — so a genuine Super Admin whose profiles.role was null/stale (while
 * Auth metadata was correct — the same account src/proxy.ts already let
 * through via a more permissive check) got stuck with userRole = null
 * forever.
 *
 * 1.0.7 removes the whole class of bug instead of patching the fallback
 * further: role is now resolved ONCE, server-side, in
 * src/app/admin/layout.tsx via the canonical resolveEffectiveUserRole()
 * (src/lib/access-control.ts — also shared by src/proxy.ts and the login
 * redirect), and passed down as the initialUserRole prop. The client shell
 * initializes its state directly from that prop — the first render (server
 * AND client) already has the right value; no useEffect/fetch is the gate
 * for whether administrative controls exist.
 *
 * No jest/vitest in this project — plain Node script, source-level
 * assertions (fs.readFileSync), same convention as
 * src/lib/workspaces/__tests__/workspace-picker-source.test.ts and
 * src/lib/__tests__/access-control-role.test.ts (which covers the resolver
 * itself in isolation). A live-render test would need a browser + an
 * authenticated session; that's a disclosed limitation, not something this
 * file pretends to cover.
 *
 *   node src/app/admin/__tests__/layout-shell.structural.test.ts
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

const adminDir = join(__dirname, "..");
const layoutSource = readFileSync(join(adminDir, "layout.tsx"), "utf8");
const shellSource = readFileSync(join(adminDir, "_layout-client.tsx"), "utf8");

console.log("[test] /admin/dashboard's actual shell chain");
{
  // No nested layout.tsx overrides the admin one for /admin/dashboard —
  // Next.js App Router would use dashboard/layout.tsx instead of
  // admin/layout.tsx if one existed here.
  let dashboardHasOwnLayout = true;
  try { readFileSync(join(adminDir, "dashboard", "layout.tsx"), "utf8"); }
  catch { dashboardHasOwnLayout = false; }
  assert(!dashboardHasOwnLayout, "src/app/admin/dashboard/ has no layout.tsx of its own — src/app/admin/layout.tsx is the one that wraps it");

  assert(/import\s*\{\s*AdminLayoutShell\s*\}\s*from\s*"\.\/_layout-client"/.test(layoutSource), "src/app/admin/layout.tsx imports AdminLayoutShell from _layout-client.tsx");
  assert(/<AdminLayoutShell\b/.test(layoutSource), "src/app/admin/layout.tsx actually renders <AdminLayoutShell>, not just imports it unused");

  assert(shellSource.includes('import { WorkspaceViewSwitcher } from "@/components/workspaces/workspace-view-switcher"'), "_layout-client.tsx imports the real WorkspaceViewSwitcher");
  assert(shellSource.includes('import { WorkspaceExitButton } from "@/components/workspaces/workspace-exit-button"'), '_layout-client.tsx imports the real WorkspaceExitButton (renders "Painel ADM")');
}

console.log("\n[test] 7/8. server resolves the role and the shell is initialized from it, not from an effect");
{
  // 7. AdminLayout resolves the role server-side (via the canonical
  // resolver) and passes it down as a prop.
  assert(layoutSource.includes('import { resolveEffectiveUserRole } from "@/lib/access-control"'), "7a. layout.tsx imports the canonical resolveEffectiveUserRole");
  assert(/const\s+supabase\s*=\s*await\s+createServerSupabaseClient\(\)/.test(layoutSource), "7b. layout.tsx uses the real server-side Supabase client, not a client-side one");
  assert(/initialUserRole\s*=\s*resolveEffectiveUserRole\(\{/.test(layoutSource), "7c. layout.tsx computes initialUserRole via the canonical resolver");
  assert(/<AdminLayoutShell\s+previewContext=\{previewContext\}\s+initialUserRole=\{initialUserRole\}>/.test(layoutSource), "7d. layout.tsx passes initialUserRole as a prop to AdminLayoutShell");

  // 8. The shell's Props type declares it, and userRole's useState is
  // initialized directly from the prop — not from null + a later effect.
  assert(/initialUserRole:\s*string \| null;/.test(shellSource), "8a. AdminLayoutShell's Props declares initialUserRole: string | null");
  assert(/export function AdminLayoutShell\(\{ children, previewContext, initialUserRole \}: Props\)/.test(shellSource), "8b. the component destructures initialUserRole from props");
  assert(/const userRole = initialUserRole;/.test(shellSource), "8c. userRole is derived directly from the prop (not useState + a later setter) — the FIRST render (server and client) already reflects the resolved role, with no useEffect in between and nothing that could ever reassign it afterward");
  assert(!/setUserRole/.test(shellSource), "8d. no setUserRole exists anywhere in the file — role truly cannot change after the server resolves it for this render");
}

console.log("\n[test] 9/16. the identity effect can no longer touch userRole, and its catch is not silent");
{
  // 9. The only useEffect touching profiles is now scoped to name/initials
  // — it must never call setUserRole at all, so nothing client-side can
  // erase (or invent) a role. Extracted by anchoring on the unique
  // `.select("name")` call rather than the generic `useEffect(() => {` /
  // `if (!isSupabaseConfigured) return;` opener several effects in this
  // file share (a non-greedy regex on that opener alone would match the
  // FIRST such effect, not necessarily this one).
  const nameSelectIdx = shellSource.indexOf('.select("name")');
  assert(nameSelectIdx > -1, "9a. the identity-fetch effect is present (found its unique .select(\"name\") call)");
  const effectStartIdx = shellSource.lastIndexOf("useEffect(", nameSelectIdx);
  const effectEndIdx = shellSource.indexOf("}, []);", nameSelectIdx) + "}, []);".length;
  const identityEffectBody = shellSource.slice(effectStartIdx, effectEndIdx);
  assert(!identityEffectBody.includes("setUserRole"), "9b. the identity-fetch effect never calls setUserRole — a failed or successful fetch can neither erase nor invent a role client-side");
  assert(identityEffectBody.includes(".select(\"name\")"), "9c. the effect only selects name from profiles now — role is not re-fetched client-side at all");

  // 16. No silent `catch {}` remains in that same effect — it must contain
  // an actual (sanitized, non-PII) diagnostic.
  assert(!/catch \{\}/.test(identityEffectBody), "16a. the identity effect's catch block is not empty — a failure is no longer swallowed silently");
  assert(identityEffectBody.includes("console.warn"), "16b. the identity effect logs a diagnostic on failure");
  assert(
    !/console\.warn\([^)]*\b(email|user\.id|token|access_token|cookie)\b/i.test(identityEffectBody),
    "16c. that diagnostic never includes email, user id, token, or cookie values",
  );
}

console.log("\n[test] 17. no token/cookie/secret is ever passed as a prop");
{
  // Check the actual prop list passed to <AdminLayoutShell>, not just
  // whether the words "token"/"cookie" appear anywhere in the file (they
  // legitimately do, in comments explaining what is NOT passed).
  const jsxCallMatch = layoutSource.match(/<AdminLayoutShell\s+([^>]*)>/);
  assert(!!jsxCallMatch, "17a. found the <AdminLayoutShell> JSX call");
  const propsPassed = jsxCallMatch?.[1] ?? "";
  assert(propsPassed === 'previewContext={previewContext} initialUserRole={initialUserRole}', "17b. the ONLY props passed are previewContext and initialUserRole — nothing else, so no token/cookie/user/profile object can leak through");
  assert(!/\buser\}|profile\}|access_token|refresh_token/.test(propsPassed), "17c. no raw user/profile object or token field appears in the props passed");
}

console.log("\n[test] Super Admin gating — desktop, mobile, Status V1, no orphaned duplicate");
{
  const occurrences = [...shellSource.matchAll(/userRole === "super_admin"/g)];
  assert(occurrences.length >= 3, `10/11/12. userRole === "super_admin" gates at least three blocks (found ${occurrences.length}) — desktop controls, the mobile bar, and the Status V1 link`);

  // 10/13. Desktop block: hidden md:flex wrapper containing both components.
  const desktopBlockMatch = shellSource.match(/userRole === "super_admin" && \(\s*<div className="hidden md:flex[^"]*">\s*<WorkspaceExitButton \/>\s*<WorkspaceViewSwitcher \/>/);
  assert(!!desktopBlockMatch, "10/13. desktop renders WorkspaceExitButton + WorkspaceViewSwitcher inside a hidden md:flex block in the header");

  // 14. Mobile block: a SEPARATE md:hidden block, same file, same
  // component — not a different/orphaned component elsewhere in the tree.
  const mobileBlockMatch = shellSource.match(/userRole === "super_admin" && \(\s*\/\/[^\n]*\n(?:\s*\/\/[^\n]*\n)*\s*<div className="md:hidden[^"]*">\s*<WorkspaceExitButton \/>\s*<WorkspaceViewSwitcher \/>/);
  assert(!!mobileBlockMatch, "14. mobile renders the same two components inside a dedicated md:hidden block, separate from the header");
  assert(desktopBlockMatch?.[0] !== mobileBlockMatch?.[0], "the desktop and mobile blocks are genuinely two distinct renders in the same shell file, not one mistaken for the other");

  // 12. Status V1 link is also gated on the exact same condition.
  assert(/userRole === "super_admin" && \(\s*<Link\s*\n\s*href="\/admin\/status"/.test(shellSource), "12. the Status V1 link is gated on userRole === \"super_admin\" too");

  // 11. The condition is a strict equality to the exact role string — not a
  // looser "is authenticated" check that would leak the controls to any
  // logged-in user (a regular user's initialUserRole would never satisfy this).
  assert(!shellSource.includes('userRole !== null &&'), "11. no fallback condition exists that would show these controls to any authenticated (non-super_admin) user");
}

console.log(`\n[test] admin layout shell — ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
})();
