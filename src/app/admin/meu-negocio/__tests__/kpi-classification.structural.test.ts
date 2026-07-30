(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("node:fs") as typeof import("node:fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("node:path") as typeof import("node:path");
const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const dashboard = read("src/app/admin/meu-negocio/_command-center-dashboard.tsx");
const waterfall = read("src/app/admin/meu-negocio/_business-result-waterfall.tsx");
let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("\n[test] classificação aplicada aos KPIs principais (Fase 18) -- Faturamento, Pedidos, Ticket, CMV real/teórico, Lacuna, Resultado, Saldo, Reserva, Produtos sem ficha, Estoque");
{
  // Faturamento: já usa BusinessMetricValue completo (sessão anterior) -- confirmado em revenue-ui.structural.test.ts.
  // Pedidos, Ticket médio, CMV real, CMV teórico, Lacuna, Saldo, Estoque, Reserva-atual (KPI numérico) e Produtos-sem-ficha
  // passam todos pelo mesmo componente ExecutiveMetric/CompactKpi -- um único ponto de aplicação cobre todos.
  assert(dashboard.includes("<DataClassificationBadge classification={classifyLegacyMetric(metric)}"), "ExecutiveMetric (usado por Pedidos, Ticket médio, CMV real, CMV teórico, Lacuna, Saldo, Estoque) mostra a classificação real, não mais um texto fixo \"Simulado\"/\"Calculado\"");
  assert(!dashboard.includes('metric.state === "simulated" ? "Simulado" : "Calculado"'), "texto ad-hoc antigo foi substituído pelo badge canônico");
  assert(dashboard.includes('<DataClassificationBadge classification="SIMULATED" />') , "CompactKpi (Reserva atual, Produtos sem ficha, Margem de contribuição) mostra o badge canônico");
  assert(waterfall.includes('<DataClassificationBadge classification="SIMULATED"'), "Resultado gerencial (cascata) mostra o badge canônico, não mais um span estilizado à mão");
}

console.log("\n[test] Visão simples vs Modo Gestor -- diferença estrutural real, não só o texto do botão (Fase 16)");
{
  assert(dashboard.includes("managerMode ? (") && dashboard.includes('data-testid="request-manager-mode"'), "indicadores complementares só existem no DOM em Modo Gestor; Visão simples mostra um convite para abrir o Modo Gestor em vez do conteúdo técnico");
  assert(dashboard.includes("onRequestManagerMode"), "convite de Visão simples realmente troca para o Modo Gestor (não é um link morto)");
}

console.log(`[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
