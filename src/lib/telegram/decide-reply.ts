/**
 * TELEGRAM ADAPTER V1 — decide o texto de resposta para uma mensagem já
 * normalizada. Pura (sem I/O) -- reusa routeConversationMessage() do
 * Conversation Core para intenções em texto livre, nunca duplica o
 * matcher. Como Identity Link ainda não é persistido, qualquer intenção
 * de domínio (growth/content/status/projects/influence/meu_negocio)
 * responde ACCOUNT_LINK_REQUIRED -- nunca tenta ler dado privado.
 */
import { routeConversationMessage } from "@/lib/conversation/router";
import type { NormalizedTelegramMessage, TelegramCommand } from "./normalize-update";
import {
  startReply,
  startWithPayloadReply,
  helpReply,
  accountLinkRequiredReply,
  unrecognizedMessageReply,
} from "./reply-copy";

export function decideTelegramReply(message: NormalizedTelegramMessage, command: TelegramCommand): string {
  if (command.kind === "start") {
    return command.payload ? startWithPayloadReply() : startReply();
  }
  if (command.kind === "help") {
    return helpReply();
  }

  const { intent } = routeConversationMessage(message.text);
  if (!intent) return unrecognizedMessageReply();

  // Intenção identificada tecnicamente, mas sem Identity Link persistido
  // nenhuma leitura privada acontece -- por design, não por esquecimento.
  return accountLinkRequiredReply(intent.label);
}
