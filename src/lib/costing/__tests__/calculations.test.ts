/**
 * Real behavioral tests for src/lib/costing/calculations.ts, verifying the
 * exact worked example numbers specified by the ticket (Smash de Exemplo
 * and the CMV real/teórico report), not just formula shape.
 *
 *   node src/lib/costing/__tests__/calculations.test.ts
 */
(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const calc = require("../calculations.ts") as typeof import("../calculations");
const {
  calculateCorrectionFactor, calculateUsableUnitCost, calculateCookingYield, calculateUsedQuantityCost,
  calculateIngredientsCost, calculateTechnicalSheetTotalCost, calculateSheetCmvPercentage, calculateContributionMargin,
  calculateActualConsumption, calculateActualCmvPercentage, calculateTheoreticalConsumptionFromSales,
  calculateTheoreticalCmvPercentage, calculateCmvGap, calculateCmvGapPercentagePoints,
} = calc;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fixtures = require("../fixtures.ts") as typeof import("../fixtures");
const { SMASH_EXAMPLE_SHEET } = fixtures;

let passed = 0;
let failed = 0;
function assert(condition: boolean, label: string) {
  if (condition) { passed++; console.log(`  ok   - ${label}`); }
  else { failed++; console.error(`  FAIL - ${label}`); }
}

console.log("[test] Ficha técnica — fator de correção, custo utilizável, rendimento de cocção (perda de limpeza ≠ perda de cocção)");
{
  assert(calculateCorrectionFactor(130, 100) === 1.3, "fator de correção = peso bruto ÷ peso líquido (130 ÷ 100 = 1.3)");
  assert(calculateCorrectionFactor(100, 0) === null, "peso líquido zero nunca causa divisão por zero — retorna null");

  assert(calculateUsableUnitCost(50, 25) === 2, "custo utilizável = valor comprado ÷ quantidade líquida utilizável (50 ÷ 25 = 2)");
  assert(calculateUsableUnitCost(50, 0) === null, "quantidade líquida zero nunca causa divisão por zero");

  const yieldValue = calculateCookingYield(78, 100);
  assert(yieldValue === 0.78, "rendimento de cocção = peso após preparo ÷ peso antes do preparo (78 ÷ 100 = 0.78), sobre o peso JÁ líquido, nunca o peso bruto");
  assert(calculateCookingYield(78, 0) === null, "peso antes do preparo zero nunca causa divisão por zero");

  assert(calculateUsedQuantityCost(2, 25) === 50, "custo da quantidade utilizada = custo utilizável × quantidade utilizada");
}

console.log("\n[test] Exemplo Smash — números exatos do ticket");
{
  const ingredientsCost = calculateIngredientsCost(SMASH_EXAMPLE_SHEET);
  assert(Math.round(ingredientsCost * 100) / 100 === 8.62, `custo dos ingredientes é R$ 8,62 (obtido: ${ingredientsCost})`);

  const totalCost = calculateTechnicalSheetTotalCost(SMASH_EXAMPLE_SHEET);
  assert(Math.round(totalCost * 100) / 100 === 8.62, "custo total sem embalagem preenchida é igual ao custo dos ingredientes");

  const cmv = calculateSheetCmvPercentage(SMASH_EXAMPLE_SHEET);
  assert(cmv === 34.48, `CMV do produto é 34,48% (obtido: ${cmv})`);

  const margin = calculateContributionMargin(SMASH_EXAMPLE_SHEET);
  assert(Math.round(margin * 100) / 100 === 16.38, `margem de contribuição é R$ 25,00 − R$ 8,62 = R$ 16,38 (obtido: ${margin})`);

  assert(SMASH_EXAMPLE_SHEET.isExample === true, "ficha do Smash está marcada como exemplo (isExample)");
  assert(SMASH_EXAMPLE_SHEET.packagingCost === null, "embalagem inicialmente não preenchida, conforme o ticket");
}

console.log("\n[test] CMV real vs. teórico — números exatos do ticket");
{
  const actualConsumption = calculateActualConsumption({ openingInventoryValue: 12_000, purchasesValue: 35_000, closingInventoryValue: 10_000 });
  assert(actualConsumption === 37_000, `consumo real é R$ 37.000 (obtido: ${actualConsumption})`);

  const actualCmv = calculateActualCmvPercentage({ actualConsumption, sales: 100_000 });
  assert(actualCmv === 37, `CMV real é 37% (obtido: ${actualCmv})`);

  const theoreticalCmv = calculateTheoreticalCmvPercentage({ theoreticalConsumption: 33_000, sales: 100_000 });
  assert(theoreticalCmv === 33, `CMV teórico é 33% (obtido: ${theoreticalCmv})`);

  const gap = calculateCmvGap({ actualConsumption, theoreticalConsumption: 33_000 });
  assert(gap === 4_000, `lacuna é R$ 4.000 (obtido: ${gap})`);

  const gapPp = calculateCmvGapPercentagePoints({ actualCmvPercentage: actualCmv ?? 0, theoreticalCmvPercentage: theoreticalCmv ?? 0 });
  assert(gapPp === 4, `lacuna percentual é 4 pontos percentuais (obtido: ${gapPp})`);

  assert(calculateActualCmvPercentage({ actualConsumption: 100, sales: 0 }) === null, "vendas zero nunca causa divisão por zero no CMV real");
  assert(calculateTheoreticalCmvPercentage({ theoreticalConsumption: 100, sales: 0 }) === null, "vendas zero nunca causa divisão por zero no CMV teórico");

  const fromSalesMix = calculateTheoreticalConsumptionFromSales([
    { ingredientCostPerUnit: 8.62, unitsSold: 100 },
    { ingredientCostPerUnit: 5.00, unitsSold: 50 },
  ]);
  assert(fromSalesMix === 8.62 * 100 + 5.00 * 50, "consumo teórico a partir do mix de vendas soma custo de ingrediente × unidades vendidas por produto");
}

console.log(`\n[test] costing/calculations — ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
})();
