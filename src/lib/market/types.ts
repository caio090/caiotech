export type MarketSourceType = "manual_research" | "menu_photo" | "public_menu" | "spreadsheet" | "field_research" | "customer_report" | "future_integration";
export type MarketChannel = "dine_in" | "pickup" | "own_delivery" | "marketplace_delivery" | "whatsapp" | "unknown";
export type QualityPositioning = "economy" | "standard" | "premium" | "unknown";
export type MarketFreshness = "current" | "aging" | "stale" | "expired" | "unknown";
export type MarketComparability = "highly_comparable" | "comparable" | "partially_comparable" | "not_comparable" | "insufficient_data";
export type MarketResearchConfidence = "high" | "medium" | "low" | "insufficient";

export interface MarketComparable {
  id: string; competitorLabel: string; productName: string; category: string; description: string;
  city: string; neighborhood: string; channel: MarketChannel; sourceType: MarketSourceType; sourceReference: string;
  observedAt: string | null; regularPrice: number; promotionalPrice: number | null; promotionStart: string | null; promotionEnd: string | null;
  portionWeight: number | null; sizeLabel: string; proteinWeight: number | null; ingredientCount: number | null;
  includesSides: boolean | null; includesDrink: boolean | null; packagingIncluded: boolean | null;
  deliveryFeeIncluded: boolean | null; serviceFeeIncluded: boolean | null; qualityPositioning: QualityPositioning;
  notes: string; confirmedByUser: boolean; active: boolean; createdAt: string; updatedAt: string;
}
export type MarketComparableProduct = MarketComparable;
export interface MarketBenchmarkSource { type: MarketSourceType; label: string; count: number }
export interface MarketPriceRange { minimum: number | null; median: number | null; average: number | null; maximum: number | null }
export interface MarketComparabilityResult { comparableId: string; score: number; classification: MarketComparability; reasons: string[]; limitations: string[] }
export interface MarketBenchmarkSummary extends MarketPriceRange {
  sampleCount: number; discardedCount: number; promotionalCount: number; channels: MarketChannel[];
  freshness: MarketFreshness; confidence: MarketResearchConfidence; limitations: string[]; comparableResults: MarketComparabilityResult[];
}
export interface MarketResearchIssue { comparableId: string | null; severity: "info" | "warning" | "error"; message: string }
export interface MarketResearchBatch { id: string; productId: string; createdAt: string; source: MarketSourceType; samples: MarketComparable[]; issues: MarketResearchIssue[]; confirmedByUser: boolean }
export type ProductMarketPosition = "below_market" | "aligned" | "above_market" | "inconclusive";
export interface PricingScenario { id: string; name: string; price: number; expectedUnitMargin: number | null; expectedCmv: number | null; risk: string; requiredActions: string[]; autoApply: false }
export interface PricingDecisionContext { currentPrice: number; realizedAveragePrice: number | null; consideredCost: number; targetCmv: number; targetContributionMargin: number; benchmark: MarketBenchmarkSummary; position: ProductMarketPosition; scenarios: PricingScenario[] }

export interface MarketFreshnessPolicy { currentDays: number; agingDays: number; staleDays: number; sourceAdjustments: Partial<Record<MarketSourceType, number>> }
export interface ChannelPriceInput { channel: MarketChannel; price: number; productCost: number; packagingCost: number | null; channelFeeRate: number | null; paymentFeeRate: number | null; deliveryCost: number | null; storeFundedDiscount: number; platformFundedDiscount: number }
export interface ChannelPriceResult extends ChannelPriceInput { realizedRevenue: number; attributedVariableCosts: number | null; contributionMargin: number | null; contributionMarginPercentage: number | null; cmv: number | null }

export interface ProductSalesMix { productId: string; productName: string; quantitySold: number; netRevenue: number; theoreticalCostTotal: number; previousQuantitySold: number }
export interface SalesMixCmvContribution extends ProductSalesMix { quantityShare: number; revenueShare: number; individualCmv: number | null; consolidatedCmvContribution: number | null; contributionTotal: number | null }
export interface SalesMixSummary { consolidatedCmv: number | null; totalRevenue: number; totalTheoreticalCost: number; products: SalesMixCmvContribution[] }
export interface SalesMixScenario { id: string; label: string; quantities: Record<string, number> }
export interface PopularityThresholdPolicy { method: "average_share" | "expected_share_percentage" | "configured_percentage" | "minimum_quantity" | "by_category"; value: number; categoryValues?: Record<string, number> }
