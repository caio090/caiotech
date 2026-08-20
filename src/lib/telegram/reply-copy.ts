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
    "A integração da sua conta Telegram com o LOKAT OS ainda está sendo preparada -- em breve você poderá vincular sua conta por aqui.",
    "",
    "Envie /help para ver o que já sei conversar.",
  ].join("\n");
}

export function startWithPayloadReply(): string {
  return [
    "Recebi seu código de vínculo.",
    "",
    "A validação e o vínculo da conta ainda estão sendo preparados -- assim que estiverem prontos, seu Telegram será conectado automaticamente à sua conta LOKAT OS.",
  ].join("\n");
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

export function unrecognizedMessageReply(): string {
  return "Ainda não entendi exatamente o que você quer fazer. Envie /help para ver o que já sei conversar.";
}
