(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const c = require("../calculations.ts") as typeof import("../calculations");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const f = require("../fixtures.ts") as typeof import("../fixtures");
let passed = 0, failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };
const near = (value: number | null, expected: number) => value !== null && Math.abs(value - expected) < 0.0001;
assert(c.calculatePriceRequiredForTargetCmv(1000, 0.25) === 4000, "preço R$ 40 para meta de 25%");
assert(c.calculateMaximumCostForMarketPrice(3000, 0.25) === 750, "custo máximo R$ 7,50");
assert(near(c.calculateChannelCmv({ channel: "pickup", price: 3000, productCost: 1000, packagingCost: 0, channelFeeRate: 0, paymentFeeRate: 0, deliveryCost: 0, storeFundedDiscount: 0, platformFundedDiscount: 0 }), 1 / 3), "CMV R$ 10/R$ 30");
assert(c.calculateRealizedAveragePrice(2700, 1) === 2700, "preço realizado após desconto");
assert(c.calculatePriceDiscountImpact(3000, 2700, 10) === 3000, "impacto do desconto");
assert(c.calculatePriceRequiredForContributionMargin([1000, null], 1200) === null, "taxa ausente não vira zero");
assert(f.CHANNEL_RESULTS.length === 4 && new Set(f.CHANNEL_RESULTS.map((item) => item.contributionMargin)).size > 1, "preço e margem por canal");
assert(f.PRICING_SCENARIOS.some((item) => item.id === "premium"), "cenário premium");
assert(f.PRICING_SCENARIOS.some((item) => item.id === "market"), "cenário alinhado");
assert(f.PRICING_SCENARIOS.some((item) => item.id === "review"), "cenário de reavaliação");
assert(f.PRICING_SCENARIOS.every((item) => item.autoApply === false), "nenhuma alteração automática");
console.log(`[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
