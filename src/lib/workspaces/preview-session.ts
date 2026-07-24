/**
 * HMAC-signed, stateless preview session token. No new persistence: the
 * payload lives entirely in a signed HttpOnly cookie, and every read
 * re-validates role/workspace/relationship against the database (see
 * resolveWorkspacePreviewContext in context.ts) — the signature only
 * proves the cookie wasn't tampered with client-side, it is never treated
 * as sufficient authorization on its own.
 *
 * Deliberately no `readOnly` field in the payload: an active preview IS
 * read-only, always — there is no toggle to tamper with, because there is
 * nothing to read. assertWorkspaceMutationAllowed() blocks writes purely
 * from "is a preview active", never from a stored boolean.
 *
 * Fase 2 do hotfix 1.0.2 — a chave de assinatura não é mais META_APP_SECRET
 * usado diretamente. Ver getWorkspacePreviewSigningKey() abaixo.
 */
import { createHmac, hkdfSync, randomBytes, timingSafeEqual } from "crypto";
import type { WorkspaceSurface } from "./types";

export interface PreviewSessionPayload {
  uid: string;                    // super_admin user id who started the preview
  surface: WorkspaceSurface;      // "agency" | "agency_client" | "direct_business"
  workspaceId: string;            // real id, or a blueprint-* id
  parentWorkspaceId: string | null;
  isBlueprint: boolean;
  n: string;                      // nonce (uniqueness, not replay-checked — sessions are meant to be reused across requests)
  iat: number;                    // issued-at, ms since epoch
  exp: number;                    // expiry, ms since epoch
  v: 1;                           // schema version
}

const SESSION_DURATION_MS = 2 * 60 * 60 * 1000; // 2h

// Stable, NOT secret — HKDF salt/info are public by design; they only
// domain-separate this derived key from any other key derived from the same
// base secret elsewhere in the app. Never treated as sensitive.
const HKDF_SALT = Buffer.from("lokat-os-workspace-preview-hkdf-salt-v1", "utf8");
const HKDF_INFO = Buffer.from("lokat-workspace-preview-v1", "utf8");
const DEV_FALLBACK_BASE_SECRET = "lokat-os-dev-workspace-preview-key-not-secure";

export class WorkspacePreviewSigningKeyUnavailableError extends Error {
  constructor() {
    super("workspace_preview_signing_key_unavailable");
    this.name = "WorkspacePreviewSigningKeyUnavailableError";
  }
}

function isRealProduction(): boolean {
  // Same signal used elsewhere in the app (src/lib/app-url.ts) — NODE_ENV is
  // "production" for every Vercel build (Preview included), only VERCEL_ENV
  // distinguishes an actual Production deployment.
  return process.env.VERCEL_ENV === "production";
}

// Deliberately not cached: HKDF-SHA256 is microseconds-cheap, and caching a
// key derived from an env var risks serving a stale key if the underlying
// secret ever changes without a process restart (irrelevant for correctness
// today, but caching would defeat the "different secret" test below and
// buys no measurable performance).
function deriveSubkeyFromBaseSecret(baseSecret: string): Buffer {
  const derived = hkdfSync(
    "sha256",
    Buffer.from(baseSecret, "utf8"),
    HKDF_SALT,
    HKDF_INFO,
    32
  );
  return Buffer.from(derived);
}

/**
 * Resolves the HMAC key for preview session tokens. Priority:
 *  1. WORKSPACE_PREVIEW_SECRET (dedicated env var) — used as-is, any env.
 *  2. Outside real Production: an HKDF-SHA256 subkey derived from
 *     META_APP_SECRET (or a hardcoded dev fallback) — NEVER the raw secret
 *     itself, so a leak of this key can't be replayed against whatever else
 *     uses META_APP_SECRET (e.g. Meta OAuth state signing).
 *  3. Real Production without WORKSPACE_PREVIEW_SECRET: fails closed by
 *     throwing WorkspacePreviewSigningKeyUnavailableError — no preview
 *     token can be created or verified until the dedicated secret is
 *     configured. This is intentional: the feature must not silently run
 *     on a derived key in Production.
 */
export function getWorkspacePreviewSigningKey(): Buffer {
  const dedicated = process.env.WORKSPACE_PREVIEW_SECRET?.trim();
  if (dedicated) return Buffer.from(dedicated, "utf8");

  if (isRealProduction()) {
    throw new WorkspacePreviewSigningKeyUnavailableError();
  }

  const baseSecret = process.env.META_APP_SECRET?.trim() || DEV_FALLBACK_BASE_SECRET;
  return deriveSubkeyFromBaseSecret(baseSecret);
}

function sign(data: string): string {
  return createHmac("sha256", getWorkspacePreviewSigningKey()).update(data).digest("hex");
}

export function createPreviewSessionToken(input: {
  uid: string; surface: WorkspaceSurface; workspaceId: string;
  parentWorkspaceId: string | null; isBlueprint: boolean;
}): string {
  const now = Date.now();
  const payload: PreviewSessionPayload = {
    uid: input.uid,
    surface: input.surface,
    workspaceId: input.workspaceId,
    parentWorkspaceId: input.parentWorkspaceId,
    isBlueprint: input.isBlueprint,
    n: randomBytes(12).toString("hex"),
    iat: now,
    exp: now + SESSION_DURATION_MS,
    v: 1,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data)}`;
}

export type PreviewTokenResult =
  | { ok: true; payload: PreviewSessionPayload }
  | { ok: false; reason: "invalid_format" | "invalid_signature" | "key_unavailable" }
  // Signature already verified valid when reason is "expired" — payload is
  // safe to read for audit-logging purposes, but callers must still treat
  // the session as inactive (ok: false) and never use it for authorization.
  | { ok: false; reason: "expired"; payload: PreviewSessionPayload };

export function verifyPreviewSessionToken(token: string | undefined | null): PreviewTokenResult {
  if (!token) return { ok: false, reason: "invalid_format" };
  const dot = token.lastIndexOf(".");
  if (dot < 0) return { ok: false, reason: "invalid_format" };

  const data = token.slice(0, dot);
  const givenSig = token.slice(dot + 1);

  let expected: string;
  try {
    expected = sign(data);
  } catch (e) {
    if (e instanceof WorkspacePreviewSigningKeyUnavailableError) {
      // Fail closed without crashing the request — this can only happen in
      // real Production without WORKSPACE_PREVIEW_SECRET configured, and
      // getWorkspacePreviewContext() is called on every request, so this
      // must never throw uncaught.
      return { ok: false, reason: "key_unavailable" };
    }
    throw e;
  }

  try {
    const a = Buffer.from(givenSig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, reason: "invalid_signature" };
    }
  } catch {
    return { ok: false, reason: "invalid_signature" };
  }

  let payload: PreviewSessionPayload;
  try {
    payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as PreviewSessionPayload;
  } catch {
    return { ok: false, reason: "invalid_format" };
  }

  if (!payload.uid || !payload.surface || !payload.workspaceId || !payload.exp || payload.v !== 1) {
    return { ok: false, reason: "invalid_format" };
  }
  if (Date.now() > payload.exp) {
    return { ok: false, reason: "expired", payload };
  }

  return { ok: true, payload };
}

export const WORKSPACE_PREVIEW_COOKIE = "lokat_workspace_preview";
export const WORKSPACE_PREVIEW_COOKIE_MAX_AGE_SECONDS = Math.floor(SESSION_DURATION_MS / 1000);
