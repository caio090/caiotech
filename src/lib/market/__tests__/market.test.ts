(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const c = require("../calculations.ts") as typeof import("../calculations");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const f = require("../fixtures.ts") as typeof import("../fixtures");
let passed = 0, failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };
assert(c.calculateMarketMinimumPrice([2800, 3000, 3300]) === 2800, "mínimo");
assert(c.calculateMarketMedianPrice([2800, 3000, 3300]) === 3000, "mediana");
assert(c.calculateMarketAveragePrice([2800, 3000, 3300]) === 3033, "média");
assert(c.calculateMarketMaximumPrice([2800, 3000, 3300]) === 3300, "máximo");
assert(c.calculateMarketSampleQuality(1, 1, 1, 1) === "insufficient", "amostra única insuficiente");
assert(f.MARKET_BENCHMARK.sampleCount === 3, "somente comparáveis no benchmark");
assert(f.MARKET_BENCHMARK.promotionalCount === 1, "promoção separada");
assert(f.MARKET_BENCHMARK.discardedCount === 2, "parcial e promoção descartados");
assert(f.MARKET_BENCHMARK.confidence === "high", "confiança calculada");
assert(c.classifyMarketFreshness("2025-01-01", "2026-07-27", "manual_research", null, f.MARKET_FRESHNESS_POLICY) === "expired", "dado expirado");
const partial = f.MARKET_BENCHMARK.comparableResults.find((item) => item.comparableId === "partial");
assert(partial?.classification === "partially_comparable", "gramagem e composição geram comparabilidade parcial");
const channel = c.calculateMarketComparability(f.INTERNAL_MARKET_PRODUCT, { ...f.MARKET_COMPARABLES[0], id: "channel", channel: "marketplace_delivery" });
assert(channel.score < 1 && channel.limitations.some((item) => item.includes("canal")), "canal diferente explicado");
assert(c.calculateMarketMedianPrice([]) === null, "dados ausentes não viram zero");
assert(!f.MARKET_COMPARABLES.some((item) => /ifood|mcdonald|burger king/i.test(item.competitorLabel)), "nenhum concorrente real");
console.log(`[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
