(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const c = require("../calculations.ts") as typeof import("../calculations");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const f = require("../fixtures.ts") as typeof import("../fixtures");
let passed = 0, failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };
assert(c.calculateProductSalesMixShare(20, 100) === 0.2, "participação usa quantidade total vendida");
assert(c.calculateProductSalesMixShare(20, 5) !== 0.2, "não divide pelo número de itens");
assert(c.calculatePopularityThreshold({ method: "average_share", value: 0 }, 5) === 0.2, "participação média esperada");
assert(c.calculatePopularityThreshold({ method: "configured_percentage", value: 0.15 }, 5) === 0.15, "limite configurável");
assert(c.calculatePopularityThreshold({ method: "by_category", value: 0.1, categoryValues: { lanche: 0.25 } }, 5, "lanche") === 0.25, "regra por categoria");
const weighted = c.calculateWeightedMenuCmv(f.SALES_MIX);
const simple = f.SALES_MIX.reduce((sum, item) => sum + item.theoreticalCostTotal / item.netRevenue, 0) / f.SALES_MIX.length;
assert(weighted !== null && Math.abs(weighted - simple) > 0.001, "CMV ponderado não é média simples");
const moreHigh = c.simulateSalesMixCmv(f.SALES_MIX, { id: "high", label: "mais alto CMV", quantities: { "high-cmv": 1000 } });
assert((moreHigh.consolidatedCmv ?? 0) > (f.SALES_MIX_SUMMARY.consolidatedCmv ?? 0), "produto de CMV alto aumenta consolidado");
assert(f.SALES_MIX_SUMMARY.products.every((item) => item.contributionTotal === item.netRevenue - item.theoreticalCostTotal), "contribuição total");
assert(f.SALES_MIX_SUMMARY.products.every((item) => item.quantityShare >= 0), "participação válida");
assert(c.compareSalesMixPeriods(f.SALES_MIX_SUMMARY, f.PREVIOUS_MIX_SUMMARY) !== null, "mudança do mix em pontos percentuais");
console.log(`[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
