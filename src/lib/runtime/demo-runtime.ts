/**
 * Sprint EditorOS 1.0.1 — decides whether a route that normally requires
 * Supabase can fall back to a safe, isolated demo mode instead of crashing.
 *
 * This is intentionally the ONE place that combines "is this Production" +
 * "is Supabase configured" + "did the caller explicitly ask for demo" into a
 * runtime decision — no other component should re-derive this logic.
 *
 * Fail-closed by design:
 * - Supabase configured           -> "authenticated" (normal flow), in every environment.
 * - Not configured + Production   -> "misconfigured", never demo, no exceptions.
 * - Not configured + non-Prod + no ?demo=1 -> "blocked" (safe, informative page).
 * - Not configured + non-Prod + ?demo=1    -> "demo" (isolated, no Supabase, no real data).
 */

import { isProductionEnv } from "@/lib/app-url";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type RuntimeEnvironment = "production" | "preview" | "development";

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

export function isProductionRuntime(): boolean {
  return isProductionEnv();
}

export function isPreviewRuntime(): boolean {
  return !isProductionRuntime() && process.env.VERCEL_ENV === "preview";
}

export function resolveRuntimeEnvironment(): RuntimeEnvironment {
  if (isProductionRuntime()) return "production";
  if (isPreviewRuntime()) return "preview";
  return "development";
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
  if (environment === "production") {
    return { mode: "misconfigured", configuration };
  }
  if (demoRequested) {
    return { mode: "demo", configuration };
  }
  return { mode: "blocked", configuration };
}
