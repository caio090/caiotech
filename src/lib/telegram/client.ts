/**
 * TELEGRAM ADAPTER V1 — client mínimo do Telegram Bot API. Só `sendMessage`
 * (V1 precisa só de texto; `replyMarkup` é aceito para preparar o contrato
 * de botões futuros, sem UX avançada agora). fetch server-side puro --
 * nenhum SDK pesado. O token NUNCA aparece em um valor de retorno, log ou
 * exceção -- a URL da API (que contém o token) nunca é exposta fora desta
 * função.
 */

const TELEGRAM_API_BASE = "https://api.telegram.org/bot";
const SEND_TIMEOUT_MS = 8000;

export function isTelegramBotTokenConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

export interface SendTelegramMessageInput {
  chatId: string;
  text: string;
  /** Contrato preparado para TELEGRAM V2 (botões) -- não usado nesta V1. */
  replyMarkup?: unknown;
}

export type SendTelegramMessageResult =
  | { ok: true }
  | { ok: false; error: "not_configured" | "timeout" | "network_error" | "telegram_api_error"; detail?: string };

export async function sendTelegramMessage(input: SendTelegramMessageInput): Promise<SendTelegramMessageResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: "not_configured" };

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

  try {
    const response = await fetch(`${TELEGRAM_API_BASE}${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: input.chatId,
        text: input.text,
        ...(input.replyMarkup ? { reply_markup: input.replyMarkup } : {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      // Nunca incluir a URL (contém o token) no detalhe do erro -- só o status HTTP.
      return { ok: false, error: "telegram_api_error", detail: `HTTP ${response.status}` };
    }
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return { ok: false, error: "timeout" };
    return { ok: false, error: "network_error" };
  } finally {
    clearTimeout(timeoutHandle);
  }
}
