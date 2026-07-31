(function () {
let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("\n[test 21] BusinessProfile genérico");
{
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const types = require("../types.ts") as typeof import("../types");
  const profile: import("../types").BusinessProfile = {
    workspaceId: "workspace_demo",
    segment: "food_service",
    businessModel: "b2c",
    revenueModels: ["one_off_sale"],
    operationModel: "storefront",
    salesChannels: ["physical_store", "delivery_app"],
    locations: [{ city: "Exemplo", state: "CE", isPrimary: true }],
    teamSize: 5,
    customersType: "consumer",
    productsType: "physical_goods",
    seasonality: true,
    maturity: "structuring",
    mainProblems: ["margem baixa em alguns produtos"],
    objectives: ["aumentar ticket médio"],
    recommendedModules: [{ moduleId: "meu_negocio", reason: "gestão do dia a dia" }],
  };
  assert(profile.workspaceId === "workspace_demo", "BusinessProfile genérico é construível com os campos do contrato");
  assert(profile.locations[0].city !== "" && profile.locations[0].state !== "", "localização tem cidade e estado");
  assert(!/duh lanches|pedreirão/i.test(JSON.stringify(profile)), "fixture de teste não referencia cliente real");
  assert(typeof types === "object", "módulo de tipos carrega sem erro (contrato TS válido)");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
