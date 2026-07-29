(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("node:fs") as typeof import("node:fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("node:path") as typeof import("node:path");
const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const dashboard = read("src/app/admin/meu-negocio/_command-center-dashboard.tsx");
const waterfall = read("src/app/admin/meu-negocio/_business-result-waterfall.tsx");
const revenuePanels = read("src/app/admin/meu-negocio/_revenue-panels.tsx");
let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("\n[test] período selecionado e base simulada nunca aparecem ambíguos (Fase 8/10 -- achado do QA visual)");
{
  assert(!/>\s*Junho de 2026\s*·/.test(dashboard) && !dashboard.includes('>{metric.period} ·'), "cards de KPI nunca mostram \"Junho de 2026\" nu, sem qualificação");
  assert(dashboard.includes("Base simulada: {metric.period}"), "cards de KPI rotulam explicitamente \"Base simulada: Junho de 2026\", não \"Junho de 2026\" como se fosse o período ativo");
  assert(!waterfall.includes('>Junho de 2026 ·'), "cascata (Resultado gerencial) não mostra \"Junho de 2026\" nu");
  assert(waterfall.includes("Base simulada: Junho de 2026"), "cascata rotula explicitamente a base simulada");
}

console.log("\n[test] cabeçalho da Visão geral mostra o período selecionado de verdade, nunca a base simulada em seu lugar (Fase 10)");
{
  assert(dashboard.includes("{period.label}") && dashboard.includes("{period.comparisonLabel}"), "cabeçalho principal usa o período central real, não uma string fixa");
  assert(!/Alimentação · Junho de 2026/.test(dashboard), "cabeçalho principal não hardcoda mais junho de 2026");
}

console.log("\n[test] aviso local (não apenas um banner distante) quando a métrica não recalcula por período (Fase 8/9)");
{
  assert(dashboard.includes("Valor demonstrativo de referência; não recalcula para o período selecionado."), "cada card de KPI (ExecutiveMetric) mostra o aviso localmente, junto ao próprio valor");
  assert(waterfall.includes("Valor demonstrativo de referência; não recalcula para o período selecionado."), "cascata mostra o mesmo aviso localmente");
  // RevenueHeroCard: o aviso precisa estar visível de cara, não só depois de abrir "Como calculamos" (achado do QA: referência a junho sem explicação suficiente).
  const heroCard = revenuePanels.split("export function RevenueHeroCard")[1]?.split("export function")[0] ?? "";
  const beforeShowFormula = heroCard.split("{showFormula &&")[0];
  assert(beforeShowFormula.includes("não recalcula para o período selecionado"), "RevenueHeroCard mostra o aviso ANTES do toggle \"Como calculamos\" (visível sem clique extra)");
}

console.log("\n[test] nenhuma fixture foi alterada para simular reação ao período (Fase 9 -- restrição absoluta)");
{
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fixtures = require("../../../../lib/business-command-center/fixtures.ts") as typeof import("../../../../lib/business-command-center/fixtures");
  const cmvActual = fixtures.COMMAND_CENTER_METRICS.find((m) => m.id === "cmv_actual");
  assert(cmvActual?.value === 37, "valor de CMV real (fixture) permanece 37, não foi alterado para parecer reagir ao período");
  const cashBalance = fixtures.COMMAND_CENTER_METRICS.find((m) => m.id === "cash_balance");
  assert(cashBalance?.value === 1845000, "valor de Saldo atual (fixture) permanece 1.845.000 centavos, inalterado");
}

console.log(`[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
