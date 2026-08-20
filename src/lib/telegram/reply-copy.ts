/**
 * TELEGRAM ADAPTER V1 — textos de resposta. Regra dura: nunca anunciar
 * como pronto algo que ainda é PLANNED/NOT_IMPLEMENTED (Identity Link
 * persistido não existe -- toda cópia aqui reflete isso honestamente).
 * Funções puras, sem I/O, para serem testáveis e revisáveis por texto.
 */

export function startReply(): string {
  return [
    "Olá. 👋",
    "",
    "Sou o LOKAT.",
    "",
    "Para conectar sua conta, gere um código de vínculo no painel LOKAT e envie /start <código> aqui. (A geração do código pelo painel Web ainda está sendo preparada -- a validação do código já é real.)",
    "",
    "Envie /help para ver o que já sei conversar.",
  ].join("\n");
}

// TELEGRAM IDENTITY LINK V1 FOUNDATION — respostas honestas para cada
// desfecho real de completeIdentityLinkFromToken(). Nunca revela qual
// conta LOKAT já está vinculada (evita vazar identidade de terceiros).

export function identityLinkedReply(): string {
  return [
    "Conta conectada. ✅",
    "",
    "Seu Telegram agora está vinculado à sua conta LOKAT OS.",
    "",
    "Envie /help para ver o que já posso fazer por aqui.",
  ].join("\n");
}

export function identityLinkExpiredReply(): string {
  return [
    "Esse código expirou.",
    "",
    "Gere um novo código de vínculo no painel LOKAT e envie /start <código> novamente.",
  ].join("\n");
}

export function identityLinkInvalidReply(): string {
  return [
    "Não reconheci esse código.",
    "",
    "Gere um novo código de vínculo no painel LOKAT e envie /start <código> aqui.",
  ].join("\n");
}

export function identityLinkAlreadyUsedReply(): string {
  return [
    "Esse código já foi usado.",
    "",
    "Se ainda precisa conectar, gere um novo código no painel LOKAT.",
  ].join("\n");
}

export function identityLinkAlreadyLinkedReply(): string {
  return "Este Telegram já está conectado a uma conta LOKAT OS.";
}

export function helpReply(): string {
  return [
    "Você pode conversar comigo sobre:",
    "",
    "• campanhas",
    "• conteúdo",
    "• projetos",
    "• status",
    "• crescimento",
    "",
    "Algumas funções exigem que sua conta Telegram esteja vinculada ao LOKAT OS.",
  ].join("\n");
}

export function accountLinkRequiredReply(intentLabel: string): string {
  return `Entendi que você quer falar sobre ${intentLabel.toLowerCase()}, mas ainda preciso que sua conta Telegram esteja vinculada ao LOKAT OS para acessar esses dados com segurança.\n\nEnvie /start para começar.`;
}

/** Usuário já identificado (Identity Link real), mas execução de ações de domínio pelo Telegram ainda não existe -- nunca confundir "sei quem você é" com "já consigo agir por você". */
export function domainActionsNotYetImplementedReply(intentLabel: string): string {
  return `Já reconheço sua conta. Ainda não consigo executar ações de ${intentLabel.toLowerCase()} por aqui -- essa parte está em construção.`;
}

export function unrecognizedMessageReply(): string {
  return "Ainda não entendi exatamente o que você quer fazer. Envie /help para ver o que já sei conversar.";
}
