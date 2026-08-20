/**
 * TELEGRAM ADAPTER V1 — implementação real do contrato ChannelAdapter
 * (adapters/types.ts) para o Telegram. Continua puro/síncrono como o
 * contrato exige -- nenhuma chamada de rede aqui (sendTelegramMessage,
 * que faz I/O, vive em src/lib/telegram/client.ts e é chamado pela rota
 * do webhook, não por este adapter). Delega toda a leitura do wire format
 * do Telegram para src/lib/telegram/ -- nunca duplica os tipos.
 */
import { normalizeTelegramUpdate } from "@/lib/telegram/normalize-update";
import type { TelegramUpdate } from "@/lib/telegram/types";
import type { ChannelAdapter, InboundChannelMessage, OutboundChannelMessage } from "./types";

export const TelegramChannelAdapter: ChannelAdapter = {
  channel: "telegram",

  parseInbound(rawPayload: unknown): InboundChannelMessage | null {
    if (!rawPayload || typeof rawPayload !== "object") return null;
    const result = normalizeTelegramUpdate(rawPayload as TelegramUpdate);
    if (result.kind !== "message") return null;
    return {
      channel: "telegram",
      externalUserId: result.message.externalUserId,
      text: result.message.text,
      receivedAt: new Date().toISOString(),
    };
  },

  formatOutbound(message: OutboundChannelMessage): unknown {
    // chat_id não faz parte de OutboundChannelMessage (é dado de sessão/
    // canal, não conteúdo da mensagem) -- o caller (rota do webhook) o
    // fornece separadamente a sendTelegramMessage().
    return { text: message.text };
  },
};
