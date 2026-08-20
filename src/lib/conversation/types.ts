/**
 * LOKAT OS — Conversation Core Foundation V1. Contratos compartilhados do
 * núcleo de conversação -- nenhum tipo aqui é específico de um canal
 * (Telegram/WhatsApp), nenhuma tabela é criada por este arquivo (só
 * tipos/contratos, conforme a missão pediu explicitamente).
 */
import type { PlatformModuleMaturity } from "@/config/platform-modules";
import type { ConversationChannel } from "./channels";
import type { ConversationIntentId } from "./intents";

export type ConversationSessionStatus =
  | "awaiting_company"
  | "awaiting_confirmation"
  | "active"
  | "expired";

/**
 * Modelo conceitual pedido pela missão (id/channel/external_user_id/
 * lokat_user_id/company_id/status/current_intent/created_at/updated_at) --
 * traduzido para camelCase seguindo a convenção TypeScript já usada no
 * resto do repositório. `lokatUserId`/`companyId` só existem depois do
 * Identity Link e da resolução de Company Context, respectivamente --
 * por isso são opcionais.
 */
export interface ConversationSession {
  id: string;
  channel: ConversationChannel;
  externalUserId: string;
  lokatUserId: string | null;
  companyId: string | null;
  status: ConversationSessionStatus;
  currentIntentId: ConversationIntentId | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Identity Link Foundation -- fluxo `/start <token>` do card. Apenas o
 * contrato: geração/validação de um token temporário e o registro final
 * do vínculo. Nenhuma persistência real (nenhuma tabela) nesta missão.
 */
export interface IdentityLinkRequest {
  channel: ConversationChannel;
  lokatUserId: string;
  temporaryToken: string;
  createdAt: string;
  expiresAt: string;
}

export interface IdentityLinkRecord {
  channel: ConversationChannel;
  externalUserId: string;
  lokatUserId: string;
  linkedAt: string;
}

/**
 * Para onde uma intenção resolvida aponta -- `maturity` vem sempre do
 * registry canônico (src/config/platform-modules.ts), nunca duplicado
 * aqui. "Status não pode mentir" também vale para a conversa: uma
 * intenção cujo módulo não é REAL precisa carregar `honestNotice`.
 */
export interface DomainTarget {
  moduleId: string;
  label: string;
  maturity: PlatformModuleMaturity | null;
  /** Presente sempre que maturity !== "production" -- nunca fingir que o módulo está pronto. */
  honestNotice: string | null;
}
