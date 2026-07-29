(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const calc = require("../calculations.ts") as typeof import("../calculations");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fixtures = require("../fixtures.ts") as typeof import("../fixtures");
let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("\n[test] classifyLegacyMetric -- ponte honesta para a taxonomia canônica (Fase 18)");
{
  assert(calc.classifyLegacyMetric({ nature: "calculated", state: "simulated" }) === "SIMULATED", "state simulated vence, mesmo com nature calculated (a origem real é fixture, não cálculo real)");
  assert(calc.classifyLegacyMetric({ nature: "simulated", state: "unavailable" }) === "UNAVAILABLE", "state unavailable é reportado honestamente, independente de nature");
  assert(calc.classifyLegacyMetric({ nature: "calculated", state: "available" }) === "CALCULATED", "nature calculated com dado disponível -> calculado");
  assert(calc.classifyLegacyMetric({ nature: "integrated", state: "available" }) === "REAL_SYNCED", "nature integrated -> real sincronizado");
  assert(calc.classifyLegacyMetric({ nature: "imported", state: "available" }) === "REAL_IMPORTED", "nature imported -> real importado");
  assert(calc.classifyLegacyMetric({ nature: "manual", state: "available" }) === "REAL_MANUAL", "nature manual -> real informado");
}

console.log("\n[test] todas as métricas de exemplo hoje classificam como SIMULATED (Fase 18 -- \"quando a origem for fixture: SIMULATED\")");
{
  for (const metric of fixtures.COMMAND_CENTER_METRICS) {
    assert(calc.classifyLegacyMetric(metric) === "SIMULATED", `${metric.id} classifica como SIMULATED (state=${metric.state})`);
  }
}

console.log(`[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
