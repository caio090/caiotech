/**
 * Real behavioral tests for src/lib/stock/calculations.ts — no jest/vitest
 * in this project (established pattern). Executes the actual production
 * module (zero framework imports, only type-only imports which Node's
 * native TS stripping erases) via Node's native TypeScript support.
 *
 *   node src/lib/stock/__tests__/calculations.test.ts
 */
(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const calc = require("../calculations.ts") as typeof import("../calculations");
const {
  calculateReplenishmentPoint, calculateStockCoverageDays, isBelowReplenishmentPoint,
  applyStockTransfer, totalAcrossLocations, calculateInventoryCount,
} = calc;

let passed = 0;
let failed = 0;
function assert(condition: boolean, label: string) {
  if (condition) { passed++; console.log(`  ok   - ${label}`); }
  else { failed++; console.error(`  FAIL - ${label}`); }
}

console.log("[test] calculateReplenishmentPoint — consumo médio diário × prazo de entrega + estoque de segurança");
{
  assert(calculateReplenishmentPoint({ averageDailyConsumption: 6.5, supplierLeadTimeDays: 3, safetyStock: 10 }) === 29.5, "6.5 × 3 + 10 = 29.5");
  assert(calculateReplenishmentPoint({ averageDailyConsumption: 0, supplierLeadTimeDays: 3, safetyStock: 10 }) === 10, "sem consumo médio, ponto de reposição é só o estoque de segurança");
  assert(calculateReplenishmentPoint({ averageDailyConsumption: -5, supplierLeadTimeDays: 3, safetyStock: 10 }) === 10, "consumo negativo é tratado como zero, nunca reduz o ponto de reposição");
}

console.log("\n[test] calculateStockCoverageDays — nunca divide por zero");
{
  const withConsumption = calculateStockCoverageDays({ availableQuantity: 40, averageDailyConsumption: 10 });
  assert(withConsumption.days === 4, "40 ÷ 10 = 4 dias");
  assert(withConsumption.label.includes("4 dias"), "label em linguagem humana menciona os dias");

  const zeroConsumption = calculateStockCoverageDays({ availableQuantity: 40, averageDailyConsumption: 0 });
  assert(zeroConsumption.days === null, "consumo médio zero nunca produz Infinity/NaN — retorna null explicitamente");

  const oneDay = calculateStockCoverageDays({ availableQuantity: 5, averageDailyConsumption: 5 });
  assert(oneDay.label.includes("1 dia") && !oneDay.label.includes("1 dias"), "singular correto para exatamente 1 dia");
}

console.log("\n[test] isBelowReplenishmentPoint");
{
  assert(isBelowReplenishmentPoint(5, 10) === true, "5 < 10 está abaixo do ponto de reposição");
  assert(isBelowReplenishmentPoint(10, 10) === false, "igual ao ponto de reposição não conta como abaixo");
}

console.log("\n[test] applyStockTransfer — nunca permite saldo negativo, preserva o total consolidado");
{
  const from = { itemId: "x", locationId: "central" as const, theoreticalQuantity: 10, physicalQuantity: null, unitValue: 2 };
  const to = { itemId: "x", locationId: "kitchen" as const, theoreticalQuantity: 3, physicalQuantity: null, unitValue: 2 };

  const totalBefore = totalAcrossLocations([from, to], "x");
  const ok = applyStockTransfer({ quantity: 4, from, to });
  assert(ok.ok === true, "transferência dentro do saldo disponível é aceita");
  if (ok.ok && ok.updatedBalances) {
    assert(ok.updatedBalances.from.theoreticalQuantity === 6, "origem reduzida corretamente (10 - 4 = 6)");
    assert(ok.updatedBalances.to.theoreticalQuantity === 7, "destino aumentado corretamente (3 + 4 = 7)");
    const totalAfter = totalAcrossLocations([ok.updatedBalances.from, ok.updatedBalances.to], "x");
    assert(totalAfter === totalBefore, "transferência preserva o total consolidado entre as duas localizações (13 antes e depois)");
  }

  const insufficient = applyStockTransfer({ quantity: 999, from, to });
  assert(insufficient.ok === false && insufficient.reason === "insufficient_balance", "transferência maior que o saldo disponível é rejeitada, nunca deixa saldo negativo");

  const invalidQty = applyStockTransfer({ quantity: -1, from, to });
  assert(invalidQty.ok === false && invalidQty.reason === "invalid_quantity", "quantidade negativa é rejeitada");

  const zeroQty = applyStockTransfer({ quantity: 0, from, to });
  assert(zeroQty.ok === false && zeroQty.reason === "invalid_quantity", "quantidade zero é rejeitada");

  const sameLocation = applyStockTransfer({ quantity: 1, from, to: { ...from } });
  assert(sameLocation.ok === false && sameLocation.reason === "same_location", "origem e destino iguais é rejeitado");
}

console.log("\n[test] calculateInventoryCount — precisão e casos de borda");
{
  const perfect = calculateInventoryCount({ theoreticalQuantity: 100, countedQuantity: 100, unitValue: 2, theoreticalUnit: "kg", countedUnit: "kg" });
  assert(perfect.valid && perfect.precisionPercent === 100, "contagem exata = 100% de precisão");

  const divergent = calculateInventoryCount({ theoreticalQuantity: 100, countedQuantity: 90, unitValue: 2, theoreticalUnit: "kg", countedUnit: "kg" });
  assert(divergent.valid && divergent.precisionPercent === 90, "10% de divergência = 90% de precisão");
  assert(divergent.valid && divergent.differenceValue === -20, "diferença em reais: -10kg × R$2 = -R$20");

  const zeroBoth = calculateInventoryCount({ theoreticalQuantity: 0, countedQuantity: 0, unitValue: 1, theoreticalUnit: "un", countedUnit: "un" });
  assert(zeroBoth.valid && zeroBoth.precisionPercent === 100, "saldo teórico zero e contado zero = 100% (nada esperado, nada encontrado) — nunca NaN");

  const zeroTheoreticalNonzeroCounted = calculateInventoryCount({ theoreticalQuantity: 0, countedQuantity: 5, unitValue: 1, theoreticalUnit: "un", countedUnit: "un" });
  assert(zeroTheoreticalNonzeroCounted.valid && zeroTheoreticalNonzeroCounted.precisionPercent === 0, "saldo teórico zero mas algo foi contado = 0% de precisão, nunca divisão por zero");

  const negativeTheoretical = calculateInventoryCount({ theoreticalQuantity: -5, countedQuantity: 5, unitValue: 1, theoreticalUnit: "un", countedUnit: "un" });
  assert(!negativeTheoretical.valid && negativeTheoretical.invalidReason === "negative_theoretical", "saldo teórico negativo é um estado inválido, tratado explicitamente");

  const negativeCounted = calculateInventoryCount({ theoreticalQuantity: 5, countedQuantity: -5, unitValue: 1, theoreticalUnit: "un", countedUnit: "un" });
  assert(!negativeCounted.valid && negativeCounted.invalidReason === "negative_counted", "quantidade contada negativa é inválida");

  const unitMismatch = calculateInventoryCount({ theoreticalQuantity: 5, countedQuantity: 5, unitValue: 1, theoreticalUnit: "kg", countedUnit: "g" });
  assert(!unitMismatch.valid && unitMismatch.invalidReason === "unit_mismatch", "unidade incompatível é rejeitada, nunca comparada como se fosse a mesma");
}

console.log(`\n[test] stock/calculations — ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
})();
