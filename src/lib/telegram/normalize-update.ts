/**
 * TELEGRAM ADAPTER V1 — normalização pura de um Telegram Update para o
 * contrato do Conversation Core, mais detecção de comando (/start,
 * /start <payload>, /help). Nada aqui faz I/O -- sem fetch, sem Supabase,
 * sem leitura de env. Updates não suportados (grupo/canal/foto/voice/
 * document/callback_query/edited_message/location/etc.) nunca lançam
 * exceção -- sempre retornam `{ kind: "unsupported" }` com um motivo.
 */
import type { ConversationChannel } from "@/lib/conversation/channels";
import type { TelegramUpdate } from "./types";

export interface NormalizedTelegramMessage {
  channel: Extract<ConversationChannel, "telegram">;
  externalUserId: string;
  externalConversationId: string;
  text: string;
  metadata: { messageId: string; updateId: string };
}

export type TelegramCommand =
  | { kind: "start"; payload: string | null }
  | { kind: "help" }
  | { kind: "text" };

export type NormalizeTelegramUpdateResult =
  | { kind: "unsupported"; reason: string }
  | { kind: "message"; message: NormalizedTelegramMessage; command: TelegramCommand };

export function detectTelegramCommand(text: string): TelegramCommand {
  const trimmed = text.trim();
  if (trimmed === "/start") return { kind: "start", payload: null };
  const startWithPayload = /^\/start(?:@\w+)?\s+(\S+)/.exec(trimmed);
  if (startWithPayload) return { kind: "start", payload: startWithPayload[1] };
  if (trimmed === "/help" || /^\/help(?:@\w+)?(\s|$)/.test(trimmed)) return { kind: "help" };
  return { kind: "text" };
}

export function normalizeTelegramUpdate(update: TelegramUpdate): NormalizeTelegramUpdateResult {
  const message = update.message;
  if (!message) {
    return { kind: "unsupported", reason: "update sem campo message (ex.: edited_message/channel_post/callback_query/my_chat_member)" };
  }
  if (message.chat.type !== "private") {
    return { kind: "unsupported", reason: `chat.type "${message.chat.type}" não suportado nesta V1 (só private) -- ver TELEGRAM V2/V3` };
  }
  if (!message.from) {
    return { kind: "unsupported", reason: "message sem from (remetente ausente)" };
  }
  if (typeof message.text !== "string" || message.text.trim() === "") {
    return { kind: "unsupported", reason: "message sem text (foto/voice/document/audio/location/sticker não suportados nesta V1)" };
  }

  const normalized: NormalizedTelegramMessage = {
    channel: "telegram",
    externalUserId: String(message.from.id),
    externalConversationId: String(message.chat.id),
    text: message.text,
    metadata: {
      messageId: String(message.message_id),
      updateId: String(update.update_id),
    },
  };

  return { kind: "message", message: normalized, command: detectTelegramCommand(message.text) };
}
