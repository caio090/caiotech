import type {
  CmvActualSummary, CmvCoverageSummary, CmvGapClassification, CmvGapSummary, CmvPolicy,
  CmvProductContribution, CmvProductMapping, CmvTheoreticalSummary, InventoryLocationPeriod,
  MenuEngineeringItem, MenuEngineeringQuadrant, MenuEngineeringThresholds,
} from "./types";

const safeRatio = (numerator: number, denominator: number): number | null => denominator > 0 ? numerator / denominator : null;

export function calculateProductTheoreticalCost(product: CmvProductMapping, policy: CmvPolicy): number | null {
  if (!product.mapped || product.sheetStatus !== "complete" || product.technicalSheetCost === null) return null;
  const packaging = policy.includePackaging ? product.packagingCost : 0;
  if (policy.includePackaging && packaging === null) return null;
  return product.technicalSheetCost + (packaging ?? 0);
}

export function calculateTotalTheoreticalConsumption(products: CmvProductMapping[], policy: CmvPolicy): number {
  return products.reduce((total, product) => {
    const unitCost = calculateProductTheoreticalCost(product, policy);
    return total + (unitCost === null ? 0 : Math.round(unitCost * product.quantitySold));
  }, 0);
}

export function calculateTheoreticalCmvPercentage(consumption: number, sales: number): number | null {
  return safeRatio(consumption, sales);
}

export function calculateTheoreticalCmvCoverage(products: CmvProductMapping[], policy: CmvPolicy): number {
  const total = products.reduce((sum, product) => sum + product.netRevenue, 0);
  const covered = products.reduce((sum, product) => sum + (calculateProductTheoreticalCost(product, policy) === null ? 0 : product.netRevenue), 0);
  return safeRatio(covered, total) ?? 0;
}

export function calculateWeightedTheoreticalCmv(products: CmvProductMapping[], policy: CmvPolicy): CmvTheoreticalSummary {
  const salesConsidered = products.reduce((sum, product) => sum + (policy.salesBasis === "net" ? product.netRevenue : product.grossRevenue), 0);
  const theoreticalConsumption = calculateTotalTheoreticalConsumption(products, policy);
  const enriched: CmvProductContribution[] = products.map((product) => {
    const unitCost = calculateProductTheoreticalCost(product, policy);
    const sales = policy.salesBasis === "net" ? product.netRevenue : product.grossRevenue;
    const unitRevenue = product.quantitySold > 0 ? Math.round(sales / product.quantitySold) : 0;
    const fees = product.variableFees;
    const contribution = unitCost === null || fees === null ? null : unitRevenue - unitCost - Math.round(fees / Math.max(product.quantitySold, 1));
    return {
      ...product,
      theoreticalConsumption: unitCost === null ? null : Math.round(unitCost * product.quantitySold),
      contributionMarginUnit: contribution,
      contributionMarginPercentage: contribution === null ? null : safeRatio(contribution, unitRevenue),
      popularity: 0,
      coverage: unitCost === null ? 0 : 1,
    };
  });
  const coveredRevenue = enriched.reduce((sum, product) => sum + (product.theoreticalConsumption === null ? 0 : (policy.salesBasis === "net" ? product.netRevenue : product.grossRevenue)), 0);
  return {
    salesConsidered, theoreticalConsumption,
    cmvPercentage: calculateTheoreticalCmvPercentage(theoreticalConsumption, salesConsidered),
    coveredRevenue, uncoveredRevenue: Math.max(0, salesConsidered - coveredRevenue), products: enriched,
  };
}

export function calculateActualConsumption(opening: number | null, purchases: number, returns: number, closing: number | null): number | null {
  if (opening === null || closing === null) return null;
  return Math.max(0, opening + purchases - returns - closing);
}

export function calculateActualCmvPercentage(consumption: number | null, sales: number): number | null {
  return consumption === null ? null : safeRatio(consumption, sales);
}

export function calculateInventoryConsumptionByLocation(location: InventoryLocationPeriod): number | null {
  const base = calculateActualConsumption(location.openingInventory, location.purchases, location.purchaseReturns, location.closingInventory);
  if (base === null) return null;
  return Math.max(0, base + location.internalTransfersIn - location.internalTransfersOut);
}

export function calculateConsolidatedInventoryConsumption(locations: InventoryLocationPeriod[]): number | null {
  const raw = locations.map(calculateInventoryConsumptionByLocation);
  if (raw.some((value) => value === null)) return null;
  return raw.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

export function calculateActualCmvCompleteness(locations: InventoryLocationPeriod[]): number {
  if (locations.length === 0) return 0;
  const complete = locations.filter((location) => location.openingInventory !== null && location.closingInventory !== null).length;
  return complete / locations.length;
}

export function buildActualCmvSummary(locations: InventoryLocationPeriod[], salesConsidered: number): CmvActualSummary {
  const actualConsumption = calculateConsolidatedInventoryConsumption(locations);
  return { salesConsidered, actualConsumption, cmvPercentage: calculateActualCmvPercentage(actualConsumption, salesConsidered), inventoryComplete: actualConsumption !== null, locations };
}

export const calculateCmvGapAmount = (actual: number | null, theoretical: number | null): number | null => actual === null || theoretical === null ? null : actual - theoretical;
export const calculateCmvGapPercentagePoints = (actual: number | null, theoretical: number | null): number | null => actual === null || theoretical === null ? null : actual - theoretical;
export const calculateCmvGapRelativeToTheoretical = (gap: number | null, theoretical: number): number | null => gap === null ? null : safeRatio(gap, theoretical);

export function classifyCmvGap(points: number | null, coverage: number, policy: CmvPolicy): CmvGapClassification {
  if (points === null || coverage < policy.minimumCoveragePercentage) return "inconclusive";
  if (points < -0.01) return "below";
  if (points <= 0.01) return "aligned";
  if (points <= 0.04) return "attention";
  return "critical";
}

export function buildCmvGapSummary(actual: CmvActualSummary, theoretical: CmvTheoreticalSummary, coverage: number, policy: CmvPolicy): CmvGapSummary {
  const amount = calculateCmvGapAmount(actual.actualConsumption, theoretical.theoreticalConsumption);
  const percentagePoints = calculateCmvGapPercentagePoints(actual.cmvPercentage, theoretical.cmvPercentage);
  return { amount, percentagePoints, relativeToTheoretical: calculateCmvGapRelativeToTheoretical(amount, theoretical.theoreticalConsumption), classification: classifyCmvGap(percentagePoints, coverage, policy) };
}

export function calculateCoverage(products: CmvProductMapping[], inventoryCoverage: number, purchaseCoverage: number, periodConsistency: number, policy: CmvPolicy): CmvCoverageSummary {
  const sold = products.filter((product) => product.quantitySold > 0);
  const mapped = sold.filter((product) => product.mapped);
  const complete = sold.filter((product) => product.mapped && product.sheetStatus === "complete");
  const incomplete = sold.filter((product) => product.sheetStatus === "incomplete");
  const without = sold.filter((product) => product.sheetStatus === "missing");
  const totalRevenue = sold.reduce((sum, product) => sum + product.netRevenue, 0);
  const coveredRevenue = complete.reduce((sum, product) => sum + product.netRevenue, 0);
  const salesCoverage = safeRatio(coveredRevenue, totalRevenue) ?? 0;
  const sheetCoverage = safeRatio(complete.length, sold.length) ?? 0;
  const dimensions = [salesCoverage, sheetCoverage, inventoryCoverage, purchaseCoverage, periodConsistency];
  const finalCoverage = dimensions.reduce((sum, value) => sum + value, 0) / dimensions.length;
  const confidence = finalCoverage < policy.minimumCoveragePercentage ? "insufficient" : finalCoverage >= 0.9 ? "high" : finalCoverage >= 0.75 ? "medium" : "low";
  const missingData: string[] = [];
  if (without.length) missingData.push(`${without.length} produto(s) sem ficha técnica`);
  if (incomplete.length) missingData.push(`${incomplete.length} ficha(s) incompleta(s)`);
  if (inventoryCoverage < 1) missingData.push("Inventário incompleto");
  if (purchaseCoverage < 1) missingData.push("Compras parcialmente registradas");
  if (periodConsistency < 1) missingData.push("Períodos incompatíveis");
  return { soldProducts: sold.length, mappedProducts: mapped.length, productsWithoutSheet: without.length, completeSheets: complete.length, incompleteSheets: incomplete.length, salesCoverage, sheetCoverage, inventoryCoverage, purchaseCoverage, periodConsistency, finalCoverage, confidence, missingData };
}

export function calculateUnitContributionMargin(netUnitRevenue: number, attributedVariableCosts: Array<number | null>): number | null {
  if (attributedVariableCosts.some((cost) => cost === null)) return null;
  return netUnitRevenue - attributedVariableCosts.reduce<number>((sum, cost) => sum + (cost ?? 0), 0);
}
export const calculateContributionMarginPercentage = (margin: number | null, netUnitRevenue: number): number | null => margin === null ? null : safeRatio(margin, netUnitRevenue);
export const calculateProductPopularity = (quantity: number, totalQuantity: number): number => safeRatio(quantity, totalQuantity) ?? 0;
export const calculateMenuPopularityAverage = (items: CmvProductContribution[]): number => items.length ? 1 / items.length : 0;

export function classifyPopularity(item: CmvProductContribution, all: CmvProductContribution[], thresholds: MenuEngineeringThresholds): boolean {
  if (thresholds.popularityMethod === "minimum_quantity") return item.quantitySold >= thresholds.minimumQuantity;
  const limit = thresholds.popularityMethod === "menu_average" ? calculateMenuPopularityAverage(all) : thresholds.popularityThreshold;
  return item.popularity >= limit;
}

export function classifyMenuEngineeringQuadrant(popular: boolean, margin: number | null, threshold: number): MenuEngineeringQuadrant {
  const profitable = margin !== null && margin >= threshold;
  if (popular && profitable) return "star";
  if (popular) return "popular_low_margin";
  if (profitable) return "profitable_low_popularity";
  return "low_performance";
}

const QUADRANT_ACTION: Record<MenuEngineeringQuadrant, string> = {
  star: "Manter o padrão, proteger a qualidade e evitar ruptura.",
  popular_low_margin: "Revisar ficha, porção, embalagem, desconto e preço.",
  profitable_low_popularity: "Testar nome, foto, posição, combo e comunicação.",
  low_performance: "Investigar função estratégica antes de simplificar, substituir ou retirar.",
};

export function buildMenuEngineering(products: CmvProductContribution[], thresholds: MenuEngineeringThresholds): MenuEngineeringItem[] {
  const totalQuantity = products.reduce((sum, product) => sum + product.quantitySold, 0);
  const withPopularity = products.map((product) => ({ ...product, popularity: calculateProductPopularity(product.quantitySold, totalQuantity) }));
  return withPopularity.map((product) => {
    const quadrant = classifyMenuEngineeringQuadrant(classifyPopularity(product, withPopularity, thresholds), product.contributionMarginUnit, thresholds.contributionMarginThreshold);
    return { ...product, averagePrice: product.quantitySold ? Math.round(product.netRevenue / product.quantitySold) : 0, quadrant, suggestedAction: QUADRANT_ACTION[quadrant] };
  });
}
