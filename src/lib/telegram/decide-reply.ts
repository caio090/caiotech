/**
 * TELEGRAM ADAPTER V1 / TELEGRAM IDENTITY LINK V1 FOUNDATION — decide o
 * texto de resposta para uma mensagem já normalizada. Pura o bastante
 * para testar sem rede (o `store` é injetado, nunca instanciado aqui) --
 * reusa routeConversationMessage() do Conversation Core para intenções em
 * texto livre e completeIdentityLinkFromToken() para `/start <token>`,
 * nunca duplica nenhum dos dois.
 *
 * Regra dura: identificar QUEM está falando (Identity Link) é uma coisa;
 * EXECUTAR uma ação de domínio (Growth/Content/Status/etc.) é outra,
 * ainda não implementada -- mesmo um usuário já vinculado só recebe a
 * confirmação de que foi reconhecido, nunca uma leitura de dado real.
 */
import { routeConversationMessage } from "@/lib/conversation/router";
import { completeIdentityLinkFromToken } from "@/lib/conversation/identity-link";
import type { IdentityLinkStore } from "@/lib/conversation/identity-link-store";
import type { NormalizedTelegramMessage, TelegramCommand } from "./normalize-update";
import {
  startReply,
  helpReply,
  accountLinkRequiredReply,
  domainActionsNotYetImplementedReply,
  unrecognizedMessageReply,
  identityLinkedReply,
  identityLinkExpiredReply,
  identityLinkInvalidReply,
  identityLinkAlreadyUsedReply,
  identityLinkAlreadyLinkedReply,
} from "./reply-copy";

export function decideTelegramReply(
  message: NormalizedTelegramMessage,
  command: TelegramCommand,
  store: IdentityLinkStore,
): string {
  if (command.kind === "start") {
    if (!command.payload) return startReply();
    return decideStartWithTokenReply(message, command.payload, store);
  }
  if (command.kind === "help") {
    return helpReply();
  }

  const { intent } = routeConversationMessage(message.text);
  if (!intent) return unrecognizedMessageReply();

  const existingLink = store.getLinkByExternalUser(message.channel, message.externalUserId);
  if (existingLink?.status === "verified") {
    // Identidade real, mas execução de domínio ainda não existe -- nunca
    // confundir "sei quem você é" com "já consigo agir por você".
    return domainActionsNotYetImplementedReply(intent.label);
  }

  // Intenção identificada tecnicamente, mas sem Identity Link verificado
  // nenhuma leitura privada acontece -- por design, não por esquecimento.
  return accountLinkRequiredReply(intent.label);
}

function decideStartWithTokenReply(message: NormalizedTelegramMessage, token: string, store: IdentityLinkStore): string {
  const result = completeIdentityLinkFromToken({
    store,
    token,
    channel: message.channel,
    externalUserId: message.externalUserId,
  });

  switch (result.kind) {
    case "linked":
      return identityLinkedReply();
    case "expired_token":
      return identityLinkExpiredReply();
    case "invalid_token":
      return identityLinkInvalidReply();
    case "token_already_used":
      return identityLinkAlreadyUsedReply();
    case "already_linked":
      return identityLinkAlreadyLinkedReply();
  }
}
