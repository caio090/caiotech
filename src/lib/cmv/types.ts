export type CmvConfidence = "high" | "medium" | "low" | "insufficient";
export type CmvGapClassification = "below" | "aligned" | "attention" | "critical" | "inconclusive";
export type MenuEngineeringQuadrant = "star" | "popular_low_margin" | "profitable_low_popularity" | "low_performance";

export interface CmvPeriod { id: string; label: string; startDate: string; endDate: string }
export interface CmvPolicy {
  salesBasis: "gross" | "net";
  includePackaging: boolean;
  includeDeliveryPackaging: boolean;
  includePaymentFees: boolean;
  includePlatformFees: boolean;
  includeTaxes: boolean;
  includeCourtesy: boolean;
  includeStaffMeal: boolean;
  includeWasteInActual: boolean;
  acceptedOrderStatuses: string[];
  excludedOrderStatuses: string[];
  inventoryValuationMethod: "weighted_average" | "last_cost";
  businessDayStart: string;
  timezone: string;
  targetCmvPercentage: number;
  warningCmvPercentage: number;
  criticalCmvPercentage: number;
  minimumCoveragePercentage: number;
}

export interface CmvProductMapping {
  productId: string;
  productName: string;
  category: string;
  quantitySold: number;
  grossRevenue: number;
  netRevenue: number;
  technicalSheetCost: number | null;
  packagingCost: number | null;
  variableFees: number | null;
  sheetStatus: "complete" | "incomplete" | "missing";
  mapped: boolean;
  source: "simulated" | "manual" | "imported";
}

export interface CmvProductContribution extends CmvProductMapping {
  theoreticalConsumption: number | null;
  contributionMarginUnit: number | null;
  contributionMarginPercentage: number | null;
  popularity: number;
  coverage: number;
}

export interface CmvTheoreticalSummary {
  salesConsidered: number;
  theoreticalConsumption: number;
  cmvPercentage: number | null;
  coveredRevenue: number;
  uncoveredRevenue: number;
  products: CmvProductContribution[];
}

export interface InventoryLocationPeriod {
  locationId: string;
  openingInventory: number | null;
  purchases: number;
  purchaseReturns: number;
  closingInventory: number | null;
  internalTransfersIn: number;
  internalTransfersOut: number;
  recordedWaste: number;
  internalConsumption: number;
  courtesy: number;
}

export interface CmvActualSummary {
  salesConsidered: number;
  actualConsumption: number | null;
  cmvPercentage: number | null;
  inventoryComplete: boolean;
  locations: InventoryLocationPeriod[];
}

export interface CmvGapSummary {
  amount: number | null;
  percentagePoints: number | null;
  relativeToTheoretical: number | null;
  classification: CmvGapClassification;
}

export interface CmvCoverageSummary {
  soldProducts: number;
  mappedProducts: number;
  productsWithoutSheet: number;
  completeSheets: number;
  incompleteSheets: number;
  salesCoverage: number;
  sheetCoverage: number;
  inventoryCoverage: number;
  purchaseCoverage: number;
  periodConsistency: number;
  finalCoverage: number;
  confidence: CmvConfidence;
  missingData: string[];
}

export interface CmvInvestigationCheck { id: string; label: string; completed: boolean }
export interface CmvInvestigationHypothesis {
  id: string;
  title: string;
  rationale: string;
  evidence: string[];
  missingEvidence: string[];
  checks: CmvInvestigationCheck[];
  priority: "high" | "medium" | "low";
  owner: "Operação" | "Compras" | "Financeiro" | "Gestão";
  estimatedImpact: number | null;
}
export interface CmvInvestigation { diagnosis: string; hypotheses: CmvInvestigationHypothesis[] }
export interface CmvInterpretationResult {
  situation: string;
  explanation: string;
  action: string;
  confidence: CmvConfidence;
  investigation: CmvInvestigation;
}

export interface MenuEngineeringThresholds {
  popularityMethod: "menu_average" | "configured_percentage" | "minimum_quantity";
  popularityThreshold: number;
  minimumQuantity: number;
  contributionMarginThreshold: number;
}
export interface MenuEngineeringItem extends CmvProductContribution {
  averagePrice: number;
  quadrant: MenuEngineeringQuadrant;
  suggestedAction: string;
}
