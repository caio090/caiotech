/**
 * Classifies products into the 4-quadrant performance matrix (sales × margin)
 * and attaches a deterministic, rule-based recommendation. No hidden
 * thresholds: the criterion actually used (a configured goal, or the median
 * of the same category) is always returned alongside the classification.
 */

import type { PerformanceQuadrant, ProductRecommendation } from "./business-types";
import type { FinancialConfidence } from "./types";

export interface ProductPerformanceInput {
  productId: string;
  productName: string;
  category: string;
  unitsSold: number;
  contributionMarginPct: number | null;
}

export interface ProductPerformanceResult {
  productId: string;
  quadrant: PerformanceQuadrant | null;
  salesCriterionLabel: string;
  marginCriterionLabel: string;
  categoryMixedWarning: boolean;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function classifyProductPerformance(
  products: ProductPerformanceInput[],
  goals: { salesGoal?: number; marginGoal?: number }
): ProductPerformanceResult[] {
  const categories = Array.from(new Set(products.map((p) => p.category || "Sem categoria")));
  const categoryMixedWarning = categories.length > 1 && (goals.salesGoal === undefined || goals.marginGoal === undefined);

  const salesByCategory = new Map<string, number | null>();
  const marginByCategory = new Map<string, number | null>();
  for (const category of categories) {
    const inCategory = products.filter((p) => (p.category || "Sem categoria") === category);
    salesByCategory.set(category, median(inCategory.map((p) => p.unitsSold)));
    marginByCategory.set(category, median(inCategory.map((p) => p.contributionMarginPct).filter((v): v is number => v !== null)));
  }

  return products.map((p) => {
    const category = p.category || "Sem categoria";
    const salesThreshold = goals.salesGoal ?? salesByCategory.get(category) ?? null;
    const marginThreshold = goals.marginGoal ?? marginByCategory.get(category) ?? null;

    const salesCriterionLabel = goals.salesGoal !== undefined
      ? `Meta configurada de ${goals.salesGoal} unidades`
      : salesThreshold !== null
        ? `Mediana da categoria "${category}" (${salesThreshold.toFixed(0)} unidades)`
        : "Sem critério disponível";
    const marginCriterionLabel = goals.marginGoal !== undefined
      ? `Meta configurada de ${(goals.marginGoal * 100).toFixed(1)}% de margem`
      : marginThreshold !== null
        ? `Mediana da categoria "${category}" (${(marginThreshold * 100).toFixed(1)}% de margem)`
        : "Sem critério disponível";

    if (salesThreshold === null || marginThreshold === null || p.contributionMarginPct === null) {
      return { productId: p.productId, quadrant: null, salesCriterionLabel, marginCriterionLabel, categoryMixedWarning };
    }

    const highSales = p.unitsSold >= salesThreshold;
    const highMargin = p.contributionMarginPct >= marginThreshold;
    const quadrant: PerformanceQuadrant =
      highSales && highMargin ? "alta_venda_alta_margem" :
      highSales && !highMargin ? "alta_venda_baixa_margem" :
      !highSales && highMargin ? "baixa_venda_alta_margem" :
      "baixa_venda_baixa_margem";

    return { productId: p.productId, quadrant, salesCriterionLabel, marginCriterionLabel, categoryMixedWarning };
  });
}

const QUADRANT_ACTIONS: Record<PerformanceQuadrant, string[]> = {
  alta_venda_alta_margem: ["Manter", "Proteger disponibilidade", "Expandir", "Aumentar divulgação"],
  alta_venda_baixa_margem: ["Revisar preço", "Reduzir custo", "Rever porção", "Rever comissão", "Rever desconto"],
  baixa_venda_alta_margem: ["Aumentar visibilidade", "Reposicionar", "Criar combo", "Testar outro canal"],
  baixa_venda_baixa_margem: ["Reformular", "Reduzir complexidade", "Tornar sazonal", "Retirar"],
};

export function buildProductRecommendation(
  productId: string,
  quadrant: PerformanceQuadrant | null,
  confidence: FinancialConfidence,
  salesCriterionLabel: string,
  marginCriterionLabel: string
): ProductRecommendation | null {
  if (!quadrant) return null;
  return {
    productId,
    quadrant,
    actions: QUADRANT_ACTIONS[quadrant],
    dataUsed: `Volume de vendas e margem de contribuição do produto no período.`,
    confidence,
    ruleApplied: `Vendas: ${salesCriterionLabel}. Margem: ${marginCriterionLabel}.`,
    limitations: "Classificação baseada em regras fixas de comparação — não considera sazonalidade nem tendência recente.",
  };
}
