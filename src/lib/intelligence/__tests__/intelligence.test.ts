(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("node:fs") as typeof import("node:fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("node:path") as typeof import("node:path");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const intelligence = require("../index.ts") as typeof import("../index");
let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("\n[test 30] IA unavailable");
{
  assert(intelligence.CURRENT_INTELLIGENCE_AVAILABILITY === "unavailable", "CURRENT_INTELLIGENCE_AVAILABILITY é 'unavailable' nesta sprint");
  assert(!intelligence.isIntelligenceAvailable(intelligence.CURRENT_INTELLIGENCE_AVAILABILITY), "isIntelligenceAvailable retorna false para 'unavailable'");
  assert(intelligence.isIntelligenceAvailable("available"), "isIntelligenceAvailable só retorna true para o literal 'available'");
  const response = intelligence.executeIntelligenceAction({ action: "explain", context: { moduleId: "meu_negocio", surface: "direct_business", locale: "pt-BR" } });
  assert(response.summary === intelligence.INTELLIGENCE_UNAVAILABLE_MESSAGE, "executeIntelligenceAction retorna a mensagem honesta, nunca finge geração");
}

console.log("\n[test 31] Botão IA desabilitado");
{
  const source = fs.readFileSync(path.join(process.cwd(), "src/components/intelligence/intelligence-action-button.tsx"), "utf8");
  assert(source.includes("disabled={!available}"), "IntelligenceActionButton usa disabled real (não só estilo) atrelado a isIntelligenceAvailable()");
  assert(source.includes("isIntelligenceAvailable(CURRENT_INTELLIGENCE_AVAILABILITY)"), "o botão consulta a mesma função central de disponibilidade, não uma checagem própria");
  assert(!source.includes("openai") && !source.includes("gemini"), "componente de botão não importa nenhum SDK de IA");
}

console.log("\n[test] capabilities por módulo");
{
  assert(intelligence.isActionAllowedForModule("meu_negocio", "explain"), "meu_negocio permite a ação explain");
  assert(!intelligence.isActionAllowedForModule("meu_negocio", "classify"), "meu_negocio NÃO permite classify (nem todo módulo mostra todos os botões)");
  const caps = intelligence.resolveIntelligenceCapabilities("meu_negocio");
  assert(caps.every((c) => c.enabled === false), "toda capability resolvida vem enabled=false enquanto availability !== 'available'");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
