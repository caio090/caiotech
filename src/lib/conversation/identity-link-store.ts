/**
 * TELEGRAM IDENTITY LINK V1 FOUNDATION — contrato de armazenamento do
 * vínculo (interface + referência em memória), mesmo padrão já usado por
 * ConversationSessionStore/InMemoryConversationSessionStore em session.ts
 * e pelo par CustomerInboxProvider/ChatwootDisabledProvider em
 * src/lib/providers/customer-inbox. `InMemoryIdentityLinkStore` NUNCA é
 * persistência real -- serve para testes e para a rota do webhook rodar
 * de ponta a ponta sem banco nesta missão (SQL: NÃO APLICAR). Uma
 * implementação real (Supabase) deve implementar a MESMA interface, sem
 * mudar nenhum chamador -- ver docs/supabase/93-identity-links.sql
 * (proposta, não aplicada) para o schema equivalente.
 */
import type { ConversationChannel } from "./channels";
import type { IdentityLinkRecord } from "./types";

export interface IdentityLinkStore {
  /** Busca o vínculo de um usuário do canal (ex.: Telegram user id) -- usado para detectar "já vinculado". */
  getLinkByExternalUser(channel: ConversationChannel, externalUserId: string): IdentityLinkRecord | null;
  /** Busca o vínculo pelo usuário LOKAT (profile_id) -- útil para a Conversation Session saber se já existe canal ligado. */
  getLinkByLokatUser(channel: ConversationChannel, lokatUserId: string): IdentityLinkRecord | null;
  saveLink(record: IdentityLinkRecord): void;
  /** Nonce do token (não o token inteiro) -- suficiente para detectar reuso, nunca precisa guardar o token em si. */
  isTokenConsumed(tokenNonce: string): boolean;
  markTokenConsumed(tokenNonce: string): void;
}

export class InMemoryIdentityLinkStore implements IdentityLinkStore {
  private readonly linksByExternalUser = new Map<string, IdentityLinkRecord>();
  private readonly linksByLokatUser = new Map<string, IdentityLinkRecord>();
  private readonly consumedNonces = new Set<string>();

  private key(channel: ConversationChannel, id: string): string {
    return `${channel}:${id}`;
  }

  getLinkByExternalUser(channel: ConversationChannel, externalUserId: string): IdentityLinkRecord | null {
    return this.linksByExternalUser.get(this.key(channel, externalUserId)) ?? null;
  }

  getLinkByLokatUser(channel: ConversationChannel, lokatUserId: string): IdentityLinkRecord | null {
    return this.linksByLokatUser.get(this.key(channel, lokatUserId)) ?? null;
  }

  saveLink(record: IdentityLinkRecord): void {
    this.linksByExternalUser.set(this.key(record.channel, record.externalUserId), record);
    this.linksByLokatUser.set(this.key(record.channel, record.lokatUserId), record);
  }

  isTokenConsumed(tokenNonce: string): boolean {
    return this.consumedNonces.has(tokenNonce);
  }

  markTokenConsumed(tokenNonce: string): void {
    this.consumedNonces.add(tokenNonce);
  }
}
