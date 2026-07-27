/**
 * Structural checks for the restaurant vertical slice UI — complements the
 * real behavioral tests in src/lib/stock/__tests__ and
 * src/lib/costing/__tests__ (which execute the actual math). These prove
 * the UI surfaces the required states/copy/safety patterns by reading the
 * real component source, not by rendering (no DOM/browser framework
 * installed in this project — same disclosed convention as the rest of
 * this sprint's test suite).
 *
 *   node src/app/admin/meu-negocio/__tests__/restaurant-vertical-slice.structural.test.ts
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

// Several files' own docstrings explain, in prose, that they deliberately
// never touch Supabase — that prose itself contains the word "Supabase",
// which would otherwise trip a naive absence check. Strip comments before
// any "this code never does X" assertion, keeping raw source for presence
// checks (harmless either way there).
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

const dir = join(__dirname, "..");
const read = (name: string) => readFileSync(join(dir, name), "utf8");

const entrySource = read("_entry.tsx");
const selectorSource = read("_company-selector.tsx");
const workspaceSource = read("_restaurant-workspace.tsx");
const overviewSource = read("_restaurant-overview.tsx");
const stockSource = read("_restaurant-stock.tsx");
const transferSource = read("_stock-transfer-panel.tsx");
const countSource = read("_stock-count-panel.tsx");
const purchasingSource = read("_restaurant-purchasing.tsx");
const sheetsSource = read("_restaurant-technical-sheets.tsx");
const reportsSource = read("_restaurant-reports.tsx");
const analyzeSource = read("_restaurant-analyze-fill.tsx");
const glossaryTermSource = read("_stock-glossary-term.tsx");
const activationSource = read("_activation-placeholder.tsx");

const glossaryLibSource = readFileSync(join(dir, "..", "..", "..", "lib", "business-archetypes", "glossary.ts"), "utf8");
const companySelectionSource = readFileSync(join(dir, "..", "..", "..", "lib", "business-archetypes", "company-selection.ts"), "utf8");
const smashFixtureSource = readFileSync(join(dir, "..", "..", "..", "lib", "costing", "fixtures.ts"), "utf8");
const archetypeTypesSource = readFileSync(join(dir, "..", "..", "..", "lib", "business-archetypes", "types.ts"), "utf8");

console.log("[test] Entrada e seleção de empresa");
{
  assert(entrySource.includes("CompanySelector"), "_entry.tsx renderiza o seletor de empresa quando nenhuma está selecionada");
  assert(companySelectionSource.includes('name: "Duh Lanches"'), "Duh Lanches está nas fixtures de seleção");
  assert(companySelectionSource.includes('name: "O Pedreirão"'), "O Pedreirão está nas fixtures de seleção");
  assert(companySelectionSource.includes('moduleState: "active"') && companySelectionSource.includes('id: "duh-lanches"'), "Duh Lanches está com estado active");
  assert(companySelectionSource.includes('moduleState: "available_for_activation"'), "O Pedreirão está com estado available_for_activation");
  assert(!/supabase|createServerSupabaseClient|createSupabaseAdminClient/i.test(stripComments(companySelectionSource)), "fixtures de seleção não fazem nenhuma consulta ao Supabase em código real");
}

console.log("\n[test] Estados do módulo — tipos completos");
{
  for (const state of ["locked_preview", "available_for_activation", "setup_required", "active", "incomplete", "suspended"]) {
    assert(companySelectionSource.includes(`"${state}"`), `estado "${state}" existe no tipo ModuleActivationState`);
  }
}

console.log("\n[test] Arquitetura adaptativa — arquétipos");
{
  for (const archetype of ["food_service", "retail", "services", "agency", "clinic", "law_firm", "generic"]) {
    assert(archetypeTypesSource.includes(`"${archetype}"`), `arquétipo "${archetype}" existe em BUSINESS_ARCHETYPES`);
  }
  assert(/food_service:\s*\{[\s\S]*?implemented:\s*true/.test(archetypeTypesSource), "food_service é o único arquétipo implementado nesta sprint");
  const implementedTrueCount = [...archetypeTypesSource.matchAll(/implemented:\s*true/g)].length;
  assert(implementedTrueCount === 1, "exatamente um arquétipo está marcado como implementado — os demais são contratos tipados");
}

console.log("\n[test] Não consulta nem altera dados reais");
{
  for (const [label, src] of [
    ["_entry.tsx", entrySource], ["_company-selector.tsx", selectorSource], ["_restaurant-workspace.tsx", workspaceSource],
    ["_restaurant-stock.tsx", stockSource], ["_restaurant-purchasing.tsx", purchasingSource],
    ["_restaurant-technical-sheets.tsx", sheetsSource], ["_restaurant-reports.tsx", reportsSource],
  ] as const) {
    assert(!/supabase/i.test(stripComments(src)), `${label} não referencia Supabase em código real`);
    assert(!src.includes("fetch("), `${label} não faz nenhuma chamada fetch()`);
  }
}

console.log("\n[test] Ficha técnica Smash — EXEMPLO SIMULADO e disclaimers");
{
  assert(smashFixtureSource.includes("isExample: true"), "ficha do Smash está marcada isExample: true");
  assert(sheetsSource.includes("Exemplo simulado"), "componente exibe o rótulo \"Exemplo simulado\" quando isExample é true");
  assert(sheetsSource.includes("SHEET_COST_DISCLAIMER"), "componente exibe o aviso de que o cálculo é só o custo dos ingredientes");
  assert(!/lucro líquido/i.test(sheetsSource), "componente da ficha técnica nunca menciona lucro líquido");
}

console.log("\n[test] Glossário — linguagem simples primeiro, termo técnico entre parênteses");
{
  for (const id of ["cmv-real", "cmv-teorico", "lacuna-cmv", "margem-contribuicao", "fator-correcao", "cobertura-estoque"]) {
    assert(glossaryLibSource.includes(`id: "${id}"`), `entrada de glossário "${id}" existe`);
  }
  assert(glossaryTermSource.includes("{entry.simpleLabel} ({entry.technicalTerm})"), "componente renderiza \"termo simples (termo técnico)\" — simples primeiro, técnico entre parênteses");
  assert(glossaryTermSource.includes("O que é:") && glossaryTermSource.includes("Como é calculado:") && glossaryTermSource.includes("Por que importa:"), "explicação expansível responde o que é / como é calculado / por que importa");
}

console.log("\n[test] Estoque — transferência nunca permite saldo negativo (guard no componente, além da função pura)");
{
  assert(transferSource.includes("applyStockTransfer"), "painel de transferência usa a função pura de transferência (não reimplementa a lógica)");
  assert(transferSource.includes("insufficient_balance"), "painel exibe a mensagem de saldo insuficiente");
  assert(countSource.includes("calculateInventoryCount"), "painel de contagem usa a função pura de precisão (não reimplementa a lógica)");
}

console.log("\n[test] Compras — ponto de reposição, cobertura, WhatsApp futuro sem integração real");
{
  assert(purchasingSource.includes("calculateReplenishmentPoint") || purchasingSource.includes("buildPurchaseDrafts"), "tela de compras usa as funções puras de reposição");
  assert(purchasingSource.includes("Em breve"), "área do WhatsApp está marcada como \"Em breve\"");
  assert(purchasingSource.includes("Nenhuma entrada é aplicada automaticamente"), "texto deixa claro que nenhuma entrada é aplicada automaticamente");
  assert(!/webhook/i.test(purchasingSource), "nenhum webhook é criado ou referenciado");
  assert(!/\+?\d{2}\s?\(?\d{2}\)?\s?\d{4,5}-?\d{4}/.test(purchasingSource), "nenhum número de telefone/WhatsApp é criado ou referenciado");
}

console.log("\n[test] Visão geral — cards navegam para o setor correspondente");
{
  assert(overviewSource.includes("onNavigate(c.section)"), "cada card da Visão geral chama onNavigate com a seção correspondente");
  assert(overviewSource.includes("motion-reduce:"), "cards respeitam prefers-reduced-motion (motion-reduce:)");
}

console.log("\n[test] prefers-reduced-motion respeitado nas microinterações");
{
  for (const [label, src] of [["_company-selector.tsx", selectorSource], ["_restaurant-overview.tsx", overviewSource]] as const) {
    assert(src.includes("motion-reduce:"), `${label} usa motion-reduce: para desabilitar a microinteração quando o usuário prefere menos movimento`);
  }
}

console.log("\n[test] Analisar e preencher — nunca aplica automaticamente");
{
  assert(analyzeSource.includes("Aplicar selecionados") && analyzeSource.includes("Revisar") && analyzeSource.includes("Cancelar"), "ações Aplicar selecionados / Revisar / Cancelar presentes");
  assert(analyzeSource.includes("permanecem somente nesta demonstração"), "texto reforça que as alterações permanecem só na demonstração");
  assert(!/useEffect\(\s*\(\)\s*=>\s*\{\s*applySelected/.test(analyzeSource), "nenhum efeito aplica a proposta automaticamente ao montar — só o clique explícito em \"Aplicar selecionados\" chama applySelected");
}

console.log("\n[test] Placeholder de ativação (arquétipos/empresas não implementados)");
{
  assert(activationSource.includes("Ativação não implementada nesta demonstração"), "CTA de ativação é claramente desabilitado, sem cobrança/checkout implementado");
  assert(activationSource.includes("disabled"), "botão de ativação está desabilitado");
  assert(!/checkout|stripe|payment/i.test(activationSource), "nenhuma cobrança/checkout foi implementada no placeholder");
}

console.log(`\n[test] restaurant-vertical-slice — ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
})();
