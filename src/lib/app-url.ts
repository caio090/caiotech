/**
 * Resolves the canonical public URL of this app.
 * Priority:
 *   1. NEXT_PUBLIC_APP_URL (non-localhost)
 *   2. NEXTAUTH_URL (non-localhost)
 *   3. VERCEL_PROJECT_PRODUCTION_URL → https://…
 *   4. VERCEL_URL → https://…
 *   5. Any of the above even if localhost (dev fallback)
 *   6. http://localhost:3000
 *
 * SERVER-SIDE ONLY — uses process.env directly.
 */
export function getAppUrl(): string {
  const explicit = [
    process.env.NEXT_PUBLIC_APP_URL?.trim(),
    process.env.NEXTAUTH_URL?.trim(),
  ];

  for (const c of explicit) {
    if (c && !c.includes("localhost")) return c;
  }

  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProd) return `https://${vercelProd}`;

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl}`;

  for (const c of explicit) {
    if (c) return c;
  }

  return "http://localhost:3000";
}

/** True when running in a Vercel production deployment, or NODE_ENV=production with a non-localhost APP_URL. */
export function isProductionEnv(): boolean {
  if (process.env.VERCEL_ENV === "production") return true;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return process.env.NODE_ENV === "production" && !!appUrl && !appUrl.includes("localhost");
}

/** True when META_REDIRECT_URI is absent or points to localhost (misconfigured for production). */
export function hasLocalhostMetaRedirect(): boolean {
  const uri = process.env.META_REDIRECT_URI?.trim();
  return !uri || uri.includes("localhost");
}
