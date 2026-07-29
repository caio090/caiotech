(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("node:fs") as typeof import("node:fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("node:path") as typeof import("node:path");
const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const dashboard = read("src/app/admin/meu-negocio/_command-center-dashboard.tsx");
const financeTab = read("src/app/admin/meu-negocio/_finance-tab.tsx");
const workspace = read("src/app/admin/meu-negocio/_restaurant-workspace.tsx");
const revenuePanels = read("src/app/admin/meu-negocio/_revenue-panels.tsx");
let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("\n[test] Faturamento realizado é o primeiro KPI da Visão geral (Fase 8)");
{
  const kpiSectionStart = dashboard.indexOf("Indicadores principais");
  const revenueCardIndex = dashboard.indexOf("<RevenueHeroCard");
  assert(revenueCardIndex > -1 && revenueCardIndex < kpiSectionStart, "RevenueHeroCard é renderizado antes da seção \"Indicadores principais\" (não escondido sob Vendas realizadas)");
  assert(/id="revenue-hero-title"[^>]*>Faturamento realizado/.test(revenuePanels), "título do card é exatamente \"Faturamento realizado\"");
}

console.log("\n[test] origem visual sempre com texto (Fase 10) -- nunca só cor");
{
  assert(revenuePanels.includes("DataClassificationBadge"), "hero card usa o badge de classificação");
  const badgeFile = read("src/app/admin/meu-negocio/_data-classification-badge.tsx");
  assert(badgeFile.includes("{DATA_CLASSIFICATION_LABEL[classification]}"), "badge sempre renderiza o texto do rótulo, não somente uma cor");
  assert(badgeFile.includes("title={tooltip"), "badge sempre tem tooltip (atributo title)");
}

console.log("\n[test] Financeiro tem uma subárea Faturamento real, não um painel paralelo (Fase 9)");
{
  assert(workspace.includes('finance: ["Resumo", "Faturamento", "Fluxo de caixa"'), "Faturamento está na lista canônica de subáreas do Financeiro, logo após Resumo");
  assert(financeTab.includes('activeSubsection === "Faturamento" && <RevenueFullPanel'), "FinanceTab renderiza o painel de Faturamento quando a subárea ativa é \"Faturamento\"");
}

console.log("\n[test] bug corrigido: FinanceTab tinha estado interno próprio desconectado da subárea externa");
{
  assert(!financeTab.includes("useState<FinanceSubTab>"), "FinanceTab não mantém mais um subTab local duplicado");
  assert(!financeTab.includes('role="tablist"'), "FinanceTab não renderiza mais uma segunda barra de abas paralela à navegação externa de subáreas");
  assert(financeTab.includes("activeSubsection: string"), "FinanceTab agora é controlado pela subárea central (RestaurantWorkspace), não por estado próprio");
  assert(workspace.includes("<FinanceTab companyName={companyName} onNavigate={navigateFromLegacy} activeSubsection={activeSubsection} />"), "RestaurantWorkspace repassa a subárea central para o FinanceTab");
}

console.log("\n[test] \"Abrir Faturamento\" no card da Visão geral realmente chega no painel (não só destaca um botão)");
{
  assert(revenuePanels.includes('onNavigate("finance", "Faturamento")'), "botão Abrir Faturamento navega com área E subárea explícitas");
}

console.log("\n[test] subáreas do Financeiro ainda não implementadas são honestas, não silenciosamente vazias (Fase 22)");
{
  assert(financeTab.includes("COMING_SOON_SUBSECTIONS") && financeTab.includes("ComingSoonPanel"), "Planejado versus realizado / Contas a pagar / Contas a receber / Projeções mostram um estado honesto de \"ainda não implementado\"");
}

console.log("\n[test] renomeação \"Dados e planilhas\" -> \"Dados e relatórios\" (Fase 15)");
{
  assert(workspace.includes('"Dados e relatórios"'), "subárea renomeada na lista canônica do workspace");
  assert(!workspace.includes("Dados e planilhas"), "nome antigo não sobra na lista canônica");
  assert(financeTab.includes('activeSubsection === "Dados e relatórios"'), "FinanceTab reconhece o novo nome");
  const financeImport = read("src/app/admin/meu-negocio/_finance-import.tsx");
  assert(financeImport.includes("Dados e relatórios") && !financeImport.includes("Dados e planilhas"), "cabeçalho do painel de importação também foi renomeado");
}

console.log("\n[test] receita após taxas nunca é chamada de lucro em nenhuma tela (Fase 8)");
{
  assert(!/lucro líquido/i.test(revenuePanels), "\"receita operacional após taxas\" nunca é rotulada como lucro líquido");
  assert(revenuePanels.includes("não é lucro"), "painel explica ativamente que a receita após taxas não é lucro, em vez de deixar a confusão implícita");
  assert(!/h3[^>]*>\s*Lucro/i.test(revenuePanels), "nenhum título de seção chama a métrica de \"Lucro\"");
}

console.log(`[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
