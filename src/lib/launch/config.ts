// Configuração de modo de lançamento controlado.
// Alterar aqui para ativar/desativar modo waitlist globalmente.
export const LAUNCH_MODE = {
  // true = modo lançamento beta ativo (CTAs viram waitlist)
  // false = cadastro aberto normal
  enabled: true,

  // "waitlist" = CTA principal vai para /pre-acesso
  // "open"     = comportamento normal
  publicSignupMode: "waitlist" as "waitlist" | "open",

  allowSuperAdmin:  true,
  allowInviteCode:  true,
  allowBetaCoupon:  true,
  betaOfferMonths:  6,
} as const;
