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
const liveTestPlan = fs.readFileSync(path.join(root, "docs/supabase/91-company-diagnostic-roadmap-rls-test-plan.sql"), "utf8");

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

console.log("[test] 7 — PROMPT 08C, P1 #1: set_updated_at() é reutilizada como dependência LIVE, NUNCA recriada/redefinida");
{
  assert(!/CREATE OR REPLACE FUNCTION public\.set_updated_at/.test(sql), "SQL 91 NÃO contém CREATE OR REPLACE FUNCTION public.set_updated_at -- só reutiliza a dependência LIVE (blast radius de 10 triggers de outros domínios não pertence a este arquivo)");
  const triggerCount = (sql.match(/FOR EACH ROW EXECUTE FUNCTION public\.set_updated_at\(\)/g) ?? []).length;
  assert(triggerCount === 5, `set_updated_at() usada em exatamente 5 triggers reais (uma por tabela mutável -- escopado a "FOR EACH ROW EXECUTE FUNCTION", nunca a uma menção em comentário), encontrado ${triggerCount}`);

  assert(!/CREATE OR REPLACE FUNCTION public\.set_updated_at/.test(rollback), "rollback NÃO contém CREATE OR REPLACE FUNCTION public.set_updated_at (nunca redefine)");
  assert(!/DROP FUNCTION[^;]*set_updated_at/.test(rollback), "rollback NÃO contém DROP FUNCTION public.set_updated_at -- a SQL 91 nunca a criou, então não há o que reverter nela");
}

console.log("[test] 7b — PROMPT 08C: inventário de objetos novos — 6 funções (não 7) e 10 triggers (não 9)");
{
  const expectedFunctions = [
    "can_access_client_company", "can_write_client_company",
    "forbid_client_id_change", "forbid_diagnostic_id_change",
    "forbid_finding_id_change", "validate_roadmap_item_consistency",
  ];
  const actualFunctionDefs = (sql.match(/CREATE OR REPLACE FUNCTION public\.\w+/g) ?? []);
  assert(actualFunctionDefs.length === 6, `SQL 91 define exatamente 6 funções novas (encontrado ${actualFunctionDefs.length}: ${actualFunctionDefs.join(", ")})`);
  for (const fn of expectedFunctions) {
    assert(sql.includes(`CREATE OR REPLACE FUNCTION public.${fn}`), `função ${fn} presente entre as 6 esperadas`);
  }

  const triggerDefs = (sql.match(/^CREATE TRIGGER \w+/gm) ?? []);
  assert(triggerDefs.length === 10, `SQL 91 cria exatamente 10 triggers (5 updated_at + 4 imutabilidade + 1 consistência), encontrado ${triggerDefs.length}`);

  const rollbackDropFns = (rollback.match(/DROP FUNCTION IF EXISTS public\.\w+/g) ?? []);
  assert(rollbackDropFns.length === 6, `rollback dropa exatamente 6 funções (mesmo inventário da SQL 91), encontrado ${rollbackDropFns.length}`);
}

console.log("[test] 7c — PROMPT 08C, P2: ACL mínima explícita nas 6 funções novas — PUBLIC/anon fechados, authenticated só onde necessário");
{
  const rlsHelperFns = ["can_access_client_company(uuid)", "can_write_client_company(uuid)"];
  const triggerFns = ["forbid_client_id_change()", "forbid_diagnostic_id_change()", "forbid_finding_id_change()", "validate_roadmap_item_consistency()"];

  for (const fnSig of [...rlsHelperFns, ...triggerFns]) {
    const fnName = fnSig.split("(")[0];
    assert(sql.includes(`REVOKE ALL ON FUNCTION public.${fnSig} FROM PUBLIC;`), `${fnName}: REVOKE ALL ... FROM PUBLIC presente`);
    assert(sql.includes(`REVOKE ALL ON FUNCTION public.${fnSig} FROM anon;`), `${fnName}: REVOKE ALL ... FROM anon presente`);
  }
  for (const fnSig of rlsHelperFns) {
    const fnName = fnSig.split("(")[0];
    assert(sql.includes(`GRANT EXECUTE ON FUNCTION public.${fnSig} TO authenticated;`), `${fnName}: GRANT EXECUTE TO authenticated presente -- chamada dentro de USING/WITH CHECK das policies`);
  }
  for (const fnSig of triggerFns) {
    const fnName = fnSig.split("(")[0];
    assert(!sql.includes(`GRANT EXECUTE ON FUNCTION public.${fnSig} TO authenticated;`), `${fnName}: SEM GRANT EXECUTE TO authenticated -- função de trigger, nunca chamada diretamente (o Postgres dispara triggers sem exigir EXECUTE do emissor do DML)`);
  }
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

console.log("[test] 11 — PROMPT 08C, P1 #2: live test plan é transacional, uma única transação para o arquivo inteiro, nunca COMMIT");
{
  // Reescrito: agora é UMA transação para o arquivo inteiro (fixtures
  // descobertas dinamicamente precisam persistir entre fases), não mais
  // 16 blocos BEGIN/ROLLBACK independentes -- por isso exatamente 1 par.
  const beginCount = (liveTestPlan.match(/^BEGIN;/gm) ?? []).length;
  const rollbackCount = (liveTestPlan.match(/^ROLLBACK;/gm) ?? []).length;
  assert(beginCount === 1 && rollbackCount === 1, `exatamente 1 BEGIN; e 1 ROLLBACK; para o arquivo inteiro (encontrado ${beginCount}/${rollbackCount}) -- fixtures precisam sobreviver entre fases`);
  assert(!/^COMMIT;/m.test(liveTestPlan), "live test plan nunca usa COMMIT -- nenhum fixture persiste");
  assert(/SET LOCAL ROLE authenticated/.test(liveTestPlan), "usa impersonação real via SET LOCAL ROLE -- mesmo padrão de legacy-security-hardening-live-test-plan.sql");
  assert(/request\.jwt\.claims/.test(liveTestPlan), "usa request.jwt.claims (via set_config) para simular auth.uid() real por usuário de teste");
  assert(/RESET ROLE;/.test(liveTestPlan), "usa RESET ROLE entre fases para voltar ao papel padrão privilegiado");
}

console.log("[test] 12 — PROMPT 08C: fixture strategy substantiva -- descoberta dinâmica, precheck com RAISE EXCEPTION, nunca placeholder <ID> hardcoded");
{
  assert(liveTestPlan.includes("SQL91_TEST_FIXTURES_UNAVAILABLE"), "precheck de fixture levanta SQL91_TEST_FIXTURES_UNAVAILABLE se faltar super_admin/cliente/2 Companies, ANTES de qualquer mutação relevante");
  assert(!/<COMPANY_A_ID>|<COMPANY_B_ID>|<ADMIN_ALFA_ID>|<USER_A_ID>/.test(liveTestPlan), "nenhum placeholder <ID> hardcoded -- todos os ids são descobertos em tempo de execução via SELECT");
  assert(/CREATE TEMP TABLE/.test(liveTestPlan), "usa TEMP TABLE para compartilhar ids de fixture entre DO blocks (que não compartilham escopo de variável entre si)");
  assert(/role = 'admin'/.test(liveTestPlan) && /client_user_access/.test(liveTestPlan), "promove um profile existente a admin + client_user_access ativo, dentro da própria transação (nunca depende de uma conta admin real pré-existente)");
}

console.log("[test] 13 — PROMPT 08C: substância real -- INSERT nas 5 tabelas, árvore A e B distintas, cross-company real (não só COUNT em tabela vazia)");
{
  for (const table of ["company_diagnostics", "diagnostic_checklist_items", "diagnostic_findings", "diagnostic_recommendations", "roadmap_items"]) {
    assert(new RegExp(`INSERT INTO public\\.${table}`).test(liveTestPlan), `pelo menos um INSERT INTO public.${table} real (não apenas SELECT/COUNT)`);
  }
  assert(/__SQL91_TEST__/.test(liveTestPlan), "usa marcador único de teste (__SQL91_TEST__) em todo dado criado -- base do residue check");
  assert(/finding_a|reco_a/.test(liveTestPlan) && /finding_b|reco_b/.test(liveTestPlan), "cria recommendation/finding tanto para árvore A quanto para árvore B (não só uma árvore com a outra assumida vazia)");
  // Cross-company real: INSERT tentando um id de B dentro do escopo de A.
  assert(/VALUES \(v_company_a, 'diagnostic_recommendation', v_reco_b/.test(liveTestPlan), "TEST 10: INSERT real de roadmap_items(client_id=A, source_id=recommendation de B) -- cross-company genuíno, não um comentário 'DEVE FALHAR'");
}

console.log("[test] 14 — PROMPT 08C: UPDATE de ownership proibido é EXECUTADO de verdade (imutabilidade), não só presença do trigger checada");
{
  const immutabilityUpdates = [
    /UPDATE public\.company_diagnostics SET client_id = v_company_b/,
    /UPDATE public\.diagnostic_findings SET diagnostic_id = gen_random_uuid\(\)/,
    /UPDATE public\.diagnostic_recommendations SET finding_id = gen_random_uuid\(\)/,
    /UPDATE public\.roadmap_items SET client_id = v_company_b/,
  ];
  for (const re of immutabilityUpdates) {
    assert(re.test(liveTestPlan), `UPDATE proibido executado de verdade: ${re.source}`);
  }
}

console.log("[test] 15 — PROMPT 08C: DELETE real da árvore em cascata, verificado por COUNT pós-DELETE (não comentário)");
{
  assert(/DELETE FROM public\.company_diagnostics WHERE id = v_diag_c/.test(liveTestPlan), "DELETE real da raiz de uma árvore descartável dedicada (nunca a árvore A usada nos outros testes)");
  assert(/SELECT COUNT\(\*\) INTO v_count FROM public\.diagnostic_checklist_items WHERE id = v_checklist_c/.test(liveTestPlan), "verifica programaticamente que o checklist descartável foi removido em cascata");
  assert(/SELECT COUNT\(\*\) INTO v_count FROM public\.diagnostic_findings WHERE id = v_finding_c/.test(liveTestPlan), "verifica programaticamente que o finding descartável foi removido em cascata");
  assert(/SELECT COUNT\(\*\) INTO v_count FROM public\.diagnostic_recommendations WHERE id = v_reco_c/.test(liveTestPlan), "verifica programaticamente que a recommendation descartável foi removida em cascata");
}

console.log("[test] 16 — PROMPT 08C: expected-failure handling programático (EXCEPTION WHEN), erro inesperado continua abortando");
{
  const expectedCatches = ["WHEN insufficient_privilege THEN", "WHEN raise_exception THEN", "WHEN check_violation THEN"];
  for (const c of expectedCatches) {
    assert(liveTestPlan.includes(c), `captura programática presente: ${c}`);
  }
  assert(!/-- DEVE FALHAR\s*$/m.test(liveTestPlan.replace(/--[^\n]*DEVE FALHAR[^\n]*\([^\n]*nao deveria existir[^\n]*\)/g, "")), "nenhum 'DEVE FALHAR' restante como comentário solto sem assertion programática correspondente");
  // Cada EXCEPTION captura um SQLSTATE específico -- nunca "WHEN OTHERS"
  // mascarando um erro inesperado como PASS (a única exceção legítima a
  // WHEN OTHERS é o SETUP best-effort do TEST 11, documentado à parte).
  const othersCount = (liveTestPlan.match(/WHEN OTHERS THEN/g) ?? []).length;
  assert(othersCount === 1, `WHEN OTHERS usado só 1 vez (setup best-effort do TEST 11 -- rec_projects fora do escopo do domínio), encontrado ${othersCount}`);
}

console.log("[test] 17 — PROMPT 08C: zero residue automático -- verificação programática, não comentário/manual");
{
  assert(/RESIDUE CHECK/.test(liveTestPlan), "existe um bloco de verificação de resíduo com marcador __SQL91_TEST__");
  assert(/RAISE EXCEPTION 'RESIDUE CHECK INCONCLUSIVO/.test(liveTestPlan), "residue check falha alto se 0 marcadores forem encontrados ANTES do ROLLBACK -- prova que os testes rodaram de verdade, não é um check vazio");
}

console.log(`\n[result] ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
