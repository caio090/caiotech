/**
 * Sprint Gota Neural Foundation V1 (Fase 44-46) — Structured Response
 * Blocks. Discriminated union por `type` -- nunca um JSON genérico sem
 * schema (Fase 11 do brief anterior).
 *
 * V1.1 (Fase 40-45 da correção CODEX WEB, P2 #6): a V1 tinha uma única
 * interface `ResponseBlock` com `type: ResponseBlockType` -- isso NÃO é
 * uma discriminated union real (TypeScript não consegue fazer narrowing
 * de payload por `type` porque só existe um shape). Corrigido aqui com
 * uma interface por tipo e uma union real, permitindo
 * `switch (block.type)` com acesso tipado ao `payload` de cada block.
 */
import type { Provenance, NeuralConfidence } from "./provenance";
import type { AgentDomain } from "./agents";
import type { Capability } from "./capabilities";
import type { NeuralVisibilityPolicy } from "./visibility";

export type ResponseBlockType =
  | "insight" | "diagnosis" | "priority" | "strategy" | "project" | "campaign"
  | "content" | "crm" | "traffic" | "financial" | "task" | "approval"
  | "connection" | "metric" | "document" | "warning";

/** Fonte única dos 16 tipos conhecidos -- evita hardcode duplicado em testes/consumidores. */
export const RESPONSE_BLOCK_TYPES: readonly ResponseBlockType[] = [
  "insight", "diagnosis", "priority", "strategy", "project", "campaign",
  "content", "crm", "traffic", "financial", "task", "approval",
  "connection", "metric", "document", "warning",
] as const;

export type ResponseBlockStatus =
  | "informational" | "suggested" | "draft" | "awaiting_confirmation" | "confirmed" | "unavailable";

/** Fase 12 (brief anterior) — ação vinculada a um block; nunca executa mutation real nesta sprint. */
export interface ResponseBlockAction {
  id: string;
  type: "open_module" | "create_draft" | "connect_integration" | "review" | "confirm_action";
  label: string;
  targetModule?: string;
  requiredCapability?: string;
  confirmationRequired: boolean;
  draftRef?: string;
}

/** Fase 41 — campos comuns a todo ResponseBlock, independente do `type`. */
export interface BaseResponseBlock {
  id: string;
  title: string;
  summary: string;
  companyId: string;
  projectId?: string;
  module?: string;
  agentId?: AgentDomain;
  sourceRefs: Provenance[];
  confidence?: NeuralConfidence;
  actions: ResponseBlockAction[];
  status: ResponseBlockStatus;
  /** Fase 16 — quando ausente, resolve para o default restritivo (ver visibility.ts). */
  visibility?: NeuralVisibilityPolicy;
}

/**
 * Fase 42/43 — payloads tipados por categoria quando semanticamente
 * fizer sentido; nunca `Record<string, unknown>` genérico para tudo, e
 * nunca dados de domínio inventados além do necessário para o narrowing
 * funcionar.
 */
export interface InsightResponseBlock extends BaseResponseBlock {
  type: "insight";
  payload?: { observation: string };
}

export interface DiagnosisResponseBlock extends BaseResponseBlock {
  type: "diagnosis";
  payload?: { finding: string; rootCauseRef?: string };
}

export interface PriorityResponseBlock extends BaseResponseBlock {
  type: "priority";
  payload?: { signal: string; rank?: number };
}

export interface StrategyResponseBlock extends BaseResponseBlock {
  type: "strategy";
  payload?: { objectiveRef?: string; recommendation: string };
}

export interface ProjectResponseBlock extends BaseResponseBlock {
  type: "project";
  payload?: { projectRef: string; status?: string };
}

export interface CampaignResponseBlock extends BaseResponseBlock {
  type: "campaign";
  payload?: { campaignRef: string; objective?: string | null };
}

export interface ContentResponseBlock extends BaseResponseBlock {
  type: "content";
  payload?: { contentRef: string; stage?: string };
}

export interface CrmResponseBlock extends BaseResponseBlock {
  type: "crm";
  payload?: { leadRef?: string; pipelineStage?: string };
}

export interface TrafficResponseBlock extends BaseResponseBlock {
  type: "traffic";
  payload?: { channel?: string; metricKey?: string; value?: number };
}

export interface FinancialResponseBlock extends BaseResponseBlock {
  type: "financial";
  payload?: { metricKey?: string; value?: number; unit?: string };
}

export interface TaskResponseBlock extends BaseResponseBlock {
  type: "task";
  payload?: { workItemDraftRef: string };
}

export interface ApprovalResponseBlock extends BaseResponseBlock {
  type: "approval";
  payload?: { approvalRef: string; approvalStatus?: string };
}

/** Payload de conexão: refs de connection/integration/capability -- nunca token/credential. */
export interface ConnectionResponseBlock extends BaseResponseBlock {
  type: "connection";
  payload?: { connectionId?: string; integrationId?: string; capability?: Capability };
}

export interface MetricResponseBlock extends BaseResponseBlock {
  type: "metric";
  payload?: { metricKey: string; value: number; unit?: string };
}

export interface DocumentResponseBlock extends BaseResponseBlock {
  type: "document";
  payload?: { documentId: string };
}

export interface WarningResponseBlock extends BaseResponseBlock {
  type: "warning";
  payload?: { severity: "low" | "medium" | "high"; reason: string };
}

/** Fase 44 — union real: `switch (block.type)` faz narrowing de `payload` corretamente. */
export type ResponseBlock =
  | InsightResponseBlock
  | DiagnosisResponseBlock
  | PriorityResponseBlock
  | StrategyResponseBlock
  | ProjectResponseBlock
  | CampaignResponseBlock
  | ContentResponseBlock
  | CrmResponseBlock
  | TrafficResponseBlock
  | FinancialResponseBlock
  | TaskResponseBlock
  | ApprovalResponseBlock
  | ConnectionResponseBlock
  | MetricResponseBlock
  | DocumentResponseBlock
  | WarningResponseBlock;
