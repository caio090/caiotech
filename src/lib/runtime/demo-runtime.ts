/**
 * Sprint EditorOS 1.0.1/1.0.2 — decides whether a route that normally
 * requires Supabase can fall back to a safe, isolated demo mode instead of
 * crashing.
 *
 * This is intentionally the ONE place that combines "is this Production" +
 * "is Supabase configured" + "did the caller explicitly ask for demo" into a
 * runtime decision — no other component should re-derive this logic.
 *
 * Fase 1.0.2 bug: this module used to call isProductionEnv() from
 * src/lib/app-url.ts to decide Production. That helper's job is resolving a
 * *displayable URL*, not authorizing a security-sensitive fallback — its
 * fallback branch is `NODE_ENV === "production" && non-localhost APP_URL`,
 * and on Vercel, NODE_ENV is "production" for EVERY deployment (Preview
 * included — `next build` always sets it), so a Preview deployment with a
 * shared, non-localhost NEXT_PUBLIC_APP_URL was silently classified as
 * Production. That is exactly what a Preview QA run hit. isProductionEnv()
 * itself is left untouched (other callers may depend on its existing
 * semantics for display purposes) — this module now resolves the
 * environment itself, with VERCEL_ENV as the sole authority whenever it is
 * present, and never falls back to it for this decision.
 *
 * Fail-closed by design:
 * - Supabase configured                    -> "authenticated" (normal flow), in every environment.
 * - Not configured + production-like       -> "misconfigured", never demo, no exceptions.
 * - Not configured + non-prod + no ?demo=1 -> "blocked" (safe, informative page).
 * - Not configured + non-prod + ?demo=1    -> "demo" (isolated, no Supabase, no real data).
 */

import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * On Vercel, VERCEL_ENV is always set and is authoritative — NODE_ENV is
 * "production" for every Vercel deployment (Production AND Preview alike),
 * so it must never be consulted to distinguish them. Only when VERCEL_ENV
 * is entirely absent (i.e. not running on Vercel at all) does NODE_ENV
 * decide.
 */
export type RuntimeEnvironment =
  | "vercel_production"
  | "vercel_preview"
  | "vercel_development"
  | "local_production"
  | "local_development";

export type DemoRuntimeMode = "authenticated" | "demo" | "blocked" | "misconfigured";

export interface RuntimeConfiguration {
  supabaseConfigured: boolean;
  environment: RuntimeEnvironment;
}

export interface DemoRuntimeDecision {
  mode: DemoRuntimeMode;
  configuration: RuntimeConfiguration;
}

/** Never logs or exposes the underlying URL/key — only whether both are present. */
export function hasSupabasePublicConfiguration(): boolean {
  return isSupabaseConfigured;
}

/**
 * VERCEL_ENV, when present, is the ONLY source consulted — never NODE_ENV,
 * never a domain/APP_URL fallback, never VERCEL_URL. An unrecognized value
 * (e.g. a hypothetical "staging") fails closed to "vercel_production" so it
 * can never accidentally unlock demo mode.
 */
export function resolveRuntimeEnvironment(): RuntimeEnvironment {
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv !== undefined) {
    if (vercelEnv === "production") return "vercel_production";
    if (vercelEnv === "preview") return "vercel_preview";
    if (vercelEnv === "development") return "vercel_development";
    return "vercel_production"; // fail closed on an unexpected value
  }
  // Not running on Vercel — only here does NODE_ENV get a say.
  return process.env.NODE_ENV === "production" ? "local_production" : "local_development";
}

export function isProductionRuntime(): boolean {
  const env = resolveRuntimeEnvironment();
  return env === "vercel_production" || env === "local_production";
}

export function isPreviewRuntime(): boolean {
  return resolveRuntimeEnvironment() === "vercel_preview";
}

export function isDevelopmentRuntime(): boolean {
  const env = resolveRuntimeEnvironment();
  return env === "vercel_development" || env === "local_development";
}

/**
 * `demoRequested` must come from an explicit `?demo=1` on the request — never
 * inferred, never defaulted to true, never derived from cookies/session.
 */
export function canUseEditorDemoMode(demoRequested: boolean): boolean {
  return !isProductionRuntime() && !hasSupabasePublicConfiguration() && demoRequested;
}

export function resolveEditorRuntimeMode(demoRequested: boolean): DemoRuntimeDecision {
  const supabaseConfigured = hasSupabasePublicConfiguration();
  const environment = resolveRuntimeEnvironment();

  const configuration: RuntimeConfiguration = { supabaseConfigured, environment };

  if (supabaseConfigured) {
    return { mode: "authenticated", configuration };
  }
  // Supabase is NOT configured from this point on.
  if (isProductionRuntime()) {
    return { mode: "misconfigured", configuration };
  }
  if (demoRequested) {
    return { mode: "demo", configuration };
  }
  return { mode: "blocked", configuration };
}
