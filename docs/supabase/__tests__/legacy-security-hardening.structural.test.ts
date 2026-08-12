/**
 * Executar com: node .tmp/run-ts-test.cjs docs/supabase/__tests__/legacy-security-hardening.structural.test.ts
 * Sprint Legacy Supabase Security Remediation V1+V2 — trava em teste os
 * P0/P1 confirmados ao vivo pelo gate de segurança sobre objetos JÁ
 * EXISTENTES em produção, para que nenhum deles regrida silenciosamente
 * numa próxima edição. V2 (verdict anterior: LEGACY_PATCH_REJECTED_SECURITY)
 * cobre: remoção total do caminho anônimo de create_client_on_signup,
 * fechamento de v_billing_mrr_summary também para authenticated, validação
 * de conexão Meta explícita cross-context, autorização de Company ANTES de
 * qualquer fallback com service role nas API routes, ownership real em
 * archive/restore/delete de clients, e REVOKE explícito de anon em todo
 * objeto tocado (nunca confiar em "REVOKE ALL FROM PUBLIC" sozinho).
 * Regex direcionada aos contratos que importam, não um teste textual
 * frágil genérico.
 */
import * as fs from "fs";
import * as path from "path";

const root = process.cwd();
const sql = fs.readFileSync(path.join(root, "docs/supabase/legacy-security-hardening-before-diagnostic.sql"), "utf8");
const rollback = fs.readFileSync(path.join(root, "docs/supabase/legacy-security-hardening-before-diagnostic-rollback.sql"), "utf8");
const sql91 = fs.readFileSync(path.join(root, "docs/supabase/91-company-diagnostic-roadmap.sql"), "utf8");
const metaRoute = fs.readFileSync(path.join(root, "src/app/api/meta/assets/link/route.ts"), "utf8");
const olaRoute = fs.readFileSync(path.join(root, "src/app/api/olaclick/connect/route.ts"), "utf8");
const billingPage = fs.readFileSync(path.join(root, "src/app/admin/super/billing/page.tsx"), "utf8");
const mrrRoute = fs.readFileSync(path.join(root, "src/app/api/admin/billing/mrr-summary/route.ts"), "utf8");

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

console.log("[test] 4 — P1.8 (V2): v_billing_mrr_summary fecha anon E authenticated -- leitura só via API route server-side");
{
  assert(sql.includes("REVOKE SELECT ON public.v_billing_mrr_summary FROM anon"), "anon revogado de v_billing_mrr_summary");
  assert(sql.includes("REVOKE SELECT ON public.v_billing_mrr_summary FROM authenticated"), "authenticated também revogado no V2 -- proteção de rota no frontend não protege a view de PostgREST direto (rejeição do CODEX)");
  assert(!billingPage.includes('.from("v_billing_mrr_summary")'), "src/app/admin/super/billing/page.tsx não consulta mais a view diretamente do browser");
  assert(billingPage.includes('fetch("/api/admin/billing/mrr-summary")'), "billing page busca o MRR via a nova API route autorizada");
  assert(mrrRoute.includes('.select("role").eq("id", user.id)') && mrrRoute.includes('!== "super_admin"'), "nova API route exige role='super_admin' explicitamente");
  const authIdx = mrrRoute.indexOf("forbidden");
  const adminClientIdx = mrrRoute.indexOf("createRequiredSupabaseAdminClient()");
  assert(authIdx > -1 && adminClientIdx > authIdx, "autorização (checagem de role) acontece ANTES de criar o client privilegiado -- nunca 'query com service role, depois confere usuário' (Fase 10)");
}

console.log("[test] 5 — P0.5: finance_mark_overdue() não é mais executável por anon nem authenticated");
{
  assert(sql.includes("REVOKE EXECUTE ON FUNCTION public.finance_mark_overdue() FROM anon"), "EXECUTE revogado de anon");
  assert(sql.includes("REVOKE EXECUTE ON FUNCTION public.finance_mark_overdue() FROM authenticated"), "EXECUTE revogado de authenticated");
  assert(sql.includes("GRANT EXECUTE ON FUNCTION public.finance_mark_overdue() TO service_role"), "EXECUTE concedido apenas a service_role (job interno)");
}

console.log("[test] 6 — P0 (V2): create_client_on_signup() sem caminho anônimo, sem janela temporal");
{
  const fnMatch = sql.match(/CREATE OR REPLACE FUNCTION public\.create_client_on_signup[\s\S]*?\$\$;/);
  assert(!!fnMatch, "função create_client_on_signup redefinida");
  const body = fnMatch?.[0] ?? "";
  assert(/auth\.uid\(\) IS NULL OR auth\.uid\(\) <> p_user_id/.test(body), "auth.uid() precisa existir E ser igual a p_user_id -- sem exceção nenhuma (rejeição do CODEX: janela temporal não prova identidade)");
  assert(!/interval/i.test(body), "nenhuma janela temporal (interval) restou no corpo da função -- removida por completo, não afrouxada");
  assert(!/auth\.uid\(\) IS NULL THEN/.test(body), "nenhum branch condicional separado para caller anônimo -- IS NULL só aparece na checagem unificada de unauthorized");
  assert(sql.includes("REVOKE ALL ON FUNCTION public.create_client_on_signup(uuid, text, text, text) FROM anon"), "EXECUTE revogado de anon explicitamente -- nenhum caminho anônimo resta");
  assert(sql.includes("GRANT EXECUTE ON FUNCTION public.create_client_on_signup(uuid, text, text, text) TO authenticated") && !sql.includes("TO anon, authenticated"), "grants: só authenticated, nunca mais anon na mesma linha de GRANT");
}

console.log("[test] 7 — P1.3/Fase 12-15 (V2): admin_link_meta_asset exige ownership real e valida conexão explícita, nunca troca silenciosamente");
{
  const fnMatch = sql.match(/CREATE OR REPLACE FUNCTION public\.admin_link_meta_asset[\s\S]*?\$\$;/);
  const body = fnMatch?.[0] ?? "";
  assert(/can_access_client\(p_client_id\)/.test(body), "can_access_client(p_client_id) chamado -- não é mais role-only");
  assert(!/role IN \('super_admin', 'admin', 'agency'\)/.test(body), "checagem de role antiga (incluindo 'agency', role inexistente) removida");
  assert(/v_conn_id IS NOT NULL/.test(body), "ramo explícito para quando meta_connection_id vem informado no payload");
  assert(/COALESCE\(v_is_super, false\) OR mc\.connected_by = v_caller_id/.test(body), "conexão explícita só aceita se super_admin OU pertence ao próprio caller -- nunca de outro contexto");
  assert(/RAISE EXCEPTION 'connection_not_found'/.test(body), "conexão explícita inválida é REJEITADA (P0006) -- nunca cai silenciosamente para escolher outra (Fase 15)");
  assert(/OR connected_by = v_caller_id\)[\s\S]{0,40}ORDER BY created_at DESC/.test(body), "fallback implícito também escopado pelo caller (exceto super_admin) -- não pega mais 'qualquer conexão ativa mais recente da plataforma'");
}

console.log("[test] 7b — Fase 17-19: rota /api/meta/assets/link autoriza Company ANTES de RPC ou fallback, sem role fantasma");
{
  assert(!metaRoute.includes('"agency"'), "'agency' removido de META_MANAGER_ROLES -- nunca foi um valor real de profiles.role");
  const canAccessIdx = metaRoute.indexOf('supabase.rpc("can_access_client"');
  const etapa1Idx = metaRoute.indexOf('supabase.rpc("admin_link_meta_asset"');
  assert(canAccessIdx > -1 && etapa1Idx > -1 && canAccessIdx < etapa1Idx, "can_access_client() chamado ANTES da Etapa 1 (RPC) -- guarda vale igualmente para RPC e fallback (Fase 17-19)");
  assert(/isSuperAdmin\s*\?[\s\S]{0,200}connected_by/.test(metaRoute), "fallback direto (Etapa 2) também escopa por connected_by exceto super_admin -- nunca mais permissivo que o caminho normal");
  assert(metaRoute.includes('rpcError.code === "P0006"'), "rota trata P0006 (conexão cross-context) rejeitando direto, sem cair no fallback para 'adivinhar' outra conexão");
  assert((metaRoute.match(/can_access_client/g) ?? []).length >= 3, "guarda de ownership também presente no handler DELETE (resolve client_id do registro antes de deletar)");
}

console.log("[test] 7c — Fase 17-20: rota /api/olaclick/connect autoriza Company ANTES de RPC ou fallback, sem role fantasma");
{
  assert(!olaRoute.includes('"agency"'), "'agency' removido de OLA_MANAGER_ROLES");
  const canAccessIdx = olaRoute.indexOf('supabase.rpc("can_access_client"');
  const etapa1Idx = olaRoute.indexOf('"admin_upsert_olaclick_connection"');
  assert(canAccessIdx > -1 && etapa1Idx > -1 && canAccessIdx < etapa1Idx, "can_access_client() chamado ANTES da Etapa 1 (RPC) no POST");
  assert((olaRoute.match(/can_access_client/g) ?? []).length >= 2, "guarda de ownership também presente no handler DELETE");
}

console.log("[test] 8 — P1.4: admin_upsert_olaclick_connection exige ownership real, sem role fantasma");
{
  const fnMatch = sql.match(/CREATE OR REPLACE FUNCTION public\.admin_upsert_olaclick_connection[\s\S]*?\$\$;/);
  const body = fnMatch?.[0] ?? "";
  assert(/can_access_client\(p_client_id\)/.test(body), "can_access_client(p_client_id) chamado");
  assert(!/'agency'/.test(body), "'agency' (role inexistente) removido do corpo da função");
  assert(sql.includes("REVOKE ALL ON FUNCTION public.admin_upsert_olaclick_connection(uuid, text, text, text, text) FROM anon"), "EXECUTE revogado de anon explicitamente (Fase 28/29, V2)");
}

console.log("[test] 9 — P1.5: admin_list_olaclick_connections escopado por Company (super_admin continua vendo tudo)");
{
  const fnMatch = sql.match(/CREATE OR REPLACE FUNCTION public\.admin_list_olaclick_connections[\s\S]*?\$\$;/);
  const body = fnMatch?.[0] ?? "";
  assert(/role = 'super_admin'/.test(body), "super_admin identificado explicitamente para o bypass global (Fase 29)");
  assert(/COALESCE\(v_is_super, false\) OR public\.can_access_client\(oc\.client_id\)/.test(body), "filtro final: super_admin vê tudo, demais só Companies autorizadas -- nunca mais 'role IN (...)' sem ownership");
  assert(sql.includes("REVOKE ALL ON FUNCTION public.admin_list_olaclick_connections() FROM anon"), "EXECUTE revogado de anon explicitamente (V2)");
}

console.log("[test] 10 — P1.6/Fase 27: get_client_meta_status é Company-scoped, não role-only");
{
  const fnMatch = sql.match(/CREATE OR REPLACE FUNCTION public\.get_client_meta_status[\s\S]*?\$\$;/);
  const body = fnMatch?.[0] ?? "";
  assert(/can_access_client\(p_client_id\)/.test(body), "can_access_client(p_client_id) chamado");
  assert(!/'agency'/.test(body) && !/'team'/.test(body), "roles fantasma ('agency', 'team') removidos");
  assert(sql.includes("REVOKE ALL ON FUNCTION public.get_client_meta_status(uuid) FROM anon"), "EXECUTE revogado de anon explicitamente (V2)");
}

console.log("[test] 11 — Fase 33: get_request_owner_for_client ganha authorization e search_path");
{
  const fnMatch = sql.match(/CREATE OR REPLACE FUNCTION public\.get_request_owner_for_client[\s\S]*?\$\$;/);
  const body = fnMatch?.[0] ?? "";
  assert(/can_access_client\(p_client_id\)/.test(body), "can_access_client(p_client_id) chamado -- antes não validava nada sobre o caller");
  assert(sql.includes("REVOKE ALL ON FUNCTION public.get_request_owner_for_client(uuid) FROM anon"), "EXECUTE revogado de anon explicitamente (V2)");
  assert(sql.slice(sql.indexOf("FUNCTION public.get_request_owner_for_client"), sql.indexOf("FUNCTION public.get_request_owner_for_client") + 300).includes("SET search_path = public"), "search_path explícito adicionado (estava ausente)");
}

console.log("[test] 11b — Fase 28/29: can_access_client() também revogado de anon explicitamente");
{
  assert(sql.includes("REVOKE ALL ON FUNCTION public.can_access_client(uuid) FROM anon"), "EXECUTE revogado de anon explicitamente, não só de PUBLIC (V2 -- REVOKE ALL FROM PUBLIC sozinho não remove um grant direto separado para anon)");
}

console.log("[test] 11c — Fase 21-27 (novo no V2): archive/restore/logical-delete exigem ownership real; hard delete continua super_admin-only");
{
  const ownershipRequired = [
    ["admin_archive_client", /CREATE OR REPLACE FUNCTION public\.admin_archive_client\(p_client_id uuid\)[\s\S]*?\$\$;/],
    ["admin_archive_clients", /CREATE OR REPLACE FUNCTION public\.admin_archive_clients\(p_client_ids uuid\[\]\)[\s\S]*?\$\$;/],
    ["admin_restore_client", /CREATE OR REPLACE FUNCTION public\.admin_restore_client[\s\S]*?\$\$;/],
    ["admin_delete_client", /CREATE OR REPLACE FUNCTION public\.admin_delete_client[\s\S]*?\$\$;/],
  ] as const;
  for (const [name, re] of ownershipRequired) {
    const body = sql.match(re)?.[0] ?? "";
    assert(body.length > 0, `${name}: definição encontrada na migration`);
    assert(/v_role IS NULL OR v_role NOT IN/.test(body), `${name}: checagem NULL-safe -- "IF v_role NOT IN (...)" sozinho deixava um chamador anônimo (role NULL) passar direto (bug de NULL-bypass, achado adicional desta correção)`);
    assert(/v_role <> 'super_admin' AND NOT public\.can_access_client\(p_client_id\)/.test(body) || /NOT public\.can_access_client\(cid\)/.test(body), `${name}: exige can_access_client() real para admin comum -- role sozinho não basta mais (Fase 23)`);
    assert(sql.includes(`REVOKE ALL ON FUNCTION public.${name}`) , `${name}: REVOKE ALL explícito adicionado (nenhuma das 4 tinha REVOKE explícito de PUBLIC/anon antes)`);
  }

  // Bulk fail-closed (Fase 26/27)
  const bulkBody = sql.match(/CREATE OR REPLACE FUNCTION public\.admin_archive_clients[\s\S]*?\$\$;/)?.[0] ?? "";
  assert(/unnest\(p_client_ids\)/.test(bulkBody) && /LIMIT 1/.test(bulkBody), "admin_archive_clients valida TODOS os ids do lote antes de mutar qualquer um (fail closed, nunca resultado parcial)");

  // Hard delete: super_admin-only preservado, SEM can_access_client (Fase 22)
  for (const name of ["admin_hard_delete_client", "admin_hard_delete_clients"]) {
    const re = new RegExp(`CREATE OR REPLACE FUNCTION public\\.${name}[\\s\\S]*?\\$\\$;`);
    const body = sql.match(re)?.[0] ?? "";
    assert(/v_role IS NULL OR v_role != 'super_admin'/.test(body), `${name}: checagem NULL-safe também aplicada`);
    assert(!body.includes("can_access_client"), `${name}: NÃO ganhou can_access_client -- hard delete continua super_admin-only, global, intencionalmente (Fase 22)`);
    assert(sql.includes(`REVOKE ALL ON FUNCTION public.${name}`), `${name}: REVOKE ALL explícito adicionado`);
  }
}

console.log("[test] 11d — Final Closure (Fase 3-8): admin_create_client fail-closed, sem identidade arbitrária");
{
  const body = sql.match(/CREATE OR REPLACE FUNCTION public\.admin_create_client\([\s\S]*?\$\$;/)?.[0] ?? "";
  assert(body.length > 0, "admin_create_client redefinida nesta migration");
  assert(/v_role IS NULL OR v_role NOT IN/.test(body), "checagem NULL-safe -- mesmo bug de NULL-bypass das funções da seção 8, agora corrigido aqui também");
  assert(/p_created_by IS NOT NULL AND p_created_by <> auth\.uid\(\)/.test(body), "p_created_by, quando informado, precisa ser exatamente o caller -- nunca atribui a criação a outro usuário (Fase 6/7)");
  assert(/v_role <> 'super_admin' AND p_agency_id IS NOT NULL AND p_agency_id <> auth\.uid\(\)/.test(body), "admin comum não pode atribuir o novo client a outro workspace/agência arbitrário -- só super_admin mantém esse alcance (Fase 5)");
  assert(sql.includes("REVOKE ALL ON FUNCTION public.admin_create_client(text, text, text, text, text, text, uuid, uuid) FROM anon"), "EXECUTE revogado de anon explicitamente");
  assert(!sql.includes("achado P0-classe NÃO corrigido"), "achado anterior não fica mais registrado como pendente -- foi corrigido nesta sprint");
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
