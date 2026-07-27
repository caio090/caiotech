/**
 * Structural safety checks for the in-memory finance experience.
 *
 *   node src/lib/finance/__tests__/finance-ui.structural.test.ts
 */
(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { readFileSync } = require("fs") as typeof import("fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { join } = require("path") as typeof import("path");

let passed = 0;
let failed = 0;
function assert(condition: boolean, label: string) {
  if (condition) { passed++; console.log(`  ok   - ${label}`); }
  else { failed++; console.error(`  FAIL - ${label}`); }
}

const root = process.cwd();
const uiDir = join(root, "src", "app", "admin", "meu-negocio");
const financeDir = join(root, "src", "lib", "finance");
const readUi = (name: string) => readFileSync(join(uiDir, name), "utf8");
const readFinance = (name: string) => readFileSync(join(financeDir, name), "utf8");
const stripComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const viewMode = readUi("_view-mode.tsx");
const financeTab = readUi("_finance-tab.tsx");
const charts = readUi("_finance-charts.tsx");
const financeImport = readUi("_finance-import.tsx");
const workspace = readUi("_restaurant-workspace.tsx");
const badge = readUi("_data-source-badge.tsx");
const template = readFinance("spreadsheet-template.ts");
const financeClientSources = [viewMode, financeTab, charts, financeImport, badge].map(stripComments).join("\n");

console.log("[test] modos de visualizacao e autorizacao");
assert(viewMode.includes("Visão simples"), "Visão simples existe");
assert(viewMode.includes("Modo Gestor"), "Modo Gestor existe");
assert(viewMode.includes("sessionStorage"), "modo visual usa sessionStorage");
assert(!/createSupabase|auth\.uid|canWrite|isAuthorized|permission|capability/i.test(stripComments(viewMode)), "modo visual não implementa autorização");

console.log("\n[test] integracao da experiencia financeira");
assert(workspace.includes('finance: { label: "Financeiro"') && workspace.includes("<FinanceTab"), "Financeiro está ligado ao workspace");
assert(financeTab.includes("DataSourceBadge"), "DataSourceBadge existe na aba Financeiro");
assert(financeTab.includes("Exemplo simulado") || financeTab.includes("DEMO_DATA_LABEL"), "dados simulados são identificados");
assert(charts.includes("title: string") && charts.includes("period: string") && charts.includes("source: string"), "gráficos exigem título, período e fonte");
assert(charts.includes("sem dados suficientes"), "gráficos possuem estado vazio");
assert(charts.includes("prefers-reduced-motion") && charts.includes("motion-reduce:"), "movimento reduzido é respeitado");
assert(charts.includes('from "recharts"'), "Recharts é reutilizado");

console.log("\n[test] importacao e integracoes futuras");
assert(financeImport.includes("Nenhuma linha é aplicada automaticamente"), "importação não aplica linhas automaticamente");
assert(financeImport.includes("Revise o mapeamento") && financeImport.includes("Confirmar proposta"), "importação exige revisão humana e confirmação");
assert(financeImport.includes("Google Planilhas") && financeImport.includes("Em breve"), "Google Planilhas está marcado como futuro");
assert(financeImport.includes("sem OAuth") && !financeClientSources.includes("client_secret"), "OAuth real não foi criado no client");
assert(!financeClientSources.includes("fetch("), "client components não fazem fetch direto para API externa");
assert(!/access_token|x-api-key|olk_live_/i.test(financeClientSources), "nenhuma chave OlaClick aparece na UI financeira");

console.log("\n[test] modelo e seguranca dos dados");
for (const sheet of ["LEIA-ME", "FLUXO DE CAIXA", "CUSTOS FIXOS", "CUSTOS VARIÁVEIS", "RECEITAS", "INSUMOS", "PRODUTOS", "FICHAS TÉCNICAS"]) {
  assert(template.includes(`"${sheet}"`), `modelo contém a aba ${sheet}`);
}
assert(financeImport.includes("overflow-x-auto") && workspace.includes("overflow-x-auto"), "layout possui tratamento de overflow mobile");
assert(!/lucro líquido/i.test(financeClientSources), "UI financeira não afirma lucro líquido indevidamente");
assert(!/518\.000|518K|R\$\s*518/i.test(financeClientSources), "nenhum valor externo foi hardcodado como dado real");

console.log(`\n[test] finance-ui structural — ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
})();
