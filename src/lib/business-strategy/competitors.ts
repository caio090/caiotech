import type { CompetitorComparison, CompetitorGap, CompetitorGapType, CompetitorProfile } from "./types";

/**
 * Regras determinísticas de gaps/oportunidades (Fase 22). Nunca infere
 * causalidade sem dado — cada gap só existe porque uma comparação explícita
 * (preenchida por uma pessoa, nunca calculada por IA nesta sprint) disse
 * "stronger", ou porque nenhuma comparação existe para uma dimensão.
 */
const CONVENIENCE_DIMENSIONS = new Set(["entrega", "facilidade_de_compra", "atendimento", "velocidade"]);
const COMMUNICATION_DIMENSIONS = new Set(["presenca_digital", "conteudo"]);
const OPERATIONAL_DIMENSIONS = new Set(["localizacao", "capacidade_operacional"]);

function classifyGapType(dimension: string, competitorType: CompetitorProfile["type"]): CompetitorGapType {
  if (dimension === "preco") return "concorrente_forte_em_preco";
  if (CONVENIENCE_DIMENSIONS.has(dimension)) return "concorrente_forte_em_conveniencia";
  if (COMMUNICATION_DIMENSIONS.has(dimension)) return "lacuna_de_comunicacao";
  if (OPERATIONAL_DIMENSIONS.has(dimension)) return "benchmark_operacional";
  if (dimension === "posicionamento") return "oportunidade_de_posicionamento";
  if (competitorType === "substitute") return "risco_de_substituicao";
  return "atributo_nao_explorado";
}

export function findCompetitorGaps(comparisons: CompetitorComparison[], competitors: CompetitorProfile[]): CompetitorGap[] {
  const competitorById = new Map(competitors.map((c) => [c.id, c]));
  const gaps: CompetitorGap[] = [];

  const dimensionSeen = new Map<string, number>();
  const dimensionUnknown = new Map<string, number>();

  for (const comparison of comparisons) {
    const competitor = competitorById.get(comparison.competitorId);
    if (!competitor) continue;

    for (const entry of comparison.entries) {
      dimensionSeen.set(entry.dimension, (dimensionSeen.get(entry.dimension) ?? 0) + 1);
      if (entry.value === "unknown") dimensionUnknown.set(entry.dimension, (dimensionUnknown.get(entry.dimension) ?? 0) + 1);

      if (entry.value === "stronger") {
        gaps.push({
          id: `gap-${competitor.id}-${entry.dimension}`,
          type: classifyGapType(entry.dimension, competitor.type),
          competitorId: competitor.id,
          dimension: entry.dimension,
          evidence: entry.evidence,
          whyItMatters: `${competitor.name || "Este concorrente"} está mais forte em ${entry.dimension} segundo a evidência registrada.`,
          impact: "medium",
          confidence: competitor.confidence,
          nextQuestion: `O que explica ${competitor.name || "este concorrente"} ser mais forte em ${entry.dimension}?`,
          nextAction: "Registrar uma ação para investigar ou responder a este ponto.",
        });
      }

      if (competitor.status === "outdated") {
        gaps.push({
          id: `gap-${competitor.id}-${entry.dimension}-outdated`,
          type: "dado_desatualizado",
          competitorId: competitor.id,
          dimension: entry.dimension,
          evidence: entry.evidence,
          whyItMatters: `A observação sobre ${competitor.name || "este concorrente"} está marcada como desatualizada.`,
          impact: "low",
          confidence: "divergent",
          nextQuestion: `Quando foi a última vez que ${competitor.name || "este concorrente"} foi observado?`,
          nextAction: "Atualizar a observação antes de usá-la em uma decisão.",
        });
      }
    }
  }

  for (const [dimension, seenCount] of dimensionSeen) {
    const unknownCount = dimensionUnknown.get(dimension) ?? 0;
    if (seenCount > 0 && unknownCount === seenCount) {
      gaps.push({
        id: `gap-informacao-insuficiente-${dimension}`,
        type: "informacao_insuficiente",
        competitorId: "",
        dimension: dimension as CompetitorGap["dimension"],
        evidence: "",
        whyItMatters: `Nenhum concorrente tem informação registrada sobre ${dimension} ainda.`,
        impact: "low",
        confidence: "unknown",
        nextQuestion: `O que sabemos sobre a concorrência em ${dimension}?`,
        nextAction: "Registrar uma observação com evidência antes de tirar conclusões.",
      });
    }
  }

  return gaps;
}
