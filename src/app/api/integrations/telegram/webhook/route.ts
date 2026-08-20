import { NextResponse, type NextRequest } from "next/server";
import { evaluateTelegramWebhookSecret } from "@/lib/telegram/webhook-security";
import { normalizeTelegramUpdate } from "@/lib/telegram/normalize-update";
import { decideTelegramReply } from "@/lib/telegram/decide-reply";
import { isTelegramBotTokenConfigured, sendTelegramMessage } from "@/lib/telegram/client";
import type { TelegramUpdate } from "@/lib/telegram/types";
import { InMemoryIdentityLinkStore } from "@/lib/conversation/identity-link-store";

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
 * responde), não há side effect duplicável ainda além do próprio Identity
 * Link, que já é protegido contra reuso via isTokenConsumed(). Antes de
 * qualquer mutation de domínio real ser adicionada aqui, será necessário
 * deduplicar update_id de forma persistida também -- não implementado
 * nesta missão (nenhuma tabela nova).
 *
 * TELEGRAM IDENTITY LINK V1 FOUNDATION — identityLinkStore é um singleton
 * de módulo (InMemoryIdentityLinkStore, nunca uma tabela). Isto persiste
 * entre requests DENTRO de uma mesma instância serverless "quente", mas
 * NUNCA de forma durável entre cold starts/múltiplas instâncias -- é a
 * fundação testável pedida pela missão (SQL: NÃO APLICAR), não uma
 * garantia de produção. Uma implementação real (Supabase) deve
 * implementar a mesma interface IdentityLinkStore, trocada aqui sem
 * alterar nenhuma outra função desta rota.
 */
const identityLinkStore = new InMemoryIdentityLinkStore();

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

  const replyText = decideTelegramReply(normalized.message, normalized.command, identityLinkStore);

  if (isTelegramBotTokenConfigured()) {
    // Chat privado -- chat.id == from.id, então externalUserId já é o chatId correto.
    await sendTelegramMessage({ chatId: normalized.message.externalUserId, text: replyText });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
