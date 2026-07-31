(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const packs = require("../business-niche-packs.ts") as typeof import("../business-niche-packs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const registry = require("../platform-modules.ts") as typeof import("../platform-modules");
let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("\n[test 15] Niche pack reconhecido");
{
  assert(packs.BUSINESS_NICHE_PACKS.length === 5, "5 pacotes definidos (geral, alimentação, materiais, agência, construção civil)");
  const ids = packs.BUSINESS_NICHE_PACKS.map((p) => p.id);
  assert(new Set(ids).size === ids.length, "todos os pacotes têm id único");
  assert(packs.findNichePackById("food_service") !== undefined, "findNichePackById encontra um pacote real");
  assert(packs.findNichePackBySegment("food_service")?.id === "food_service", "findNichePackBySegment resolve corretamente");
}

console.log("\n[test 16] Módulos do niche pack existentes no registry de módulos");
{
  const knownModuleIds = new Set(registry.PLATFORM_MODULES.map((m) => m.id));
  for (const pack of packs.BUSINESS_NICHE_PACKS) {
    const unknown = [...pack.enabledModules, ...pack.recommendedModules].filter((id) => !knownModuleIds.has(id));
    assert(unknown.length === 0, `${pack.id}: todos os módulos referenciados existem em platform-modules.ts (desconhecidos: ${unknown.join(", ") || "nenhum"})`);
  }
}

console.log("\n[test 17] Alimentação");
{
  const pack = packs.findNichePackById("food_service")!;
  assert(pack.importantMetrics.includes("cmv"), "food_service tem CMV como métrica importante");
  assert(pack.seasonalOpportunities.length > 0, "food_service tem oportunidades sazonais mapeadas");
  assert(pack.productCostModel === "technical_sheet_cmv", "food_service usa modelo de custo de ficha técnica/CMV");
}

console.log("\n[test 18] Materiais de construção");
{
  const pack = packs.findNichePackById("construction_materials")!;
  assert(pack.terminology.customer === "Cliente/Obra", "construction_materials adapta terminologia (Cliente/Obra)");
  assert(pack.operationalTemplates.some((step) => step.id === "delivery_route"), "construction_materials tem template de rota de entrega");
}

console.log("\n[test 19] Agência");
{
  const pack = packs.findNichePackById("agency_services")!;
  assert(pack.importantMetrics.includes("margem_por_cliente"), "agency_services rastreia margem por cliente");
  assert(pack.financialInterpretationModel === "project_based_margin", "agency_services usa modelo de margem por projeto");
}

console.log("\n[test 20] Construção civil");
{
  const pack = packs.findNichePackById("construction_projects")!;
  assert(pack.importantMetrics.includes("avanco_fisico") && pack.importantMetrics.includes("avanco_financeiro"), "construction_projects rastreia avanço físico e financeiro");
  assert(pack.productCostModel === "planned_vs_actual_cost", "construction_projects usa modelo orçado vs. realizado");
}

console.log("\n[test] nenhum cliente real referenciado");
{
  const serialized = JSON.stringify(packs.BUSINESS_NICHE_PACKS);
  assert(!/duh lanches|pedreirão/i.test(serialized), "nenhum pacote referencia clientes reais (Duh Lanches, O Pedreirão)");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
