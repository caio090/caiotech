/**
 * Sprint Gota Neural Foundation V1 (Fase 56-58, 61-62) — LKT awareness,
 * Execution Map, Module Reference, Connector context.
 *
 * LKT já está formalizado em
 * docs/architecture/lkt-orchestration-framework-v1.md como framework,
 * não módulo. `CANONICAL_FLOW_STEPS` (src/lib/domain-events/canonical-flow.ts)
 * já é uma instância REAL e implementada desse mesmo loop, específica
 * para o fluxo comercial Produto->Oportunidade->Campanha->...->Resultado
 * -- reaproveitada aqui em vez de duplicar um enum paralelo de estágios.
 */
import { CANONICAL_FLOW_STEPS, type CanonicalFlowStep } from "@/lib/domain-events/canonical-flow";
import type { DomainEvent } from "@/lib/domain-events/types";
import type { Capability } from "./capabilities";
import type { Provenance } from "./provenance";
import type { PlanningLevel } from "./planning";

/** As 9 fases conceituais do loop LKT geral (independente da aplicação específica). */
export const LKT_STAGES = [
  "context", "diagnosis", "direction", "initiative", "architecture",
  "connections", "execution", "measurement", "learning",
] as const;

export type LktStage = (typeof LKT_STAGES)[number];

/**
 * Fase 57 — permite ao NeuralContext saber "onde estamos" sem
 * implementar nenhuma UX. `canonicalFlowStepId`, quando presente,
 * aponta para uma etapa REAL de `CANONICAL_FLOW_STEPS` -- nunca um
 * texto solto.
 */
export interface LktProgress {
  companyId: string;
  projectId?: string;
  currentStage: LktStage;
  canonicalFlowStepId?: CanonicalFlowStep["id"];
}

export function currentCanonicalFlowStep(progress: LktProgress): CanonicalFlowStep | undefined {
  if (!progress.canonicalFlowStepId) return undefined;
  return CANONICAL_FLOW_STEPS.find((s) => s.id === progress.canonicalFlowStepId);
}

/** Fase 58 — nunca hardcoda os exemplos do brief; o mapa real vem do contexto/Initiative de cada chamada. */
export interface ExecutionMapEntry {
  need: string;
  domain: string;
  module: ModuleReference;
  capability?: Capability;
  connectionId?: string;
  workItemDraftRef?: string;
  status: "recommended" | "confirmed" | "not_applicable";
  /** Fase 34 — relaciona a entrada a um nível de planejamento e a um objetivo, sem transformar PlanningLevel em módulo. */
  planningLevel?: PlanningLevel;
  objectiveRef?: string;
}

export interface ExecutionMap {
  companyId: string;
  projectId?: string;
  entries: ExecutionMapEntry[];
}

/**
 * Fase 59 — auditoria não encontrou um registry de módulo puro e
 * reutilizável (o catálogo de busca em `src/components/admin-search-sheet.tsx`
 * deriva de `configs` em `src/components/app-sidebar.tsx`, acoplado à UI
 * — nunca importado por um pacote de lib puro). Por isso, só o TIPO é
 * criado aqui, sem um segundo registry de navegação.
 */
export interface ModuleReference {
  moduleId: string;
  label: string;
}

// ── NIS/Connector context (Fase 61-62) — sem endpoint, sem request HTTP ──

export interface ConnectorManifest {
  connectorId: string;
  capabilities: Capability[];
}

export interface ConnectorSnapshot {
  connectorId: string;
  companyId: string;
  capability: Capability;
  data: Readonly<Record<string, string | number | boolean>>;
  lastSyncAt: string;
}

export interface ConnectorSource {
  sourceSystem: string;
  connectorId: string;
  capability: Capability;
  scope: string;
  lastSyncAt: string;
  health: "healthy" | "degraded" | "offline";
  stale: boolean;
  provenance: Provenance;
}

export interface ConnectorHealth {
  connectorId: string;
  status: "healthy" | "degraded" | "offline";
  checkedAt: string;
}

/**
 * V1.1 (Fase 19-24 da correção CODEX WEB, P1 #4): a V1 tinha
 * Manifest/Snapshot/Health mas nenhum contrato explícito de Events ou
 * Metrics -- o contrato NIS/Connector estava incompleto. `ConnectorEvent`
 * formaliza a diferença entre um evento vindo do connector boundary
 * (sistema externo) e um `DomainEvent` canônico interno (já
 * implementado, `src/lib/domain-events/`): ConnectorEvent nunca é
 * publicado automaticamente como DomainEvent aqui -- o fluxo futuro
 * (ConnectorEvent -> validation/normalization -> DomainEvent) não é
 * implementado nesta Foundation. Nenhum Event Bus paralelo é criado --
 * `DomainEvent` continua sendo o único barramento canônico.
 */
export interface ConnectorEvent {
  version: string;
  connectorId: string;
  sourceSystem: string;
  companyId: string;
  projectId?: string;
  eventId: string;
  eventName: string;
  occurredAt: string;
  entity: string;
  payload: Readonly<Record<string, string | number | boolean | null>>;
  provenance: Provenance;
  /**
   * Só preenchido depois que uma normalização futura (fora de escopo)
   * de fato publicar um DomainEvent a partir deste ConnectorEvent --
   * nunca preenchido automaticamente por este contrato. `undefined`
   * significa "ainda não normalizado", nunca "não aplicável".
   */
  normalizedDomainEventId?: DomainEvent["id"];
}

/**
 * Fase 22 — não assume apenas marketing; serve futuramente para
 * sales/financial/operations/commerce/analytics/logistics. Nenhum
 * fetch/HTTP/token real -- contrato apenas.
 */
export interface ConnectorMetric {
  connectorId: string;
  sourceSystem: string;
  companyId: string;
  projectId?: string;
  metricKey: string;
  value: number;
  unit?: string;
  period?: string;
  observedAt: string;
  provenance: Provenance;
  stale?: boolean;
}
