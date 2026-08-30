-- ============================================================
-- LOKAT OS — SQL 91 LIVE TEST PLAN (transacional)
-- PROMPT 08 (Fase 22) — upgrade da versão anterior (pseudocódigo
-- comentado, "Run as" manual no dashboard) para o mesmo padrão
-- transacional já estabelecido em
-- docs/supabase/legacy-security-hardening-live-test-plan.sql:
-- BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims;
-- ... ROLLBACK; -- nunca persiste estado, mesmo rodado por engano.
--
-- NÃO EXECUTAR AGORA. Só faz sentido DEPOIS que
-- docs/supabase/91-company-diagnostic-roadmap.sql tiver sido aplicado
-- manualmente e aprovado. Nunca SELECT email/token/PII -- só
-- EXISTS/COUNT/boolean/colunas não-sensíveis já públicas ao próprio
-- domínio (status, client_id).
--
-- Pré-requisito -- substituir os placeholders abaixo por linhas reais
-- de TESTE (nunca Companies/usuários de produção) antes de rodar:
--   <COMPANY_A_ID>       -- client real de teste, Company A
--   <COMPANY_B_ID>       -- client real de teste, Company B
--   <SUPER_ADMIN_ID>     -- profiles.role = 'super_admin'
--   <ADMIN_ALFA_ID>      -- profiles.role = 'admin', com
--                            client_user_access ativo SÓ para Company A
--   <ADMIN_BETA_ID>      -- espelho de Alfa, só para Company B
--   <CLIENTE_ALFA_ID>    -- profiles.role = 'cliente',
--                            profiles.client_id = Company A
--   <REC_PROJECT_B_ID>   -- um rec_projects.id real cujo client_id = Company B
--
-- Todos os blocos usam `SET LOCAL` -- o efeito nunca sobrevive ao
-- ROLLBACK do próprio bloco, então a ordem de execução entre blocos
-- não importa e nenhum bloco vaza estado/role para o próximo.
-- ============================================================


-- ── Item 1 (Fase 22) — super_admin cria diagnóstico (qualquer Company) ──
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<SUPER_ADMIN_ID>"}';
  INSERT INTO public.company_diagnostics (client_id) VALUES ('<COMPANY_A_ID>');  -- deve suceder
  INSERT INTO public.company_diagnostics (client_id) VALUES ('<COMPANY_B_ID>');  -- deve suceder (super_admin é global)
ROLLBACK;

-- ── Item 2 — admin com Company access cria diagnóstico na própria Company ──
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_ALFA_ID>"}';
  INSERT INTO public.company_diagnostics (client_id) VALUES ('<COMPANY_A_ID>');  -- deve suceder
ROLLBACK;

-- ── Item 3 — admin cross-company é negado (INSERT e SELECT) ─────────
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_ALFA_ID>"}';
  INSERT INTO public.company_diagnostics (client_id) VALUES ('<COMPANY_B_ID>');  -- DEVE FALHAR (RLS WITH CHECK)
ROLLBACK;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_ALFA_ID>"}';
  SELECT COUNT(*) FROM public.company_diagnostics WHERE client_id = '<COMPANY_B_ID>';  -- deve retornar 0 (nunca erro -- RLS filtra em silêncio)
ROLLBACK;

-- ── Item 4 — cliente lê SÓ a própria Company (contrato: somente-leitura,
--    Fase 45 do SQL 91 -- can_write_client_company exige role
--    admin/super_admin, cliente nunca passa) ─────────────────────────
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<CLIENTE_ALFA_ID>"}';
  SELECT COUNT(*) FROM public.company_diagnostics WHERE client_id = '<COMPANY_A_ID>';  -- deve retornar >= 0 linhas visíveis (nunca erro)
ROLLBACK;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<CLIENTE_ALFA_ID>"}';
  SELECT COUNT(*) FROM public.company_diagnostics WHERE client_id = '<COMPANY_B_ID>';  -- deve retornar 0 (cross-company)
ROLLBACK;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<CLIENTE_ALFA_ID>"}';
  INSERT INTO public.company_diagnostics (client_id) VALUES ('<COMPANY_A_ID>');  -- DEVE FALHAR mesmo na própria Company -- cliente é somente-leitura neste domínio (Fase 45)
ROLLBACK;

-- ── Item 5 — cross-company SELECT negado (espelha item 3, tabela raiz) ──
-- (já coberto acima -- mantido aqui como referência ao número do item)

-- ── Item 6 — checklist pertence ao diagnóstico correto (nunca vaza
--    entre diagnósticos de Companies diferentes) ────────────────────
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_ALFA_ID>"}';
  SELECT COUNT(*) FROM public.diagnostic_checklist_items
    WHERE diagnostic_id IN (SELECT id FROM public.company_diagnostics WHERE client_id = '<COMPANY_B_ID>');  -- deve retornar 0 para Alfa
ROLLBACK;

-- ── Item 7 — finding pertence ao diagnóstico correto ─────────────────
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_ALFA_ID>"}';
  SELECT COUNT(*) FROM public.diagnostic_findings
    WHERE diagnostic_id IN (SELECT id FROM public.company_diagnostics WHERE client_id = '<COMPANY_B_ID>');  -- deve retornar 0 para Alfa
ROLLBACK;

-- ── Item 8 — recommendation pertence ao diagnóstico correto (cadeia de
--    3 saltos: finding_id → diagnostic_id → client_id) ──────────────
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_ALFA_ID>"}';
  SELECT COUNT(*) FROM public.diagnostic_recommendations dr
    JOIN public.diagnostic_findings df ON df.id = dr.finding_id
    JOIN public.company_diagnostics cd ON cd.id = df.diagnostic_id
    WHERE cd.client_id = '<COMPANY_B_ID>';  -- deve retornar 0 para Alfa
ROLLBACK;

-- ── Item 9 — roadmap pertence à Company correta ──────────────────────
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_ALFA_ID>"}';
  SELECT COUNT(*) FROM public.roadmap_items WHERE client_id = '<COMPANY_B_ID>';  -- deve retornar 0 para Alfa
ROLLBACK;

-- ── Item 10 — ligar roadmap de Company A a recommendation/project de
--    Company B é bloqueado por trigger (não só por RLS) ─────────────
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_ALFA_ID>"}';
  INSERT INTO public.roadmap_items (client_id, project_id, title)
    VALUES ('<COMPANY_A_ID>', '<REC_PROJECT_B_ID>', 'Item cross-company (deve falhar)');  -- DEVE FALHAR (trg_roadmap_items_consistency)
ROLLBACK;

-- ── Item 11 — constraints de status/score (SQL 91 não tem coluna
--    score -- ver Fase 14 do audit; testa os CHECKs de status reais) ──
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_ALFA_ID>"}';
  INSERT INTO public.company_diagnostics (client_id, status) VALUES ('<COMPANY_A_ID>', 'active');  -- DEVE FALHAR (CHECK -- 'active' nunca é um status válido aqui, só draft/in_progress/completed/archived)
ROLLBACK;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_ALFA_ID>"}';
  -- 'manual' com source_id preenchido nunca é válido -- CHECK de schema
  -- puro, nem chega a avaliar o trigger de consistência. gen_random_uuid()
  -- aqui é só um valor qualquer não-NULL para violar o CHECK; nunca
  -- precisa apontar para uma linha real.
  INSERT INTO public.roadmap_items (client_id, source_type, source_id, title)
    VALUES ('<COMPANY_A_ID>', 'manual', gen_random_uuid(), 'Manual com source_id (deve falhar)');  -- DEVE FALHAR (CHECK: source_type='manual' exige source_id NULL)
ROLLBACK;

-- ── Item 12 — FK integrity (referência a diagnostic/finding inexistente) ──
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_ALFA_ID>"}';
  INSERT INTO public.diagnostic_findings (diagnostic_id, category, title)
    VALUES (gen_random_uuid(), 'presenca_digital', 'FK inválida (deve falhar)');  -- DEVE FALHAR (FK diagnostic_id → company_diagnostics inexistente)
ROLLBACK;

-- ── Item 13 — delete behavior (Alfa não afeta linhas de B; trigger
--    client_id/diagnostic_id imutável) ───────────────────────────────
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_ALFA_ID>"}';
  DELETE FROM public.company_diagnostics WHERE client_id = '<COMPANY_B_ID>';  -- 0 linhas afetadas, nunca erro
  UPDATE public.company_diagnostics SET client_id = '<COMPANY_B_ID>' WHERE client_id = '<COMPANY_A_ID>';  -- DEVE FALHAR (trigger forbid_client_id_change, se houver ao menos 1 linha de A)
ROLLBACK;

-- ── Item 14 — zero resíduo após ROLLBACK ─────────────────────────────
-- Cada bloco acima já usa BEGIN;/ROLLBACK; -- nenhuma linha inserida em
-- qualquer teste sobrevive ao seu próprio bloco. Para confirmar
-- explicitamente após rodar TODOS os blocos acima em sequência (fora de
-- uma sessão que os precede), rodar como super_admin fora de qualquer
-- bloco de teste:
--   SELECT COUNT(*) FROM public.company_diagnostics WHERE client_id IN ('<COMPANY_A_ID>', '<COMPANY_B_ID>');
-- Esperado: exatamente o número de diagnósticos criados manualmente
-- ANTES deste test plan (nenhum resíduo dos INSERTs acima, todos
-- revertidos pelo próprio ROLLBACK de cada bloco).

-- ── Bloco espelho — Beta (Company B), mesma bateria dos itens 2/3/5-9 ──
-- Repetir os blocos acima com <ADMIN_ALFA_ID> → <ADMIN_BETA_ID> e
-- <COMPANY_A_ID> ↔ <COMPANY_B_ID> trocados, para confirmar que o
-- isolamento é simétrico, não um acidente de teste unidirecional.

-- ── Critério de aceite ────────────────────────────────────────────
-- Todo item marcado "deve retornar 0" retorna efetivamente 0 (nunca
-- erro mascarando um bug de policy). Todo item marcado "DEVE FALHAR"
-- levanta exceção explícita (RLS ou trigger), nunca aceita/corrompe
-- dado em silêncio. Só com os 14 itens limpos (incluindo o espelho
-- Beta) este schema pode ser considerado seguro para expor em UI.
-- ============================================================
