/**
 * LOKAT OS — Conversation Core Foundation V1. Ciclo de vida da sessão de
 * conversa e o contrato de Identity Link -- funções puras + um contrato de
 * armazenamento (`ConversationSessionStore`). `InMemoryConversationSessionStore`
 * é só uma referência para testes/desenvolvimento local, no mesmo espírito
 * do padrão já usado em src/lib/providers/customer-inbox (interface +
 * implementação "disabled"/de referência) -- NUNCA uma tabela real, NUNCA
 * conectada a nenhum canal nesta missão.
 */
import type { ConversationChannel } from "./channels";
import type {
  ConversationSession,
  IdentityLinkRequest,
  IdentityLinkRecord,
} from "./types";
import type { ConversationIntentId } from "./intents";

const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 30; // 30 minutos de inatividade
const DEFAULT_IDENTITY_LINK_TTL_MS = 1000 * 60 * 10; // 10 minutos para completar /start <token>

export function createConversationSession(input: {
  id: string;
  channel: ConversationChannel;
  externalUserId: string;
  now?: Date;
}): ConversationSession {
  const now = (input.now ?? new Date()).toISOString();
  return {
    id: input.id,
    channel: input.channel,
    externalUserId: input.externalUserId,
    lokatUserId: null,
    companyId: null,
    status: "awaiting_company",
    currentIntentId: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function withIdentityLink(session: ConversationSession, lokatUserId: string, now: Date = new Date()): ConversationSession {
  return { ...session, lokatUserId, updatedAt: now.toISOString() };
}

export function withCompanyContext(session: ConversationSession, companyId: string, now: Date = new Date()): ConversationSession {
  return { ...session, companyId, status: "active", updatedAt: now.toISOString() };
}

export function withIntent(session: ConversationSession, intentId: ConversationIntentId | null, now: Date = new Date()): ConversationSession {
  return { ...session, currentIntentId: intentId, updatedAt: now.toISOString() };
}

export function isSessionExpired(session: ConversationSession, now: Date = new Date(), ttlMs = DEFAULT_SESSION_TTL_MS): boolean {
  return now.getTime() - new Date(session.updatedAt).getTime() > ttlMs;
}

// ── Identity Link Foundation ────────────────────────────────────────────
// Fluxo do card: usuário Web autenticado gera um token temporário, abre o
// canal e envia "/start <token>" (ou equivalente); o LOKAT OS valida e
// grava o vínculo externalUserId <-> lokatUserId. Nunca usar username do
// canal como identidade principal (por isso IdentityLinkRecord exige
// externalUserId, o id numérico/estável da plataforma, não um handle).

export function createIdentityLinkRequest(input: {
  channel: ConversationChannel;
  lokatUserId: string;
  temporaryToken: string;
  now?: Date;
  ttlMs?: number;
}): IdentityLinkRequest {
  const now = input.now ?? new Date();
  const ttlMs = input.ttlMs ?? DEFAULT_IDENTITY_LINK_TTL_MS;
  return {
    channel: input.channel,
    lokatUserId: input.lokatUserId,
    temporaryToken: input.temporaryToken,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
  };
}

export function isIdentityLinkRequestExpired(request: IdentityLinkRequest, now: Date = new Date()): boolean {
  return now.getTime() > new Date(request.expiresAt).getTime();
}

export function completeIdentityLink(
  request: IdentityLinkRequest,
  externalUserId: string,
  now: Date = new Date(),
): IdentityLinkRecord | null {
  if (isIdentityLinkRequestExpired(request, now)) return null;
  return {
    channel: request.channel,
    externalUserId,
    lokatUserId: request.lokatUserId,
    linkedAt: now.toISOString(),
    status: "verified",
  };
}

// ── Session store contract ──────────────────────────────────────────────

export interface ConversationSessionStore {
  get(id: string): ConversationSession | null;
  save(session: ConversationSession): void;
  delete(id: string): void;
}

/** Referência para testes/dev local -- nunca persiste de verdade, nunca é conectada a um canal real nesta missão. */
export class InMemoryConversationSessionStore implements ConversationSessionStore {
  private readonly sessions = new Map<string, ConversationSession>();

  get(id: string): ConversationSession | null {
    return this.sessions.get(id) ?? null;
  }

  save(session: ConversationSession): void {
    this.sessions.set(session.id, session);
  }

  delete(id: string): void {
    this.sessions.delete(id);
  }
}
