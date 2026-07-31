import type { ProductOpportunity, ProductPainPoint, ProductResearchEntry } from "./types";

/**
 * Fase 6: contratos para uma futura IA de análise do Radar de Produto. A
 * implementação atual é "deterministic_stub" -- agrupamento e ranking por
 * regras simples e explícitas (contagem, correspondência de string), nunca
 * geração de texto nem chamada a um modelo. Isso não é um placeholder de UI:
 * é o comportamento real e definitivo enquanto availability !== "available"
 * em src/lib/intelligence/availability.ts.
 */
export type ProductResearchAnalyzerAvailability = "deterministic_stub" | "unavailable";

export interface ProductResearchAnalyzer {
  readonly availability: ProductResearchAnalyzerAvailability;
  clusterPainPoints(entries: ProductResearchEntry[]): ProductPainPoint[];
  detectRepeatedProblems(entries: ProductResearchEntry[]): Array<{ segment: string; count: number; entryIds: string[] }>;
  rankOpportunities(opportunities: ProductOpportunity[]): ProductOpportunity[];
  suggestFollowUpQuestions(entry: ProductResearchEntry): string[];
  buildWeeklySummary(entries: ProductResearchEntry[]): string;
}

const SEVERITY_WEIGHT: Record<ProductOpportunity["estimatedImpact"], number> = { low: 1, medium: 2, high: 3, critical: 4 };

/** Agrupa entradas cujo primeiro módulo afetado coincide -- regra literal, sem inferência semântica. */
function clusterPainPoints(entries: ProductResearchEntry[]): ProductPainPoint[] {
  const byModule = new Map<string, ProductResearchEntry[]>();
  for (const entry of entries) {
    const key = entry.affectedModules[0] ?? "unclassified";
    byModule.set(key, [...(byModule.get(key) ?? []), entry]);
  }
  return Array.from(byModule.entries()).map(([moduleId, groupEntries]) => ({
    id: `stub_pp_${moduleId}`,
    entryIds: groupEntries.map((entry) => entry.id),
    summary: `${groupEntries.length} relato(s) afetando ${moduleId}`,
    affectedModules: [moduleId],
    occurrenceCount: groupEntries.length,
    segments: Array.from(new Set(groupEntries.map((entry) => entry.businessSegment))),
  }));
}

function detectRepeatedProblems(entries: ProductResearchEntry[]) {
  const bySegment = new Map<string, ProductResearchEntry[]>();
  for (const entry of entries) bySegment.set(entry.businessSegment, [...(bySegment.get(entry.businessSegment) ?? []), entry]);
  return Array.from(bySegment.entries())
    .filter(([, group]) => group.length > 1)
    .map(([segment, group]) => ({ segment, count: group.length, entryIds: group.map((entry) => entry.id) }));
}

function rankOpportunities(opportunities: ProductOpportunity[]): ProductOpportunity[] {
  return [...opportunities].sort((a, b) => SEVERITY_WEIGHT[b.estimatedImpact] - SEVERITY_WEIGHT[a.estimatedImpact]);
}

/** Perguntas fixas por severidade -- não gera perguntas novas, apenas seleciona de um roteiro determinístico. */
function suggestFollowUpQuestions(entry: ProductResearchEntry): string[] {
  const base = ["Com que frequência isso acontece hoje?", "O que você faz atualmente para contornar isso?"];
  if (entry.severity === "high" || entry.severity === "critical") base.push("Quanto isso já custou (tempo ou dinheiro) no último mês?");
  if (entry.affectedModules.length > 1) base.push(`Isso também afeta ${entry.affectedModules.slice(1).join(", ")}, ou só ${entry.affectedModules[0]}?`);
  return base;
}

function buildWeeklySummary(entries: ProductResearchEntry[]): string {
  const bySeverity: Record<string, number> = {};
  for (const entry of entries) bySeverity[entry.severity] = (bySeverity[entry.severity] ?? 0) + 1;
  const parts = Object.entries(bySeverity).map(([severity, count]) => `${count} ${severity}`);
  return `${entries.length} relato(s) na semana (${parts.join(", ") || "nenhum"}).`;
}

export const DETERMINISTIC_PRODUCT_RESEARCH_ANALYZER: ProductResearchAnalyzer = {
  availability: "deterministic_stub",
  clusterPainPoints,
  detectRepeatedProblems,
  rankOpportunities,
  suggestFollowUpQuestions,
  buildWeeklySummary,
};

export const UNAVAILABLE_PRODUCT_RESEARCH_ANALYZER: ProductResearchAnalyzer = {
  availability: "unavailable",
  clusterPainPoints: () => [],
  detectRepeatedProblems: () => [],
  rankOpportunities: (opportunities) => opportunities,
  suggestFollowUpQuestions: () => [],
  buildWeeklySummary: () => "Análise indisponível neste ambiente.",
};
