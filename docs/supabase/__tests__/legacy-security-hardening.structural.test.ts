/**
 * Executar com: node .tmp/run-ts-test.cjs docs/supabase/__tests__/legacy-security-hardening.structural.test.ts
 * Sprint Legacy Supabase Security Remediation V1 — trava em teste os P0/P1
 * confirmados ao vivo pelo gate de segurança (verdict LEGACY_P0_FIX_REQUIRED)
 * sobre objetos JÁ EXISTENTES em produção, para que nenhum deles regrida
 * silenciosamente numa próxima edição. Regex direcionada aos contratos que
 * importam (quem pode chamar o quê, com que ownership), não um teste
 * textual frágil genérico.
 */
import * as fs from "fs";
import * as path from "path";

const root = process.cwd();
const sql = fs.readFileSync(path.join(root, "docs/supabase/legacy-security-hardening-before-diagnostic.sql"), "utf8");
const rollback = fs.readFileSync(path.join(root, "docs/supabase/legacy-security-hardening-before-diagnostic-rollback.sql"), "utf8");
const sql91 = fs.readFileSync(path.join(root, "docs/supabase/91-company-diagnostic-roadmap.sql"), "utf8");

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("[test] 1 — P1.2: can_access_client() segue o modelo canônico real, nunca admin global sem ownership");
{
  const fnMatch = sql.match(/CREATE OR REPLACE FUNCTION public\.can_access_client\(target_client_id uuid\)[\s\S]*?\$\$;/);
  assert(!!fnMatch, "função can_access_client(uuid) redefinida nesta migration");
  const body = fnMatch?.[0] ?? "";
  assert(/role = 'super_admin'/.test(body), "super_admin continua com acesso global (único role verdadeiramente global)");
  assert(!/role IN \('admin', 'super_admin'\)/.test(body), "admin comum removido do branch global -- precisa provar ownership real como qualquer outro role");
  assert(/client_user_access/.test(body), "client_user_access consultado -- mesmo caminho de resolveCompanyContext()");
  assert(/agency_workspaces/.test(body) && /agency_clients/.test(body), "agency_workspaces + agency_clients consultados");
  assert(/profiles p[\s\S]{0,80}p\.client_id = target_client_id/.test(body), "profiles.client_id consultado como vínculo direto de Company");
  assert(/SET search_path = public/.test(sql.slice(sql.indexOf("can_access_client(target_client_id"), sql.indexOf("can_access_client(target_client_id") + 400)), "can_access_client mantém search_path explícito");
}

console.log("[test] 2 — P1.1: current_user_role() com search_path restaurado");
{
  const fnMatch = sql.match(/CREATE OR REPLACE FUNCTION public\.current_user_role\(\)[\s\S]*?\$\$;/);
  assert(!!fnMatch, "função current_user_role() redefinida nesta migration");
  assert(/SET search_path = public/.test(fnMatch?.[0] ?? ""), "search_path explícito restaurado (SQL 06/07 tinham desfeito a correção do SQL 03)");
}

console.log("[test] 3 — P0.1-P0.4: views administrativas fechadas para anon, sem bypass de RLS via security_invoker ausente");
{
  const closedViews = [
    "v_olaclick_connections_safe",
    "v_platform_accounts_overview",
    "admin_signups_view",
    "v_orphan_client_invites",
  ];
  for (const view of closedViews) {
    assert(sql.includes(`ALTER VIEW public.${view} SET (security_invoker = true)`), `${view}: security_invoker = true (não bypassa mais RLS da tabela base)`);
    assert(sql.includes(`REVOKE SELECT ON public.${view} FROM anon`), `${view}: SELECT revogado de anon (P0)`);
    assert(sql.includes(`REVOKE SELECT ON public.${view} FROM authenticated`), `${view}: SELECT revogado de authenticated (não usada pelo app via este caminho)`);
  }
}

console.log("[test] 4 — P1.8: v_billing_mrr_summary fecha anon mas preserva authenticated (uso real em /admin/super/billing)");
{
  assert(sql.includes("REVOKE SELECT ON public.v_billing_mrr_summary FROM anon"), "anon revogado de v_billing_mrr_summary");
  assert(!sql.includes("REVOKE SELECT ON public.v_billing_mrr_summary FROM authenticated"), "authenticated preservado -- a tela real do super admin consulta esta view diretamente do browser");
}

console.log("[test] 5 — P0.5: finance_mark_overdue() não é mais executável por anon nem authenticated");
{
  assert(sql.includes("REVOKE EXECUTE ON FUNCTION public.finance_mark_overdue() FROM anon"), "EXECUTE revogado de anon");
  assert(sql.includes("REVOKE EXECUTE ON FUNCTION public.finance_mark_overdue() FROM authenticated"), "EXECUTE revogado de authenticated");
  assert(sql.includes("GRANT EXECUTE ON FUNCTION public.finance_mark_overdue() TO service_role"), "EXECUTE concedido apenas a service_role (job interno)");
}

console.log("[test] 6 — P0.6: create_client_on_signup() bloqueia p_user_id arbitrário");
{
  const fnMatch = sql.match(/CREATE OR REPLACE FUNCTION public\.create_client_on_signup[\s\S]*?\$\$;/);
  assert(!!fnMatch, "função create_client_on_signup redefinida");
  const body = fnMatch?.[0] ?? "";
  assert(/auth\.uid\(\) IS NOT NULL AND auth\.uid\(\) <> p_user_id/.test(body), "caller autenticado só pode criar client para o próprio auth.uid(), nunca para outro usuário");
  assert(/created_at > now\(\) - interval '10 minutes'/.test(body), "caminho anon (sem sessão) só permitido para contas criadas nos últimos minutos -- fecha abuso contra usuários arbitrários já existentes");
  assert(sql.includes("GRANT EXECUTE ON FUNCTION public.create_client_on_signup(uuid, text, text, text) TO anon, authenticated"), "grants preservados (anon continua necessário para o fluxo real documentado de signup sem sessão confirmada)");
}

console.log("[test] 7 — P1.3/Fase 26: admin_link_meta_asset exige ownership real e resolve meta_connection_id escopado por Company");
{
  const fnMatch = sql.match(/CREATE OR REPLACE FUNCTION public\.admin_link_meta_asset[\s\S]*?\$\$;/);
  const body = fnMatch?.[0] ?? "";
  assert(/can_access_client\(p_client_id\)/.test(body), "can_access_client(p_client_id) chamado -- não é mais role-only");
  assert(!/role IN \('super_admin', 'admin', 'agency'\)/.test(body), "checagem de role antiga (incluindo 'agency', role inexistente) removida");
  assert(/WHERE client_id = p_client_id\s+AND status = 'active'/.test(body), "fallback de meta_connection_id agora filtra por client_id -- não pega mais 'qualquer conexão ativa mais recente da plataforma'");
}

console.log("[test] 8 — P1.4: admin_upsert_olaclick_connection exige ownership real, sem role fantasma");
{
  const fnMatch = sql.match(/CREATE OR REPLACE FUNCTION public\.admin_upsert_olaclick_connection[\s\S]*?\$\$;/);
  const body = fnMatch?.[0] ?? "";
  assert(/can_access_client\(p_client_id\)/.test(body), "can_access_client(p_client_id) chamado");
  assert(!/'agency'/.test(body), "'agency' (role inexistente) removido do corpo da função");
}

console.log("[test] 9 — P1.5: admin_list_olaclick_connections escopado por Company (super_admin continua vendo tudo)");
{
  const fnMatch = sql.match(/CREATE OR REPLACE FUNCTION public\.admin_list_olaclick_connections[\s\S]*?\$\$;/);
  const body = fnMatch?.[0] ?? "";
  assert(/role = 'super_admin'/.test(body), "super_admin identificado explicitamente para o bypass global (Fase 29)");
  assert(/COALESCE\(v_is_super, false\) OR public\.can_access_client\(oc\.client_id\)/.test(body), "filtro final: super_admin vê tudo, demais só Companies autorizadas -- nunca mais 'role IN (...)' sem ownership");
}

console.log("[test] 10 — P1.6/Fase 27: get_client_meta_status é Company-scoped, não role-only");
{
  const fnMatch = sql.match(/CREATE OR REPLACE FUNCTION public\.get_client_meta_status[\s\S]*?\$\$;/);
  const body = fnMatch?.[0] ?? "";
  assert(/can_access_client\(p_client_id\)/.test(body), "can_access_client(p_client_id) chamado");
  assert(!/'agency'/.test(body) && !/'team'/.test(body), "roles fantasma ('agency', 'team') removidos");
}

console.log("[test] 11 — Fase 33: get_request_owner_for_client ganha authorization e search_path");
{
  const fnMatch = sql.match(/CREATE OR REPLACE FUNCTION public\.get_request_owner_for_client[\s\S]*?\$\$;/);
  const body = fnMatch?.[0] ?? "";
  assert(/can_access_client\(p_client_id\)/.test(body), "can_access_client(p_client_id) chamado -- antes não validava nada sobre o caller");
  assert(sql.slice(sql.indexOf("FUNCTION public.get_request_owner_for_client"), sql.indexOf("FUNCTION public.get_request_owner_for_client") + 300).includes("SET search_path = public"), "search_path explícito adicionado (estava ausente)");
}

console.log("[test] 12 — transação e rollback seguros (Fase 34/39/40)");
{
  assert(sql.includes("BEGIN;") && sql.includes("COMMIT;"), "migration envolvida em transação");
  assert(rollback.includes("BEGIN;") && rollback.includes("COMMIT;"), "rollback envolvido em transação");
  assert(!/DROP[^;]*CASCADE/.test(rollback), "rollback nunca usa DROP ... CASCADE -- restaura definições/grants, não apaga estrutura");
  assert(/reabre P0/i.test(rollback), "rollback documenta explicitamente, objeto por objeto, que restaura os P0 confirmados ao vivo (aviso de segurança obrigatório, Fase 40)");
}

console.log("[test] 13 — SQL 91 permanece congelado, zero alterações nesta correção (Fase 1)");
{
  assert(sql91.includes("SQL_READY_FOR_MANUAL_APPROVAL"), "SQL 91 continua no mesmo status de aprovação manual pendente, não tocado por este arquivo");
  assert(!/CREATE (OR REPLACE )?(FUNCTION|VIEW|TABLE) public\.(company_diagnostics|diagnostic_checklist_items|diagnostic_findings|diagnostic_recommendations|roadmap_items|can_access_client_company|can_write_client_company)/.test(sql), "esta migration nunca define nenhum objeto do domínio Diagnostic/Roadmap -- só referencia o SQL 91 em comentários explicativos");
}

console.log("[test] 14 — status de aprovação: nunca auto-aprovado por este sprint");
{
  assert(sql.includes("SQL_READY_FOR_MANUAL_APPROVAL"), "status permanece SQL_READY_FOR_MANUAL_APPROVAL -- aguardando CODEX WEB");
  assert(!sql.includes("SQL_APPROVED_FOR_APPLY") && !sql.includes("LEGACY_P0_FIX_APPROVED"), "nenhum veredito de aprovação é auto-atribuído por este arquivo");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
