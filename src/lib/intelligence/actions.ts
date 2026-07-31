import type { IntelligenceAction, IntelligenceRequest, IntelligenceResponse } from "./types";
import { CURRENT_INTELLIGENCE_AVAILABILITY, INTELLIGENCE_UNAVAILABLE_MESSAGE, isIntelligenceAvailable } from "./availability";
import { isActionAllowedForModule } from "./capabilities";

/**
 * Executor de ações de IA. Enquanto CURRENT_INTELLIGENCE_AVAILABILITY não for
 * "available", toda ação retorna a mensagem honesta -- nunca um resultado
 * fingindo geração real (Fase 17).
 */
export function executeIntelligenceAction(request: IntelligenceRequest): IntelligenceResponse {
  if (!isActionAllowedForModule(request.context.moduleId, request.action)) {
    return { action: request.action, summary: `Ação "${request.action}" não é permitida no módulo "${request.context.moduleId}".` };
  }
  if (!isIntelligenceAvailable(CURRENT_INTELLIGENCE_AVAILABILITY)) {
    return { action: request.action, summary: INTELLIGENCE_UNAVAILABLE_MESSAGE };
  }
  // Inalcançável nesta sprint -- availability nunca é "available" aqui.
  return { action: request.action, summary: INTELLIGENCE_UNAVAILABLE_MESSAGE };
}

export const ALL_INTELLIGENCE_ACTIONS: IntelligenceAction[] = ["explain", "help_fill", "interpret", "find_inconsistencies", "suggest_next_step", "generate_questions", "summarize", "compare", "classify"];
