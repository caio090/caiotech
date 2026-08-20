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

/**
 * "implemented" e "code_ready" são distinções deliberadas -- não misturar:
 * - not_connected: nenhum código de canal existe.
 * - code_ready: adapter/webhook/normalização/sender existem e são
 *   testados, mas o Telegram/WhatsApp ainda não sabe que a rota existe
 *   (setWebhook nunca foi chamado) e/ou o token/secret runtime não está
 *   confirmado configurado -- zero tráfego real chega ainda.
 * - implemented: além de tudo acima, o canal está de fato recebendo
 *   tráfego real (setWebhook confirmado, envs confirmadas em Production).
 */
export type ChannelConnectionStatus = "implemented" | "code_ready" | "not_connected";

export interface ChannelDefinition {
  id: ConversationChannel;
  label: string;
  status: ChannelConnectionStatus;
  notes: string;
}

export const CHANNEL_REGISTRY: Record<ConversationChannel, ChannelDefinition> = {
  web: {
    id: "web",
    label: "Web (Jarvis)",
    status: "implemented",
    notes: "Único canal recebendo tráfego real hoje -- /api/jarvis/chat, acoplado a sessão Supabase de navegador e streaming SSE. O Conversation Core reaproveita seus building blocks (resolveCompanyContext, buildJarvisContextText, streamJarvisChat), nunca a rota em si.",
  },
  telegram: {
    id: "telegram",
    label: "Telegram",
    status: "code_ready",
    notes: "TELEGRAM ADAPTER V1: webhook (src/app/api/integrations/telegram/webhook/route.ts), normalização, secret validation (fail-closed) e sendMessage implementados e testados. Ainda code_ready, não implemented: setWebhook nunca foi chamado nesta missão (proibido explicitamente) e TELEGRAM_BOT_TOKEN/TELEGRAM_WEBHOOK_SECRET não estão confirmados configurados em Production -- zero tráfego real do Telegram chega ainda. Identity Link permanece NOT_IMPLEMENTED (sem persistência).",
  },
  whatsapp: {
    id: "whatsapp",
    label: "WhatsApp",
    status: "not_connected",
    notes: "src/lib/messaging/types.ts já reserva os tipos de provider (meta_cloud_api/evolution_*), todos not_configured. Nenhum adapter implementado ainda -- Conversation Core (router/intents/session/context) já é channel-agnostic e reutilizável quando este canal for construído.",
  },
};

export function isConversationChannel(value: string): value is ConversationChannel {
  return (CONVERSATION_CHANNELS as readonly string[]).includes(value);
}
