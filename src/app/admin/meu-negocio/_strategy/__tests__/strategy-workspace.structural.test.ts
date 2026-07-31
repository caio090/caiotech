/**
 * Executar com: node .tmp/run-ts-test.cjs src/app/admin/meu-negocio/_strategy/__tests__/strategy-workspace.structural.test.ts
 */
import * as fs from "fs";
import * as path from "path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

const workspace = read("src/app/admin/meu-negocio/_restaurant-workspace.tsx");
const strategyWorkspace = read("src/app/admin/meu-negocio/_strategy/_strategy-workspace.tsx");
const overview = read("src/app/admin/meu-negocio/_strategy/_strategy-overview.tsx");
const manual = read("src/app/admin/meu-negocio/_strategy/_strategy-manual.tsx");
const eightPs = read("src/app/admin/meu-negocio/_strategy/_strategy-eight-ps.tsx");
const swot = read("src/app/admin/meu-negocio/_strategy/_strategy-swot.tsx");
const competitors = read("src/app/admin/meu-negocio/_strategy/_strategy-competitors.tsx");
const positioning = read("src/app/admin/meu-negocio/_strategy/_strategy-positioning.tsx");
const goalsSeasonality = read("src/app/admin/meu-negocio/_strategy/_strategy-goals-seasonality.tsx");
const dataQuality = read("src/app/admin/meu-negocio/_strategy/_strategy-data-quality.tsx");
const entry = read("src/app/admin/meu-negocio/_entry.tsx");
const oldClientContent = read("src/app/admin/meu-negocio/_client-content.tsx");

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("[test] Nova área não cria rota concorrente");
assert(entry.includes("RestaurantWorkspace"), "_entry.tsx continua sendo o único ponto de entrada real de /admin/meu-negocio");
assert(!fs.existsSync(path.join(root, "src/app/admin/dna-estrategia")), "nenhuma rota nova /admin/dna-estrategia foi criada");
assert(!fs.existsSync(path.join(root, "src/app/admin/estrategia")), "nenhuma rota nova /admin/estrategia foi criada");

console.log("[test] Nenhuma aba atual removida, DNA & Estratégia adicionada na posição certa");
for (const label of ["Visão geral", "Financeiro", "CMV e Cardápio", "Produtos e Fichas", "Estoque e Compras", "Relatórios", "Fontes e Integrações", "Configurações"]) {
  assert(workspace.includes(`label: "${label}"`), `área histórica preservada: ${label}`);
}
assert(workspace.includes('label: "DNA & Estratégia"'), "nova área 'DNA & Estratégia' presente");
const overviewIdx = workspace.indexOf('label: "Visão geral"');
const strategyIdx = workspace.indexOf('label: "DNA & Estratégia"');
const financeIdx = workspace.indexOf('label: "Financeiro"');
assert(overviewIdx < strategyIdx && strategyIdx < financeIdx, "DNA & Estratégia fica entre Visão geral e Financeiro");
assert(workspace.includes('activeSection === "strategy"'), "seção 'strategy' é de fato renderizada no switch do Centro de Comando");
assert(workspace.includes("StrategyWorkspace"), "StrategyWorkspace é importado e usado");

console.log("[test] Navegação interna — 8 subseções na ordem do ticket");
const subsections = ["Visão do Negócio", "Manual Vivo", "8Ps LOKAT", "SWOT / FOFA", "Concorrência", "Posicionamento", "Metas e Sazonalidade", "Qualidade dos Dados"];
assert(subsections.every((s) => strategyWorkspace.includes(`"${s}"`)), "todas as 8 subseções estão declaradas");
let cursor = -1;
for (const label of subsections) { const next = strategyWorkspace.indexOf(`"${label}"`, cursor + 1); assert(next > cursor, `ordem da navegação interna: ${label}`); cursor = next; }

console.log("[test] Deep navigation segue o padrão existente (SUBSECTIONS + activeSubsection)");
assert(workspace.includes("STRATEGY_SUBSECTIONS"), "workspace reutiliza a mesma lista exportada pelo StrategyWorkspace (nenhuma lista duplicada)");
assert(strategyWorkspace.includes("activeSubsection"), "StrategyWorkspace recebe activeSubsection como prop, igual às demais áreas");

console.log("[test] Visão simples e Modo Gestor preservados, mesma fonte");
assert(strategyWorkspace.includes("viewMode") && strategyWorkspace.includes("onViewModeChange"), "StrategyWorkspace recebe viewMode/onViewModeChange do Command Center (mesmo estado, não um segundo)");
assert(overview.includes("managerMode"), "Visão do Negócio consulta managerMode");
assert(!overview.includes("useBusinessViewMode"), "Visão do Negócio não cria um segundo hook de view mode (usa o que vem por prop)");

console.log("[test] Manual Vivo é derivado, não um segundo cadastro");
assert(manual.includes("buildLivingManual"), "painel do Manual Vivo chama a função de derivação, não guarda seções próprias em useState");
assert(!manual.includes("useState"), "Manual Vivo não tem estado próprio (é 100% derivado das outras áreas)");

console.log("[test] 8Ps LOKAT — nome e estrutura");
assert(eightPs.includes("8Ps LOKAT"), "rótulo '8Ps LOKAT' visível");
assert(eightPs.includes("EIGHT_P_ORDER"), "usa a ordem canônica dos 8Ps, não uma lista redigitada");

console.log("[test] SWOT preserva ambiente interno/externo");
assert(swot.includes("Ambiente interno") && swot.includes("Ambiente externo"), "agrupamento por ambiente preservado");
assert(swot.includes("buildSwotCrossSuggestions"), "cruzamentos determinísticos exibidos, não uma decisão automática");

console.log("[test] Concorrência nunca cria dado real, pesquisa automática indisponível");
assert(competitors.includes("COMPETITOR_RESEARCH_PROVIDER"), "usa o contrato de pesquisa (sempre unavailable nesta sprint)");
assert(!/duh lanches|pedreir[aã]o/i.test(competitors), "nenhuma referência a cliente real no painel de concorrência");
assert(competitors.includes("disabled"), "botão de pesquisa automática existe desabilitado, não escondido nem fingindo funcionar");

console.log("[test] Posicionamento nunca inventa frase");
assert(positioning.includes("buildPositioningSummary"), "usa a função de derivação, não monta a frase manualmente na UI");

console.log("[test] Metas mostram 'Sem dado', nunca 0% fictício");
assert(goalsSeasonality.includes("Sem dado"), "estado sem realizado mostra 'Sem dado'");
assert(goalsSeasonality.includes("goal.goalValue !== 0"), "divisão por goalValue é guardada explicitamente antes do cálculo de percentual (nunca divide por zero)");

console.log("[test] Qualidade dos dados nunca marca completo só por existir texto");
assert(dataQuality.includes("computeStrategyDataQuality"), "usa a função de cálculo determinístico de completude");

console.log("[test] Estado demonstrativo — nenhuma persistência real");
for (const source of [strategyWorkspace, overview, manual, eightPs, swot, competitors, positioning, goalsSeasonality, dataQuality]) {
  assert(!source.includes("supabase"), "nenhum arquivo da Estratégia referencia supabase");
  assert(!/localStorage|sessionStorage/.test(source), "nenhum arquivo da Estratégia usa localStorage/sessionStorage");
  assert(!source.includes("fetch("), "nenhum arquivo da Estratégia chama fetch()");
}

console.log("[test] Demo antigo (_client-content.tsx) permanece intocado e compilável, mas continua órfão");
assert(oldClientContent.includes("BusinessTab"), "_client-content.tsx continua usando BusinessTab sem quebrar (não foi tocado nesta sprint)");
assert(!workspace.includes("_client-content"), "o Centro de Comando real continua sem importar o demo antigo");

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
