(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const reports = require("../view-modes.ts") as typeof import("../view-modes");
let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("\n[test 22] Relatórios Essential");
{
  const essential = reports.buildEssentialView(reports.DEMO_REPORT_SOURCE);
  assert(essential.totalSold === reports.DEMO_REPORT_SOURCE.grossRevenue, "totalSold vem direto de grossRevenue da fonte");
  assert(essential.mainAlert !== null, "alerta principal aparece quando receivedNet < expectedNet na fixture");
  assert(typeof essential.nextAction === "string" && essential.nextAction.length > 0, "sempre há uma próxima ação, mesmo sem alerta");
}

console.log("\n[test 23] Relatórios Analytical");
{
  const analytical = reports.buildAnalyticalView(reports.DEMO_REPORT_SOURCE);
  assert(analytical.divergence === reports.DEMO_REPORT_SOURCE.expectedNet - reports.DEMO_REPORT_SOURCE.receivedNet, "divergence = expectedNet - receivedNet");
  assert(Number.isFinite(analytical.effectiveRate), "effectiveRate é um número finito, nunca NaN/Infinity");
  assert(analytical.channels.length > 0 && analytical.paymentMethods.length > 0, "visão analítica expõe canais e formas de pagamento");
}

console.log("\n[test 24] Mesma fonte nos dois modos");
{
  const essential = reports.buildEssentialView(reports.DEMO_REPORT_SOURCE);
  const analytical = reports.buildAnalyticalView(reports.DEMO_REPORT_SOURCE);
  assert(essential.totalReceived === analytical.receivedNet, "totalReceived (Essencial) e receivedNet (Analítica) vêm do mesmo campo da fonte -- nenhum motor duplicado");
  assert(essential.averageTicket === reports.DEMO_REPORT_SOURCE.averageTicket, "Essencial não recalcula averageTicket -- lê direto da fonte única");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
