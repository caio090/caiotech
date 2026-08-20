import { NextResponse, type NextRequest } from "next/server";
import { evaluateTelegramWebhookSecret } from "@/lib/telegram/webhook-security";
import { normalizeTelegramUpdate } from "@/lib/telegram/normalize-update";
import { decideTelegramReply } from "@/lib/telegram/decide-reply";
import { isTelegramBotTokenConfigured, sendTelegramMessage } from "@/lib/telegram/client";
import type { TelegramUpdate } from "@/lib/telegram/types";

/**
 * TELEGRAM ADAPTER V1 — webhook receiver. Responsabilidade estritamente
 * de CHANNEL ADAPTER: validar origem, normalizar, decidir resposta via
 * Conversation Core, enviar. Nenhuma regra de negócio mora aqui.
 *
 * Segurança (regra dura, diferente de /api/leads/typebot -- lá "sem
 * variável = sem bloqueio" é um fallback deliberado de dev/staging; aqui
 * NUNCA): secret ausente => fail closed (503, serviço não configurado);
 * secret incorreto => 401. Nunca processa o body sem secret válido.
 *
 * Idempotência: Telegram pode reenviar o mesmo update -- como esta V1
 * ainda não executa nenhuma mutação de domínio (só decide texto e
 * responde), não há side effect duplicável ainda. Antes de qualquer
 * mutation real ser adicionada aqui, será necessário deduplicar por
 * `update_id` de forma persistida -- não implementado nesta missão
 * (nenhuma tabela nova).
 */
export async function POST(req: NextRequest) {
  const secretDecision = evaluateTelegramWebhookSecret(
    req.headers.get("x-telegram-bot-api-secret-token"),
    process.env.TELEGRAM_WEBHOOK_SECRET,
  );

  if (secretDecision === "fail_closed_no_secret_configured") {
    return NextResponse.json({ ok: false, error: "service_not_configured" }, { status: 503 });
  }
  if (secretDecision === "rejected_invalid_secret") {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== "object") throw new Error("invalid_body");
    update = body as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const normalized = normalizeTelegramUpdate(update);

  // Update_id só (nunca PII/texto da mensagem) -- observabilidade mínima.
  console.log("[telegram-webhook] update", update.update_id, "kind:", normalized.kind);

  if (normalized.kind === "unsupported") {
    // Nunca 5xx para um tipo de update não suportado -- Telegram reenviaria
    // indefinidamente. Confirma recebimento, não executa nada.
    return NextResponse.json({ ok: true, ignored: true, reason: normalized.reason }, { status: 200 });
  }

  const replyText = decideTelegramReply(normalized.message, normalized.command);

  if (isTelegramBotTokenConfigured()) {
    // Chat privado -- chat.id == from.id, então externalUserId já é o chatId correto.
    await sendTelegramMessage({ chatId: normalized.message.externalUserId, text: replyText });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
