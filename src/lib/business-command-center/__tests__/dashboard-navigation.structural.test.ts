(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("node:fs") as typeof import("node:fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("node:path") as typeof import("node:path");
const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const workspace = read("src/app/admin/meu-negocio/_restaurant-workspace.tsx");
const dashboard = read("src/app/admin/meu-negocio/_command-center-dashboard.tsx");
const waterfall = read("src/app/admin/meu-negocio/_business-result-waterfall.tsx");
const sources = read("src/app/admin/meu-negocio/_sources-tab.tsx");
const tokens = read("src/app/admin/meu-negocio/_dashboard-design-tokens.ts");
const globals = read("src/app/globals.css");
const packageJson = read("package.json");
let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

// Sprint Meu Negócio 2.1.2: "DNA & Estratégia" entrou entre Visão geral e
// Financeiro (restauração da camada estratégica dentro do Centro de Comando
// atual, sem remover nenhuma área existente) — nove áreas principais agora,
// não mais oito.
const navigation = ["Visão geral", "DNA & Estratégia", "Financeiro", "CMV e Cardápio", "Produtos e Fichas", "Estoque e Compras", "Relatórios", "Fontes e Integrações", "Configurações"];
let cursor = -1;
for (const label of navigation) { const next = workspace.indexOf(`label: "${label}"`, cursor + 1); assert(next > cursor, `ordem de navegação: ${label}`); cursor = next; }
assert((workspace.match(/label: "/g) ?? []).length === 9, "nove áreas principais (oito originais + DNA & Estratégia)");
assert(workspace.includes("Fichas técnicas") && workspace.includes("Vínculos do cardápio"), "Produtos e Fichas unificados com subáreas");
assert(workspace.includes("Estoque central") && workspace.includes("Lista de compras"), "Estoque e Compras unificados com subáreas");
assert(workspace.includes("setSubsections((current)"), "subárea preservada por área");
assert(workspace.includes("<select value={activeSection}"), "mobile usa seletor controlado");
assert(!workspace.includes("overflow-x-auto pb-1 scrollbar-none\" role=\"tablist"), "mobile não usa oito tabs espremidas");

for (const token of ["Indicadores principais", "Vendas e pedidos", "CMV real, teórico e meta", "Saldo de caixa projetado", "O que precisa da sua atenção", "Qualidade dos dados", "Ações rápidas"]) assert(dashboard.includes(token), `dashboard contém ${token}`);
assert(dashboard.includes("PRIMARY.includes") && dashboard.includes("2xl:grid-cols-6"), "seis KPIs principais");
assert(dashboard.includes("aria-labelledby") && dashboard.includes("aria-label"), "estrutura acessível");
assert(dashboard.includes("dashboardTokens.focus") && tokens.includes("focus-visible:ring-2"), "foco visível");
assert(dashboard.includes("motion-reduce") || tokens.includes("motion-reduce"), "reduced motion");
assert(tokens.includes("mn-dashboard-theme") && tokens.includes("bg-[#090b10]") && tokens.includes("text-[#f6f7fb]"), "canvas escuro e foreground principal locais");
assert(tokens.includes("bg-[#11141c]") && tokens.includes("bg-[#171b26]"), "hierarquia de superficies locais");
assert(globals.includes(".mn-dashboard-theme .text-slate-950") && globals.includes(".mn-dashboard-theme .text-gray-900"), "foregrounds claros substituem classes herdadas");
assert(globals.includes(".mn-dashboard-theme button:disabled") && globals.includes("cursor: not-allowed"), "estado disabled permanece legivel");
assert(globals.includes(".recharts-default-tooltip") && globals.includes(".recharts-cartesian-axis-tick-value"), "graficos e tooltips usam tema escuro");
for (const forbidden of ["text-black", "text-slate-950", "text-zinc-950", "text-gray-950"]) {
  assert(!dashboard.includes(forbidden) && !waterfall.includes(forbidden), `dashboard principal sem ${forbidden}`);
}
assert(waterfall.includes("Resultado gerencial, não substitui a contabilidade."), "cascata não chama resultado de lucro líquido");
for (const label of ["Vendas realizadas", "Descontos", "Custo dos produtos", "Taxas variáveis", "Despesas operacionais", "Resultado gerencial"]) assert(waterfall.includes(label), `cascata contém ${label}`);
for (const source of ["Cardápio digital", "Planilhas", "Preenchimento manual", "Diagnóstico", "Estoque", "Fichas técnicas", "Cálculos Lokat", "OpenAI", "Google Planilhas"]) assert(sources.includes(source), `fontes contém ${source}`);
assert(sources.includes("runtimeValidated: false") && !sources.includes('name: "Cardápio digital · OlaClick", state: "connected"'), "OlaClick não é conectada sem runtime (resolveConnectionStatus sempre recebe runtimeValidated: false nesta sprint)");
for (const dependency of ["@tremor", "antd", "apexcharts", "@clerk"]) assert(!packageJson.includes(`\"${dependency}`), `sem nova dependência ${dependency}`);
console.log(`[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
