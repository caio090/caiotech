/**
 * TELEGRAM IDENTITY LINK V1 FOUNDATION — token de vínculo temporário,
 * HMAC-assinado e stateless (mesmo padrão já estabelecido em
 * src/lib/workspaces/preview-session.ts, nunca uma segunda invenção de
 * esquema de token). Isto é o que falta em createIdentityLinkRequest()
 * (src/lib/conversation/session.ts) -- aquela função já aceitava um
 * `temporaryToken` pronto, mas nada no repositório o gerava/verificava
 * ainda; este arquivo fecha essa lacuna.
 *
 * Canal-agnóstico de propósito (`CONVERSATION_IDENTITY_LINK_SECRET`, não
 * `TELEGRAM_...`): "Identity Core" deve servir Telegram e o futuro
 * WhatsApp com o MESMO mecanismo de token, nunca uma solução exclusiva de
 * canal (regra explícita da missão).
 *
 * O token NUNCA contém nome/e-mail/telefone/username do canal -- só o
 * `profile_id` do usuário LOKAT que iniciou o vínculo (`uid` abaixo), um
 * nonce aleatório e a validade. Não é previsível (assinado com HMAC-SHA256,
 * comparado em tempo constante) e nunca é o próprio ID do usuário exposto
 * cru -- a assinatura é obrigatória para qualquer verificação passar.
 */
import { createHmac, hkdfSync, randomBytes, timingSafeEqual } from "crypto";
import type { ConversationChannel } from "./channels";

export interface IdentityLinkTokenPayload {
  uid: string;              // profile_id do usuário LOKAT que solicitou o vínculo
  ch: ConversationChannel;  // canal para o qual este token é válido
  n: string;                // nonce (unicidade -- não é um contador de uso)
  iat: number;              // issued-at, ms desde epoch
  exp: number;              // expiry, ms desde epoch
  v: 1;                     // versão do schema do payload
}

const TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutos -- curto prazo, por design da missão

// Salt/info do HKDF são públicos por design (só separam este subkey de
// qualquer outro derivado da mesma base secret em outro lugar do app) --
// nunca tratados como sensíveis.
const HKDF_SALT = Buffer.from("lokat-os-conversation-identity-link-hkdf-salt-v1", "utf8");
const HKDF_INFO = Buffer.from("lokat-conversation-identity-link-v1", "utf8");
const DEV_FALLBACK_BASE_SECRET = "lokat-os-dev-identity-link-key-not-secure";

export class IdentityLinkSigningKeyUnavailableError extends Error {
  constructor() {
    super("identity_link_signing_key_unavailable");
    this.name = "IdentityLinkSigningKeyUnavailableError";
  }
}

// Checagem estrita (só VERCEL_ENV), igual preview-session.ts -- nunca a
// isProductionEnv() mais ampla de src/lib/app-url.ts, para não fail-closed
// durante `npm run build && npm start` local (só Production real da Vercel).
function isRealProduction(): boolean {
  return process.env.VERCEL_ENV === "production";
}

function deriveSubkeyFromBaseSecret(baseSecret: string): Buffer {
  const derived = hkdfSync("sha256", Buffer.from(baseSecret, "utf8"), HKDF_SALT, HKDF_INFO, 32);
  return Buffer.from(derived);
}

/**
 * Prioridade (mesmo modelo de preview-session.ts):
 *  1. CONVERSATION_IDENTITY_LINK_SECRET (env dedicada) -- usada como está.
 *  2. Fora de Production real: subkey HKDF-SHA256 derivado de
 *     META_APP_SECRET (ou fallback de dev) -- nunca o secret cru.
 *  3. Production real sem a env dedicada: fail closed (lança
 *     IdentityLinkSigningKeyUnavailableError) -- nunca roda em Production
 *     com uma chave derivada por acidente.
 */
export function getIdentityLinkSigningKey(): Buffer {
  const dedicated = process.env.CONVERSATION_IDENTITY_LINK_SECRET?.trim();
  if (dedicated) return Buffer.from(dedicated, "utf8");

  if (isRealProduction()) {
    throw new IdentityLinkSigningKeyUnavailableError();
  }

  const baseSecret = process.env.META_APP_SECRET?.trim() || DEV_FALLBACK_BASE_SECRET;
  return deriveSubkeyFromBaseSecret(baseSecret);
}

function sign(data: string): string {
  return createHmac("sha256", getIdentityLinkSigningKey()).update(data).digest("hex");
}

export function generateIdentityLinkToken(input: {
  lokatUserId: string;
  channel: ConversationChannel;
  now?: Date;
  ttlMs?: number;
}): { token: string; expiresAt: string } {
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  const payload: IdentityLinkTokenPayload = {
    uid: input.lokatUserId,
    ch: input.channel,
    n: randomBytes(12).toString("hex"),
    iat: nowMs,
    exp: nowMs + (input.ttlMs ?? TOKEN_TTL_MS),
    v: 1,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return { token: `${data}.${sign(data)}`, expiresAt: new Date(payload.exp).toISOString() };
}

export type IdentityLinkTokenResult =
  | { ok: true; payload: IdentityLinkTokenPayload }
  | { ok: false; reason: "invalid_format" | "invalid_signature" | "key_unavailable" | "wrong_channel" }
  // Assinatura já verificada válida quando reason é "expired" -- o payload
  // é seguro para log/auditoria, mas o chamador nunca deve tratá-lo como
  // vínculo válido.
  | { ok: false; reason: "expired"; payload: IdentityLinkTokenPayload };

export function verifyIdentityLinkToken(
  token: string | undefined | null,
  expectedChannel: ConversationChannel,
  now: Date = new Date(),
): IdentityLinkTokenResult {
  if (!token) return { ok: false, reason: "invalid_format" };
  const dot = token.lastIndexOf(".");
  if (dot < 0) return { ok: false, reason: "invalid_format" };

  const data = token.slice(0, dot);
  const givenSig = token.slice(dot + 1);

  let expected: string;
  try {
    expected = sign(data);
  } catch (e) {
    if (e instanceof IdentityLinkSigningKeyUnavailableError) return { ok: false, reason: "key_unavailable" };
    throw e;
  }

  try {
    const a = Buffer.from(givenSig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: "invalid_signature" };
  } catch {
    return { ok: false, reason: "invalid_signature" };
  }

  let payload: IdentityLinkTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as IdentityLinkTokenPayload;
  } catch {
    return { ok: false, reason: "invalid_format" };
  }

  if (!payload.uid || !payload.ch || !payload.exp || payload.v !== 1) {
    return { ok: false, reason: "invalid_format" };
  }
  if (payload.ch !== expectedChannel) return { ok: false, reason: "wrong_channel" };
  if (now.getTime() > payload.exp) return { ok: false, reason: "expired", payload };

  return { ok: true, payload };
}
