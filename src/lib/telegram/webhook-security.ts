/**
 * TELEGRAM ADAPTER V1 — validação do webhook. Regra dura da missão:
 * secret ausente (env não configurada) => FAIL CLOSED, nunca "sem
 * variável = sem bloqueio" (esse é o comportamento deliberado e diferente
 * de /api/leads/typebot, que aceita fallback sem auth em dev/staging --
 * o Telegram webhook NUNCA tem esse fallback). Comparação em tempo
 * constante para não vazar o secret por diferença de timing.
 */

export type TelegramWebhookDecision =
  | "fail_closed_no_secret_configured"
  | "rejected_invalid_secret"
  | "accepted";

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Pura -- testável sem Request/Response reais, mesmo padrão de
 * evaluateDebugAccess() em src/app/api/debug/_require-admin.ts.
 */
export function evaluateTelegramWebhookSecret(
  headerValue: string | null | undefined,
  configuredSecret: string | undefined,
): TelegramWebhookDecision {
  if (!configuredSecret) return "fail_closed_no_secret_configured";
  if (!headerValue || !constantTimeEquals(headerValue, configuredSecret)) return "rejected_invalid_secret";
  return "accepted";
}
