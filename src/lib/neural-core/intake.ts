/**
 * Sprint Gota Neural Foundation V1 (Fase 15-20) — Context Intake.
 * Discriminated union por `type`; nenhum upload real, nenhum
 * speech-to-text, nenhuma conexão com LLM nesta sprint.
 */
import type { Provenance } from "./provenance";

interface ContextIntakeBase {
  companyId: string;
  workspaceId: string;
  projectId?: string;
  source: string;
  createdAt: string;
}

export interface TextIntake extends ContextIntakeBase {
  type: "text";
  payload: { content: string };
}

/** Fase 16 — só o contrato; nenhum microfone, upload ou provider de speech-to-text implementado. */
export interface AudioIntake extends ContextIntakeBase {
  type: "audio";
  payload: { reference: string; durationSeconds?: number };
}

/** Fase 17 — só o contrato; nenhum parser implementado. */
export interface DocumentIntake extends ContextIntakeBase {
  type: "document";
  payload: { reference: string; kind: "pdf" | "docx" | "txt" | "markdown" | "other" };
}

/**
 * Fase 18 — o usuário já elaborou contexto numa IA externa (qualquer
 * uma — nunca um enum fechado tipo chatgpt|claude|gemini, porque
 * qualquer IA deve poder ser usada) e cola o resultado aqui. O LOKAT OS
 * nunca se conecta diretamente ao provider externo.
 */
export interface ExternalAIImportIntake extends ContextIntakeBase {
  type: "external_ai_import";
  payload: {
    providerLabel?: string;
    conversationLabel?: string;
    content: string;
  };
}

export interface FormIntake extends ContextIntakeBase {
  type: "form";
  payload: Readonly<Record<string, string>>;
}

export interface DomainEventIntake extends ContextIntakeBase {
  type: "domain_event";
  payload: { domainEventId: string };
}

export interface ConnectorEventIntake extends ContextIntakeBase {
  type: "connector_event";
  payload: { connectorId: string; eventId: string };
}

export type ContextIntake =
  | TextIntake
  | AudioIntake
  | DocumentIntake
  | ExternalAIImportIntake
  | FormIntake
  | DomainEventIntake
  | ConnectorEventIntake;

/**
 * Fase 18 — toda informação vinda de External AI Import nasce
 * `verified: false`; nunca vira ConfirmedFact automaticamente (mesma
 * regra de Document Import). Só a confirmação explícita do usuário
 * (ver activation.ts, USER_CONFIRMATION) promove isso a fato confirmado.
 */
export function provenanceForExternalAIImport(intake: ExternalAIImportIntake): Provenance {
  return {
    sourceType: "external_ai_import",
    sourceLabel: intake.payload.providerLabel,
    observedAt: intake.createdAt,
    verified: false,
  };
}

export function provenanceForDocumentIntake(intake: DocumentIntake): Provenance {
  return {
    sourceType: "document",
    sourceId: intake.payload.reference,
    observedAt: intake.createdAt,
    verified: false,
  };
}

/**
 * Fase 19 — campos mínimos que o futuro "Copy Context Prompt" deve
 * orientar a IA externa a preencher. Não é o texto final do prompt
 * (não definido nesta sprint) -- é o contrato de dados esperado de
 * volta. Nunca inclui secrets.
 */
export const COPY_CONTEXT_PROMPT_FIELDS = [
  "overview", "history", "segment", "productsServices", "audience", "positioning",
  "goals", "problemsGaps", "channels", "social", "team", "tools", "processes",
  "commercial", "customerService", "marketing", "projects", "campaigns",
  "metrics", "importantDates", "decisions", "unknowns",
] as const;

export type CopyContextPromptField = (typeof COPY_CONTEXT_PROMPT_FIELDS)[number];

export type CopyContextPromptResult = Partial<Record<CopyContextPromptField, string>>;

/**
 * Fase 20 — resultado conceitual de uma interpretação futura de
 * Context Intake. Nenhuma LLM nesta sprint -- este é só o shape que uma
 * interpretação (humana ou futura IA) preencheria.
 */
export interface ContextExtractionResult {
  companyId: string;
  facts: string[];
  unknowns: string[];
  goals: string[];
  problems: string[];
  opportunities: string[];
  risks: string[];
  people: string[];
  dates: string[];
  projects: string[];
  campaigns: string[];
  deliverables: string[];
  tools: string[];
  connections: string[];
  metrics: string[];
  provenance: Provenance;
}
