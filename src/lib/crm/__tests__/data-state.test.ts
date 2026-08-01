/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/crm/__tests__/data-state.test.ts
 * Cobre Fase 38 (testes de segurança do CRM) itens 73-80 e Fase 37 item 68
 * do brief da Sprint Navegação e Experiência 3.0.1.2.
 */
import { resolveCrmDataState, crmStateCopy, containsForbiddenTechnicalDetail } from "../data-state";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("[test] 93 — loading");
assert(resolveCrmDataState(null) === "loading", "sem resultado ainda -> loading");

console.log("[test] 75/94 — available_empty mostra zero real (sucesso, sem itens)");
assert(resolveCrmDataState({ ok: true, entryCount: 0 }) === "available_empty", "sucesso com 0 itens é zero REAL, não indisponibilidade");

console.log("[test] 95 — available_with_data");
assert(resolveCrmDataState({ ok: true, entryCount: 5 }) === "available_with_data", "sucesso com itens");

console.log("[test] 74/76 — falha nunca vira zero, sempre unavailable");
assert(resolveCrmDataState({ ok: false, code: "service_role_missing" }) === "unavailable", "service_role_missing -> unavailable, nunca available_empty");
assert(resolveCrmDataState({ ok: false, code: "network_error" }) === "unavailable", "erro de rede -> unavailable");
assert(resolveCrmDataState({ ok: false }) === "unavailable", "falha sem code -> unavailable (nunca assume sucesso)");

console.log("[test] 77 — unauthorized distinto de unavailable");
assert(resolveCrmDataState({ ok: false, code: "unauthenticated" }) === "unauthorized", "unauthenticated -> unauthorized");
assert(resolveCrmDataState({ ok: false, code: "forbidden" }) === "unauthorized", "forbidden -> unauthorized");

console.log("[test] 78 — preview sempre read-only, mesmo com dado disponível");
assert(resolveCrmDataState({ ok: true, entryCount: 10 }, { isPreview: true }) === "preview_read_only", "preview vence sobre o resultado real");

console.log("[test] 73/79/80 — nenhuma cópia visível menciona detalhe técnico");
for (const state of ["loading", "available_empty", "available_with_data", "unavailable", "unauthorized", "preview_read_only", "demo"] as const) {
  const copy = crmStateCopy(state);
  assert(!containsForbiddenTechnicalDetail(copy.title) && !containsForbiddenTechnicalDetail(copy.description), `${state}: título/descrição nunca mencionam service role, env ou credencial`);
}
assert(containsForbiddenTechnicalDetail("SUPABASE_SERVICE_ROLE_KEY não configurada"), "detector reconhece a frase técnica real que era exibida antes desta sprint (regressão)");

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
