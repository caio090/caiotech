(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("node:fs") as typeof import("node:fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("node:path") as typeof import("node:path");
const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const workspace = read("src/app/admin/meu-negocio/_restaurant-workspace.tsx");
const financeTab = read("src/app/admin/meu-negocio/_finance-tab.tsx");
const cmvCenter = read("src/app/admin/meu-negocio/_cmv-center.tsx");
let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("\n[test] bug corrigido: Visão simples/Modo Gestor tinha 3 estados desconectados (workspace, FinanceTab, CmvCenter)");
{
  assert((workspace.match(/useBusinessViewMode\(\)/g) ?? []).length === 1, "useBusinessViewMode() é chamado uma única vez, no RestaurantWorkspace (fonte central)");
  assert(!financeTab.includes("= useBusinessViewMode()"), "FinanceTab não chama mais seu próprio hook de modo (recebe via prop; o nome do hook antigo só sobra num comentário explicativo)");
  assert(!cmvCenter.includes("useBusinessViewMode()"), "CmvCenter não chama mais seu próprio hook de modo (recebia antes, mesmo bug do FinanceTab)");
  assert(financeTab.includes("viewMode: BusinessViewMode; onViewModeChange:"), "FinanceTab recebe viewMode/onViewModeChange como props");
  assert(cmvCenter.includes("viewMode: BusinessViewMode; onViewModeChange:"), "CmvCenter recebe viewMode/onViewModeChange como props");
}

console.log("\n[test] mudar o modo em qualquer área afeta a rota inteira (Fase 13/16)");
{
  assert(workspace.includes('<FinanceTab companyName={companyName} onNavigate={navigateFromLegacy} activeSubsection={activeSubsection} period={periodSelection} viewMode={viewMode} onViewModeChange={setViewMode} />'), "Financeiro usa o mesmo viewMode/setViewMode central do workspace");
  assert(workspace.includes('<CmvCenter companyName={companyName} viewMode={viewMode} onViewModeChange={setViewMode} />'), "CMV usa o mesmo viewMode/setViewMode central do workspace");
  assert(!workspace.includes("type ViewMode ="), "tipo local ViewMode duplicado foi removido (usa BusinessViewMode do hook central)");
}

console.log("\n[test] preservação de estado ao alternar o modo (Fase 17)");
{
  // O toggle (linhas do banner) chama apenas setViewMode -- nunca reseta activeSection/subsections/periodSelection/balances/movements.
  const toggleBlock = workspace.split("Nível de detalhe")[1]?.split("</div></div></div>")[0] ?? "";
  assert(!/setActiveSection|setSubsections|setPeriodSelection|setBalances|setMovements/.test(toggleBlock), "alternar o modo não dispara nenhum reset de área, subárea, período ou dados -- só troca a densidade");
}

console.log(`[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
