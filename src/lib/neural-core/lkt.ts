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
import type { Capability } from "./capabilities";
import type { Provenance } from "./provenance";

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
