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
const liveTestPlan = fs.readFileSync(path.join(root, "docs/supabase/legacy-security-hardening-live-test-plan.sql"), "utf8");
const authGuard = fs.readFileSync(path.join(root, "src/lib/supabase/authorization-guard.ts"), "utf8");
const archiveRoute = fs.readFileSync(path.join(root, "src/app/api/admin/clients/[id]/route.ts"), "utf8");
const restoreRoute = fs.readFileSync(path.join(root, "src/app/api/admin/clients/[id]/restore/route.ts"), "utf8");
const resolveClient = fs.readFileSync(path.join(root, "src/lib/client/resolve-client.ts"), "utf8");

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

console.log("[test] 15 — Rollback (Fase 4-9, PROMPT 02B): matriz de ACL restaurada com EXACT_PRE_PATCH_PARITY");
{
  // Fase 4: grupo PUBLIC + anon (6 funções) -- rollback precisa restaurar
  // EXECUTE explícito para PUBLIC e anon, além de authenticated.
  const publicAndAnonGroup: Array<[string, RegExp]> = [
    ["can_access_client(uuid)", /GRANT EXECUTE ON FUNCTION public\.can_access_client\(uuid\) TO PUBLIC, anon, authenticated;/],
    ["get_request_owner_for_client(uuid)", /GRANT EXECUTE ON FUNCTION public\.get_request_owner_for_client\(uuid\) TO PUBLIC, anon, authenticated;/],
    ["admin_archive_client(uuid)", /GRANT EXECUTE ON FUNCTION public\.admin_archive_client\(uuid\) TO PUBLIC, anon, authenticated;/],
    ["admin_restore_client(uuid)", /GRANT EXECUTE ON FUNCTION public\.admin_restore_client\(uuid\) TO PUBLIC, anon, authenticated;/],
    ["admin_hard_delete_client(uuid)", /GRANT EXECUTE ON FUNCTION public\.admin_hard_delete_client\(uuid\) TO PUBLIC, anon, authenticated;/],
    ["admin_create_client(...)", /GRANT EXECUTE ON FUNCTION public\.admin_create_client\(\s*text, text, text, text, text, text, uuid, uuid\s*\) TO PUBLIC, anon, authenticated;/],
  ];
  for (const [name, re] of publicAndAnonGroup) {
    assert(re.test(rollback), `${name}: rollback restaura EXECUTE explícito para PUBLIC e anon (Fase 4) -- ACL viva pré-patch auditada, signature exata`);
  }

  // Fase 5: grupo PUBLIC-only -- anon/authenticated já restaurados antes
  // desta correção; só falta adicionar PUBLIC explicitamente.
  assert(/GRANT EXECUTE ON FUNCTION public\.finance_mark_overdue\(\) TO PUBLIC, authenticated, anon;/.test(rollback), "finance_mark_overdue(): rollback adiciona PUBLIC explicitamente (Fase 5), preservando anon/authenticated já restaurados");
  assert(/GRANT EXECUTE ON FUNCTION public\.create_client_on_signup\(uuid, text, text, text\)\s*TO PUBLIC, anon, authenticated;/.test(rollback), "create_client_on_signup(uuid, text, text, text): rollback adiciona PUBLIC explicitamente (Fase 5)");

  // Fase 6: grupo anon-only (7 funções) -- rollback adiciona anon
  // explicitamente, mas o REVOKE ALL FROM PUBLIC precisa permanecer --
  // estado vivo pré-patch confirmou PUBLIC = NONE para este grupo.
  const anonOnlyGroup = [
    "admin_link_meta_asset\\(uuid, text, text, text, text, text, uuid, boolean\\)",
    "admin_upsert_olaclick_connection\\(uuid, text, text, text, text\\)",
    "admin_list_olaclick_connections\\(\\)",
    "get_client_meta_status\\(uuid\\)",
    "admin_archive_clients\\(uuid\\[\\]\\)",
    "admin_delete_client\\(uuid\\)",
    "admin_hard_delete_clients\\(uuid\\[\\]\\)",
  ];
  for (const sig of anonOnlyGroup) {
    const pairRe = new RegExp(`REVOKE ALL ON FUNCTION public\\.${sig} FROM PUBLIC;\\s+GRANT EXECUTE ON FUNCTION public\\.${sig} TO authenticated, anon;`);
    assert(pairRe.test(rollback), `${sig.replace(/\\\\?/g, "")}: rollback restaura anon explicitamente (Fase 6) mantendo REVOKE ALL FROM PUBLIC logo acima -- nunca introduz PUBLIC neste grupo`);
  }

  // Ausência explícita de PUBLIC nas linhas de GRANT deste grupo (nenhuma
  // das 7 pode ganhar PUBLIC -- estado vivo pré-patch: PUBLIC = NONE).
  for (const sig of anonOnlyGroup) {
    const grantLineRe = new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${sig} TO [^;]*;`);
    const grantLine = rollback.match(grantLineRe)?.[0] ?? "";
    assert(grantLine.length > 0 && !/\bPUBLIC\b/.test(grantLine), `${sig.replace(/\\\\?/g, "")}: GRANT não inclui PUBLIC -- grupo anon-only nunca ganha PUBLIC (Fase 6, IMPORTANTE)`);
  }

  // Fase 3/8: as 5 views e current_user_role() já tinham paridade
  // confirmada -- o rollback NÃO pode ter sido reescrito nestas seções.
  assert(rollback.includes("ALTER VIEW public.v_olaclick_connections_safe RESET (security_invoker);"), "views P0: seção de rollback das 5 views permanece com a mesma definição (paridade já confirmada, Fase 8 -- não reescrita)");
  assert(rollback.includes("GRANT SELECT ON public.v_billing_mrr_summary TO anon, authenticated;"), "v_billing_mrr_summary: grant de rollback inalterado (Fase 8)");
  const currentUserRoleBlock = rollback.slice(
    rollback.indexOf("-- 2. current_user_role"),
    rollback.indexOf("-- 1. can_access_client"),
  );
  assert(currentUserRoleBlock.length > 0 && !/GRANT|REVOKE/.test(currentUserRoleBlock), "current_user_role(): rollback não introduz nenhum GRANT/REVOKE nesta seção -- ACL desta função nunca foi tocada, nem pelo patch nem pelo rollback (Fase 3)");
}

console.log("[test] 16 — Fase 10: ledger de migrations documentado factualmente, distinto dos arquivos históricos numerados");
{
  assert(!sql.includes("0 migrations"), "afirmação obsoleta de '0 migrations' removida do arquivo principal");
  const migrationIds = [
    "20260813200621_personal_core_tasks",
    "20260813200750_personal_core_routines",
    "20260813200856_personal_core_gratitude",
    "20260813200949_personal_core_events",
  ];
  for (const id of migrationIds) {
    assert(sql.includes(id), `ledger documenta a migration rastreada ${id} (estado vivo auditado em 27/08/2026)`);
  }
  assert(/não equivalem automaticamente a terem sido aplicados|não presuma que\s*\n?-- todo SQL histórico/.test(sql), "documentação deixa explícito que os arquivos históricos numerados não equivalem ao ledger formal do Supabase nem provam execução ao vivo");
}

console.log("[test] 17 — PROMPT 04A/P0-A: client_meta_assets fecha bypass direto via Data API");
{
  const policies = ["client_meta_assets_select", "client_meta_assets_insert", "client_meta_assets_update", "client_meta_assets_delete"];
  for (const p of policies) {
    const block = sql.match(new RegExp(`DROP POLICY IF EXISTS "${p}"[\\s\\S]*?CREATE POLICY "${p}"[\\s\\S]*?;`))?.[0] ?? "";
    assert(block.length > 0, `${p}: redefinida nesta migration`);
    assert(/can_access_client\(client_id\)/.test(block), `${p}: exige can_access_client(client_id) -- role sozinho não basta mais (P0-A)`);
    assert(/role IN \(/.test(block), `${p}: mantém o gate de role já existente (semântica de role preservada, ownership adicionada)`);
  }
  assert(!sql.includes('DROP POLICY IF EXISTS "client_meta_assets_select" ON public.client_meta_assets;\nCREATE POLICY "client_meta_assets_select"\n  ON public.client_meta_assets FOR SELECT\n  USING (\n    EXISTS (\n      SELECT 1 FROM public.profiles p\n      WHERE p.id = auth.uid()\n        AND p.role IN (\'super_admin\', \'admin\', \'agency\', \'team\', \'operacional\')\n    )\n  );'), "client_meta_assets_select: versão role-only antiga (sem ownership) não sobrevive na migration atual");
}

console.log("[test] 18 — PROMPT 04A/P0-B: olaclick_connections fecha bypass direto via Data API");
{
  assert(sql.includes('DROP POLICY IF EXISTS "admin_all_olaclick" ON public.olaclick_connections;'), "admin_all_olaclick (role-only, FOR ALL) é removida nesta migration");
  const policies = ["olaclick_connections_select", "olaclick_connections_insert", "olaclick_connections_update", "olaclick_connections_delete"];
  for (const p of policies) {
    const block = sql.match(new RegExp(`CREATE POLICY "${p}"[\\s\\S]*?;`))?.[0] ?? "";
    assert(block.length > 0, `${p}: criada nesta migration`);
    assert(/can_access_client\(client_id\)/.test(block), `${p}: exige can_access_client(client_id) -- fecha o bypass global de admin_all_olaclick (P0-B)`);
  }
}

console.log("[test] 19 — PROMPT 04A/P0-B cont.: v_olaclick_connections_safe sem privilégios mutantes");
{
  assert(/REVOKE ALL ON public\.v_olaclick_connections_safe FROM PUBLIC;/.test(sql), "REVOKE ALL de PUBLIC na view (fecha INSERT/UPDATE/DELETE herdados dos default privileges, não só SELECT)");
  assert(/REVOKE ALL ON public\.v_olaclick_connections_safe FROM anon;/.test(sql), "REVOKE ALL de anon na view");
  assert(/REVOKE ALL ON public\.v_olaclick_connections_safe FROM authenticated;/.test(sql), "REVOKE ALL de authenticated na view -- CODEX confirmou is_updatable=YES/is_insertable_into=YES antes desta correção");
}

console.log("[test] 20 — PROMPT 04A/P0-C: authorization denial de RPC é FINAL, nunca dispara fallback service_role");
{
  assert(/isAuthorizationDeniedError/.test(authGuard), "helper isAuthorizationDeniedError existe em src/lib/supabase/authorization-guard.ts");
  assert(/canAccessClientIndependently/.test(authGuard), "helper canAccessClientIndependently existe -- revalidação independente antes de qualquer fallback service_role");

  for (const [name, route] of [["archive/delete route", archiveRoute], ["restore route", restoreRoute]] as const) {
    // PROMPT 04E: refatorado para usar classifyRpcError/shouldAttemptPrivilegedFallback
    // (gate único, ver teste 31) em vez de isAuthorizationDeniedError direto --
    // a classificação de negação continua acontecendo, só que via helper composto.
    assert(/classifyRpcError\(/.test(route), `${name}: classifica o erro da RPC explicitamente (authorization_denied é uma das categorias)`);
    assert(/canAccessClientIndependently/.test(route), `${name}: revalida autorização independentemente antes do fallback service_role (Fase 9-11)`);
    const authIdx = route.indexOf('=== "authorization_denied"');
    const fallbackIdx = Math.max(route.lastIndexOf("createSupabaseAdminClient()"), route.lastIndexOf("createRequiredSupabaseAdminClient()"));
    assert(authIdx > -1 && fallbackIdx > -1 && authIdx < fallbackIdx, `${name}: checagem de authorization denial vem ANTES do client admin/service_role no código`);
  }
}

console.log("[test] 21 — PROMPT 04A/Fase 12-13: Meta/OlaClick DELETE fail-closed quando lookup não resolve ownership");
{
  for (const [name, fullRoute] of [["Meta assets link DELETE", metaRoute], ["OlaClick connect DELETE", olaRoute]] as const) {
    const deleteIdx = fullRoute.indexOf("export const DELETE");
    assert(deleteIdx > -1, `${name}: handler DELETE encontrado`);
    const block = fullRoute.slice(deleteIdx);
    assert(/lookupError/.test(block), `${name}: distingue erro de lookup de "não encontrado"`);
    assert(/reason: "not_found"[\s\S]{0,40}status: 404/.test(block), `${name}: registro inexistente retorna 404, nunca prossegue para delete`);
    assert(/reason: "forbidden"[\s\S]{0,40}status: 403/.test(block), `${name}: client_id ausente ou can_access_client negado retorna 403, nunca prossegue`);
    assert(!/if \(error && hasSupabaseServiceRoleKey/.test(block), `${name}: dentro do handler DELETE não existe mais "tenta com sessão, cai pro admin em qualquer erro" -- delete só roda depois de autorização já confirmada`);
    assert(/const deleteDb = hasSupabaseServiceRoleKey\(\) \? createSupabaseAdminClient\(\) : supabase;/.test(block), `${name}: usa service_role para a mutação SÓ depois de can_access_client já ter confirmado true`);
  }
}

console.log("[test] 22 — PROMPT 04A/Fase 15-16: signup bootstrap idempotente para usuário sem client vinculado");
{
  assert(/signup_bootstrap/.test(resolveClient), "resolveCurrentClient() ganha a fonte signup_bootstrap (Fase 15)");
  assert(/create_client_on_signup/.test(resolveClient), "bootstrap reutiliza a MESMA RPC canônica -- nunca um sistema paralelo de criação de Company (Fase 15)");
  assert(/sessionClient\.rpc/.test(resolveClient), "bootstrap chama a RPC via sessionClient (JWT real) -- nunca via admin client, pois auth.uid() precisa resolver dentro da função");
  const bootstrapIdx = resolveClient.indexOf("signup_bootstrap");
  const notFoundIdx = resolveClient.lastIndexOf('"not_found"');
  assert(bootstrapIdx > -1 && notFoundIdx > -1 && bootstrapIdx < notFoundIdx, "bootstrap é tentado ANTES do retorno not_found final -- é a última fonte, não substitui as 5 anteriores");
}

console.log("[test] 23 — PROMPT 04A: rollback ganha as novas seções com paridade de ACL, e permanece transacional");
{
  assert(rollback.includes('CREATE POLICY "client_meta_assets_select"') && /role IN \('super_admin', 'admin', 'agency', 'team', 'operacional'\)/.test(rollback.slice(rollback.indexOf('CREATE POLICY "client_meta_assets_select"'), rollback.indexOf('CREATE POLICY "client_meta_assets_select"') + 400)), "rollback restaura client_meta_assets_select ao estado role-only exato (docs/supabase/62)");
  assert(!/can_access_client/.test(rollback.slice(rollback.indexOf('CREATE POLICY "client_meta_assets_select"'), rollback.indexOf('CREATE POLICY "client_meta_assets_delete"'))), "rollback das policies de client_meta_assets NÃO inclui can_access_client -- reabre exatamente o P0-A");
  assert(rollback.includes('CREATE POLICY "admin_all_olaclick"'), "rollback restaura admin_all_olaclick (FOR ALL, role-only) removendo as 4 policies novas");
  assert(rollback.includes('DROP POLICY IF EXISTS "olaclick_connections_select"'), "rollback remove explicitamente as 4 policies novas de olaclick_connections antes de recriar a antiga");
}

console.log("[test] 27 — PROMPT 04C: rollback restaura o ACL exato pré-patch de v_olaclick_connections_safe (captura live 28/08/2026)");
{
  assert(!rollback.includes("NEEDS_READ_ONLY_LIVE_CAPTURE"), "gap documental resolvido -- captura live já feita, marcador não permanece nesta seção");
  const grantBlock = rollback.slice(
    rollback.indexOf("-- 12. v_olaclick_connections_safe"),
    rollback.indexOf("-- 11. olaclick_connections policies"),
  );
  assert(grantBlock.length > 0, "seção 12 (view) encontrada, antes da seção 11 (ordem reversa do rollback)");
  for (const priv of ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"]) {
    assert(new RegExp(`\\b${priv}\\b`).test(grantBlock), `rollback restaura ${priv} na view (ACL live pré-patch confirmado)`);
  }
  const grantStatement = grantBlock.match(/GRANT [\s\S]*?;/)?.[0] ?? "";
  assert(grantStatement.length > 0, "statement GRANT real encontrado (não só o comentário)");
  assert(!/\bMAINTAIN\b/.test(grantStatement), "MAINTAIN não é restaurado -- não estava presente no ACL live capturado, nunca inventar privilégio extra");
  assert(/TO anon, authenticated;/.test(grantStatement), "GRANT restrito a anon e authenticated -- exatamente os grantees que o patch revoga");
  assert(!/service_role/.test(grantStatement) && !/\bpostgres\b/.test(grantStatement), "o GRANT em si não inclui service_role/postgres -- o patch nunca os revoga, então o rollback não precisa (nem deve) recriá-los");
  assert(rollback.includes("client_read_own_olaclick"), "rollback documenta a policy adicional client_read_own_olaclick (achado factual da captura live) sem alterá-la");
}

console.log("[test] 24 — PROMPT 04A/Fase 17: aviso de emergência do rollback reforçado");
{
  assert(/MECANISMO ESTRITAMENTE EMERGENCIAL/.test(rollback), "rollback declara explicitamente ser mecanismo emergencial");
  assert(/NUNCA É ADEQUADO PARA OPERAÇÃO NORMAL/.test(rollback), "rollback declara explicitamente que o estado restaurado não é adequado para operação normal");
  assert(/HARDENING PRECISA SER REAPLICADO/.test(rollback), "rollback instrui reaplicar o hardening (ou plano equivalente) imediatamente após execução");
  assert(/P0-A\/P0-B/.test(rollback), "rollback documenta os novos P0-A/P0-B (client_meta_assets/olaclick_connections) na lista de exposições reabertas");
}

console.log("[test] 25 — PROMPT 04A/Fase 13: ledger de migrations também corrigido no arquivo de rollback");
{
  assert(!rollback.includes("não tem migration history rastreada"), "rollback não repete mais a afirmação obsoleta sobre ausência de migration history");
  assert(rollback.includes("4 migrations rastreadas") || rollback.includes("ledger formal de migrations do Supabase"), "rollback referencia o ledger formal corretamente, sem contradizer o arquivo principal");
}

console.log("[test] 26 — PROMPT 04A/Fase 18-19: live-test-plan cobre os novos casos, todos transacionais");
{
  const newCases = [
    "client_meta_assets", "olaclick_connections", "v_olaclick_connections_safe",
    "signup_bootstrap", "late_bootstrap_still_works", "idempotent",
  ];
  for (const c of newCases) {
    assert(liveTestPlan.includes(c), `live-test-plan cobre um caso referenciando "${c}"`);
  }
  const beginCount = (liveTestPlan.match(/\bBEGIN;/g) ?? []).length;
  const rollbackCount = (liveTestPlan.match(/\bROLLBACK;/g) ?? []).length;
  assert(beginCount > 0 && beginCount === rollbackCount, `todo bloco BEGIN; tem um ROLLBACK; correspondente (${beginCount} pares) -- nenhum COMMIT; em todo o arquivo`);
  assert(!/\bCOMMIT;/.test(liveTestPlan), "live-test-plan nunca usa COMMIT -- nenhuma mutação de teste persiste de verdade");
}

console.log("[test] 28 — PROMPT 04E/Fase 12-14: unique partial index em clients.owner_id com preflight fail-closed");
{
  assert(sql.includes("CREATE UNIQUE INDEX IF NOT EXISTS clients_owner_id_unique_idx"), "patch cria clients_owner_id_unique_idx");
  assert(/CREATE UNIQUE INDEX IF NOT EXISTS clients_owner_id_unique_idx\s*\n\s*ON public\.clients \(owner_id\)\s*\n\s*WHERE owner_id IS NOT NULL;/.test(sql), "índice é parcial (WHERE owner_id IS NOT NULL) -- nunca exige unicidade para NULL");
  assert(sql.includes("idx_clients_owner") && !sql.includes("CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_owner"), "nome escolhido (clients_owner_id_unique_idx) é distinto de idx_clients_owner -- documentado no patch, nunca reutiliza o nome do índice comum existente");
  const preflightBlock = sql.slice(sql.indexOf("DO $$"), sql.indexOf("CREATE UNIQUE INDEX IF NOT EXISTS clients_owner_id_unique_idx"));
  assert(preflightBlock.includes("HAVING COUNT(*) > 1"), "preflight verifica duplicatas antes de criar o índice");
  assert(/RAISE EXCEPTION 'ABORT:/.test(preflightBlock), "preflight aborta com RAISE EXCEPTION explícito -- nunca cria o índice silenciosamente sobre duplicatas");
  assert(!/DELETE FROM public\.clients/.test(preflightBlock) && !/UPDATE public\.clients/.test(preflightBlock), "preflight nunca corrige/apaga dados automaticamente -- só aborta");
}

console.log("[test] 29 — PROMPT 04E/Fase 15: create_client_on_signup trata unique_violation específico do novo índice");
{
  const fnBody = sql.slice(sql.indexOf("Fase 15 (PROMPT 04E)"), sql.indexOf("REVOKE ALL ON FUNCTION public.create_client_on_signup"));
  assert(/EXCEPTION WHEN unique_violation THEN/.test(fnBody), "função captura unique_violation explicitamente");
  assert(/GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;/.test(fnBody), "identifica o constraint pelo nome via GET STACKED DIAGNOSTICS -- nunca captura genericamente");
  assert(/IF v_constraint = 'clients_owner_id_unique_idx' THEN/.test(fnBody), "só trata como sucesso idempotente o constraint exato criado nesta correção");
  assert(/\bRAISE;\s*\n\s*END IF;|RAISE;\n\s*END;/.test(fnBody) || /RAISE;/.test(fnBody), "re-propaga (RAISE) qualquer outro unique_violation não relacionado -- nunca engole silenciosamente");
  assert(/auth\.uid\(\) IS NULL OR auth\.uid\(\) <> p_user_id/.test(fnBody), "contrato de identidade (auth.uid() = p_user_id) preservado -- corrida não reabre caminho anônimo");
}

console.log("[test] 30 — PROMPT 04E/Fase 17-18: rollback remove só o índice novo, preserva idx_clients_owner");
{
  assert(rollback.includes("DROP INDEX IF EXISTS public.clients_owner_id_unique_idx;"), "rollback remove clients_owner_id_unique_idx");
  assert(!rollback.includes("DROP INDEX IF EXISTS public.idx_clients_owner") && !rollback.includes("DROP INDEX IF EXISTS idx_clients_owner"), "rollback NUNCA remove idx_clients_owner (índice comum pré-existente, não criado por este hardening)");
  const idx13 = rollback.indexOf("-- 13. clients.owner_id");
  const idx12 = rollback.indexOf("-- 12. v_olaclick_connections_safe");
  assert(idx13 > -1 && idx12 > -1 && idx13 < idx12, "seção 13 (índice) é desfeita ANTES da seção 12 -- ordem reversa correta em relação ao patch");
}

console.log("[test] 31 — PROMPT 04E/Fase 1-4: rotas archive/restore usam o gate único shouldAttemptPrivilegedFallback + classifyRpcError");
{
  for (const [name, route] of [["archive/delete route", archiveRoute], ["restore route", restoreRoute]] as const) {
    assert(/classifyRpcError/.test(route), `${name}: usa classifyRpcError -- classificação explícita, nunca "qualquer erro vira fallback"`);
    assert(/shouldAttemptPrivilegedFallback/.test(route), `${name}: usa o gate único shouldAttemptPrivilegedFallback antes do fallback final`);
    assert(/"unknown_error"/.test(route), `${name}: trata unknown_error como caminho fail-closed explícito (não apenas authorization_denied)`);
  }
}

console.log("[test] 32 — PROMPT 04E/Fase 20-23: live-test-plan tem INSERT real do OlaClick e ACL da view filtrada por role");
{
  assert(/INSERT INTO public\.olaclick_connections/.test(liveTestPlan), "existe um INSERT executável real contra olaclick_connections (não só comentário)");
  const insertBlock = liveTestPlan.slice(liveTestPlan.indexOf("INSERT INTO public.olaclick_connections"), liveTestPlan.indexOf("INSERT INTO public.olaclick_connections") + 400);
  assert(insertBlock.includes("<COMPANY_B_ID>"), "INSERT usa fixture cross-company (Company B) sob sessão autorizada só para Company A");
  assert(liveTestPlan.includes("grantee IN ('PUBLIC', 'anon', 'authenticated')"), "query de ACL da view filtra explicitamente aos browser roles, não espera zero linhas globalmente");
  assert(liveTestPlan.includes("grantee IN ('service_role', 'postgres')"), "existe verificação positiva de que service_role/postgres preservam o ACL (não só ausência para browser roles)");
  const section19 = liveTestPlan.slice(liveTestPlan.indexOf("── 19."), liveTestPlan.indexOf("── 20."));
  const section19Queries = section19.match(/SELECT grantee, privilege_type[\s\S]*?;/g) ?? [];
  assert(section19Queries.length > 0 && section19Queries.every((q) => !/MAINTAIN/.test(q)), "as queries SQL da seção 19 não filtram/mencionam MAINTAIN -- nunca esteve presente no ACL real auditado (comentário explicativo à parte pode citar o nome)");
}

console.log("[test] 33 — PROMPT 04E/Fase 19: live-test-plan verifica índice único e ausência de duplicatas pós-apply");
{
  assert(liveTestPlan.includes("clients_owner_id_unique_idx"), "live-test-plan confirma existência do índice pós-apply");
  assert(/GROUP BY owner_id\s*\n\s*HAVING COUNT\(\*\) > 1/.test(liveTestPlan), "live-test-plan reconfirma ausência de duplicatas pós-apply");
}

console.log("[test] 34 — PROMPT 04E/Fase 24-25: numeração do live-test-plan e comentários de bootstrap atualizados");
{
  {
    const allSectionNumbers = [...liveTestPlan.matchAll(/── (\d+)\. /g)].map((m) => parseInt(m[1], 10));
    const advisorMatch = liveTestPlan.match(/── (\d+)\. Após aplicar/);
    const advisorNumber = advisorMatch ? parseInt(advisorMatch[1], 10) : -1;
    assert(advisorNumber > -1 && advisorNumber === Math.max(...allSectionNumbers), "seção final do Advisor tem o maior número da sequência (segue em ordem, não mais 'volta' para 12) -- checagem robusta a renumeração futura");
  }
  assert(!/── 12\. Após aplicar/.test(liveTestPlan), "não existe mais uma seção '12' duplicada/fora de ordem no fim do arquivo");
  assert(sql.includes("signup_bootstrap") || sql.includes("resolveCurrentClient()"), "comentário do patch sobre create_client_on_signup já reflete o bootstrap de resolveCurrentClient() (Fase 25) -- não afirma mais que o gap fica sem cobertura");
  assert(!/não é uma correção de segurança -- não tocado aqui\./.test(sql.slice(sql.indexOf("-- 5. create_client_on_signup"), sql.indexOf("-- 6. Meta/OlaClick RPCs"))), "afirmação obsoleta removida do comentário da seção 5 -- o gap descrito ali já foi fechado");
}

console.log("[test] 35 — PROMPT 05D/Blocker 1: clients.status usa exclusivamente o vocabulário canônico (clients_status_check)");
{
  const archiveSingleBody = sql.match(/CREATE OR REPLACE FUNCTION public\.admin_archive_client\(p_client_id uuid\)[\s\S]*?\$\$;/)?.[0] ?? "";
  const archiveBulkBody = sql.match(/CREATE OR REPLACE FUNCTION public\.admin_archive_clients\(p_client_ids uuid\[\]\)[\s\S]*?\$\$;/)?.[0] ?? "";
  const deleteBody = sql.match(/CREATE OR REPLACE FUNCTION public\.admin_delete_client\(p_client_id uuid\)[\s\S]*?\$\$;/)?.[0] ?? "";
  const createBody = sql.match(/CREATE OR REPLACE FUNCTION public\.admin_create_client\([\s\S]*?\$\$;/)?.[0] ?? "";
  const olaclickUpsertBody = sql.match(/CREATE OR REPLACE FUNCTION public\.admin_upsert_olaclick_connection\([\s\S]*?\$\$;/)?.[0] ?? "";

  for (const [name, body] of [["admin_archive_client", archiveSingleBody], ["admin_archive_clients", archiveBulkBody], ["admin_delete_client", deleteBody]] as const) {
    assert(body.length > 0, `${name}: definição encontrada`);
    assert(/status\s*=\s*'encerrado'/.test(body), `${name}: usa status = 'encerrado' (único valor canônico válido para arquivado/deletado)`);
    assert(!/status\s*=\s*'archived'/.test(body) && !/status\s*=\s*'inactive'/.test(body), `${name}: não usa mais 'archived'/'inactive' -- nunca foram valores aceitos por clients_status_check`);
  }
  assert(!/EXCEPTION WHEN check_violation/.test(deleteBody), "admin_delete_client: cascata de tentativas (archived→inactive→pausado) removida -- atribuição direta e correta no lugar");

  assert(/IF p_status NOT IN \('onboarding', 'aguardando_validacao'\) THEN/.test(createBody), "admin_create_client: aceita exatamente os 2 status de criação válidos do produto (onboarding, aguardando_validacao)");
  assert(!/NOT IN \('active', 'onboarding'\)/.test(createBody), "admin_create_client: não usa mais 'active' (nunca foi valor válido)");

  assert(/c\.status IN \('ativo', 'onboarding'\)/.test(olaclickUpsertBody), "admin_upsert_olaclick_connection: valida clients.status com 'ativo' (canônico), não 'active'");
  assert(!/c\.status IN \('active', 'onboarding'\)/.test(olaclickUpsertBody), "admin_upsert_olaclick_connection: não usa mais 'active' para clients.status");
}

console.log("[test] 36 — PROMPT 05D/Blocker 2-3: ON CONFLICT ambíguo corrigido (RETURNS TABLE colide com conflict target)");
{
  const metaBody = sql.match(/CREATE OR REPLACE FUNCTION public\.admin_link_meta_asset\([\s\S]*?\$\$;/)?.[0] ?? "";
  const olaBody = sql.match(/CREATE OR REPLACE FUNCTION public\.admin_upsert_olaclick_connection\([\s\S]*?\$\$;/)?.[0] ?? "";

  for (const [name, body] of [["admin_link_meta_asset", metaBody], ["admin_upsert_olaclick_connection", olaBody]] as const) {
    assert(body.length > 0, `${name}: definição encontrada`);
    const pragmaIdx = body.indexOf("#variable_conflict use_column");
    const conflictIdx = body.indexOf("ON CONFLICT (");
    assert(pragmaIdx > -1, `${name}: declara #variable_conflict use_column`);
    assert(conflictIdx > -1 && pragmaIdx < conflictIdx, `${name}: a diretiva vem ANTES do ON CONFLICT ambíguo (precisa estar logo após AS $$, antes de DECLARE)`);
    assert(body.indexOf("DECLARE") > pragmaIdx, `${name}: pragma está antes do DECLARE -- posição exigida pelo PL/pgSQL`);
  }
  // Meta: ambos os 3 nomes do conflict target colidem com OUT params (asset_record_id, client_id, asset_type, asset_id, linked)
  assert(/ON CONFLICT \(client_id, asset_type, asset_id\)/.test(metaBody), "admin_link_meta_asset: ON CONFLICT continua na mesma signature (client_id, asset_type, asset_id) -- só a diretiva resolve a ambiguidade, contrato inalterado");
  assert(/ON CONFLICT \(client_id, connection_name\)/.test(olaBody), "admin_upsert_olaclick_connection: ON CONFLICT continua (client_id, connection_name) -- contrato inalterado");
  // Nenhuma correção envolveu renomear colunas de retorno público
  assert(/RETURNS TABLE\(\s*asset_record_id\s+uuid,\s*client_id\s+uuid,\s*asset_type\s+text,\s*asset_id\s+text,\s*linked\s+boolean\s*\)/.test(metaBody), "admin_link_meta_asset: RETURNS TABLE inalterado -- nenhum nome de retorno público foi renomeado");
}

console.log("[test] 37 — PROMPT 05D: rollback preserva fielmente o estado histórico (bugs inclusos), não vira um segundo patch");
{
  const rbArchive = rollback.match(/CREATE OR REPLACE FUNCTION public\.admin_archive_client\(p_client_id uuid\)[\s\S]*?\$\$;/)?.[0] ?? "";
  const rbDelete = rollback.match(/CREATE OR REPLACE FUNCTION public\.admin_delete_client\(p_client_id uuid\)[\s\S]*?\$\$;/)?.[0] ?? "";
  assert(/status\s*=\s*'archived'/.test(rbArchive), "rollback: admin_archive_client histórico continua usando 'archived' (bug preservado fielmente, nunca corrigido no rollback)");
  assert(/EXCEPTION WHEN check_violation/.test(rbDelete), "rollback: admin_delete_client histórico mantém a cascata de tentativas original -- rollback não é um segundo patch de produto");
  assert(rollback.includes("PROMPT 05D"), "rollback documenta a nota sobre os bugs de runtime pré-existentes, sem alterar o comportamento restaurado");
}

console.log("[test] 38 — PROMPT 05D: nenhuma correção reabre fallback role-only, anon, ou remove can_access_client");
{
  // Regressão: as correções desta rodada tocaram só valores de status e a
  // diretiva #variable_conflict -- não devem ter tocado nenhuma cláusula
  // de autorização já existente.
  for (const fn of ["admin_archive_client", "admin_archive_clients", "admin_delete_client"]) {
    const re = new RegExp(`CREATE OR REPLACE FUNCTION public\\.${fn}\\([^)]*\\)[\\s\\S]*?\\$\\$;`);
    const body = sql.match(re)?.[0] ?? "";
    assert(/can_access_client\(p_client_id\)|NOT public\.can_access_client\(cid\)/.test(body), `${fn}: continua exigindo can_access_client -- não removido pelas correções de status`);
    assert(/v_role IS NULL OR v_role NOT IN/.test(body), `${fn}: continua NULL-safe -- não regrediu`);
  }
  for (const fn of ["admin_link_meta_asset", "admin_upsert_olaclick_connection"]) {
    const re = new RegExp(`CREATE OR REPLACE FUNCTION public\\.${fn}\\([\\s\\S]*?\\$\\$;`);
    const body = sql.match(re)?.[0] ?? "";
    assert(/can_access_client\(p_client_id\)/.test(body), `${fn}: continua exigindo can_access_client -- não removido pela correção de ambiguidade/status`);
  }
  assert(sql.includes("REVOKE ALL ON FUNCTION public.admin_archive_client(uuid) FROM anon;"), "admin_archive_client: REVOKE de anon continua presente -- correções não reabriram anon");
  assert(sql.includes("REVOKE ALL ON FUNCTION public.admin_link_meta_asset(uuid, text, text, text, text, text, uuid, boolean) FROM PUBLIC;"), "admin_link_meta_asset: REVOKE de PUBLIC continua presente");
}

console.log("[test] 39 — PROMPT 05D: live-test-plan cobre os 8 novos casos de runtime (status + ON CONFLICT), transacional");
{
  const newCases = [
    "clients_status_check", "status = 'encerrado'", "nunca SQLSTATE 42702", "sem_duplicata",
  ];
  for (const c of newCases) {
    assert(liveTestPlan.includes(c), `live-test-plan cobre um caso referenciando "${c}"`);
  }
  const beginCount = (liveTestPlan.match(/\bBEGIN;/g) ?? []).length;
  const rollbackCount = (liveTestPlan.match(/\bROLLBACK;/g) ?? []).length;
  assert(beginCount > 0 && beginCount === rollbackCount, `todo bloco BEGIN; ainda tem ROLLBACK; correspondente (${beginCount} pares) após as adições do PROMPT 05D`);
  assert(!/\bCOMMIT;/.test(liveTestPlan), "live-test-plan ainda nunca usa COMMIT");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
