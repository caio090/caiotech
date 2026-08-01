/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/rec-os-workflow/__tests__/radar-opportunities.test.ts
 * Cobre Fase 29 (testes Radar) itens 1-12 do brief da Sprint REC OS 3.0.1.1 — parte de lógica pura.
 * A parte de UI (ação real, abre Criar, badge de origem) é coberta pelo teste estrutural em
 * src/app/admin/contentos/radar/__tests__/radar.structural.test.ts e
 * src/app/admin/contentos/criar/__tests__/guided-create-flow-3-0-1-1.structural.test.ts.
 */
import { RADAR_DEMO_OPPORTUNITIES, findRadarOpportunity } from "../radar-opportunities";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("[test] 2 — cada oportunidade constrói os campos de um CreateContentSeed (objetivo/público/evidência)");
for (const opp of RADAR_DEMO_OPPORTUNITIES) {
  assert(!!opp.objective && !!opp.audience && !!opp.evidence && !!opp.opportunity, `${opp.id}: possui objetivo, público, evidência e oportunidade`);
}

console.log("[test] Catálogo é demonstrativo e nunca inventa dado real do cliente");
assert(RADAR_DEMO_OPPORTUNITIES.every((o) => /benchmark|gen[eé]rico|qualitativa/i.test(o.evidence)), "toda evidência deixa explícito que não é dado calculado da conta real");

console.log("[test] 11 — query manipulada (seed inexistente) não concede acesso, resolve null");
assert(findRadarOpportunity("id-que-nao-existe") === null, "seed desconhecido resolve para null, nunca lança");
assert(findRadarOpportunity(undefined) === null, "seed ausente resolve para null");
assert(findRadarOpportunity(RADAR_DEMO_OPPORTUNITIES[0].id)?.id === RADAR_DEMO_OPPORTUNITIES[0].id, "seed válido resolve a oportunidade correta");

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
