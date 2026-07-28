(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const c = require("../calculations.ts") as typeof import("../calculations");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const f = require("../fixtures.ts") as typeof import("../fixtures");
let passed = 0, failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };
assert(c.classifyMenuEngineeringQuadrant(true, 2000, 1000) === "star", "quadrante estrela");
assert(c.classifyMenuEngineeringQuadrant(true, 500, 1000) === "popular_low_margin", "popular margem baixa");
assert(c.classifyMenuEngineeringQuadrant(false, 2000, 1000) === "profitable_low_popularity", "rentável pouco vendido");
assert(c.classifyMenuEngineeringQuadrant(false, 500, 1000) === "low_performance", "baixo desempenho");
assert(f.MENU_ENGINEERING.length === f.CMV_PRODUCTS.length, "todos os produtos classificados");
assert(f.MENU_ENGINEERING.every((item) => item.suggestedAction.length > 10), "todos têm ação sugerida");
assert(Math.abs(f.MENU_ENGINEERING.reduce((sum, item) => sum + item.popularity, 0) - 1) < 0.0001, "popularidade soma 100%");
assert(c.calculateMenuPopularityAverage(f.CMV_THEORETICAL.products) === 0.2, "média do mix configurável");
const minQuantity = { ...f.MENU_THRESHOLDS, popularityMethod: "minimum_quantity" as const, minimumQuantity: 600 };
assert(c.classifyPopularity(f.CMV_THEORETICAL.products[0], f.CMV_THEORETICAL.products, minQuantity), "limite por quantidade");
assert(!c.classifyPopularity(f.CMV_THEORETICAL.products[1], f.CMV_THEORETICAL.products, minQuantity), "quantidade abaixo do limite");
assert(f.MENU_ENGINEERING.some((item) => item.quadrant === "star"), "fixture demonstra estrela");
assert(f.MENU_ENGINEERING.some((item) => item.quadrant !== "star"), "fixture demonstra decisão diferente");
assert(f.MENU_ENGINEERING.every((item) => Number.isFinite(item.popularity)), "nenhum NaN/Infinity");
assert(f.MENU_ENGINEERING.find((item) => item.productId === "drink")?.contributionMarginUnit === null, "taxa/custo ausente permanece indisponível");

console.log(`[result] ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
})();
