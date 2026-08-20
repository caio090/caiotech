/**
 * TELEGRAM IDENTITY LINK V1 FOUNDATION — orquestração: token verificado
 * (identity-link-token.ts) + estado do vínculo (identity-link-store.ts) +
 * construção do registro final (completeIdentityLink, session.ts — reusado,
 * nunca duplicado). Esta é a única função que a camada de canal (Telegram
 * hoje, WhatsApp amanhã) deve chamar para completar um vínculo -- nenhuma
 * lógica de negócio de autorização mora aqui, e ela nunca resolve Company
 * Context (isso é um passo SEPARADO e posterior, via
 * resolveConversationCompanyContext() em context.ts).
 */
import type { ConversationChannel } from "./channels";
import { completeIdentityLink, createIdentityLinkRequest } from "./session";
import { verifyIdentityLinkToken } from "./identity-link-token";
import type { IdentityLinkStore } from "./identity-link-store";
import type { IdentityLinkRecord } from "./types";

export type CompleteIdentityLinkResult =
  | { kind: "linked"; record: IdentityLinkRecord }
  | { kind: "invalid_token"; reason: "invalid_format" | "invalid_signature" | "key_unavailable" | "wrong_channel" }
  | { kind: "expired_token" }
  | { kind: "token_already_used" }
  | { kind: "already_linked"; existing: IdentityLinkRecord };

/**
 * Processa um `/start <token>` (ou equivalente de outro canal). Pura o
 * bastante para testar sem rede -- `store` é injetado pelo chamador
 * (nunca instanciado aqui), então um teste pode passar um
 * InMemoryIdentityLinkStore novo por caso, e a rota real do webhook pode
 * passar uma instância compartilhada.
 */
export function completeIdentityLinkFromToken(params: {
  store: IdentityLinkStore;
  token: string;
  channel: ConversationChannel;
  externalUserId: string;
  now?: Date;
}): CompleteIdentityLinkResult {
  const now = params.now ?? new Date();

  const verification = verifyIdentityLinkToken(params.token, params.channel, now);
  if (!verification.ok) {
    if (verification.reason === "expired") return { kind: "expired_token" };
    return { kind: "invalid_token", reason: verification.reason };
  }

  if (params.store.isTokenConsumed(verification.payload.n)) {
    return { kind: "token_already_used" };
  }

  const existing = params.store.getLinkByExternalUser(params.channel, params.externalUserId);
  if (existing && existing.status === "verified") {
    return { kind: "already_linked", existing };
  }

  const request = createIdentityLinkRequest({
    channel: params.channel,
    lokatUserId: verification.payload.uid,
    temporaryToken: params.token,
    now: new Date(verification.payload.iat),
    ttlMs: verification.payload.exp - verification.payload.iat,
  });

  const record = completeIdentityLink(request, params.externalUserId, now);
  // Defensivo: verifyIdentityLinkToken() já rejeitou tokens expirados acima,
  // então completeIdentityLink() nunca deveria retornar null aqui -- mas
  // nunca assumir isso sem checar (nunca lançar exceção não tratada na rota).
  if (!record) return { kind: "expired_token" };

  params.store.saveLink(record);
  params.store.markTokenConsumed(verification.payload.n);
  return { kind: "linked", record };
}
