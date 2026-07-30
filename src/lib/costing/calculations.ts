import type { TechnicalSheet } from "./types";

// ── Ficha técnica — perda de limpeza vs. perda de cocção (nunca misturadas) ──

/** Fator de correção = peso bruto ÷ peso líquido (perda de limpeza). */
export function calculateCorrectionFactor(grossWeight: number, netWeight: number): number | null {
  if (netWeight <= 0) return null;
  return grossWeight / netWeight;
}

/** Custo utilizável = valor comprado ÷ quantidade líquida utilizável. */
export function calculateUsableUnitCost(purchaseValue: number, netUsableQuantity: number): number | null {
  if (netUsableQuantity <= 0) return null;
  return purchaseValue / netUsableQuantity;
}

/** Rendimento de cocção = peso após preparo ÷ peso antes do preparo (perda de cocção, sobre o peso já líquido). */
export function calculateCookingYield(weightAfterPreparation: number, weightBeforePreparation: number): number | null {
  if (weightBeforePreparation <= 0) return null;
  return weightAfterPreparation / weightBeforePreparation;
}

export function calculateUsedQuantityCost(usableUnitCost: number, usedQuantity: number): number {
  return usableUnitCost * usedQuantity;
}

// ── Ficha técnica — totais ────────────────────────────────────

export function calculateIngredientsCost(sheet: Pick<TechnicalSheet, "ingredients">): number {
  return sheet.ingredients.reduce((sum, i) => sum + i.cost, 0);
}

export function calculateTechnicalSheetTotalCost(sheet: Pick<TechnicalSheet, "ingredients" | "packagingCost">): number {
  return calculateIngredientsCost(sheet) + (sheet.packagingCost ?? 0);
}

/** CMV do produto = custo total (ingredientes + embalagem) ÷ preço praticado × 100. */
export function calculateSheetCmvPercentage(sheet: Pick<TechnicalSheet, "ingredients" | "packagingCost" | "practicedPrice">): number | null {
  if (sheet.practicedPrice <= 0) return null;
  const totalCost = calculateTechnicalSheetTotalCost(sheet);
  return Math.round((totalCost / sheet.practicedPrice) * 10000) / 100;
}

/** Margem de contribuição = preço praticado − custo total (ingredientes + embalagem). Não é lucro líquido — taxas, impostos e despesas fixas não entram aqui. */
export function calculateContributionMargin(sheet: Pick<TechnicalSheet, "ingredients" | "packagingCost" | "practicedPrice">): number {
  return sheet.practicedPrice - calculateTechnicalSheetTotalCost(sheet);
}

// ── CMV real vs. teórico (nível de relatório) ──────────────────

export function calculateActualConsumption(input: {
  openingInventoryValue: number;
  purchasesValue: number;
  closingInventoryValue: number;
}): number {
  return input.openingInventoryValue + input.purchasesValue - input.closingInventoryValue;
}

export function calculateActualCmvPercentage(input: { actualConsumption: number; sales: number }): number | null {
  if (input.sales <= 0) return null;
  return Math.round((input.actualConsumption / input.sales) * 10000) / 100;
}

export function calculateTheoreticalConsumptionFromSales(
  lines: { ingredientCostPerUnit: number; unitsSold: number }[]
): number {
  return lines.reduce((sum, l) => sum + l.ingredientCostPerUnit * l.unitsSold, 0);
}

export function calculateTheoreticalCmvPercentage(input: { theoreticalConsumption: number; sales: number }): number | null {
  if (input.sales <= 0) return null;
  return Math.round((input.theoreticalConsumption / input.sales) * 10000) / 100;
}

export function calculateCmvGap(input: { actualConsumption: number; theoreticalConsumption: number }): number {
  return input.actualConsumption - input.theoreticalConsumption;
}

/** Diferença em pontos percentuais entre CMV real e CMV teórico — NUNCA a diferença percentual relativa entre os dois. */
export function calculateCmvGapPercentagePoints(input: { actualCmvPercentage: number; theoreticalCmvPercentage: number }): number {
  return Math.round((input.actualCmvPercentage - input.theoreticalCmvPercentage) * 100) / 100;
}

export const CMV_GAP_EXPLANATION =
  "A diferença não prova automaticamente desvio ou desperdício. Ela pode ser causada por ficha técnica desatualizada, porção acima do padrão, perdas, cortesias, consumo interno, erro de compra ou erro de contagem.";

export const SHEET_COST_DISCLAIMER =
  "Este cálculo representa apenas o custo dos ingredientes. Taxas, impostos, embalagem e despesas ainda precisam ser considerados.";
