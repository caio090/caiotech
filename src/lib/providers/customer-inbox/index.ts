import type {
  BaseProvider,
  ProviderCapability,
  ProviderContext,
  ProviderHealth,
  ProviderResult,
} from "../shared/types";

export interface Conversation {
  id: string;
  clientId: string;
  status: "open" | "resolved" | "pending";
  assignedTo?: string;
  contactName?: string;
  channel: "whatsapp" | "instagram" | "facebook" | "email" | "webchat";
  lastMessageAt: string;
  tags?: string[];
}

export interface InboxMessage {
  id: string;
  conversationId: string;
  content: string;
  sender: "contact" | "agent";
  createdAt: string;
  attachmentUrl?: string;
}

export interface CustomerInboxProvider extends BaseProvider {
  listConversations(
    ctx: ProviderContext,
    filters?: { status?: string }
  ): Promise<ProviderResult<Conversation[]>>;
  getConversation(ctx: ProviderContext, conversationId: string): Promise<ProviderResult<Conversation>>;
  listMessages(ctx: ProviderContext, conversationId: string): Promise<ProviderResult<InboxMessage[]>>;
  sendMessage(
    ctx: ProviderContext,
    conversationId: string,
    content: string
  ): Promise<ProviderResult<InboxMessage>>;
  assignConversation(
    ctx: ProviderContext,
    conversationId: string,
    profileId: string
  ): Promise<ProviderResult<void>>;
  addTag(ctx: ProviderContext, conversationId: string, tag: string): Promise<ProviderResult<void>>;
  syncContact(ctx: ProviderContext, contactId: string): Promise<ProviderResult<void>>;
}

const NOT_CONFIGURED_ERROR: ProviderResult<never> = {
  success: false,
  error: {
    code: "PROVIDER_NOT_CONFIGURED",
    message:
      "CRM Inbox não configurado. Provisione o Chatwoot e configure a integração.",
    retryable: false,
  },
};

class ChatwootDisabledProvider implements CustomerInboxProvider {
  readonly id = "chatwoot-disabled";
  readonly name = "Chatwoot (não configurado)";
  readonly status = "not_configured" as const;
  readonly blocker =
    "Chatwoot requer serviço self-hosted separado (VPS + Docker). Configure a instância e a chave de API antes de ativar.";
  readonly capabilities: ProviderCapability[] = [
    { id: "inbox", label: "Inbox unificado", supported: false },
    { id: "whatsapp", label: "WhatsApp", supported: false },
    { id: "instagram", label: "Instagram DM", supported: false },
    { id: "facebook", label: "Facebook Messenger", supported: false },
    { id: "email", label: "E-mail", supported: false },
    { id: "webchat", label: "Webchat", supported: false },
    { id: "assignment", label: "Atribuição de agentes", supported: false },
    { id: "teams", label: "Equipes", supported: false },
    { id: "tags", label: "Tags", supported: false },
    { id: "notes", label: "Notas internas", supported: false },
    { id: "attachments", label: "Anexos", supported: false },
    { id: "webhooks", label: "Webhooks", supported: false },
    { id: "reports", label: "Relatórios", supported: false },
  ];

  async healthCheck(): Promise<ProviderHealth> {
    return { status: "unknown", error: "Serviço não configurado" };
  }
  async listConversations() { return NOT_CONFIGURED_ERROR; }
  async getConversation() { return NOT_CONFIGURED_ERROR; }
  async listMessages() { return NOT_CONFIGURED_ERROR; }
  async sendMessage() { return NOT_CONFIGURED_ERROR; }
  async assignConversation() { return NOT_CONFIGURED_ERROR; }
  async addTag() { return NOT_CONFIGURED_ERROR; }
  async syncContact() { return NOT_CONFIGURED_ERROR; }
}

export const CHATWOOT_REVIEW_ENTRY = {
  id: "chatwoot",
  name: "Chatwoot",
  license: "MIT (core) + Enterprise (features avançados)",
  decision: "external_service",
  architecture: "Ruby on Rails + Sidekiq + Redis + PostgreSQL",
  requiresDocker: true,
  requiresVPS: true,
  hasRestApi: true,
  hasWebhooks: true,
  hasSso: true,
  channels: ["WhatsApp", "Instagram", "Facebook", "Email", "Webchat", "Telegram"],
  notes:
    "Licença MIT no core. Pode ser auto-hospedado. Integrar via API REST + webhooks. Não instalar Ruby/Rails no Vercel.",
};

export function getCustomerInboxProvider(): CustomerInboxProvider {
  return new ChatwootDisabledProvider();
}
