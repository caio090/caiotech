/**
 * Sprint Gota Neural Foundation V1.1 (Fase 12-18) — Visibility Contract.
 * Corrige um gap apontado pela auditoria CODEX WEB (P1 #3): a Foundation
 * V1 não tinha um contrato explícito para "onde este dado pode aparecer"
 * (Visibility) -- uma dimensão DIFERENTE de "quem pode executar/acessar"
 * (Permission/CapabilityState.permitted). As duas nunca são fundidas
 * aqui: Visibility nunca decide autorização, Permission nunca decide
 * onde um dado é exibido.
 */

/** "Onde este dado pode aparecer para o cliente" -- nunca combina hidden+visible. */
export type ClientVisibilityLevel = "hidden" | "summary" | "visible";

/**
 * `futureCommandable` é só metadata classificatória para uma extensão
 * futura ("este tipo de informação poderia um dia virar um comando") --
 * NUNCA autoriza um comando real, nunca cria um executor. Nenhuma parte
 * desta Foundation lê esse campo para decidir executar algo.
 */
export interface NeuralVisibilityPolicy {
  internalOnly: boolean;
  client: ClientVisibilityLevel;
  connectorReadable: boolean;
  futureCommandable: boolean;
}

/** Fase 15 — default seguro: o mais restritivo possível. Nunca client-visible por padrão. */
export const DEFAULT_VISIBILITY_POLICY: NeuralVisibilityPolicy = {
  internalOnly: true,
  client: "hidden",
  connectorReadable: false,
  futureCommandable: false,
};

/** Ausência de policy explícita sempre resolve para o default restritivo -- nunca "assume visível". */
export function resolveVisibilityPolicy(policy?: Partial<NeuralVisibilityPolicy>): NeuralVisibilityPolicy {
  if (!policy) return DEFAULT_VISIBILITY_POLICY;
  return { ...DEFAULT_VISIBILITY_POLICY, ...policy };
}

/** `internalOnly` sempre vence -- mesmo que `client` tenha sido setado como "visible" por engano. */
export function clientVisibilityLevel(policy: NeuralVisibilityPolicy): ClientVisibilityLevel {
  return policy.internalOnly ? "hidden" : policy.client;
}

/** Fase 13 — "client_summary" nunca é tratado como equivalente a "client_visible". */
export function isClientVisible(policy: NeuralVisibilityPolicy): boolean {
  return clientVisibilityLevel(policy) === "visible";
}

export function isClientSummaryOnly(policy: NeuralVisibilityPolicy): boolean {
  return clientVisibilityLevel(policy) === "summary";
}

/** `connectorReadable: false` nunca é interpretado como "readable" por omissão. */
export function isConnectorReadable(policy: NeuralVisibilityPolicy): boolean {
  if (policy.internalOnly) return false;
  return policy.connectorReadable === true;
}
