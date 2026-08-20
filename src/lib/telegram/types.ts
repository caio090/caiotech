/**
 * TELEGRAM ADAPTER V1 — tipos mínimos do Telegram Bot API Update object.
 * Só os campos que esta missão realmente lê (PRIVATE TEXT MESSAGE V1) --
 * nunca o schema completo do Bot API, que tem dezenas de tipos de update
 * não suportados ainda (photo/voice/document/location/callback_query/
 * edited_message/channel_post/group). Campos desconhecidos são ignorados
 * pelo parser, nunca causam erro.
 */

export interface TelegramUser {
  id: number;
  is_bot?: boolean;
  username?: string;
  first_name?: string;
}

export interface TelegramChat {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  text?: string;
  date?: number;
}

/**
 * Update real do Telegram tem muito mais campos opcionais (edited_message,
 * channel_post, callback_query, etc.) -- só `message` é modelado, os
 * demais são tratados como "não suportado" por normalizeTelegramUpdate()
 * sem precisar de um tipo próprio para cada um.
 */
export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  [otherUpdateKind: string]: unknown;
}
