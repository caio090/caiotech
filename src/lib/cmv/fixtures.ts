// `require` keeps this fixture executable by the repository's direct Node test
// pattern while remaining statically checked by TypeScript/Next.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { buildActualCmvSummary, buildCmvGapSummary, buildMenuEngineering, calculateCoverage, calculateWeightedTheoreticalCmv } = require("./calculations.ts") as typeof import("./calculations");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { interpretCmv } = require("./interpretation.ts") as typeof import("./interpretation");
import type { CmvPeriod, CmvPolicy, CmvProductMapping, InventoryLocationPeriod, MenuEngineeringThresholds } from "./types";

export const CMV_FINAL_REFERENCE_PENDING = true;
export const CMV_PERIOD: CmvPeriod = { id: "simulated-jun-2026", label: "Junho de 2026 · exemplo", startDate: "2026-06-01", endDate: "2026-06-30" };
export const CMV_POLICY: CmvPolicy = {
  salesBasis: "net", includePackaging: true, includeDeliveryPackaging: false, includePaymentFees: true,
  includePlatformFees: false, includeTaxes: false, includeCourtesy: true, includeStaffMeal: true, includeWasteInActual: true,
  acceptedOrderStatuses: ["completed", "delivered"], excludedOrderStatuses: ["cancelled", "refunded"],
  inventoryValuationMethod: "weighted_average", businessDayStart: "05:00", timezone: "America/Fortaleza",
  targetCmvPercentage: 0.32, warningCmvPercentage: 0.35, criticalCmvPercentage: 0.4, minimumCoveragePercentage: 0.75,
};

export const CMV_PRODUCTS: CmvProductMapping[] = [
  { productId: "smash", productName: "Smash de Exemplo", category: "Lanches", quantitySold: 640, grossRevenue: 1600000, netRevenue: 1536000, technicalSheetCost: 862, packagingCost: 80, variableFees: 46080, sheetStatus: "complete", mapped: true, source: "simulated" },
  { productId: "classic", productName: "Hambúrguer Clássico de Exemplo", category: "Lanches", quantitySold: 480, grossRevenue: 1104000, netRevenue: 1059840, technicalSheetCost: 790, packagingCost: 80, variableFees: 31795, sheetStatus: "complete", mapped: true, source: "simulated" },
  { productId: "combo", productName: "Combo de Exemplo", category: "Combos", quantitySold: 350, grossRevenue: 1260000, netRevenue: 1209600, technicalSheetCost: 1280, packagingCost: 140, variableFees: 36288, sheetStatus: "complete", mapped: true, source: "simulated" },
  { productId: "fries", productName: "Batata de Exemplo", category: "Acompanhamentos", quantitySold: 260, grossRevenue: 390000, netRevenue: 374400, technicalSheetCost: 410, packagingCost: 55, variableFees: 11232, sheetStatus: "incomplete", mapped: true, source: "simulated" },
  { productId: "drink", productName: "Bebida de Exemplo", category: "Bebidas", quantitySold: 570, grossRevenue: 570000, netRevenue: 547200, technicalSheetCost: null, packagingCost: null, variableFees: 16416, sheetStatus: "missing", mapped: false, source: "simulated" },
];

export const CMV_LOCATIONS: InventoryLocationPeriod[] = [
  { locationId: "central", openingInventory: 920000, purchases: 1480000, purchaseReturns: 20000, closingInventory: 720000, internalTransfersIn: 0, internalTransfersOut: 1180000, recordedWaste: 12000, internalConsumption: 8000, courtesy: 4000 },
  { locationId: "kitchen", openingInventory: 310000, purchases: 180000, purchaseReturns: 0, closingInventory: 230000, internalTransfersIn: 1180000, internalTransfersOut: 0, recordedWaste: 32000, internalConsumption: 18000, courtesy: 10000 },
];

export const MENU_THRESHOLDS: MenuEngineeringThresholds = { popularityMethod: "menu_average", popularityThreshold: 0.2, minimumQuantity: 100, contributionMarginThreshold: 1300 };
export const CMV_THEORETICAL = calculateWeightedTheoreticalCmv(CMV_PRODUCTS, CMV_POLICY);
export const CMV_ACTUAL = buildActualCmvSummary(CMV_LOCATIONS, CMV_THEORETICAL.salesConsidered);
export const CMV_COVERAGE = calculateCoverage(CMV_PRODUCTS, 1, 0.95, 1, CMV_POLICY);
export const CMV_GAP = buildCmvGapSummary(CMV_ACTUAL, CMV_THEORETICAL, CMV_COVERAGE.finalCoverage, CMV_POLICY);
export const CMV_INTERPRETATION = interpretCmv(CMV_GAP, CMV_COVERAGE, CMV_THEORETICAL.cmvPercentage, CMV_ACTUAL.cmvPercentage, CMV_POLICY);
export const MENU_ENGINEERING = buildMenuEngineering(CMV_THEORETICAL.products, MENU_THRESHOLDS);
