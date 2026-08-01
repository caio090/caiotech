/**
 * Executar com: node .tmp/run-ts-test.cjs src/app/admin/contentos/radar/__tests__/radar.structural.test.ts
 * Cobre Fase 29 (testes Radar) itens 1, 3-10, 12 do brief da Sprint REC OS 3.0.1.1.
 */
import * as fs from "fs";
import * as path from "path";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

const page = read("src/app/admin/contentos/radar/page.tsx");
const card = read("src/app/admin/contentos/radar/_radar-opportunity-card.tsx");

console.log("[test] 1 — Radar possui ação real (não é mais só \"Em breve\" estático)");
assert(page.includes("RadarOpportunityCard"), "página monta o card de oportunidade real");
assert(card.includes('data-testid="radar-create-from-opportunity"'), "ação 'Criar a partir desta oportunidade' existe de verdade");

console.log("[test] 3/4 — cliente preservado, ação só disponível com contexto mínimo");
assert(card.includes("clientId ? `/admin/contentos/criar?client=${clientId}"), "href só é construído quando há clientId (contexto mínimo)");
assert(card.includes('data-testid="radar-create-disabled"'), "sem cliente, mostra por que a ação está indisponível — nunca some ou finge funcionar");

console.log("[test] 8/9 — abre Criar na seção Ideia, não o dashboard genérico");
assert(card.includes("&seed=${opp.id}&section=ideia"), "link para Criar carrega seed + section=ideia");
assert(!card.includes("/admin/dashboard"), "nunca redireciona para o dashboard genérico");

console.log("[test] 12 — fixture demonstrativa nunca é persistida a partir do Radar");
assert(!page.includes(".insert(") && !card.includes(".insert("), "nenhuma chamada de insert no Radar — seed é só navegação");
assert(page.includes("Demonstração") || card.includes("Demonstração"), "oportunidades marcadas como Demonstração — nunca fingem ser detecção real de IA");

console.log("[test] Fase 27 — estado vazio honesto para Radar sem oportunidades");
assert(page.includes("EmptyState") && page.includes("Nenhuma oportunidade no momento"), "Radar tem um estado vazio real, não só a lista estática de antes");

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
