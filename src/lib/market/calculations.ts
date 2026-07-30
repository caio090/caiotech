import type { ChannelPriceInput, ChannelPriceResult, MarketBenchmarkSummary, MarketComparable, MarketComparabilityResult, MarketFreshness, MarketFreshnessPolicy, MarketPriceRange, MarketResearchConfidence, PopularityThresholdPolicy, PricingScenario, ProductMarketPosition, ProductSalesMix, SalesMixScenario, SalesMixSummary } from "./types";

const ratio = (a: number, b: number): number | null => b > 0 ? a / b : null;
const mean = (values: number[]): number | null => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;

export function classifyMarketFreshness(observedAt: string | null, now: string, source: MarketComparable["sourceType"], promotionEnd: string | null, policy: MarketFreshnessPolicy): MarketFreshness {
  if (!observedAt) return "unknown";
  const nowTime = Date.parse(`${now}T00:00:00Z`), observed = Date.parse(`${observedAt}T00:00:00Z`);
  if (!Number.isFinite(nowTime) || !Number.isFinite(observed)) return "unknown";
  if (promotionEnd && Date.parse(`${promotionEnd}T23:59:59Z`) < nowTime) return "expired";
  const age = Math.max(0, Math.floor((nowTime - observed) / 86_400_000));
  const adjustment = policy.sourceAdjustments[source] ?? 0;
  if (age <= policy.currentDays + adjustment) return "current";
  if (age <= policy.agingDays + adjustment) return "aging";
  if (age <= policy.staleDays + adjustment) return "stale";
  return "expired";
}

export function calculateMarketComparability(internal: MarketComparable, candidate: MarketComparable): MarketComparabilityResult {
  const reasons: string[] = [], limitations: string[] = [];
  let score = 0, available = 0;
  const criterion = (known: boolean, matches: boolean, label: string, weight = 1) => { if (!known) { limitations.push(`${label} não informado`); return; } available += weight; if (matches) { score += weight; reasons.push(label); } else limitations.push(`${label} diferente`); };
  criterion(Boolean(internal.category && candidate.category), internal.category.toLowerCase() === candidate.category.toLowerCase(), "mesma categoria", 2);
  criterion(internal.portionWeight !== null && candidate.portionWeight !== null, internal.portionWeight !== null && candidate.portionWeight !== null && Math.abs(internal.portionWeight - candidate.portionWeight) / Math.max(internal.portionWeight, 1) <= 0.2, "gramagem próxima", 2);
  criterion(internal.proteinWeight !== null && candidate.proteinWeight !== null, internal.proteinWeight !== null && candidate.proteinWeight !== null && Math.abs(internal.proteinWeight - candidate.proteinWeight) <= 30, "proteína semelhante");
  criterion(internal.ingredientCount !== null && candidate.ingredientCount !== null, internal.ingredientCount !== null && candidate.ingredientCount !== null && Math.abs(internal.ingredientCount - candidate.ingredientCount) <= 2, "composição próxima");
  criterion(true, internal.channel === candidate.channel, "mesmo canal", 2);
  criterion(Boolean(internal.neighborhood && candidate.neighborhood), internal.neighborhood.toLowerCase() === candidate.neighborhood.toLowerCase(), "mesma região");
  criterion(internal.qualityPositioning !== "unknown" && candidate.qualityPositioning !== "unknown", internal.qualityPositioning === candidate.qualityPositioning, "posicionamento semelhante");
  criterion(internal.includesSides !== null && candidate.includesSides !== null, internal.includesSides === candidate.includesSides, "acompanhamento equivalente");
  criterion(internal.includesDrink !== null && candidate.includesDrink !== null, internal.includesDrink === candidate.includesDrink, "bebida equivalente");
  const normalized = available ? score / available : 0;
  const classification = available < 5 ? "insufficient_data" : normalized >= 0.85 ? "highly_comparable" : normalized >= 0.68 ? "comparable" : normalized >= 0.45 ? "partially_comparable" : "not_comparable";
  return { comparableId: candidate.id, score: normalized, classification, reasons, limitations };
}
export const classifyMarketComparability = (result: MarketComparabilityResult) => result.classification;
export const explainMarketComparability = (result: MarketComparabilityResult) => result.classification === "not_comparable" ? `Este item custa diferente, mas ${result.limitations.join(" e ").toLowerCase()}.` : `${result.reasons.join(", ") || "Dados insuficientes"}. Limitações: ${result.limitations.join(", ") || "nenhuma"}.`;

const sorted = (values: number[]) => [...values].sort((a, b) => a - b);
export const calculateMarketMinimumPrice = (values: number[]) => values.length ? Math.min(...values) : null;
export const calculateMarketMaximumPrice = (values: number[]) => values.length ? Math.max(...values) : null;
export const calculateMarketAveragePrice = mean;
export function calculateMarketMedianPrice(values: number[]): number | null { const s = sorted(values); if (!s.length) return null; const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); }
export function calculateWeightedMarketPrice(samples: Array<{ price: number; weight: number }>): number | null { const weight = samples.reduce((sum, item) => sum + item.weight, 0); return weight ? Math.round(samples.reduce((sum, item) => sum + item.price * item.weight, 0) / weight) : null; }
export function calculateMarketPriceRange(values: number[]): MarketPriceRange { return { minimum: calculateMarketMinimumPrice(values), median: calculateMarketMedianPrice(values), average: calculateMarketAveragePrice(values), maximum: calculateMarketMaximumPrice(values) }; }
export const calculateProductMarketGap = (current: number, median: number | null) => median === null ? null : current - median;
export const calculateProductMarketGapPercentage = (current: number, median: number | null) => median === null ? null : ratio(current - median, median);
export function calculateMarketSampleQuality(count: number, averageComparability: number, freshness: number, sourceDiversity: number): MarketResearchConfidence { if (count < 2) return "insufficient"; const score = averageComparability * 0.4 + freshness * 0.3 + sourceDiversity * 0.3; return score >= 0.85 ? "high" : score >= 0.65 ? "medium" : score >= 0.45 ? "low" : "insufficient"; }

export function buildMarketBenchmark(internal: MarketComparable, candidates: MarketComparable[], now: string, freshnessPolicy: MarketFreshnessPolicy): MarketBenchmarkSummary {
  const results = candidates.map((candidate) => calculateMarketComparability(internal, candidate));
  const accepted = candidates.filter((candidate, index) => {
    const comp = results[index].classification;
    const fresh = classifyMarketFreshness(candidate.observedAt, now, candidate.sourceType, candidate.promotionEnd, freshnessPolicy);
    return candidate.active && candidate.confirmedByUser && ["highly_comparable", "comparable"].includes(comp) && fresh !== "expired" && candidate.promotionalPrice === null;
  });
  const prices = accepted.map((item) => item.regularPrice);
  const range = calculateMarketPriceRange(prices);
  const averageComp = accepted.length ? accepted.reduce((sum, item) => sum + (results.find((result) => result.comparableId === item.id)?.score ?? 0), 0) / accepted.length : 0;
  const sources = new Set(accepted.map((item) => item.sourceType));
  const confidence = calculateMarketSampleQuality(accepted.length, averageComp, accepted.length ? 1 : 0, Math.min(1, sources.size / 2));
  return { ...range, sampleCount: accepted.length, discardedCount: candidates.length - accepted.length, promotionalCount: candidates.filter((item) => item.promotionalPrice !== null).length, channels: [...new Set(accepted.map((item) => item.channel))], freshness: accepted.length ? "current" : "unknown", confidence, limitations: confidence === "high" ? [] : ["Amostra limitada; valide novas observações antes de decidir."], comparableResults: results };
}

export const calculatePriceRequiredForTargetCmv = (cost: number, target: number) => target > 0 ? Math.ceil(cost / target) : null;
export const calculateMaximumCostForMarketPrice = (price: number, target: number) => Math.round(price * target);
export const calculatePriceRequiredForContributionMargin = (costs: Array<number | null>, targetMargin: number) => costs.some((item) => item === null) ? null : costs.reduce<number>((sum, item) => sum + (item ?? 0), 0) + targetMargin;
export const calculateRealizedAveragePrice = (netRevenue: number, quantity: number) => quantity > 0 ? Math.round(netRevenue / quantity) : null;
export const calculatePriceDiscountImpact = (listedPrice: number, realizedPrice: number | null, quantity: number) => realizedPrice === null ? null : Math.max(0, (listedPrice - realizedPrice) * quantity);

export function calculateChannelPriceResult(input: ChannelPriceInput): ChannelPriceResult {
  const realizedRevenue = input.price - input.storeFundedDiscount;
  const ratesKnown = input.channelFeeRate !== null && input.paymentFeeRate !== null && input.packagingCost !== null && input.deliveryCost !== null;
  const attributedVariableCosts = !ratesKnown ? null : input.productCost + (input.packagingCost ?? 0) + (input.deliveryCost ?? 0) + Math.round(realizedRevenue * ((input.channelFeeRate ?? 0) + (input.paymentFeeRate ?? 0)));
  const contributionMargin = attributedVariableCosts === null ? null : realizedRevenue - attributedVariableCosts;
  return { ...input, realizedRevenue, attributedVariableCosts, contributionMargin, contributionMarginPercentage: contributionMargin === null ? null : ratio(contributionMargin, realizedRevenue), cmv: ratio(input.productCost + (input.packagingCost ?? 0), realizedRevenue) };
}
export const calculateChannelContributionMargin = (input: ChannelPriceInput) => calculateChannelPriceResult(input).contributionMargin;
export const calculateChannelCmv = (input: ChannelPriceInput) => calculateChannelPriceResult(input).cmv;
export const compareChannels = (inputs: ChannelPriceInput[]) => inputs.map(calculateChannelPriceResult);

export const calculateProductSalesMixShare = (quantity: number, total: number) => ratio(quantity, total) ?? 0;
export function calculatePopularityThreshold(policy: PopularityThresholdPolicy, menuItemCount: number, category?: string): number {
  if (policy.method === "minimum_quantity") return policy.value;
  if (policy.method === "by_category") return policy.categoryValues?.[category ?? ""] ?? policy.value;
  const expectedShare = menuItemCount > 0 ? 1 / menuItemCount : 0;
  if (policy.method === "average_share") return expectedShare;
  if (policy.method === "expected_share_percentage") return expectedShare * policy.value;
  return policy.value;
}
export const calculateWeightedMenuCmv = (items: ProductSalesMix[]) => ratio(items.reduce((sum, item) => sum + item.theoreticalCostTotal, 0), items.reduce((sum, item) => sum + item.netRevenue, 0));
export function calculateSalesMixCmvContribution(item: ProductSalesMix, all: ProductSalesMix[]) { const totalQuantity = all.reduce((sum, product) => sum + product.quantitySold, 0), totalRevenue = all.reduce((sum, product) => sum + product.netRevenue, 0); return { ...item, quantityShare: calculateProductSalesMixShare(item.quantitySold, totalQuantity), revenueShare: ratio(item.netRevenue, totalRevenue) ?? 0, individualCmv: ratio(item.theoreticalCostTotal, item.netRevenue), consolidatedCmvContribution: ratio(item.theoreticalCostTotal, totalRevenue), contributionTotal: item.netRevenue - item.theoreticalCostTotal }; }
export function buildSalesMixSummary(items: ProductSalesMix[]): SalesMixSummary { const products = items.map((item) => calculateSalesMixCmvContribution(item, items)); const totalRevenue = items.reduce((sum, item) => sum + item.netRevenue, 0), totalTheoreticalCost = items.reduce((sum, item) => sum + item.theoreticalCostTotal, 0); return { consolidatedCmv: ratio(totalTheoreticalCost, totalRevenue), totalRevenue, totalTheoreticalCost, products }; }
export function simulateSalesMixCmv(items: ProductSalesMix[], scenario: SalesMixScenario): SalesMixSummary { return buildSalesMixSummary(items.map((item) => { const quantity = scenario.quantities[item.productId] ?? item.quantitySold; const unitRevenue = item.quantitySold ? item.netRevenue / item.quantitySold : 0, unitCost = item.quantitySold ? item.theoreticalCostTotal / item.quantitySold : 0; return { ...item, quantitySold: quantity, netRevenue: Math.round(unitRevenue * quantity), theoreticalCostTotal: Math.round(unitCost * quantity) }; })); }
export const compareSalesMixPeriods = (current: SalesMixSummary, previous: SalesMixSummary) => current.consolidatedCmv === null || previous.consolidatedCmv === null ? null : current.consolidatedCmv - previous.consolidatedCmv;
export const calculateHighCmvProductImpact = (summary: SalesMixSummary, threshold: number) => summary.products.filter((product) => (product.individualCmv ?? 0) >= threshold).reduce((sum, product) => sum + (product.consolidatedCmvContribution ?? 0), 0);

export function classifyMarketPosition(current: number, median: number | null): ProductMarketPosition { const gap = calculateProductMarketGapPercentage(current, median); return gap === null ? "inconclusive" : gap < -0.05 ? "below_market" : gap > 0.05 ? "above_market" : "aligned"; }
export function buildPricingScenarios(cost: number, marketMedian: number, currentPrice: number, targetCmv: number): PricingScenario[] { const required = calculatePriceRequiredForTargetCmv(cost, targetCmv) ?? currentPrice; return [
  { id: "market", name: "Alinhar ao mercado", price: marketMedian, expectedUnitMargin: marketMedian - cost, expectedCmv: ratio(cost, marketMedian), risk: "Pode reduzir margem ou não refletir diferenciais.", requiredActions: ["Validar comparabilidade", "Conferir custo máximo permitido"], autoApply: false },
  { id: "premium", name: "Manter posicionamento premium", price: currentPrice, expectedUnitMargin: currentPrice - cost, expectedCmv: ratio(cost, currentPrice), risk: "Pode reduzir volume se o valor não for percebido.", requiredActions: ["Comprovar diferenciais", "Acompanhar popularidade"], autoApply: false },
  { id: "target", name: "Preço pela meta interna", price: required, expectedUnitMargin: required - cost, expectedCmv: ratio(cost, required), risk: "Pode ficar acima da faixa observada.", requiredActions: ["Simular canal", "Validar percepção de valor"], autoApply: false },
  { id: "cost", name: "Reduzir custo sem alterar proposta", price: currentPrice, expectedUnitMargin: currentPrice - cost, expectedCmv: ratio(cost, currentPrice), risk: "Não reduzir qualidade sem medir impacto.", requiredActions: ["Negociar insumo", "Revisar rendimento e embalagem"], autoApply: false },
  { id: "redesign", name: "Redesenhar o produto", price: currentPrice, expectedUnitMargin: null, expectedCmv: null, risk: "Mudanças podem alterar a proposta percebida.", requiredActions: ["Testar gramagem", "Criar versão menor ou premium"], autoApply: false },
  { id: "channel", name: "Preço diferente por canal", price: currentPrice, expectedUnitMargin: null, expectedCmv: null, risk: "Taxas e embalagem variam por canal.", requiredActions: ["Simular salão, retirada e delivery"], autoApply: false },
  { id: "review", name: "Reavaliar permanência no cardápio", price: currentPrice, expectedUnitMargin: null, expectedCmv: null, risk: "Uma janela curta pode distorcer popularidade e margem.", requiredActions: ["Confirmar período e amostra", "Verificar função estratégica", "Exigir decisão humana"], autoApply: false },
]; }
