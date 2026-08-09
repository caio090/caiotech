/**
 * Sprint Gota Neural Foundation V1 (Fase 44-46) — Structured Response
 * Blocks. Discriminated union por `type` -- nunca um JSON genérico sem
 * schema (Fase 11 do brief anterior).
 */
import type { Provenance, NeuralConfidence } from "./provenance";
import type { AgentDomain } from "./agents";

export type ResponseBlockType =
  | "insight" | "diagnosis" | "priority" | "strategy" | "project" | "campaign"
  | "content" | "crm" | "traffic" | "financial" | "task" | "approval"
  | "connection" | "metric" | "document" | "warning";

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

export interface ResponseBlock {
  id: string;
  type: ResponseBlockType;
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
}
