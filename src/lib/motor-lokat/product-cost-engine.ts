/**
 * Per-unit product/service cost engineering — reuses the same classification
 * rules as the business-wide financial engine (classifyCostVsGoal /
 * classifyMarginVsGoal), just applied to a single product's price instead of
 * total revenue. No formula is duplicated.
 */

import { safeDivide } from "./money";
import { classifyCostVsGoal, classifyMarginVsGoal, combineConfidence } from "./financial-engine";
import type { ProductCostInput, ProductCostResult, ProductKind } from "./business-types";
import type { FinancialDataSource } from "./types";

/** Same math for both kinds — only the displayed formula wording changes (product vs. service vocabulary). */
const PRODUCT_FORMULA = "Custo direto = componentes + embalagem + entrega + taxas + perda esperada. Margem de contribuição unitária = preço − custo direto − (taxa + comissão + desconto + imposto sobre o preço).";
const SERVICE_FORMULA = "CSV = mão de obra + materiais + ferramentas + deslocamento + terceirização + retrabalho esperado. Margem de contribuição unitária = preço − CSV − (taxa + comissão + desconto + imposto sobre o preço).";

export function calculateProductCost(
  input: ProductCostInput,
  salesPrice: number,
  kind: ProductKind = "produto",
  goals?: { directCostPctGoal?: number; contributionMarginPctGoal?: number }
): ProductCostResult {
  const { components, packagingCost, feePct, commissionPct, discountPct, deliveryCost, taxPct, expectedLossPct } = input;

  const componentsCost = components.reduce((sum, c) => sum + c.quantity * c.unitCost, 0);
  const lossCost = Math.round(componentsCost * expectedLossPct);
  const directCost = componentsCost + packagingCost + deliveryCost + lossCost;

  const variableCostFromPct = Math.round(salesPrice * (feePct + commissionPct + discountPct + taxPct));

  const contributionMarginUnit = salesPrice - directCost - variableCostFromPct;

  const directCostPct = safeDivide(directCost, salesPrice);
  const contributionMarginPct = safeDivide(contributionMarginUnit, salesPrice);

  const missingInputs: string[] = [];
  if (salesPrice <= 0) missingInputs.push("Preço de venda");
  if (components.length === 0) missingInputs.push("Componentes de custo");

  const sources: FinancialDataSource[] = [
    salesPrice > 0 ? "manual" : "missing",
    components.length > 0 ? "manual" : "missing",
  ];
  const confidence = combineConfidence(sources);

  let status: ProductCostResult["status"] = "sem_meta";
  let statusReason = "Nenhuma meta configurada para este produto — compare com a meta geral de margem em Metas de Vendas.";

  if (goals?.contributionMarginPctGoal !== undefined && contributionMarginPct !== null) {
    const marginClass = classifyMarginVsGoal(contributionMarginPct, goals.contributionMarginPctGoal);
    status = marginClass.status ?? "sem_meta";
    statusReason = marginClass.reason;
  } else if (goals?.directCostPctGoal !== undefined && directCostPct !== null) {
    const costClass = classifyCostVsGoal(directCostPct, goals.directCostPctGoal);
    status = costClass.status ?? "sem_meta";
    statusReason = costClass.reason;
  }

  return {
    directCost,
    directCostPct,
    contributionMarginUnit,
    contributionMarginPct,
    formula: kind === "servico" ? SERVICE_FORMULA : PRODUCT_FORMULA,
    confidence,
    missingInputs,
    status,
    statusReason,
  };
}
