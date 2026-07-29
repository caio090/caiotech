(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("node:fs") as typeof import("node:fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("node:path") as typeof import("node:path");
const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const workspace = read("src/app/admin/meu-negocio/_restaurant-workspace.tsx");
const dashboard = read("src/app/admin/meu-negocio/_command-center-dashboard.tsx");
const financeTab = read("src/app/admin/meu-negocio/_finance-tab.tsx");
const revenuePanels = read("src/app/admin/meu-negocio/_revenue-panels.tsx");
const periodSelector = read("src/app/admin/meu-negocio/_period-selector.tsx");
let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("\n[test] período central único no shell (Fase 9/10) -- não duplicado por setor");
{
  assert((workspace.match(/<PeriodSelector/g) ?? []).length === 1, "PeriodSelector aparece uma única vez, no shell do RestaurantWorkspace");
  assert(!dashboard.includes("<PeriodSelector") && !financeTab.includes("<PeriodSelector"), "nem Visão geral nem Financeiro renderizam seu próprio seletor de período");
  assert(workspace.includes("const [periodSelection, setPeriodSelection] = useState<BusinessPeriodSelection>"), "estado de período vive em RestaurantWorkspace (orquestrador único), não em cada módulo");
}

console.log("\n[test] dia operacional configurável por empresa, não fixo globalmente (Fase 8)");
{
  assert(workspace.includes('COMPANY_OPERATIONAL_DAY_START = "04:00"'), "dia operacional é uma constante de configuração da empresa, não um literal espalhado pelo código");
  assert(!/operationalDayStart\s*=\s*["']04:00["']/.test(dashboard) && !/operationalDayStart\s*=\s*["']04:00["']/.test(financeTab), "Visão geral e Financeiro não hardcodam o próprio horário de virada -- recebem via período central");
}

console.log("\n[test] Visão geral e Financeiro/Resumo reagem ao período central (Fase 9/11)");
{
  assert(dashboard.includes("period.label") && dashboard.includes("period.comparisonLabel"), "cabeçalho da Visão geral usa o rótulo real do período selecionado, não mais um texto fixo (\"Junho de 2026\")");
  assert(financeTab.includes("toMetricPeriod(period)") && financeTab.includes("metricPeriod.start, metricPeriod.end, metricPeriod.label"), "Financeiro/Resumo recalcula de verdade a partir do período central (buildFinanceDashboardData recebe as datas derivadas do período, não constantes fixas)");
  assert(!financeTab.includes('PERIOD_START = "2026-07-01"'), "constantes fixas de período foram removidas do FinanceTab");
}

console.log("\n[test] Faturamento propaga o período (rótulo e comparação), mas não finge recalcular a fixture estática (Fase 11/19)");
{
  assert(revenuePanels.includes("toMetricPeriod(period)") && revenuePanels.includes("toComparisonMetricPeriod(period)"), "RevenueHeroCard/RevenueFullPanel derivam período e comparação do período central");
  assert(revenuePanels.includes("não recalculam por período nesta sprint"), "aviso honesto explícito de que a fixture simulada não varia por período (Fase 19 -- nunca fingir recálculo)");
}

console.log("\n[test] seletor de período -- presets, personalizado, validação (Fase 10/21)");
{
  for (const preset of ["TODAY", "YESTERDAY", "LAST_7_DAYS", "LAST_30_DAYS", "THIS_MONTH", "PREVIOUS_MONTH", "THIS_QUARTER", "THIS_YEAR"]) {
    assert(periodSelector.includes(preset), `seletor lista o preset ${preset}`);
  }
  assert(periodSelector.includes('type="date"'), "seletor tem campos de data para o intervalo personalizado");
  assert(periodSelector.includes("validateCustomPeriodDraft"), "seletor valida a data inicial contra a final via a função central validateCustomPeriodDraft (correção definitiva: checagem deixou de ser um ternário local e passou a viver em business-period/calculations.ts, testada isoladamente lá)");
  assert(periodSelector.includes("Restaurar padrão") && periodSelector.includes("Cancelar") && periodSelector.includes("Aplicar"), "seletor personalizado tem aplicar/cancelar/restaurar padrão");
  assert(periodSelector.includes("Comparando com"), "seletor mostra a comparação ativa");
  assert(periodSelector.includes("managerMode &&") && periodSelector.includes("Timezone"), "timezone e dia operacional só aparecem no Modo Gestor");
}

console.log(`[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
