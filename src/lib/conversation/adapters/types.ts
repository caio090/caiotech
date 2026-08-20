/**
 * LOKAT OS — Conversation Core Foundation V1. Contrato que um futuro
 * adapter de canal (TelegramChannelAdapter, WhatsAppChannelAdapter) deve
 * implementar. Este arquivo NUNCA deve importar/chamar uma API externa de
 * canal (Telegram Bot API, WhatsApp Cloud/Evolution API) -- é só a forma,
 * nenhuma implementação concreta é criada nesta missão.
 */
import type { ConversationChannel } from "../channels";

export interface InboundChannelMessage {
  channel: ConversationChannel;
  externalUserId: string;
  text: string;
  receivedAt: string;
}

export interface OutboundChannelMessage {
  text: string;
}

/**
 * `parseInbound`/`formatOutbound` são deliberadamente síncronos e puros
 * (sem I/O) -- qualquer chamada de rede (enviar ao Telegram/WhatsApp de
 * verdade) pertence a uma camada de transporte fora deste contrato,
 * escrita quando o canal real for conectado.
 */
export interface ChannelAdapter {
  channel: ConversationChannel;
  parseInbound(rawPayload: unknown): InboundChannelMessage | null;
  formatOutbound(message: OutboundChannelMessage): unknown;
}
