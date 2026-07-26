/**
 * Hotfix 1.0.10 — the real bug QA found in 1.0.9 wasn't Router Cache: it was
 * that ending a preview was two separate network round-trips (DELETE, then
 * a client-side navigation) with no ordering guarantee between "the browser
 * has actually applied the Set-Cookie from the DELETE response" and "the
 * browser has already sent the follow-up request for /admin/dashboard".
 * fetch() resolves once headers are readable, but nothing about that
 * contract promises the cookie jar write has committed before the next
 * request this same tick can fire — so the very first /admin/dashboard
 * document could still be built server-side with the OLD preview cookie
 * still attached, rendering the banner one more time.
 *
 * The fix is architectural: the cookie deletion and the redirect must be
 * the SAME HTTP response. A real <form method="post"> submission is a
 * single request/response pair — the browser cannot dispatch the request
 * this response's Location targets before it has finished processing that
 * same response's Set-Cookie header, because it's literally the same
 * navigation.
 *
 * Deliberately zero imports (not even the cookie name — callers pass it
 * in): every other module in this feature that touches cookies(),
 * getCurrentUser(), or a relative cross-file import needs a running Next.js
 * server to test at all, because Node's native TypeScript runner cannot
 * resolve extension-less relative specifiers (tsc forbids the explicit
 * `.ts` extension that would fix that, and "next/server" has no ESM
 * subpath resolution outside the Next.js build). Keeping this module
 * import-free means it can be exercised directly, with a real Response
 * object, in a real (not string-match) automated test.
 */
export const WORKSPACE_PREVIEW_EXIT_DESTINATION = "/admin/dashboard";
export const WORKSPACE_PREVIEW_EXIT_LOGIN_DESTINATION = "/login";

/**
 * Same identity (name/path) the cookie was created with in
 * src/app/api/admin/workspaces/preview/route.ts, so this Set-Cookie
 * unambiguously targets the same cookie for the browser to expire —
 * cookie identity for overwrite/removal purposes is (name, domain, path),
 * never httpOnly/secure/sameSite. Those attributes are still matched here
 * anyway, exactly as created, so there is no discrepancy to reason about.
 */
export function serializePreviewExitCookie(cookieName: string): string {
  const parts = [`${cookieName}=`, "Path=/", "Max-Age=0", "HttpOnly", "SameSite=Lax"];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

/**
 * Failure / not-authorized path: a real redirect (the browser still gets a
 * normal navigation to follow), but NEVER touches the preview cookie. If
 * validation failed, whatever cookie exists — valid, stale, or absent — is
 * left exactly as it was; only a confirmed, authorized exit may clear it.
 */
export function buildSafeRedirect(requestUrl: string, destination: string): Response {
  const location = new URL(destination, requestUrl).toString();
  return new Response(null, {
    status: 303,
    headers: { Location: location, "Cache-Control": "no-store" },
  });
}

/**
 * Success path: cookie deletion and the 303 redirect are set on the exact
 * same Response instance, so they are serialized into the exact same HTTP
 * response — there is no second request, no second response, nothing for a
 * race to happen between.
 */
export function buildAtomicExitRedirect(requestUrl: string, cookieName: string): Response {
  const location = new URL(WORKSPACE_PREVIEW_EXIT_DESTINATION, requestUrl).toString();
  return new Response(null, {
    status: 303,
    headers: {
      Location: location,
      "Cache-Control": "no-store",
      Pragma: "no-cache",
      "Set-Cookie": serializePreviewExitCookie(cookieName),
    },
  });
}
