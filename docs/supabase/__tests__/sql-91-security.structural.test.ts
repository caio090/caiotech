/**
 * Executar com: node .tmp/run-ts-test.cjs docs/supabase/__tests__/sql-91-security.structural.test.ts
 * Sprint SQL 91 Security Hardening V2 (Fase 54) — trava em teste os
 * contratos P0 do gate de segurança do CODEX WEB, para que nenhum deles
 * regrida silenciosamente numa próxima edição do SQL. Regex direcionada
 * aos contratos que importam, não um teste textual frágil genérico.
 */
import * as fs from "fs";
import * as path from "path";

const root = process.cwd();
const sql = fs.readFileSync(path.join(root, "docs/supabase/91-company-diagnostic-roadmap.sql"), "utf8");
const rollback = fs.readFileSync(path.join(root, "docs/supabase/91-company-diagnostic-roadmap-rollback.sql"), "utf8");

let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("[test] 1 — P0.1: nenhuma policy concede acesso Company-scoped só por role (role não é ownership)");
{
  // A versão rejeitada usava literalmente `role IN ('super_admin','admin','agency','operacional')`
  // como USING/WITH CHECK das 5 tabelas. Essa string não pode reaparecer.
  assert(!/role IN \('super_admin','admin','agency','operacional'\)/.test(sql), "grant role-only amplo (super_admin/admin/agency/operacional) removido");
  assert(!/role IN \([^)]*'agency'/.test(sql), "'agency' nunca aparece dentro de um predicado role IN (...) -- não é um valor real de profiles.role (é surface/account_type)");
  assert(!/clients WHERE owner_id = auth\.uid\(\)/.test(sql), "modelo de ownership legado (clients.owner_id) removido -- não é o caminho usado por resolveCompanyContext()");
  assert(!sql.includes("FOR ALL TO authenticated"), "nenhuma policy 'FOR ALL' genérica -- SELECT/INSERT/UPDATE/DELETE são policies distintas com regras de leitura vs. escrita diferentes (client é somente-leitura, Fase 45)");
}

console.log("[test] 2 — P0.1/P0.2: todas as 5 tabelas têm RLS habilitada e policies próprias, todas via helper canônico");
{
  const tables = ["company_diagnostics", "diagnostic_checklist_items", "diagnostic_findings", "diagnostic_recommendations", "roadmap_items"];
  for (const table of tables) {
    assert(sql.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`), `RLS habilitada explicitamente em ${table}`);
    const createPolicyCount = (sql.match(new RegExp(`CREATE POLICY "[^"]*"\\s+ON public\\.${table}`, "g")) ?? []).length;
    assert(createPolicyCount >= 4, `${table} tem pelo menos 4 policies (SELECT/INSERT/UPDATE/DELETE), nunca um FOR ALL genérico role-based`);
  }
  const canAccessCount = (sql.match(/can_access_client_company/g) ?? []).length;
  const canWriteCount = (sql.match(/can_write_client_company/g) ?? []).length;
  assert(canAccessCount >= 8, "can_access_client_company() usado nas policies de leitura das 5 tabelas (definição + SELECT policies), nunca duplicada com lógica própria");
  assert(canWriteCount >= 8, "can_write_client_company() usado nas policies de escrita das 5 tabelas");
}

console.log("[test] 3 — helper de ownership reproduz o modelo canônico real (super_admin, client_user_access, agency_workspaces+agency_clients)");
{
  const helperMatch = sql.match(/CREATE OR REPLACE FUNCTION public\.can_access_client_company[\s\S]*?\$\$;/);
  assert(!!helperMatch, "função can_access_client_company existe");
  const body = helperMatch?.[0] ?? "";
  assert(/role = 'super_admin'/.test(body), "super_admin continua com acesso global (único role verdadeiramente global)");
  assert(/client_user_access/.test(body), "client_user_access consultado -- mesmo caminho de resolveCurrentClient()/fetchAdminCompanyAuthorization()");
  assert(/agency_workspaces/.test(body) && /agency_clients/.test(body), "agency_workspaces + agency_clients consultados -- mesma cadeia de isCompanyAuthorizedForAdmin()");
  assert(/SECURITY INVOKER/.test(body) || /SECURITY INVOKER/.test(sql.slice(sql.indexOf("can_access_client_company") - 400, sql.indexOf("can_access_client_company"))), "helper é SECURITY INVOKER, não DEFINER -- não precisa escalar privilégio (Fase 3)");
}

console.log("[test] 4 — P0.3: diagnostic_findings não tem client_id redundante; Company sempre derivada via diagnostic_id");
{
  const findingsTableMatch = sql.match(/CREATE TABLE IF NOT EXISTS public\.diagnostic_findings \([\s\S]*?\);/);
  assert(!!findingsTableMatch, "definição da tabela diagnostic_findings encontrada");
  assert(!/client_id\s+UUID/.test(findingsTableMatch?.[0] ?? ""), "diagnostic_findings.client_id removido -- elimina a classe de inconsistência 'diagnostic_id de A + client_id de B'");
  assert((findingsTableMatch?.[0] ?? "").includes("diagnostic_id"), "diagnostic_id continua sendo a única referência de ownership da tabela");
}

console.log("[test] 5 — P0.3: cross-company Project/Recommendation bloqueado por trigger, não só por TypeScript");
{
  assert(sql.includes("trg_roadmap_items_consistency"), "trigger de consistência do roadmap existe");
  const fnMatch = sql.match(/CREATE OR REPLACE FUNCTION public\.validate_roadmap_item_consistency[\s\S]*?\$\$;/);
  const fnBody = fnMatch?.[0] ?? "";
  assert(/rp\.client_id = NEW\.client_id/.test(fnBody), "project_id só é aceito se rec_projects.client_id bater exatamente com roadmap_items.client_id");
  assert(/cd\.client_id = NEW\.client_id/.test(fnBody), "source_id (diagnostic_recommendation) só é aceito se a Company derivada bater com roadmap_items.client_id");
}

console.log("[test] 6 — statuses revisados: draft incluído, in_roadmap/in_project/in_campaign removidos");
{
  assert(/status\s+TEXT NOT NULL DEFAULT 'draft'/.test(sql), "company_diagnostics.status aceita 'draft' como default (Fase 14)");
  assert(!sql.includes("'in_roadmap'"), "'in_roadmap' removido do status do Finding -- é uma relação, não um estado (Fase 18)");
  assert(!sql.includes("'in_project'") && !sql.includes("'in_campaign'"), "'in_project'/'in_campaign' removidos do status do Roadmap -- já representado por project_id (Fase 25)");
  assert(sql.includes("'not_applicable'"), "checklist ganhou 'not_applicable' (Fase 16)");
}

console.log("[test] 7 — updated_at reaproveita o mecanismo canônico existente, não recria um novo por tabela");
{
  const setUpdatedAtDefs = (sql.match(/CREATE OR REPLACE FUNCTION public\.set_updated_at\(\)/g) ?? []).length;
  assert(setUpdatedAtDefs === 1, "public.set_updated_at() definida uma única vez (idempotente, reaproveitando o padrão de docs/supabase/18 e /33), nunca duplicada com nome novo");
  const triggerCount = (sql.match(/EXECUTE FUNCTION public\.set_updated_at\(\)/g) ?? []).length;
  assert(triggerCount >= 5, "set_updated_at() usada em pelo menos 5 triggers (uma por tabela mutável)");
}

console.log("[test] 8 — rollback não usa CASCADE genérico e dropa só o que o 91 cria");
{
  assert(!/DROP TABLE[^;]*CASCADE/.test(rollback), "nenhum DROP TABLE ... CASCADE no rollback (Fase 33) -- dependências não antecipadas falham explicitamente em vez de serem destruídas em silêncio");
  for (const table of ["roadmap_items", "diagnostic_recommendations", "diagnostic_findings", "diagnostic_checklist_items", "company_diagnostics"]) {
    assert(rollback.includes(`DROP TABLE IF EXISTS public.${table}`), `rollback dropa public.${table} explicitamente`);
  }
  assert(!rollback.includes("public.clients") && !rollback.includes("public.profiles") && !rollback.includes("public.rec_projects"), "rollback nunca toca em tabelas pré-existentes (clients/profiles/rec_projects)");
}

console.log("[test] 9 — transação: migration e rollback são atômicos (Fase 34)");
{
  assert(sql.includes("BEGIN;") && sql.includes("COMMIT;"), "SQL 91 envolvido em transação");
  assert(rollback.includes("BEGIN;") && rollback.includes("COMMIT;"), "rollback envolvido em transação");
}

console.log("[test] 10 — SQL ainda não marcado como aprovado para produção (aguardando CODEX WEB)");
{
  assert(sql.includes("SQL_READY_FOR_MANUAL_APPROVAL"), "status permanece SQL_READY_FOR_MANUAL_APPROVAL -- nunca auto-aprovado por este sprint");
  assert(!sql.includes("SQL_APPROVED_FOR_APPLY"), "SQL_APPROVED_FOR_APPLY nunca é auto-atribuído -- só o CODEX WEB pode emitir esse veredito");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
