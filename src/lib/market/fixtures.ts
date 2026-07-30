// eslint-disable-next-line @typescript-eslint/no-require-imports
const c = require("./calculations.ts") as typeof import("./calculations");
import type { ChannelPriceInput, MarketComparable, MarketFreshnessPolicy, ProductSalesMix } from "./types";

const base = { category: "Hambúrguer", description: "Produto genérico de demonstração", city: "Cidade de exemplo", neighborhood: "Centro", channel: "pickup" as const, sourceType: "manual_research" as const, sourceReference: "Pesquisa simulada", promotionalPrice: null, promotionStart: null, promotionEnd: null, portionWeight: 220, sizeLabel: "Individual", proteinWeight: 100, ingredientCount: 6, includesSides: false, includesDrink: false, packagingIncluded: true, deliveryFeeIncluded: false, serviceFeeIncluded: false, qualityPositioning: "standard" as const, notes: "EXEMPLO SIMULADO", confirmedByUser: true, active: true, createdAt: "2026-07-27T00:00:00Z", updatedAt: "2026-07-27T00:00:00Z" };
export const INTERNAL_MARKET_PRODUCT: MarketComparable = { ...base, id: "duh-example", competitorLabel: "Duh Lanches · exemplo", productName: "Produto de Exemplo", observedAt: "2026-07-20", regularPrice: 3000 };
export const MARKET_COMPARABLES: MarketComparable[] = [
  { ...base, id: "a", competitorLabel: "Concorrente A", productName: "Produto comparável A", observedAt: "2026-07-18", regularPrice: 2800 },
  { ...base, id: "b", competitorLabel: "Concorrente B", productName: "Produto comparável B", observedAt: "2026-07-16", regularPrice: 3000, sourceType: "field_research" },
  { ...base, id: "c", competitorLabel: "Concorrente C", productName: "Produto comparável C", observedAt: "2026-07-14", regularPrice: 3300, sourceType: "spreadsheet" },
  { ...base, id: "promo", competitorLabel: "Concorrente A", productName: "Promoção temporária", observedAt: "2026-07-20", regularPrice: 2900, promotionalPrice: 2400, promotionStart: "2026-07-20", promotionEnd: "2026-07-29" },
  { ...base, id: "partial", competitorLabel: "Concorrente B", productName: "Combo diferente", observedAt: "2026-07-16", regularPrice: 3800, portionWeight: 420, includesSides: true, includesDrink: true },
];
export const MARKET_FRESHNESS_POLICY: MarketFreshnessPolicy = { currentDays: 30, agingDays: 60, staleDays: 90, sourceAdjustments: { field_research: 10 } };
export const MARKET_BENCHMARK = c.buildMarketBenchmark(INTERNAL_MARKET_PRODUCT, MARKET_COMPARABLES, "2026-07-27", MARKET_FRESHNESS_POLICY);
export const REQUIRED_PRICE_EXAMPLE = c.calculatePriceRequiredForTargetCmv(1000, 0.25);
export const MAXIMUM_COST_EXAMPLE = c.calculateMaximumCostForMarketPrice(3000, 0.25);
export const PRICING_SCENARIOS = c.buildPricingScenarios(1000, MARKET_BENCHMARK.median ?? 3000, 3000, 0.25);

export const CHANNELS: ChannelPriceInput[] = [
  { channel: "dine_in", price: 3000, productCost: 1000, packagingCost: 0, channelFeeRate: 0, paymentFeeRate: 0.02, deliveryCost: 0, storeFundedDiscount: 0, platformFundedDiscount: 0 },
  { channel: "pickup", price: 3000, productCost: 1000, packagingCost: 80, channelFeeRate: 0, paymentFeeRate: 0.02, deliveryCost: 0, storeFundedDiscount: 100, platformFundedDiscount: 0 },
  { channel: "own_delivery", price: 3400, productCost: 1000, packagingCost: 120, channelFeeRate: 0, paymentFeeRate: 0.03, deliveryCost: 250, storeFundedDiscount: 0, platformFundedDiscount: 0 },
  { channel: "marketplace_delivery", price: 3900, productCost: 1000, packagingCost: 120, channelFeeRate: 0.18, paymentFeeRate: 0.03, deliveryCost: 0, storeFundedDiscount: 200, platformFundedDiscount: 0 },
];
export const CHANNEL_RESULTS = c.compareChannels(CHANNELS);
export const SALES_MIX: ProductSalesMix[] = [
  { productId: "low-cmv", productName: "Produto leve de exemplo", quantitySold: 500, netRevenue: 1500000, theoreticalCostTotal: 375000, previousQuantitySold: 650 },
  { productId: "high-cmv", productName: "Produto de CMV alto de exemplo", quantitySold: 600, netRevenue: 1800000, theoreticalCostTotal: 720000, previousQuantitySold: 350 },
  { productId: "premium", productName: "Produto premium de exemplo", quantitySold: 200, netRevenue: 900000, theoreticalCostTotal: 270000, previousQuantitySold: 200 },
];
export const SALES_MIX_SUMMARY = c.buildSalesMixSummary(SALES_MIX);
export const PREVIOUS_MIX_SUMMARY = c.buildSalesMixSummary(SALES_MIX.map((item) => ({ ...item, quantitySold: item.previousQuantitySold, netRevenue: Math.round(item.netRevenue / item.quantitySold * item.previousQuantitySold), theoreticalCostTotal: Math.round(item.theoreticalCostTotal / item.quantitySold * item.previousQuantitySold) })));
export const MIX_CHANGE_POINTS = c.compareSalesMixPeriods(SALES_MIX_SUMMARY, PREVIOUS_MIX_SUMMARY);
