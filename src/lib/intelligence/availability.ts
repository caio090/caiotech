/**
 * Fase 17: SEM IA FALSA. Este é o único módulo que decide se uma ação de IA
 * pode ser habilitada -- toda a UI consulta isAvailable() antes de habilitar
 * um botão, nunca assume disponibilidade.
 */
export type IntelligenceAvailability = "unavailable" | "planned" | "configured" | "degraded" | "available" | "error";

/** Nesta sprint não há nenhuma chamada a OpenAI/Gemini nem import da branch experimental do Assistente -- por isso o valor é sempre "unavailable". */
export const CURRENT_INTELLIGENCE_AVAILABILITY: IntelligenceAvailability = "unavailable";

export function isIntelligenceAvailable(availability: IntelligenceAvailability): boolean {
  return availability === "available";
}

export const INTELLIGENCE_UNAVAILABLE_MESSAGE = "O Assistente LOKAT ainda não está disponível neste ambiente.";
