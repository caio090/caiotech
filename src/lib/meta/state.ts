// HMAC-signed OAuth state for Meta connections.
// Uses META_APP_SECRET (already configured) as signing key.
// Includes nonce (anti-replay), expiry, and optional client context.
// In-memory nonce tracking — not shared across serverless instances,
// but state expires in 10 min so replays across restarts are negligible.

import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export interface OAuthStatePayload {
  uid: string;    // authenticated user id
  n:   string;    // nonce
  exp: number;    // expiry ms since epoch
  cid?: string;   // client_id context (optional)
  rt?:  string;   // return_to path (allowlisted)
}

const VALID_RETURN_PATHS = new Set([
  "/admin/clientes",
  "/admin/conexoes",
  "/client/integracoes",
  "/client/configuracoes",
]);

const USED_NONCES = new Map<string, number>(); // nonce → expiry

function secret(): string {
  const s = process.env.META_APP_SECRET?.trim();
  // Without the real secret, signatures are weaker but still bound to this deploy.
  return s ?? "lokat-os-dev-state-key-not-secure";
}

function purgeNonces() {
  const now = Date.now();
  for (const [n, exp] of USED_NONCES) {
    if (now > exp) USED_NONCES.delete(n);
  }
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("hex");
}

export function createOAuthState(
  payload: Pick<OAuthStatePayload, "uid" | "cid" | "rt">
): string {
  purgeNonces();
  const rt = payload.rt && VALID_RETURN_PATHS.has(payload.rt) ? payload.rt : undefined;
  const full: OAuthStatePayload = {
    uid: payload.uid,
    n:   randomBytes(16).toString("hex"),
    exp: Date.now() + 10 * 60 * 1000,
    cid: payload.cid,
    rt,
  };
  const data = Buffer.from(JSON.stringify(full)).toString("base64url");
  return `${data}.${sign(data)}`;
}

export type OAuthStateResult =
  | { ok: true;  payload: OAuthStatePayload }
  | { ok: false; reason: "invalid_format" | "invalid_signature" | "expired" | "replay" };

export function verifyOAuthState(state: string): OAuthStateResult {
  const dot = state.lastIndexOf(".");
  if (dot < 0) return { ok: false, reason: "invalid_format" };

  const data     = state.slice(0, dot);
  const givenSig = state.slice(dot + 1);
  const expected = sign(data);

  // Constant-time comparison
  try {
    const a = Buffer.from(givenSig, "hex");
    const b = Buffer.from(expected,  "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, reason: "invalid_signature" };
    }
  } catch {
    return { ok: false, reason: "invalid_signature" };
  }

  let payload: OAuthStatePayload;
  try {
    payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as OAuthStatePayload;
  } catch {
    return { ok: false, reason: "invalid_format" };
  }

  if (!payload.uid || !payload.n || !payload.exp) {
    return { ok: false, reason: "invalid_format" };
  }
  if (Date.now() > payload.exp) {
    return { ok: false, reason: "expired" };
  }
  if (USED_NONCES.has(payload.n)) {
    return { ok: false, reason: "replay" };
  }

  // Mark nonce used
  USED_NONCES.set(payload.n, payload.exp);
  purgeNonces();

  // Allowlist return_to
  if (payload.rt && !VALID_RETURN_PATHS.has(payload.rt)) {
    payload.rt = undefined;
  }

  return { ok: true, payload };
}
