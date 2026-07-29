(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("node:fs") as typeof import("node:fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("node:path") as typeof import("node:path");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fixtures = require("../../../../lib/business-command-center/fixtures.ts") as typeof import("../../../../lib/business-command-center/fixtures");
const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const workspace = read("src/app/admin/meu-negocio/_restaurant-workspace.tsx");
const dashboard = read("src/app/admin/meu-negocio/_command-center-dashboard.tsx");
let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("\n[test] destinos com subárea corretos nos dados (regressão do QA visual)");
{
  const metricById = Object.fromEntries(fixtures.COMMAND_CENTER_METRICS.map((metric) => [metric.id, metric]));
  const alertById = Object.fromEntries(fixtures.COMMAND_CENTER_ALERTS.map((alert) => [alert.id, alert]));

  assert(metricById.cmv_actual.destination === "cmv_menu" && metricById.cmv_actual.destinationDetail === "CMV real", "CMV real -> CMV e Cardápio / CMV real");
  assert(metricById.cmv_gap.destination === "cmv_menu" && metricById.cmv_gap.destinationDetail === "Diferença e investigação", "Lacuna de CMV -> CMV e Cardápio / Diferença e investigação");
  assert(alertById["cmv-gap"].destination === "cmv_menu" && alertById["cmv-gap"].destinationDetail === "Diferença e investigação", "alerta de lacuna de CMV -> Diferença e investigação");
  assert(metricById.cash_balance.destination === "finance" && metricById.cash_balance.destinationDetail === "Resumo", "Saldo atual -> Financeiro / Resumo");
  assert(metricById.reserve_days.destination === "finance" && metricById.reserve_days.destinationDetail === "Reserva", "Reserva -> Financeiro / Reserva");
  assert(alertById.reserve.destination === "finance" && alertById.reserve.destinationDetail === "Reserva", "alerta de reserva -> Financeiro / Reserva");
  assert(alertById["missing-sheet"].destination === "products_pricing" && alertById["missing-sheet"].destinationDetail === "Fichas técnicas", "Produtos sem ficha -> Produtos e Fichas / Fichas técnicas");
  assert(metricById.stock_value.destination === "stock" && metricById.stock_value.destinationDetail === "Visão geral", "Estoque -> Estoque e Compras / Visão geral");
  assert(metricById.cmv_actual.trace.linksToFixData[0].destinationDetail === "CMV real", "trace de CMV real propaga a subárea para \"Corrigir base\"/\"Abrir setor\"");
}

console.log("\n[test] navegação profunda é atômica e não depende de animação");
{
  assert(workspace.includes("function navigateFromLegacy(section: BusinessModuleKey, detail?: string)"), "navigateFromLegacy aceita subárea opcional");
  assert(workspace.includes("setActiveSection(targetArea)") && workspace.includes("setSubsections((current) => ({ ...current, [targetArea]: resolvedDetail }))"), "área e subárea são setadas juntas na mesma função (atômico)");
  assert(!/navigateFromLegacy[\s\S]{0,400}setTimeout/.test(workspace), "navegação não depende de setTimeout");
  assert(workspace.includes("options.includes(detail)"), "subárea recebida é validada contra a lista canônica da área de destino antes de ser aplicada");
  assert(dashboard.includes("onNavigate(metric.destination, metric.destinationDetail)"), "cards de KPI repassam a subárea ao navegar");
  assert(dashboard.includes(`onNavigate(alert.destination, alert.destinationDetail)`), "alertas repassam a subárea ao navegar");
  assert(dashboard.includes(`onNavigate("finance", "Reserva")`), "atalho de Reserva no InsightPanel aponta para a subárea Reserva");
}

console.log("\n[test] nenhuma regressão nos destinos sem subárea explícita");
{
  assert(dashboard.includes(`onNavigate("products_pricing")`), "atalho genérico de Produtos continua funcionando (cai na primeira subárea)");
  assert(dashboard.includes(`onNavigate("stock")`), "atalho genérico de Estoque continua funcionando");
  assert(workspace.includes(`legacyDetail = section === "technical_sheets" ? "Fichas técnicas" : section === "purchasing" ? "Lista de compras" : undefined`), "compatibilidade retroativa preservada para chamadores que só passam a área (ex.: cross-links do Financeiro)");
}

console.log(`[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
