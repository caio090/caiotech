import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "src/app/admin/meu-negocio");
const ui = fs.readFileSync(path.join(root, "_cmv-center.tsx"), "utf8");
const workspace = fs.readFileSync(path.join(root, "_restaurant-workspace.tsx"), "utf8");
let passed = 0, failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

assert(workspace.includes('label: "CMV e Cardápio"'), "Central ligada ao workspace");
assert(ui.includes("Visão simples") && ui.includes("Modo Gestor"), "dois níveis de profundidade");
assert(ui.includes("CMV teórico") && ui.includes("CMV real"), "duas apurações separadas");
assert(ui.includes("CmvSummaryCards") && ui.includes("CmvComparisonChart") && ui.includes("CmvTrendChart"), "componentes de resumo e gráficos");
assert(ui.includes("CmvGapPanel") && ui.includes("CmvInvestigationPanel"), "componentes de lacuna e investigação");
assert(ui.includes("CmvCoveragePanel") && ui.includes("CmvPolicyPanel"), "componentes de cobertura e política");
assert(ui.includes("CmvProductTable") && ui.includes("MenuEngineeringMatrix") && ui.includes("MenuEngineeringTable"), "componentes de cardápio modulares");
assert(ui.includes("Exemplo simulado") || ui.includes("exemplo simulado"), "simulação identificada");
assert(ui.includes("META SIMULADA"), "meta simulada identificada");
assert(ui.includes("não uma acusação") || ui.includes("nenhuma acusação"), "sem acusação automática");
assert(ui.includes("pontos percentuais"), "lacuna usa pontos percentuais");
assert(ui.includes("Não é lucro líquido"), "margem não chamada de lucro líquido");
assert(ui.includes("overflow-x-auto"), "tabela e navegação tratam overflow");
assert(ui.includes("prefers-reduced-motion"), "movimento reduzido respeitado");
assert(ui.includes("ResponsiveContainer") && ui.includes("ScatterChart"), "Recharts reutilizado");
assert(!ui.includes("fetch("), "UI não chama API externa");
assert(!ui.includes("SUPABASE") && !ui.includes("process.env"), "UI sem segredo/env");
assert(ui.includes("Contrato futuro — sem persistência"), "histórico futuro honesto");
assert(ui.includes("Duh Lanches") === false, "componente recebe empresa por prop");
assert(ui.includes("Visão simples e Modo Gestor alteram apenas a profundidade"), "modo não é permissão");

console.log(`[result] ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
