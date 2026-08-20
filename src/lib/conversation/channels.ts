/**
 * LOKAT OS — Conversation Core Foundation V1. UMA INTELIGÊNCIA / VÁRIAS
 * INTERFACES: este arquivo só registra QUAIS canais existem/são planejados
 * -- nenhuma lógica de canal (nenhuma chamada Bot API, nenhum webhook)
 * pertence aqui. Ver docs/architecture/lkt-orchestration-framework-v1.md
 * (auditoria "LOKAT OS Conversational Layer / Telegram First Audit") para
 * o estado real confirmado de cada canal.
 */

export const CONVERSATION_CHANNELS = ["web", "telegram", "whatsapp"] as const;
export type ConversationChannel = (typeof CONVERSATION_CHANNELS)[number];

export type ChannelConnectionStatus = "implemented" | "not_connected";

export interface ChannelDefinition {
  id: ConversationChannel;
  label: string;
  /** Estado real observado, nunca uma intenção -- "implemented" exige webhook/rota real conectada. */
  status: ChannelConnectionStatus;
  notes: string;
}

export const CHANNEL_REGISTRY: Record<ConversationChannel, ChannelDefinition> = {
  web: {
    id: "web",
    label: "Web (Jarvis)",
    status: "implemented",
    notes: "Único canal real hoje -- /api/jarvis/chat, acoplado a sessão Supabase de navegador e streaming SSE. O Conversation Core reaproveita seus building blocks (resolveCompanyContext, buildJarvisContextText, streamJarvisChat), nunca a rota em si.",
  },
  telegram: {
    id: "telegram",
    label: "Telegram",
    status: "not_connected",
    notes: "Confirmado por auditoria (LOKAT OS Conversational Layer / Telegram First Audit): zero bot, zero webhook, zero env var existe hoje. Fundação apenas -- nenhum adapter implementado nesta missão.",
  },
  whatsapp: {
    id: "whatsapp",
    label: "WhatsApp",
    status: "not_connected",
    notes: "src/lib/messaging/types.ts já reserva os tipos de provider (meta_cloud_api/evolution_*), todos not_configured. Nenhum adapter implementado nesta missão.",
  },
};

export function isConversationChannel(value: string): value is ConversationChannel {
  return (CONVERSATION_CHANNELS as readonly string[]).includes(value);
}
