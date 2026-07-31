/**
 * Contratos para o Assistente LOKAT contextual (Fase 16). Nenhum destes
 * tipos implica uma IA funcional -- ver availability.ts para o único ponto
 * que decide se uma ação pode ser habilitada.
 */

export type IntelligenceAction = "explain" | "help_fill" | "interpret" | "find_inconsistencies" | "suggest_next_step" | "generate_questions" | "summarize" | "compare" | "classify";

export interface IntelligenceContext {
  moduleId: string;
  surface: string;
  fieldId?: string;
  recordId?: string;
  locale: "pt-BR";
}

export interface IntelligenceRequest {
  action: IntelligenceAction;
  context: IntelligenceContext;
  input?: Record<string, unknown>;
}

export interface IntelligenceProposedUpdate {
  fieldId: string;
  currentValue: unknown;
  proposedValue: unknown;
  rationale: string;
}

export interface IntelligenceQuestion {
  id: string;
  text: string;
}

export interface IntelligenceResponse {
  action: IntelligenceAction;
  summary: string;
  proposedUpdates?: IntelligenceProposedUpdate[];
  questions?: IntelligenceQuestion[];
}

export interface IntelligenceCapability {
  action: IntelligenceAction;
  moduleId: string;
  enabled: boolean;
}

export interface IntelligenceRecommendation {
  id: string;
  moduleId: string;
  title: string;
  rationale: string;
  suggestedAction: IntelligenceAction;
}
