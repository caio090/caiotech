/**
 * Sprint Gota Neural Foundation V1 (Fase 25-26, 35-36) — Capability.
 * Este é um TERCEIRO eixo, distinto de `WorkspaceCapability`
 * (src/config/workspace-capabilities.ts, gate por SURFACE) e de
 * feature-flags (motor interno ligado/desligado por ambiente) — ver
 * docs/product/lokat-os-capabilities-v1.md. `Capability` aqui responde
 * "o LOKAT OS sabe trabalhar com esse TIPO de capacidade de negócio",
 * independente de plano ou surface.
 *
 * V1.1 (Fase 2-7 da correção CODEX WEB, P1 #1): a V1 exigia `connected`
 * para TODA capability, o que é incorreto -- capabilities internas
 * (documents internos, CRM interno, operações internas) não dependem de
 * nenhuma integração externa. `ConnectionRequirement` torna essa
 * exigência explícita e condicional em vez de um gate universal.
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
 * Fase 3 — responde "esta capability específica precisa de uma conexão
 * externa para ser actionable?". Não é uma propriedade fixa do
 * `Capability` (tipo) -- é uma propriedade de cada `CapabilityState`
 * (instância), porque a mesma capability pode ter requisito diferente
 * dependendo do contexto (ex.: `crm` interno do LOKAT OS é
 * `not_required`, mas um `crm` espelhado de um provider externo seria
 * `required`).
 *
 * - required: sem `connected: true`, nunca actionable.
 * - optional: `connected` pode enriquecer a capability, mas nunca é
 *   sozinho um blocker de actionable.
 * - not_required: conexão nem é avaliada como blocker.
 */
export type ConnectionRequirement = "required" | "optional" | "not_required";

/**
 * Fase 4 — seis estados independentes, nunca tratados como
 * equivalentes (ex.: `connected` não implica `permitted`). V1.1 adiciona
 * `connectionRequirement` para que `connected` deixe de ser um gate
 * universal.
 */
export interface CapabilityState {
  capability: Capability;
  exists: boolean; // o LOKAT OS sabe trabalhar com isso, em algum lugar do produto
  entitled: boolean; // o plano da Company inclui isso
  enabled: boolean; // a feature flag/motor correspondente está ligado neste ambiente
  connectionRequirement: ConnectionRequirement; // esta instância de capability depende de conexão externa?
  connected: boolean; // existe uma Connection ativa para isso -- só é gate quando connectionRequirement !== "not_required"
  permitted: boolean; // o usuário atual tem permissão de usar isso
}

/**
 * Fase 6 — motivos equivalentes aos sugeridos pela auditoria
 * (`not_available`≈`not_exists`, `disabled`≈`not_enabled`,
 * `permission_denied`≈`not_permitted`). `not_connected` só pode ser
 * reportado quando a capability de fato exige conexão (`required`) --
 * nunca para `not_required`, e nunca sozinho como blocker para
 * `optional`. `context_missing`/`action_not_allowed` (gates
 * conceituais de "context constraints"/"action safety", ver Fase 5 do
 * brief) não são implementados nesta Foundation -- nenhum permission
 * runtime novo foi criado (Fase 5: "não implementar permission runtime
 * novo"). Ficam documentados aqui como FUTURE EXTENSION.
 */
export type UnmetCapabilityReason =
  | "not_exists"
  | "not_entitled"
  | "not_enabled"
  | "not_connected"
  | "not_permitted";

export interface UnmetCapability {
  capability: Capability;
  reason: UnmetCapabilityReason;
  relatedCapability?: Capability;
  alternative?: string;
}

/**
 * Fase 5 — resolver puro e determinístico. Cascata conceitual completa:
 * exists? -> entitled? -> enabled? -> connection requirement? (IF
 * required: connected? / IF optional: connected pode enriquecer mas não
 * bloqueia / IF not_required: conexão não é avaliada) -> permitted? ->
 * ACTIONABLE. "context constraints?"/"action safety?" (gates futuros
 * citados no brief) não são avaliados aqui -- nenhum permission runtime
 * novo nesta sprint. A primeira condição falsa decide o motivo do
 * "unmet" -- nunca inventa execução para uma capability ausente.
 */
export function resolveCapabilityPrecedence(state: CapabilityState): { actionable: boolean; unmet?: UnmetCapability } {
  if (!state.exists) return { actionable: false, unmet: { capability: state.capability, reason: "not_exists" } };
  if (!state.entitled) return { actionable: false, unmet: { capability: state.capability, reason: "not_entitled" } };
  if (!state.enabled) return { actionable: false, unmet: { capability: state.capability, reason: "not_enabled" } };
  if (state.connectionRequirement === "required" && !state.connected) {
    return { actionable: false, unmet: { capability: state.capability, reason: "not_connected" } };
  }
  // "optional": connected pode enriquecer a capability, mas nunca bloqueia sozinho.
  // "not_required": conexão nem é avaliada como blocker.
  if (!state.permitted) return { actionable: false, unmet: { capability: state.capability, reason: "not_permitted" } };
  return { actionable: true };
}
