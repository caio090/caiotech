/**
 * HMAC-signed, stateless preview session token — same pattern already
 * established in src/lib/meta/state.ts (OAuth state signing), reusing
 * META_APP_SECRET rather than requiring a new env var. No new persistence:
 * the payload lives entirely in a signed HttpOnly cookie, and every read
 * re-validates role/workspace/relationship against the database (see
 * resolveWorkspacePreviewContext in context.ts) — the signature only
 * proves the cookie wasn't tampered with client-side, it is never treated
 * as sufficient authorization on its own.
 *
 * Deliberately no `readOnly` field in the payload: an active preview IS
 * read-only, always — there is no toggle to tamper with, because there is
 * nothing to read. assertWorkspaceMutationAllowed() blocks writes purely
 * from "is a preview active", never from a stored boolean.
 */
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
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

function secret(): string {
  const s = process.env.META_APP_SECRET?.trim();
  return s ?? "lokat-os-dev-workspace-preview-key-not-secure";
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("hex");
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
  | { ok: false; reason: "invalid_format" | "invalid_signature" }
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
  const expected = sign(data);

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

  if (!payload.uid || !payload.surface || !payload.workspaceId || !payload.exp) {
    return { ok: false, reason: "invalid_format" };
  }
  if (Date.now() > payload.exp) {
    return { ok: false, reason: "expired", payload };
  }

  return { ok: true, payload };
}

export const WORKSPACE_PREVIEW_COOKIE = "lokat_workspace_preview";
export const WORKSPACE_PREVIEW_COOKIE_MAX_AGE_SECONDS = Math.floor(SESSION_DURATION_MS / 1000);
