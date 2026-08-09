/**
 * Sprint Gota Neural Foundation V1 (Fase 25-26, 35-36) — Capability.
 * Este é um TERCEIRO eixo, distinto de `WorkspaceCapability`
 * (src/config/workspace-capabilities.ts, gate por SURFACE) e de
 * feature-flags (motor interno ligado/desligado por ambiente) — ver
 * docs/product/lokat-os-capabilities-v1.md. `Capability` aqui responde
 * "o LOKAT OS sabe trabalhar com esse TIPO de capacidade de negócio",
 * independente de plano ou surface.
 */

export type Capability =
  | "advertising"
  | "social_content"
  | "messaging"
  | "attribution"
  | "checkout"
  | "payment"
  | "crm"
  | "calendar"
  | "documents"
  | "analytics"
  | "commerce"
  | "local_presence";

/**
 * Fase 35 — seis estados independentes, nunca tratados como
 * equivalentes (ex.: `connected` não implica `permitted`).
 */
export interface CapabilityState {
  capability: Capability;
  exists: boolean; // o LOKAT OS sabe trabalhar com isso, em algum lugar do produto
  entitled: boolean; // o plano da Company inclui isso
  enabled: boolean; // a feature flag/motor correspondente está ligado neste ambiente
  connected: boolean; // existe uma Connection ativa para isso, quando aplicável
  permitted: boolean; // o usuário atual tem permissão de usar isso
}

export interface UnmetCapability {
  capability: Capability;
  reason: "not_exists" | "not_entitled" | "not_enabled" | "not_connected" | "not_permitted";
  relatedCapability?: Capability;
  alternative?: string;
}

/**
 * Fase 36 — resolver puro e determinístico. Percorre a cadeia na ordem
 * conceitual exigida; a primeira condição falsa decide o motivo do
 * "unmet" -- nunca inventa execução para uma capability ausente
 * (Fase 16 do brief anterior: "automatize meu estoque" -> inventory
 * capability unavailable, nunca uma automação fake).
 */
export function resolveCapabilityPrecedence(state: CapabilityState): { actionable: boolean; unmet?: UnmetCapability } {
  if (!state.exists) return { actionable: false, unmet: { capability: state.capability, reason: "not_exists" } };
  if (!state.entitled) return { actionable: false, unmet: { capability: state.capability, reason: "not_entitled" } };
  if (!state.enabled) return { actionable: false, unmet: { capability: state.capability, reason: "not_enabled" } };
  if (!state.connected) return { actionable: false, unmet: { capability: state.capability, reason: "not_connected" } };
  if (!state.permitted) return { actionable: false, unmet: { capability: state.capability, reason: "not_permitted" } };
  return { actionable: true };
}
