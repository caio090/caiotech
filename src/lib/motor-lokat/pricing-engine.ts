/**
 * Pricing calculator — markup-on-price methodology (a chosen methodology,
 * not "the" formula: Preço = Custo ÷ [1 − (fixas% + variáveis% + margem%)]).
 */

import type { PricingInput, PricingResult } from "./types";

export function calculatePricing(input: PricingInput): PricingResult {
  const { productCost, fixedExpensesPct, variableExpensesPct, desiredMarginPct, currentPrice } = input;

  const totalPct = fixedExpensesPct + variableExpensesPct + desiredMarginPct;

  if (productCost <= 0) {
    return {
      valid: false,
      error: "Informe o custo do produto ou serviço para calcular o preço.",
      minimumPrice: 0,
      composition: { productCost: 0, fixedExpensesAmount: 0, variableExpensesAmount: 0, marginAmount: 0 },
    };
  }

  if (!Number.isFinite(totalPct) || totalPct >= 1 || totalPct < 0) {
    return {
      valid: false,
      error: "A soma de gastos fixos, gastos variáveis e margem desejada precisa ser menor que 100%.",
      minimumPrice: 0,
      composition: { productCost: 0, fixedExpensesAmount: 0, variableExpensesAmount: 0, marginAmount: 0 },
    };
  }

  const minimumPrice = Math.round(productCost / (1 - totalPct));

  const fixedExpensesAmount = Math.round(minimumPrice * fixedExpensesPct);
  const variableExpensesAmount = Math.round(minimumPrice * variableExpensesPct);
  const marginAmount = minimumPrice - productCost - fixedExpensesAmount - variableExpensesAmount;

  const result: PricingResult = {
    valid: true,
    minimumPrice,
    composition: { productCost, fixedExpensesAmount, variableExpensesAmount, marginAmount },
  };

  if (typeof currentPrice === "number" && currentPrice > 0) {
    result.differenceFromCurrent = currentPrice - minimumPrice;
    result.belowMinimum = currentPrice < minimumPrice;
  }

  return result;
}
