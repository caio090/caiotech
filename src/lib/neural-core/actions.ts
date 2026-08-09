/**
 * Sprint Gota Neural Foundation V1 (Fase 47-49) — Action Draft e níveis
 * de segurança/autonomia. Nesta sprint, o máximo efetivo é DRAFT/
 * LEVEL_2 -- nenhuma action real é executada.
 */
import type { Provenance } from "./provenance";
import type { AgentDomain } from "./agents";

export type ActionSafetyLevel = "INSIGHT" | "SUGGESTION" | "DRAFT" | "CONFIRMED_ACTION";

export type AutonomyLevel =
  | "LEVEL_0_EXPLAIN"
  | "LEVEL_1_SUGGEST"
  | "LEVEL_2_PREPARE_DRAFT"
  | "LEVEL_3_EXECUTE_AFTER_CONFIRMATION"
  | "LEVEL_4_FUTURE_AUTOMATION";

/** Fase 49 — teto desta sprint. Nada além disso deve ser produzido pelo Orchestrator. */
export const MAX_AUTONOMY_LEVEL_THIS_SPRINT: AutonomyLevel = "LEVEL_2_PREPARE_DRAFT";

export interface NeuralActionDraft {
  id: string;
  companyId: string;
  projectId?: string;
  type: string;
  targetModule: string;
  targetEntity?: string;
  summary: string;
  impact: string;
  requiredCapability?: string;
  /** Payload livre, mas sempre serializável -- nunca uma função/client injetado aqui (ver Fase 51, no-silent-mutation). */
  payload: Readonly<Record<string, string | number | boolean | null>>;
  confirmationRequired: boolean;
  createdByAgent?: AgentDomain;
  sourceRefs: Provenance[];
  safetyLevel: ActionSafetyLevel;
}

/**
 * Fase 48 — nenhum draft desta sprint pode nascer sem exigir
 * confirmação: o executor real (fora de escopo) não existe ainda, então
 * `confirmationRequired: false` seria uma promessa que ninguém cumpre.
 */
export function createDraftAction(
  input: Omit<NeuralActionDraft, "safetyLevel" | "confirmationRequired">
): NeuralActionDraft {
  return { ...input, safetyLevel: "DRAFT", confirmationRequired: true };
}
