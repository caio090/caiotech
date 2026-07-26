/**
 * Hotfix 1.0.11 — pure, framework-free decision logic for src/proxy.ts's
 * defense-in-depth mutation guard. Extracted out of proxy.ts so it can be
 * executed directly by a real test (Node's native TS runner can't load
 * proxy.ts itself — it imports from "next/server", whose ESM subpath
 * resolution only works inside the Next.js build, the same wall
 * atomic-exit.ts hit in the 1.0.10 sprint). proxy.ts imports and calls
 * these same functions — this file IS the guard's real logic, not a
 * parallel copy that could drift from it.
 *
 * Root cause of the 1.0.11 P1: hotfix 1.0.10 added a brand new mutating
 * route (POST /api/admin/workspaces/preview/exit) under the
 * "/api/admin/" namespace this guard already treats as mutable, but never
 * added it to the runtime exemption list below — only to the OFFLINE
 * mutation-inventory script's allowlist (scripts/check-workspace-mutation
 * -coverage.ts), which has zero effect at request time. The proxy
 * intercepted the exit endpoint's own POST and returned 403
 * WORKSPACE_PREVIEW_READ_ONLY before the request ever reached the route
 * handler — the one mutation a preview must always be allowed to make is
 * ending itself.
 */
export const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const MUTABLE_API_NAMESPACES = [
  "/api/admin/", "/api/client/", "/api/team/", "/api/payments/",
  "/api/olaclick/", "/api/meta/", "/api/billing/", "/api/ai/",
];

// Blanket exemptions: every mutating method on these exact paths is
// legitimate preview control, not a business mutation.
//  - /api/admin/workspaces/preview: the original entry/exit point — POST
//    starts a preview, DELETE performs a best-effort cookie cleanup (see
//    clear-invalid-preview-cookie.tsx) — both must always be reachable.
//  - /api/billing/coupons/validate: read-only, never a real mutation.
export const MUTATION_GUARD_EXEMPT_PATHS = new Set([
  "/api/admin/workspaces/preview",
  "/api/billing/coupons/validate",
]);

// Hotfix 1.0.10's dedicated atomic exit endpoint. Deliberately NOT added
// to the blanket Set above: unlike the original preview route, this one
// only ever implements POST (no GET/PUT/PATCH/DELETE handler exists at
// all) — a method-bound exception is strictly narrower and keeps any
// other verb on this exact path blocked, matching least privilege.
export const WORKSPACE_PREVIEW_EXIT_MUTATION_PATH = "/api/admin/workspaces/preview/exit";

export function isMutableNamespace(pathname: string): boolean {
  return MUTABLE_API_NAMESPACES.some((ns) => pathname.startsWith(ns));
}

/**
 * True only for an exact, unadorned POST to the exit endpoint — no
 * trailing slash, no extra path segment, no near-miss pathname, no
 * method other than POST. Deliberately strict: this function's only job
 * is to let the one legitimate self-ending mutation through, nothing
 * that merely resembles it.
 */
export function isWorkspacePreviewControlMutation(input: { method: string; pathname: string }): boolean {
  if (input.method !== "POST") return false;
  return input.pathname === WORKSPACE_PREVIEW_EXIT_MUTATION_PATH;
}

/**
 * The exact decision src/proxy.ts makes for every request: should this
 * mutating request be rejected with 403 WORKSPACE_PREVIEW_READ_ONLY
 * because a preview is active? False means "let it continue" — either
 * because it isn't a mutation this guard cares about, it's an explicitly
 * exempt preview-control path, or no preview is active at all.
 */
export function shouldBlockMutationInPreview(input: {
  method: string;
  pathname: string;
  hasValidPreviewToken: boolean;
}): boolean {
  if (!input.hasValidPreviewToken) return false;
  if (!MUTATING_METHODS.has(input.method)) return false;
  if (!isMutableNamespace(input.pathname)) return false;
  if (MUTATION_GUARD_EXEMPT_PATHS.has(input.pathname)) return false;
  if (isWorkspacePreviewControlMutation(input)) return false;
  return true;
}
