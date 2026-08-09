/**
 * Sprint Gota Neural Foundation V1 (Fase 21-24) — contratos de
 * Activation. Nenhuma página, nenhuma UI. Fluxo completo já formalizado
 * em docs/product/lokat-os-activation-v1.md; aqui só o tipo.
 */
import type { Provenance } from "./provenance";
import type { InitiativeType } from "./context";

export type CompanyActivationStep =
  | "WELCOME"
  | "CONTEXT_INTAKE"
  | "FACT_EXTRACTION"
  | "UNKNOWN_REVIEW"
  | "USER_CONFIRMATION"
  | "INITIAL_DIAGNOSIS"
  | "DIRECTION"
  | "INITIATIVE_SUGGESTION"
  | "CONNECTION_SUGGESTION"
  | "OPERATIONAL_ENTRY";

export type CompanyActivationStatus =
  | "not_started"
  | "in_progress"
  | "awaiting_confirmation"
  | "completed"
  | "skipped_when_applicable"; // Direct Business com contexto já adquirido no signup, ver Fase 33 da recalibração anterior

export interface CompanyActivationState {
  companyId: string;
  status: CompanyActivationStatus;
  currentStep: CompanyActivationStep;
  completedSteps: CompanyActivationStep[];
  startedAt?: string;
  completedAt?: string;
}

export type ProjectActivationStep =
  | "SELECT_COMPANY"
  | "DESCRIBE_INITIATIVE"
  | "INTERPRET_OBJECTIVE"
  | "CLASSIFY_INITIATIVE"
  | "DEFINE_SCOPE"
  | "DEFINE_DELIVERABLES"
  | "IDENTIFY_MODULES"
  | "IDENTIFY_CONNECTIONS"
  | "GENERATE_WORK_PLAN";

/**
 * Fase 24 — tudo aqui é DRAFT. Nada persistido; um resultado real de
 * Project Activation (fora de escopo) decidiria o que criar de fato.
 */
export interface ProjectActivationResult {
  companyId: string;
  initiativeType: InitiativeType;
  projectDraft?: { name: string; objective: string | null };
  campaignDraft?: { name: string; objective: string | null };
  deliverableDrafts: string[];
  moduleRecommendations: string[];
  connectionRecommendations: string[];
  workItemDrafts: string[];
  measurementSuggestions: string[];
  sourceRefs: Provenance[];
}
