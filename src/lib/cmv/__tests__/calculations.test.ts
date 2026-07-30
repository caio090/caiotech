(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const c = require("../calculations.ts") as typeof import("../calculations");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const f = require("../fixtures.ts") as typeof import("../fixtures");
let passed = 0, failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };
const near = (a: number | null, b: number, tolerance = 0.0001) => a !== null && Math.abs(a - b) <= tolerance;

assert(c.calculateProductTheoreticalCost(f.CMV_PRODUCTS[0], f.CMV_POLICY) === 942, "custo teórico inclui embalagem configurada");
assert(c.calculateTotalTheoreticalConsumption(f.CMV_PRODUCTS, f.CMV_POLICY) > 0, "consumo teórico consolidado");
assert(f.CMV_THEORETICAL.cmvPercentage !== null, "CMV teórico calculado");
assert(f.CMV_PRODUCTS[4].quantitySold > 0 && f.CMV_THEORETICAL.products[4].theoreticalConsumption === null, "produto sem ficha não vira custo zero");
assert(f.CMV_THEORETICAL.uncoveredRevenue === f.CMV_PRODUCTS[3].netRevenue + f.CMV_PRODUCTS[4].netRevenue, "receita sem cobertura explícita");
assert(c.calculateActualConsumption(1000, 500, 100, 700) === 700, "consumo real");
assert(c.calculateActualConsumption(null, 500, 0, 700) === null, "estoque inicial ausente");
assert(c.calculateActualConsumption(1000, 500, 0, null) === null, "estoque final ausente");
assert(c.calculateActualCmvPercentage(100, 0) === null, "divisão por zero protegida");
assert(f.CMV_ACTUAL.actualConsumption !== null, "CMV real consolidado");
assert(f.CMV_ACTUAL.locations[0].internalTransfersOut === f.CMV_ACTUAL.locations[1].internalTransfersIn, "transferência interna balanceada");
assert(c.calculateConsolidatedInventoryConsumption(f.CMV_LOCATIONS) === 1920000, "transferências se anulam no consolidado");
assert(f.CMV_GAP.amount === (f.CMV_ACTUAL.actualConsumption ?? 0) - f.CMV_THEORETICAL.theoreticalConsumption, "lacuna em reais");
assert(f.CMV_GAP.percentagePoints === (f.CMV_ACTUAL.cmvPercentage ?? 0) - (f.CMV_THEORETICAL.cmvPercentage ?? 0), "lacuna em pontos percentuais");
assert(f.CMV_GAP.relativeToTheoretical !== null, "diferença relativa");
assert(f.CMV_COVERAGE.mappedProducts === 4, "produtos mapeados");
assert(f.CMV_COVERAGE.productsWithoutSheet === 1, "produto sem ficha contado");
assert(f.CMV_COVERAGE.incompleteSheets === 1, "ficha incompleta contada");
assert(f.CMV_COVERAGE.missingData.length >= 2, "decomposição de dados ausentes");
assert(c.calculateCoverage([], 0, 0, 0, f.CMV_POLICY).confidence === "insufficient", "cobertura vazia insuficiente");
assert(c.classifyCmvGap(0.05, 0.9, f.CMV_POLICY) === "critical", "lacuna crítica");
assert(c.classifyCmvGap(0.05, 0.2, f.CMV_POLICY) === "inconclusive", "baixa cobertura prevalece");
assert(c.calculateUnitContributionMargin(2500, [862, 80, 75]) === 1483, "margem de contribuição unitária");
assert(c.calculateUnitContributionMargin(2500, [862, null]) === null, "taxa ausente não assume zero");
assert(near(c.calculateContributionMarginPercentage(1000, 2500), 0.4), "percentual de margem");
assert(near(c.calculateProductPopularity(20, 100), 0.2), "popularidade");
assert(c.calculateProductPopularity(20, 0) === 0, "popularidade sem divisão por zero");
assert(Number.isFinite(f.CMV_COVERAGE.finalCoverage), "nenhum NaN/Infinity na cobertura");
assert(f.CMV_POLICY.targetCmvPercentage === 0.32, "meta simulada configurada");
assert(f.CMV_POLICY.timezone === "America/Fortaleza", "timezone explícito");

console.log(`[result] ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
})();
