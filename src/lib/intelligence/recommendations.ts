import type { IntelligenceRecommendation } from "./types";

/** Fixtures demonstrativas -- recomendações reais dependeriam de availability === "available" (nunca nesta sprint). */
export const DEMO_INTELLIGENCE_RECOMMENDATIONS: IntelligenceRecommendation[] = [
  { id: "rec_001", moduleId: "meu_negocio", title: "Revisar produtos com margem abaixo de 10%", rationale: "Exemplo demonstrativo -- nenhum dado real analisado.", suggestedAction: "find_inconsistencies" },
];

export function findRecommendationsForModule(moduleId: string): IntelligenceRecommendation[] {
  return DEMO_INTELLIGENCE_RECOMMENDATIONS.filter((recommendation) => recommendation.moduleId === moduleId);
}
