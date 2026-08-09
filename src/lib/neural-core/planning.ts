/**
 * Sprint Gota Neural Foundation V1.1 (Fase 25-31) — Planning Layer.
 * Corrige um gap apontado pela auditoria CODEX WEB (P2 #5): a Foundation
 * V1 não tinha nenhuma noção de nível de planejamento nem de horizonte de
 * tempo. `PlanningLevel` e `PlanningHorizon` são DIMENSÕES TRANSVERSAIS,
 * nunca um módulo "Planning" novo, e nunca uma equivalência rígida com um
 * tipo de entidade -- Company != strategic, Project != tactical, Work
 * Item != operational são padrões FREQUENTES, não regras. Da mesma
 * forma, `strategic = long horizon` nunca é assumido automaticamente
 * (Fase 28): um objetivo estratégico pode ter horizonte curto, uma
 * rotina operacional pode ser contínua.
 *
 * FUTURE EXTENSION (não implementado nesta sprint): BusinessNeed e
 * BusinessDomain poderão futuramente se conectar a PlanningContext
 * (Business Context -> Business Need -> Business Domain -> Objective ->
 * Planning Level -> Initiative -> Execution Map). Nenhuma taxonomia
 * completa de BusinessNeed/BusinessDomain é criada aqui.
 */
import type { Provenance } from "./provenance";

/** "Para onde vamos" (strategic) / "como chegamos lá" (tactical) / "o que está sendo feito agora" (operational). */
export type PlanningLevel = "strategic" | "tactical" | "operational";

/** Independente de PlanningLevel -- nunca inferido a partir dele. */
export type PlanningHorizon = "short" | "medium" | "long" | "continuous";

/**
 * Fase 31 — referência mínima a um objetivo, nunca uma entidade completa
 * persistida. `parentObjectiveId` permite representar a cascata
 * Strategic Objective -> Tactical Initiative -> Operational Work sem
 * criar uma tabela nova.
 */
export interface ObjectiveReference {
  id: string;
  companyId: string;
  projectId?: string;
  title: string;
  planningLevel: PlanningLevel;
  parentObjectiveId?: string;
  metricRefs?: string[];
  sourceRefs?: Provenance[];
}

/**
 * Fase 29 — contrato leve, opcional em todo contexto que o carrega
 * (CompanyContext, ProjectContext, InitiativeContext, Campaign,
 * ExecutionMapEntry, NeuralRequest/NeuralPlan). Nunca obrigatório --
 * nem toda Company/Project precisa ter planejamento formal registrado.
 */
export interface PlanningContext {
  level: PlanningLevel;
  horizon?: PlanningHorizon;
  objectiveRef?: string;
  parentObjectiveRef?: string;
  initiativeRef?: string;
  metricRefs?: string[];
  sourceRefs?: Provenance[];
}
