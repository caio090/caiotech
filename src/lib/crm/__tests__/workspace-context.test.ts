/**
 * Executar com: node .tmp/run-ts-test.cjs src/lib/crm/__tests__/workspace-context.test.ts
 * Cobre Fase 37 (testes do CRM canônico) itens 62-68 do brief da Sprint
 * Navegação e Experiência 3.0.1.2.
 */
import { resolveCrmWorkspaceContext } from "../workspace-context";

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("[test] 62 — Super ADM: contexto plataforma (Lokat)");
const superAdmin = resolveCrmWorkspaceContext({ surface: "super_admin", workspaceId: null, isPreview: false });
assert(superAdmin.scope === "platform", "super_admin sempre escopo 'platform'");
assert(superAdmin.readOnly === false, "sessão real de super_admin não é read-only");

console.log("[test] 63/64/65 — Agência/Cliente/Empresa Direta: segmentação real ainda não existe (honesto)");
for (const surface of ["agency", "agency_client", "direct_business"] as const) {
  const ctx = resolveCrmWorkspaceContext({ surface, workspaceId: "w1", isPreview: false });
  assert(ctx.scope === "not_yet_segmented", `${surface}: scope 'not_yet_segmented' — nunca finge isolamento que a tabela não suporta`);
}

console.log("[test] 66 — Operacional: mesmo tratamento honesto (sem segmentação inventada)");
assert(resolveCrmWorkspaceContext({ surface: "agency", workspaceId: "op1", isPreview: false }).scope === "not_yet_segmented", "superfície operacional não recebe segmentação fabricada");

console.log("[test] 67 — nunca aceita client_id/role vindos do navegador — só parâmetros já resolvidos no servidor");
assert(resolveCrmWorkspaceContext({ surface: null, workspaceId: "qualquer-coisa-da-url", isPreview: false }).scope === "platform", "surface null (sem contexto de sessão resolvido) cai no caso mais restrito, nunca concede segmentação");

console.log("[test] 68 — preview sempre readOnly, independente da superfície");
for (const surface of ["super_admin", "agency", "agency_client", "direct_business"] as const) {
  assert(resolveCrmWorkspaceContext({ surface, workspaceId: "w1", isPreview: true }).readOnly === true, `${surface} em preview é sempre readOnly`);
}

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
