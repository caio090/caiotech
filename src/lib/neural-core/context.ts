/**
 * Sprint Gota Neural Foundation V1 (Fase 3-12) — contratos de contexto.
 * Nenhuma tabela nova: Company reaproveita `clients` (PARTIAL_REUSE, ver
 * docs/architecture/lokat-os-entity-centric-v1.md), Workspace reaproveita
 * `WorkspaceSurface` (src/lib/workspaces/types.ts) e o Event History
 * reaproveita `DomainEvent` (src/lib/domain-events/types.ts, já
 * implementado — a auditoria desta sprint confirmou que um registro de
 * eventos em memória já existe, corrigindo uma afirmação da recalibração
 * anterior de que "nenhum barramento de eventos existe hoje").
 */
import type { WorkspaceSurface } from "@/lib/workspaces/types";
import type { WorkspaceCapability } from "@/config/workspace-capabilities";
import type { DomainEvent } from "@/lib/domain-events/types";
import type { Provenance, NeuralConfidence } from "./provenance";

// ── Workspace / Company / Project — nunca resolvidos módulo a módulo ──────

export interface CanonicalBusinessContext {
  workspaceId: string;
  surface: WorkspaceSurface;
  companyId: string | null;
  userId: string;
  role: string;
  accountType?: string;
  /** true quando a sessão está em Workspace Preview (somente leitura, cookie assinado). */
  preview: boolean;
  readOnly: boolean;
  capabilities: WorkspaceCapability[];
  connections: string[];
  dataQuality: NeuralConfidence;
  provenance: Provenance;
}

/**
 * Company é `PARTIAL_REUSE` de `clients` (nunca uma tabela nova) —
 * este contrato é a camada de leitura/encapsulamento que a arquitetura
 * Entity-Centric propõe, resolvendo por baixo para `clients` sem
 * carregar a nomenclatura histórica de "cliente de agência" para quem
 * consome o contexto.
 */
export interface CompanyContext {
  companyId: string;
  workspaceId: string;
  name: string;
  segment: string | null;
  businessProfileRef?: string;
  diagnosisRef?: string;
  goals: string[];
  audience: string | null;
  productsServices: string[];
  channels: string[];
  brandContextRef?: string;
  dataQuality: NeuralConfidence;
  capabilities: WorkspaceCapability[];
  connections: string[];
  sources: Provenance[];
}

export interface ProjectContext {
  projectId: string;
  companyId: string;
  name: string;
  objective: string | null;
  status: "not_started" | "in_progress" | "blocked" | "completed" | "cancelled";
  stage: string | null;
  scope: string | null;
  desiredOutcome: string | null;
  deliverables: string[];
  workItemRefs: string[];
  moduleRefs: string[];
  connectionRefs: string[];
  metricRefs: string[];
  sourceRefs: Provenance[];
}

// ── Company / Project / Campaign — decisão arquitetural preservada ────────
// (docs/product/lokat-os-activation-v1.md §7 — não redesenhada nesta sprint)

export interface Campaign {
  campaignId: string;
  companyId: string; // required
  projectId?: string; // optional — Company -> Campaign e Company -> Project -> Campaign são válidos
  name: string;
  objective: string | null;
  status: "draft" | "active" | "paused" | "completed" | "cancelled";
  sourceRefs: Provenance[];
}

export type InitiativeType =
  | "project"
  | "campaign"
  | "operational_improvement"
  | "content_action"
  | "commercial_action"
  | "internal_initiative";

export interface InitiativeContext {
  type: InitiativeType;
  title: string;
  objective: string | null;
  companyId: string;
  projectId?: string;
  campaignId?: string;
  desiredOutcome: string | null;
  /** Pistas de domínio (ex.: ["content", "crm"]) -- nunca hardcoded a partir de uma frase específica. */
  domainHints: string[];
  sourceRefs: Provenance[];
}

// ── Living Business Context (Fase 10-12) ──────────────────────────────────
// Seis grupos conceituais, nunca persistidos nesta sprint.

export interface ConfirmedFact {
  key: string;
  value: string;
  source: Provenance;
  verified: true;
  verifiedAt?: string;
  confidence?: NeuralConfidence;
  observedAt?: string;
}

export type DerivedKnowledgeKind = "insight" | "opportunity" | "risk" | "gap" | "blocker" | "hypothesis";

/** Nunca vira ConfirmedFact automaticamente -- exige confirmação explícita do usuário para isso (ver activation.ts). */
export interface DerivedKnowledge {
  kind: DerivedKnowledgeKind;
  summary: string;
  companyId: string;
  projectId?: string;
  provenance: Provenance; // sempre obrigatória -- nunca "achismo" sem origem
  confidence: NeuralConfidence;
}

/** Transitório -- nunca vira BusinessMemory sozinho (ver memory.ts, "Conversation is not Memory"). */
export interface ConversationContext {
  turnId: string;
  companyId: string;
  currentQuestion: string;
  occurredAt: string;
}

/** Projeção sobre DomainEvent já existente -- nunca uma segunda taxonomia de eventos. */
export interface EventHistoryEntry {
  event: DomainEvent;
  relevantToCompanyId: string;
}

export interface DocumentReference {
  documentId: string;
  companyId: string;
  kind: "pdf" | "docx" | "txt" | "markdown" | "other";
  label: string;
  provenance: Provenance;
}

/** Dados vindos de um Connector (ver lkt.ts para ConnectorSource) -- nunca tratados como fato atual sem checar staleness. */
export interface IntegrationDataEntry {
  connectorId: string;
  companyId: string;
  capability: string;
  observedAt: string;
  provenance: Provenance;
}

export interface LivingBusinessContext {
  companyId: string;
  confirmedFacts: ConfirmedFact[];
  derivedKnowledge: DerivedKnowledge[];
  conversationContext: ConversationContext[];
  eventHistory: EventHistoryEntry[];
  documentReferences: DocumentReference[];
  integrationData: IntegrationDataEntry[];
}
