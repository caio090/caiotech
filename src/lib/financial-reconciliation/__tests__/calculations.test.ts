(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const recon = require("../calculations.ts") as typeof import("../calculations");
let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("\n[test 25] Conciliação sem NaN");
{
  const result = recon.calculateFinancialDifference(0, 100);
  assert(!Number.isNaN(result.difference), "difference nunca é NaN");
  assert(result.percentageDifference === null, "percentageDifference é null (não calculável) quando expected=0, nunca NaN");
}

console.log("\n[test 26] Conciliação sem Infinity");
{
  const result = recon.calculateFinancialDifference(0, 100);
  assert(result.percentageDifference !== Infinity && result.percentageDifference !== -Infinity, "percentageDifference nunca é Infinity mesmo com expected=0");
  const normal = recon.calculateFinancialDifference(1000, 900);
  assert(Number.isFinite(normal.percentageDifference), "caso normal (expected != 0) retorna um percentual finito");
  assert(normal.percentageDifference === -10, "percentual calculado corretamente: (900-1000)/1000*100 = -10");
}

console.log("\n[test 27] Split separado de taxa");
{
  const deductions: import("../types").FinancialDeduction[] = [
    { type: "fee", amount: 100, source: "gateway_report" },
    { type: "split", amount: 50, source: "gateway_report" },
    { type: "commission", amount: 30, source: "declared" },
  ];
  const totals = recon.sumDeductionsByType(deductions);
  assert(totals.fee === 100 && totals.split === 50 && totals.commission === 30, "fee, split e commission somam separadamente, nunca misturados em um único total");
  assert(totals.tax === 0, "tipo sem deduções registradas fica em 0 -- mas isso é 'nenhuma deduzida ainda', não uma confirmação de valor zero (ver settlement abaixo)");

  const settlement = recon.buildFinancialSettlement(1000, deductions);
  assert(settlement.netAmount === 1000 - 100 - 50 - 30, "netAmount = grossAmount - soma de todas as deduções");

  const result = recon.reconcile({ grossAmount: 1000, deductions, expectedNet: 820, actualNet: 815 });
  assert(result.deductionsByType.fee === 100, "reconcile() expõe deductionsByType com fee isolado de split/commission");
  assert(Number.isFinite(result.difference.percentageDifference!), "reconcile() nunca retorna NaN/Infinity mesmo com múltiplas deduções");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
