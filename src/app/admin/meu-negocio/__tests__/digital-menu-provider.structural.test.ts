(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("node:fs") as typeof import("node:fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("node:path") as typeof import("node:path");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const registry = require("../../../../lib/digital-menu/provider-registry.ts") as typeof import("../../../../lib/digital-menu/provider-registry");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const status = require("../../../../lib/digital-menu/provider-status.ts") as typeof import("../../../../lib/digital-menu/provider-status");
const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const sources = read("src/app/admin/meu-negocio/_sources-tab.tsx");
const workspace = read("src/app/admin/meu-negocio/_restaurant-workspace.tsx");
let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("\n[test] OlaClick é provedor, não módulo (Fase 20)");
{
  const olaclick = registry.findDigitalMenuProvider("olaclick");
  assert(olaclick !== null && olaclick.displayName === "OlaClick", "OlaClick existe no registro como um DigitalMenuProvider (provedor), com displayName");
  assert(!/SECTIONS[\s\S]{0,400}OlaClick/.test(workspace), "OlaClick não aparece na lista de áreas principais (SECTIONS) do workspace");
  assert(!workspace.includes('"olaclick"') && !/type DashboardSection[\s\S]*olaclick/i.test(workspace), "nenhum DashboardSection chamado olaclick existe");
}

console.log("\n[test] card visual se chama \"Cardápio digital\", provedor aparece dentro dele (Fase 4)");
{
  assert(sources.includes('<h3 className="text-xs font-extrabold text-slate-900">Cardápio digital</h3>'), "título do card é \"Cardápio digital\", não \"Cardápio digital · OlaClick\"");
  assert(sources.includes("Provedor: <strong"), "provedor é um campo rotulado dentro do card, não o título");
  assert(sources.includes("provider?.displayName"), "nome do provedor vem do registro genérico, não de uma string fixa \"OlaClick\" solta no JSX");
}

console.log("\n[test] domínio financeiro não depende do provedor (Fase 6)");
{
  const revenuePanels = read("src/app/admin/meu-negocio/_revenue-panels.tsx");
  const revenueCalculations = read("src/lib/revenue/calculations.ts");
  assert(!/Faturamento OlaClick/i.test(revenuePanels), "nunca existe o rótulo \"Faturamento OlaClick\"");
  assert(!revenueCalculations.includes("olaclick") && !revenueCalculations.includes("OlaClick"), "cálculo de faturamento não referencia OlaClick — é um domínio financeiro genérico");
}

console.log("\n[test] modelos normalizados são genéricos, código específico fica no adapter (Fase 3)");
{
  const digitalMenuIndex = read("src/lib/digital-menu/index.ts");
  assert(digitalMenuIndex.includes("olaclick"), "o adapter específico do OlaClick continua isolado em src/lib/digital-menu (não foi removido nem espalhado)");
  const providerStatusSource = read("src/lib/digital-menu/provider-status.ts");
  const providerStatusCode = providerStatusSource.replace(/\/\*\*[\s\S]*?\*\//g, ""); // remove doc comments (podem citar OlaClick como exemplo)
  assert(!providerStatusCode.includes("olaclick") && !providerStatusCode.includes("OlaClick"), "o código de DigitalMenuProvider/Capability/ConnectionStatus (fora de comentários) não hardcoda OlaClick — é genérico de verdade");
}

console.log("\n[test] status \"Conectada\" exige runtimeValidated (Fase 20)");
{
  assert(status.resolveConnectionStatus({ hasConnectionRow: true, runtimeValidated: true }) !== "NOT_LINKED", "runtime validado avança o status além de NOT_LINKED");
  assert(!status.isConnectedStatus("RUNTIME_NOT_VALIDATED", false), "sem prova de runtime, nunca é tratado como conectado");
  for (const connectedish of ["CONNECTED", "SYNCING", "UPDATED", "PARTIAL"] as const) {
    assert(!status.isConnectedStatus(connectedish, false), `${connectedish} sem runtimeValidated=true nunca conta como conectado`);
  }
}

console.log("\n[test] capacidades são individuais, nenhuma é assumida (Fase 3/20)");
{
  const olaclick = registry.findDigitalMenuProvider("olaclick");
  assert(Array.isArray(olaclick?.supportedCapabilities) && olaclick!.supportedCapabilities.length > 0, "provedor declara uma lista explícita de capacidades, não um booleano único \"tudo funciona\"");
  assert(!olaclick!.supportedCapabilities.includes("MENU"), "capacidade MENU não é assumida (endpoint de menu segue TODO no código do adapter)");
  assert(!olaclick!.supportedCapabilities.includes("INVENTORY"), "capacidade INVENTORY não é assumida (nunca implementada)");
}

console.log("\n[test] runtime não validado aparece honestamente; nenhuma credencial aparece (Fase 19/3)");
{
  assert(sources.includes("Indisponível"), "campos sem prova real mostram \"Indisponível\", não um valor inventado");
  assert(!/access_token|Authorization:\s*Bearer|olk_live_/i.test(sources), "nenhuma credencial aparece na tela de Fontes e Integrações");
}

console.log("\n[test] navegação principal permanece independente da camada de cardápio digital (Fase 20)");
{
  assert(workspace.includes('{ id: "sources", label: "Fontes e Integrações"'), "Fontes e Integrações continua sendo a área principal (não substituída por \"Cardápio digital\"/\"OlaClick\")");
  assert(!/id:\s*"digital_menu"|id:\s*"cardapio_digital"/.test(workspace), "nenhuma nova área principal foi criada para cardápios digitais (fica como subseção dentro de Fontes e Integrações)");
}

console.log(`[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
