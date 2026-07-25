/**
 * Structural regression test for Sprint Workspaces 1.0.6.
 *
 * The bug: a genuine Super Admin reached /admin/dashboard (sidebar, CRM
 * topbar, everything else worked) but "Painel ADM" / "Visualizar como"
 * never appeared. The root cause was NOT a wrong shell or an orphaned
 * component — WorkspaceViewSwitcher was always correctly imported and
 * wired into the one real admin layout. The bug was that
 * src/app/admin/_layout-client.tsx resolved the user's role by querying
 * profiles.role alone, with no fallback, while src/proxy.ts (the route
 * gate that actually let this same user reach /admin/dashboard) and the
 * login redirect both already fall back to user_metadata/app_metadata —
 * specifically because a real account's profiles.role row can be null or
 * stale. So the same user could pass the server's permissive check and
 * still have this ONE client component's local `userRole` state stuck at
 * null forever, hiding every super_admin-gated control.
 *
 * No jest/vitest in this project — plain Node script, source-level
 * assertions (fs.readFileSync), same convention as
 * src/lib/workspaces/__tests__/workspace-picker-source.test.ts and
 * src/app/api/meta/publish/__tests__/guard.structural.test.ts (Meta
 * branch). A live-render test would need a browser + an authenticated
 * session; this is the same disclosed limitation those files already
 * document.
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
  // 1. No nested layout.tsx overrides the admin one for /admin/dashboard —
  // Next.js App Router would use dashboard/layout.tsx instead of
  // admin/layout.tsx if one existed here.
  let dashboardHasOwnLayout = true;
  try { readFileSync(join(adminDir, "dashboard", "layout.tsx"), "utf8"); }
  catch { dashboardHasOwnLayout = false; }
  assert(!dashboardHasOwnLayout, "1. src/app/admin/dashboard/ has no layout.tsx of its own — src/app/admin/layout.tsx is the one that wraps it");

  // The single admin layout renders AdminLayoutShell from _layout-client.tsx.
  assert(/import\s*\{\s*AdminLayoutShell\s*\}\s*from\s*"\.\/_layout-client"/.test(layoutSource), "src/app/admin/layout.tsx imports AdminLayoutShell from _layout-client.tsx");
  assert(/<AdminLayoutShell\b/.test(layoutSource), "src/app/admin/layout.tsx actually renders <AdminLayoutShell>, not just imports it unused");

  // 2. The shell real importa WorkspaceViewSwitcher (and its sibling exit button).
  assert(shellSource.includes('import { WorkspaceViewSwitcher } from "@/components/workspaces/workspace-view-switcher"'), "2. _layout-client.tsx imports the real WorkspaceViewSwitcher");
  assert(shellSource.includes('import { WorkspaceExitButton } from "@/components/workspaces/workspace-exit-button"'), "_layout-client.tsx imports the real WorkspaceExitButton (renders \"Painel ADM\")");
}

console.log("\n[test] Super Admin gating — desktop and mobile, no orphaned duplicate");
{
  const occurrences = [...shellSource.matchAll(/userRole === "super_admin"/g)];
  assert(occurrences.length >= 2, `3/4. userRole === "super_admin" gates at least two blocks (found ${occurrences.length}) — one for desktop, one for the mobile bar`);

  // 6. Desktop block: hidden md:flex wrapper containing both components.
  const desktopBlockMatch = shellSource.match(/userRole === "super_admin" && \(\s*<div className="hidden md:flex[^"]*">\s*<WorkspaceExitButton \/>\s*<WorkspaceViewSwitcher \/>/);
  assert(!!desktopBlockMatch, "6. desktop renders WorkspaceExitButton + WorkspaceViewSwitcher inside a hidden md:flex block in the header");

  // 7 & 8. Mobile block: a SEPARATE md:hidden block, same file, same
  // component — not a different/orphaned component elsewhere in the tree.
  const mobileBlockMatch = shellSource.match(/userRole === "super_admin" && \(\s*\/\/[^\n]*\n(?:\s*\/\/[^\n]*\n)*\s*<div className="md:hidden[^"]*">\s*<WorkspaceExitButton \/>\s*<WorkspaceViewSwitcher \/>/);
  assert(!!mobileBlockMatch, "7. mobile renders the same two components inside a dedicated md:hidden block, separate from the header");
  assert(desktopBlockMatch?.[0] !== mobileBlockMatch?.[0], "8. the desktop and mobile blocks are genuinely two distinct renders in the same shell file, not one block mistaken for the other");

  // 5. The condition is a strict equality to the exact role string — not a
  // looser "is authenticated" check that would leak the controls to any
  // logged-in user.
  assert(!shellSource.includes('userRole !== null &&'), "5. no fallback condition exists that would show these controls to any authenticated (non-super_admin) user");
}

console.log("\n[test] role resolution has the fallback that fixes the actual bug (regression guard)");
{
  // The exact bug: this used to be `if (!profile || cancelled) return;`
  // (bailing out entirely, never setting userRole) and
  // `setUserRole(profile.role ?? null)` with no metadata fallback.
  assert(!/if \(!profile \|\| cancelled\) return;/.test(shellSource), "the old early-return-on-null-profile bug is gone — a missing profiles row no longer permanently blanks userRole");
  assert(/profile\?\.role\s*\n?\s*\?\?\s*\(user\.user_metadata\?\.role as string \| undefined\)\s*\n?\s*\?\?\s*\(user\.app_metadata\?\.role as string \| undefined\)\s*\n?\s*\?\?\s*null/.test(shellSource), "role resolution falls back profile.role -> user_metadata.role -> app_metadata.role -> null, matching src/proxy.ts's own fallback chain");
}

console.log(`\n[test] admin layout shell — ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
})();
