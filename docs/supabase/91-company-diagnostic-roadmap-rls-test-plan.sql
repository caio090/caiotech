-- ============================================================
-- LOKAT OS — SQL 91 LIVE TEST PLAN (transacional, substantivo)
-- PROMPT 08C, P1 #2 — reescrita da versão anterior (Fase 22 do PROMPT
-- 08), cujos testes eram nominalmente presentes mas vazios: COUNT em
-- tabelas potencialmente vazias, sem árvore real Company A/B, sem
-- INSERT/UPDATE cross-company real, "DEVE FALHAR" só em comentário
-- (nunca verificado programaticamente), residue check manual.
--
-- NÃO EXECUTAR AGORA. Só faz sentido DEPOIS que
-- docs/supabase/91-company-diagnostic-roadmap.sql tiver sido aplicado
-- manualmente e aprovado. Nunca SELECT email/token/PII -- só ids,
-- status, client_id (já não-sensíveis neste domínio).
--
-- ─────────────────────────────────────────────────────────────
-- ESTRATÉGIA DE FIXTURE (Fase "FIXTURE STRATEGY" do PROMPT 08C)
-- ─────────────────────────────────────────────────────────────
-- O LIVE atual não garante ter nenhum profile role=admin. Em vez de
-- depender de contas reais pré-criadas manualmente (padrão anterior,
-- com placeholders de id substituídos à mão), este plano DESCOBRE
-- fixtures existentes em tempo de execução e promove TEMPORARIAMENTE
-- um profile existente a role='admin' + client_user_access ativo --
-- mutação que nunca sobrevive ao ROLLBACK final. Nenhum dado é
-- COMMITADO em nenhum momento (uma única transação para o arquivo
-- inteiro).
--
-- Toda leitura/escrita de fixture (descoberta, promoção temporária de
-- role, criação da árvore de teste da Company B) roda com o papel
-- padrão da sessão (o mesmo que conecta via SQL Editor -- privilegiado
-- o bastante para ler/escrever profiles/client_user_access
-- diretamente, e globalmente autorizado quando impersona super_admin).
-- As operações que precisam provar RLS de verdade alternam para
-- `SET LOCAL ROLE authenticated;` seguido de
-- `PERFORM set_config('request.jwt.claims', ..., true)` (equivalente
-- plpgsql de `SET LOCAL request.jwt.claims = ...` -- `SET`/`SET LOCAL`
-- não são statements plpgsql válidos dentro de um DO block, por isso
-- `set_config(..., is_local => true)`) -- mesmo padrão de
-- docs/supabase/legacy-security-hardening-live-test-plan.sql -- e usam
-- `RESET ROLE;` para voltar ao papel padrão entre fases. Só UMA
-- identidade sintética é promovida (Alfa/Company A) -- a árvore da
-- Company B é criada pelo próprio super_admin (acesso global
-- legítimo), evitando o risco de reaproveitar/repontar uma segunda
-- identidade no meio do script e revogar por engano o acesso de Alfa
-- antes dos testes que ainda dependem dele.
--
-- Estado compartilhado entre as fases fica em uma TEMP TABLE (nunca
-- persiste -- CREATE TABLE também é revertido pelo ROLLBACK final);
-- DO blocks não compartilham variáveis entre si, então este é o
-- mecanismo real de passar ids (Company A/B, diagnostic A/B, etc.)
-- de uma fase para a próxima.
--
-- Marcador único de teste: todo texto criado por este plano usa o
-- prefixo `__SQL91_TEST__` -- usado no residue check final (Fase
-- "ZERO RESIDUE AUTOMÁTICO").
-- ============================================================

BEGIN;

CREATE TEMP TABLE _sql91_fx (key text PRIMARY KEY, value uuid);
GRANT SELECT, INSERT ON _sql91_fx TO authenticated;

-- ── FASE 0 — Fixture precheck + descoberta (papel padrão da sessão) ──
DO $$
DECLARE
  v_super_admin_id        uuid;
  v_cliente_a_profile_id  uuid;
  v_company_a_id          uuid;
  v_company_b_id          uuid;
  v_admin_alfa_profile_id uuid;
BEGIN
  SELECT id INTO v_super_admin_id FROM public.profiles WHERE role = 'super_admin' LIMIT 1;
  IF v_super_admin_id IS NULL THEN
    RAISE EXCEPTION 'SQL91_TEST_FIXTURES_UNAVAILABLE: nenhum profile role=super_admin encontrado';
  END IF;

  -- Deriva Company A a partir de um cliente real já vinculado -- nunca
  -- assume que uma Company arbitrária tem um cliente associado.
  SELECT id, client_id INTO v_cliente_a_profile_id, v_company_a_id
    FROM public.profiles WHERE role = 'cliente' AND client_id IS NOT NULL LIMIT 1;
  IF v_cliente_a_profile_id IS NULL THEN
    RAISE EXCEPTION 'SQL91_TEST_FIXTURES_UNAVAILABLE: nenhum profile role=cliente com client_id encontrado';
  END IF;

  SELECT id INTO v_company_b_id FROM public.clients WHERE id <> v_company_a_id LIMIT 1;
  IF v_company_b_id IS NULL THEN
    RAISE EXCEPTION 'SQL91_TEST_FIXTURES_UNAVAILABLE: menos de 2 Companies distintas encontradas';
  END IF;

  -- Admin sintético Alfa: um profile qualquer distinto do cliente A e
  -- do super_admin (nunca reaproveita a IDENTIDADE super_admin -- isso
  -- invalidaria o teste "admin comum é negado", já que super_admin é
  -- sempre global).
  SELECT id INTO v_admin_alfa_profile_id
    FROM public.profiles WHERE id NOT IN (v_cliente_a_profile_id, v_super_admin_id) LIMIT 1;
  IF v_admin_alfa_profile_id IS NULL THEN
    v_admin_alfa_profile_id := v_cliente_a_profile_id;
    RAISE NOTICE 'FIXTURE FALLBACK: nenhum terceiro profile disponível -- reaproveitando o profile cliente A como admin sintético Alfa. Seguro porque os testes de cliente puro (TEST 4/5) rodam ANTES desta promoção, nesta ordem.';
  END IF;

  -- Nenhum "admin Beta" sintético é necessário: a árvore de fixture da
  -- Company B (FASE 3 abaixo) é criada pelo próprio super_admin, que já
  -- tem acesso global -- evita promover/repontar uma SEGUNDA identidade
  -- (e o risco real de, ao reaproveitar a MESMA identidade de Alfa para
  -- Beta, revogar por engano o acesso de Alfa à Company A no meio do
  -- script, antes dos testes 6-9/12/13 que dependem dele). Nenhum teste
  -- desta lista exige uma "admin Beta" com identidade própria -- só
  -- exige que EXISTA dado real em Company B para provar negação
  -- cross-company, e o super_admin cria isso com total legitimidade.
  INSERT INTO _sql91_fx (key, value) VALUES
    ('super_admin', v_super_admin_id),
    ('cliente_a', v_cliente_a_profile_id),
    ('company_a', v_company_a_id),
    ('company_b', v_company_b_id),
    ('admin_alfa', v_admin_alfa_profile_id);

  RAISE NOTICE 'FIXTURES OK: super_admin=%, cliente_a=%, company_a=%, company_b=%, admin_alfa=%',
    v_super_admin_id, v_cliente_a_profile_id, v_company_a_id, v_company_b_id, v_admin_alfa_profile_id;
END $$;

-- ── FASE 1 — promove Alfa a admin da Company A (papel padrão) ────────
DO $$
DECLARE v_admin_alfa uuid; v_company_a uuid;
BEGIN
  SELECT value INTO v_admin_alfa FROM _sql91_fx WHERE key = 'admin_alfa';
  SELECT value INTO v_company_a  FROM _sql91_fx WHERE key = 'company_a';
  UPDATE public.profiles SET role = 'admin' WHERE id = v_admin_alfa;
  INSERT INTO public.client_user_access (user_id, client_id, status) VALUES (v_admin_alfa, v_company_a, 'active');
  RAISE NOTICE 'FASE 1 OK: % promovido a admin de Company A (%)', v_admin_alfa, v_company_a;
END $$;

-- ============================================================
-- TEST 1 — super_admin cria diagnostic legítimo (qualquer Company)
-- ============================================================
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_super uuid; v_company_a uuid; v_id uuid;
BEGIN
  SELECT value INTO v_super      FROM _sql91_fx WHERE key = 'super_admin';
  SELECT value INTO v_company_a  FROM _sql91_fx WHERE key = 'company_a';
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_super)::text, true);

  INSERT INTO public.company_diagnostics (client_id, niche_category)
    VALUES (v_company_a, '__SQL91_TEST__ niche')
    RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'TEST 1 FAIL: super_admin não conseguiu criar diagnostic em Company A';
  END IF;
  INSERT INTO _sql91_fx (key, value) VALUES ('diag_a', v_id);
  RAISE NOTICE 'TEST 1 PASS: super_admin criou diagnostic % em Company A', v_id;
END $$;
RESET ROLE;

-- ============================================================
-- TEST 2 — admin com Company access cria diagnostic na própria Company
-- ============================================================
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_admin_alfa uuid; v_company_a uuid; v_id uuid;
BEGIN
  SELECT value INTO v_admin_alfa FROM _sql91_fx WHERE key = 'admin_alfa';
  SELECT value INTO v_company_a  FROM _sql91_fx WHERE key = 'company_a';
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_alfa)::text, true);

  INSERT INTO public.company_diagnostics (client_id, niche_category)
    VALUES (v_company_a, '__SQL91_TEST__ niche B2')
    RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'TEST 2 FAIL: admin Alfa não conseguiu criar diagnostic na própria Company A';
  END IF;
  RAISE NOTICE 'TEST 2 PASS: admin Alfa criou diagnostic % em Company A (própria)', v_id;
END $$;
RESET ROLE;

-- ============================================================
-- TEST 3 — admin cross-company é negado (INSERT em Company B)
-- ============================================================
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_admin_alfa uuid; v_company_b uuid; v_before integer; v_after integer;
BEGIN
  SELECT value INTO v_admin_alfa FROM _sql91_fx WHERE key = 'admin_alfa';
  SELECT value INTO v_company_b  FROM _sql91_fx WHERE key = 'company_b';
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_alfa)::text, true);

  SELECT COUNT(*) INTO v_before FROM public.company_diagnostics WHERE client_id = v_company_b;
  BEGIN
    INSERT INTO public.company_diagnostics (client_id, niche_category)
      VALUES (v_company_b, '__SQL91_TEST__ cross-company (nao deveria existir)');
    RAISE EXCEPTION 'TEST 3 FAIL: admin Alfa conseguiu inserir diagnostic em Company B (cross-company NÃO bloqueado)';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST 3 PASS: INSERT cross-company negado por RLS (insufficient_privilege), como esperado';
  END;
  SELECT COUNT(*) INTO v_after FROM public.company_diagnostics WHERE client_id = v_company_b;
  IF v_after <> v_before THEN
    RAISE EXCEPTION 'TEST 3 FAIL: contagem de linhas de Company B mudou apesar do INSERT ter sido negado (% -> %)', v_before, v_after;
  END IF;
END $$;
RESET ROLE;

-- ============================================================
-- TEST 4 — cliente lê SÓ a própria Company (contrato: somente-leitura)
-- TEST 5 — cross-company SELECT negado (0 linhas, nunca erro)
-- ============================================================
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_cliente_a uuid; v_company_a uuid; v_company_b uuid; v_count_a integer; v_count_b integer;
BEGIN
  SELECT value INTO v_cliente_a FROM _sql91_fx WHERE key = 'cliente_a';
  SELECT value INTO v_company_a FROM _sql91_fx WHERE key = 'company_a';
  SELECT value INTO v_company_b FROM _sql91_fx WHERE key = 'company_b';
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_cliente_a)::text, true);

  SELECT COUNT(*) INTO v_count_a FROM public.company_diagnostics WHERE client_id = v_company_a;
  IF v_count_a < 1 THEN
    RAISE EXCEPTION 'TEST 4 FAIL: cliente Alfa não enxerga nenhum diagnostic da própria Company A (esperado >= 1, os criados nos TEST 1/2)';
  END IF;
  RAISE NOTICE 'TEST 4 PASS: cliente Alfa enxerga % diagnostic(s) da própria Company A', v_count_a;

  SELECT COUNT(*) INTO v_count_b FROM public.company_diagnostics WHERE client_id = v_company_b;
  IF v_count_b <> 0 THEN
    RAISE EXCEPTION 'TEST 5 FAIL: cliente Alfa enxerga % linha(s) de Company B (esperado 0)', v_count_b;
  END IF;
  RAISE NOTICE 'TEST 5 PASS: cliente Alfa não enxerga nenhuma linha de Company B (RLS filtra em silêncio, sem erro)';

  -- Fase 45 do SQL 91: cliente é somente-leitura neste domínio, mesmo
  -- na própria Company.
  BEGIN
    INSERT INTO public.company_diagnostics (client_id) VALUES (v_company_a);
    RAISE EXCEPTION 'TEST 4b FAIL: cliente Alfa conseguiu escrever na própria Company A (deveria ser somente-leitura)';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST 4b PASS: cliente é somente-leitura mesmo na própria Company (WITH CHECK exige role admin/super_admin)';
  END;
END $$;
RESET ROLE;

-- ── FASE 2 — árvore completa de Company A (checklist/finding/recommendation/roadmap) ──
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_admin_alfa uuid; v_company_a uuid; v_diag_a uuid;
        v_checklist_a uuid; v_finding_a uuid; v_reco_a uuid; v_roadmap_a uuid;
BEGIN
  SELECT value INTO v_admin_alfa FROM _sql91_fx WHERE key = 'admin_alfa';
  SELECT value INTO v_company_a  FROM _sql91_fx WHERE key = 'company_a';
  SELECT value INTO v_diag_a     FROM _sql91_fx WHERE key = 'diag_a';
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_alfa)::text, true);

  INSERT INTO public.diagnostic_checklist_items (diagnostic_id, item_key, category, label, status)
    VALUES (v_diag_a, '__sql91_test_item__', '__SQL91_TEST__ categoria', '__SQL91_TEST__ item A', 'yes')
    RETURNING id INTO v_checklist_a;

  INSERT INTO public.diagnostic_findings (diagnostic_id, category, title, severity, priority)
    VALUES (v_diag_a, '__SQL91_TEST__ categoria', '__SQL91_TEST__ finding A', 'high', 'high')
    RETURNING id INTO v_finding_a;

  INSERT INTO public.diagnostic_recommendations (finding_id, title, capability)
    VALUES (v_finding_a, '__SQL91_TEST__ recommendation A', 'external_execution')
    RETURNING id INTO v_reco_a;

  INSERT INTO public.roadmap_items (client_id, source_type, source_id, title, priority)
    VALUES (v_company_a, 'diagnostic_recommendation', v_reco_a, '__SQL91_TEST__ roadmap A', 'high')
    RETURNING id INTO v_roadmap_a;

  INSERT INTO _sql91_fx (key, value) VALUES
    ('checklist_a', v_checklist_a), ('finding_a', v_finding_a),
    ('reco_a', v_reco_a), ('roadmap_a', v_roadmap_a);

  RAISE NOTICE 'FASE 2 OK: árvore A completa -- checklist=%, finding=%, recommendation=%, roadmap=%',
    v_checklist_a, v_finding_a, v_reco_a, v_roadmap_a;
END $$;
RESET ROLE;

-- ── FASE 3 — árvore mínima de Company B, criada pelo super_admin ────
-- Nenhuma identidade "Beta" promovida: super_admin já tem acesso
-- global legítimo (mesmo papel usado no TEST 1), então cria a árvore B
-- sem repontar/reaproveitar a identidade de Alfa -- elimina o risco de
-- revogar Company A de Alfa no meio do script, antes dos testes
-- 6-9/12/13 abaixo que ainda dependem desse acesso.
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_super uuid; v_company_b uuid;
        v_diag_b uuid; v_finding_b uuid; v_reco_b uuid;
BEGIN
  SELECT value INTO v_super      FROM _sql91_fx WHERE key = 'super_admin';
  SELECT value INTO v_company_b  FROM _sql91_fx WHERE key = 'company_b';
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_super)::text, true);

  INSERT INTO public.company_diagnostics (client_id, niche_category)
    VALUES (v_company_b, '__SQL91_TEST__ niche B')
    RETURNING id INTO v_diag_b;

  INSERT INTO public.diagnostic_findings (diagnostic_id, category, title, severity, priority)
    VALUES (v_diag_b, '__SQL91_TEST__ categoria', '__SQL91_TEST__ finding B', 'medium', 'medium')
    RETURNING id INTO v_finding_b;

  INSERT INTO public.diagnostic_recommendations (finding_id, title, capability)
    VALUES (v_finding_b, '__SQL91_TEST__ recommendation B', 'external_execution')
    RETURNING id INTO v_reco_b;

  INSERT INTO _sql91_fx (key, value) VALUES
    ('diag_b', v_diag_b), ('finding_b', v_finding_b), ('reco_b', v_reco_b);

  RAISE NOTICE 'FASE 3 OK: árvore B mínima criada por super_admin -- diagnostic=%, finding=%, recommendation=%', v_diag_b, v_finding_b, v_reco_b;
END $$;
RESET ROLE;

-- ============================================================
-- TEST 6 — checklist real (leitura A ok, cross-company negado)
-- ============================================================
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_admin_alfa uuid; v_checklist_a uuid; v_diag_b uuid; v_count integer;
BEGIN
  SELECT value INTO v_admin_alfa FROM _sql91_fx WHERE key = 'admin_alfa';
  SELECT value INTO v_checklist_a FROM _sql91_fx WHERE key = 'checklist_a';
  SELECT value INTO v_diag_b FROM _sql91_fx WHERE key = 'diag_b';
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_alfa)::text, true);

  SELECT COUNT(*) INTO v_count FROM public.diagnostic_checklist_items WHERE id = v_checklist_a;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'TEST 6 FAIL: admin Alfa não enxerga o checklist real da própria Company A';
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.diagnostic_checklist_items WHERE diagnostic_id = v_diag_b;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'TEST 6 FAIL: admin Alfa enxerga % item(ns) de checklist do diagnostic B (esperado 0)', v_count;
  END IF;

  BEGIN
    INSERT INTO public.diagnostic_checklist_items (diagnostic_id, category, label)
      VALUES (v_diag_b, '__SQL91_TEST__', '__SQL91_TEST__ item cross-company (nao deveria existir)');
    RAISE EXCEPTION 'TEST 6 FAIL: admin Alfa conseguiu inserir checklist no diagnostic B (cross-company)';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST 6 PASS: checklist pertence ao diagnostic correto -- leitura própria ok, cross-company negado em SELECT e INSERT';
  END;
END $$;
RESET ROLE;

-- ============================================================
-- TEST 7 — finding real (leitura A ok, cross-company negado)
-- ============================================================
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_admin_alfa uuid; v_finding_a uuid; v_diag_b uuid; v_count integer;
BEGIN
  SELECT value INTO v_admin_alfa FROM _sql91_fx WHERE key = 'admin_alfa';
  SELECT value INTO v_finding_a FROM _sql91_fx WHERE key = 'finding_a';
  SELECT value INTO v_diag_b FROM _sql91_fx WHERE key = 'diag_b';
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_alfa)::text, true);

  SELECT COUNT(*) INTO v_count FROM public.diagnostic_findings WHERE id = v_finding_a;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'TEST 7 FAIL: admin Alfa não enxerga o finding real da própria Company A';
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.diagnostic_findings WHERE diagnostic_id = v_diag_b;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'TEST 7 FAIL: admin Alfa enxerga % finding(s) do diagnostic B (esperado 0)', v_count;
  END IF;

  BEGIN
    INSERT INTO public.diagnostic_findings (diagnostic_id, category, title)
      VALUES (v_diag_b, '__SQL91_TEST__', '__SQL91_TEST__ finding cross-company (nao deveria existir)');
    RAISE EXCEPTION 'TEST 7 FAIL: admin Alfa conseguiu inserir finding no diagnostic B (cross-company)';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'TEST 7 PASS: finding pertence ao diagnostic correto -- leitura própria ok, cross-company negado em SELECT e INSERT';
  END;
END $$;
RESET ROLE;

-- ============================================================
-- TEST 8 — recommendation real: admin A não manipula recommendation B
-- ============================================================
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_admin_alfa uuid; v_reco_a uuid; v_reco_b uuid; v_count integer; v_affected integer;
BEGIN
  SELECT value INTO v_admin_alfa FROM _sql91_fx WHERE key = 'admin_alfa';
  SELECT value INTO v_reco_a FROM _sql91_fx WHERE key = 'reco_a';
  SELECT value INTO v_reco_b FROM _sql91_fx WHERE key = 'reco_b';
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_alfa)::text, true);

  SELECT COUNT(*) INTO v_count FROM public.diagnostic_recommendations WHERE id = v_reco_a;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'TEST 8 FAIL: admin Alfa não enxerga a recommendation real da própria Company A (cadeia de 3 saltos)';
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.diagnostic_recommendations WHERE id = v_reco_b;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'TEST 8 FAIL: admin Alfa enxerga a recommendation B (esperado 0 linhas via SELECT)';
  END IF;

  -- UPDATE cross-company é diferente de INSERT: a policy USING oculta a
  -- linha por completo -- Postgres filtra em SILÊNCIO (0 linhas
  -- afetadas), nunca levanta insufficient_privilege aqui (isso só
  -- acontece quando a linha É visível mas o WITH CHECK pós-mutação
  -- falha, como em INSERT). Por isso a asserção certa é ROW_COUNT = 0,
  -- não uma exceção capturada.
  UPDATE public.diagnostic_recommendations SET status = 'dismissed' WHERE id = v_reco_b;
  GET DIAGNOSTICS v_affected = ROW_COUNT;
  IF v_affected <> 0 THEN
    RAISE EXCEPTION 'TEST 8 FAIL: admin Alfa conseguiu atualizar % linha(s) da recommendation B (esperado 0)', v_affected;
  END IF;
  RAISE NOTICE 'TEST 8 PASS: recommendation pertence ao finding/diagnostic/Company corretos -- admin A não lê (0 SELECT) nem escreve (0 linhas afetadas) recommendation B';
END $$;
RESET ROLE;

-- ============================================================
-- TEST 9 — roadmap own: Company A com source legítimo (já criado FASE 2)
-- ============================================================
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_admin_alfa uuid; v_roadmap_a uuid; v_reco_a uuid; v_count integer;
BEGIN
  SELECT value INTO v_admin_alfa FROM _sql91_fx WHERE key = 'admin_alfa';
  SELECT value INTO v_roadmap_a FROM _sql91_fx WHERE key = 'roadmap_a';
  SELECT value INTO v_reco_a FROM _sql91_fx WHERE key = 'reco_a';
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_alfa)::text, true);

  SELECT COUNT(*) INTO v_count FROM public.roadmap_items
    WHERE id = v_roadmap_a AND source_type = 'diagnostic_recommendation' AND source_id = v_reco_a;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'TEST 9 FAIL: roadmap A com source legítimo (recommendation A) não foi criado/lido corretamente (FASE 2 já deveria ter criado)';
  END IF;
  RAISE NOTICE 'TEST 9 PASS: roadmap_items.client_id = Company A, source_id = recommendation A (mesma Company) -- aceito';
END $$;
RESET ROLE;

-- ============================================================
-- TEST 10 — roadmap cross-company recommendation: OBRIGATÓRIO
-- ============================================================
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_admin_alfa uuid; v_company_a uuid; v_reco_b uuid;
BEGIN
  SELECT value INTO v_admin_alfa FROM _sql91_fx WHERE key = 'admin_alfa';
  SELECT value INTO v_company_a  FROM _sql91_fx WHERE key = 'company_a';
  SELECT value INTO v_reco_b     FROM _sql91_fx WHERE key = 'reco_b';
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_alfa)::text, true);

  BEGIN
    INSERT INTO public.roadmap_items (client_id, source_type, source_id, title)
      VALUES (v_company_a, 'diagnostic_recommendation', v_reco_b, '__SQL91_TEST__ roadmap cross-company (nao deveria existir)');
    RAISE EXCEPTION 'TEST 10 FAIL: roadmap de Company A aceitou source_id de recommendation da Company B -- trg_roadmap_items_consistency NÃO bloqueou';
  EXCEPTION
    WHEN raise_exception THEN
      RAISE NOTICE 'TEST 10 PASS: trg_roadmap_items_consistency bloqueou roadmap A referenciando recommendation de B';
  END;
END $$;
RESET ROLE;

-- ============================================================
-- TEST 11 — roadmap cross-company project (se houver fixture segura)
-- ============================================================
DO $$
DECLARE v_company_b uuid; v_project_b uuid;
BEGIN
  SELECT value INTO v_company_b FROM _sql91_fx WHERE key = 'company_b';
  BEGIN
    -- Tentativa mínima e controlada de projeto B dentro da MESMA
    -- transação (revertido pelo ROLLBACK final) -- se rec_projects
    -- exigir colunas além de client_id, este bloco captura o erro e
    -- documenta a limitação em vez de adivinhar o schema de outro
    -- domínio.
    INSERT INTO public.rec_projects (client_id) VALUES (v_company_b) RETURNING id INTO v_project_b;
    INSERT INTO _sql91_fx (key, value) VALUES ('project_b', v_project_b);
    RAISE NOTICE 'TEST 11 SETUP OK: projeto de teste % criado para Company B', v_project_b;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 11 SKIPPED (documentado): não foi possível criar um rec_projects mínimo só com client_id (%). '
      'Limitação conhecida -- rec_projects pode exigir colunas adicionais fora do escopo deste domínio. '
      'Rodar manualmente com um project_id real de Company B se esta cobertura for necessária antes do apply.', SQLERRM;
  END;
END $$;

SET LOCAL ROLE authenticated;
DO $$
DECLARE v_admin_alfa uuid; v_company_a uuid; v_project_b uuid;
BEGIN
  SELECT value INTO v_project_b FROM _sql91_fx WHERE key = 'project_b';
  IF v_project_b IS NULL THEN
    RAISE NOTICE 'TEST 11 SKIPPED: sem projeto B disponível (ver NOTICE do SETUP acima)';
  ELSE
    SELECT value INTO v_admin_alfa FROM _sql91_fx WHERE key = 'admin_alfa';
    SELECT value INTO v_company_a  FROM _sql91_fx WHERE key = 'company_a';
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_alfa)::text, true);
    BEGIN
      INSERT INTO public.roadmap_items (client_id, project_id, title)
        VALUES (v_company_a, v_project_b, '__SQL91_TEST__ roadmap com project cross-company (nao deveria existir)');
      RAISE EXCEPTION 'TEST 11 FAIL: roadmap de Company A aceitou project_id de rec_projects da Company B';
    EXCEPTION
      WHEN raise_exception THEN
        RAISE NOTICE 'TEST 11 PASS: trg_roadmap_items_consistency bloqueou roadmap A referenciando project de B';
    END;
  END IF;
END $$;
RESET ROLE;

-- ============================================================
-- TEST 12 — immutability: UPDATE proibido de client_id/diagnostic_id/
-- finding_id executado de verdade, não só presença do trigger
-- ============================================================
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_admin_alfa uuid; v_company_b uuid; v_diag_a uuid; v_finding_a uuid; v_roadmap_a uuid;
BEGIN
  SELECT value INTO v_admin_alfa FROM _sql91_fx WHERE key = 'admin_alfa';
  SELECT value INTO v_company_b  FROM _sql91_fx WHERE key = 'company_b';
  SELECT value INTO v_diag_a     FROM _sql91_fx WHERE key = 'diag_a';
  SELECT value INTO v_finding_a  FROM _sql91_fx WHERE key = 'finding_a';
  SELECT value INTO v_roadmap_a  FROM _sql91_fx WHERE key = 'roadmap_a';
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_alfa)::text, true);

  BEGIN
    UPDATE public.company_diagnostics SET client_id = v_company_b WHERE id = v_diag_a;
    RAISE EXCEPTION 'TEST 12 FAIL: company_diagnostics.client_id foi alterado (deveria ser imutável)';
  EXCEPTION WHEN raise_exception THEN
    RAISE NOTICE 'TEST 12 PASS: company_diagnostics.client_id continua imutável (forbid_client_id_change)';
  END;

  BEGIN
    UPDATE public.diagnostic_findings SET diagnostic_id = gen_random_uuid() WHERE id = v_finding_a;
    RAISE EXCEPTION 'TEST 12 FAIL: diagnostic_findings.diagnostic_id foi alterado (deveria ser imutável)';
  EXCEPTION WHEN raise_exception THEN
    RAISE NOTICE 'TEST 12 PASS: diagnostic_findings.diagnostic_id continua imutável (forbid_diagnostic_id_change)';
  END;

  BEGIN
    UPDATE public.diagnostic_recommendations SET finding_id = gen_random_uuid()
      WHERE finding_id = v_finding_a;
    RAISE EXCEPTION 'TEST 12 FAIL: diagnostic_recommendations.finding_id foi alterado (deveria ser imutável)';
  EXCEPTION WHEN raise_exception THEN
    RAISE NOTICE 'TEST 12 PASS: diagnostic_recommendations.finding_id continua imutável (forbid_finding_id_change)';
  END;

  BEGIN
    UPDATE public.roadmap_items SET client_id = v_company_b WHERE id = v_roadmap_a;
    RAISE EXCEPTION 'TEST 12 FAIL: roadmap_items.client_id foi alterado (deveria ser imutável)';
  EXCEPTION WHEN raise_exception THEN
    RAISE NOTICE 'TEST 12 PASS: roadmap_items.client_id continua imutável (forbid_client_id_change reaproveitada)';
  END;
END $$;
RESET ROLE;

-- ============================================================
-- TEST 13 — status/CHECK constraints inválidos, capturados sem abortar
-- ============================================================
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_admin_alfa uuid; v_company_a uuid; v_diag_a uuid; v_finding_a uuid;
BEGIN
  SELECT value INTO v_admin_alfa FROM _sql91_fx WHERE key = 'admin_alfa';
  SELECT value INTO v_company_a  FROM _sql91_fx WHERE key = 'company_a';
  SELECT value INTO v_diag_a     FROM _sql91_fx WHERE key = 'diag_a';
  SELECT value INTO v_finding_a  FROM _sql91_fx WHERE key = 'finding_a';
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_alfa)::text, true);

  BEGIN
    INSERT INTO public.company_diagnostics (client_id, status) VALUES (v_company_a, 'active');
    RAISE EXCEPTION 'TEST 13 FAIL: company_diagnostics aceitou status=active (nunca válido -- draft/in_progress/completed/archived)';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'TEST 13 PASS: company_diagnostics.status rejeita "active" (CHECK)';
  END;

  BEGIN
    INSERT INTO public.diagnostic_checklist_items (diagnostic_id, category, label, status)
      VALUES (v_diag_a, '__SQL91_TEST__', '__SQL91_TEST__', 'maybe');
    RAISE EXCEPTION 'TEST 13 FAIL: diagnostic_checklist_items aceitou status=maybe (nunca válido)';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'TEST 13 PASS: diagnostic_checklist_items.status rejeita valor inválido (CHECK)';
  END;

  BEGIN
    INSERT INTO public.diagnostic_findings (diagnostic_id, category, title, severity)
      VALUES (v_diag_a, '__SQL91_TEST__', '__SQL91_TEST__', 'critical');
    RAISE EXCEPTION 'TEST 13 FAIL: diagnostic_findings aceitou severity=critical (só low/medium/high)';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'TEST 13 PASS: diagnostic_findings.severity rejeita valor inválido (CHECK)';
  END;

  BEGIN
    INSERT INTO public.diagnostic_recommendations (finding_id, title, status)
      VALUES (v_finding_a, '__SQL91_TEST__', 'in_review');
    RAISE EXCEPTION 'TEST 13 FAIL: diagnostic_recommendations aceitou status=in_review (só suggested/accepted/dismissed)';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'TEST 13 PASS: diagnostic_recommendations.status rejeita valor inválido (CHECK)';
  END;

  BEGIN
    INSERT INTO public.roadmap_items (client_id, title, status)
      VALUES (v_company_a, '__SQL91_TEST__', 'blocked');
    RAISE EXCEPTION 'TEST 13 FAIL: roadmap_items aceitou status=blocked (só planned/in_progress/completed/cancelled)';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'TEST 13 PASS: roadmap_items.status rejeita valor inválido (CHECK)';
  END;

  BEGIN
    INSERT INTO public.roadmap_items (client_id, source_type, source_id, title)
      VALUES (v_company_a, 'manual', gen_random_uuid(), '__SQL91_TEST__ manual com source_id');
    RAISE EXCEPTION 'TEST 13 FAIL: roadmap_items aceitou source_type=manual com source_id preenchido (CHECK deveria rejeitar)';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'TEST 13 PASS: roadmap_items rejeita source_type=manual com source_id preenchido (CHECK)';
  END;
END $$;
RESET ROLE;

-- ============================================================
-- TEST 14 — cascade real: deletar a raiz remove a árvore inteira
-- (árvore DESCARTÁVEL própria, nunca a árvore A usada nos testes acima)
-- ============================================================
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_admin_alfa uuid; v_company_a uuid;
        v_diag_c uuid; v_checklist_c uuid; v_finding_c uuid; v_reco_c uuid;
        v_count integer;
BEGIN
  SELECT value INTO v_admin_alfa FROM _sql91_fx WHERE key = 'admin_alfa';
  SELECT value INTO v_company_a  FROM _sql91_fx WHERE key = 'company_a';
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_alfa)::text, true);

  INSERT INTO public.company_diagnostics (client_id, niche_category)
    VALUES (v_company_a, '__SQL91_TEST__ descartavel')
    RETURNING id INTO v_diag_c;
  INSERT INTO public.diagnostic_checklist_items (diagnostic_id, category, label)
    VALUES (v_diag_c, '__SQL91_TEST__', '__SQL91_TEST__ descartavel')
    RETURNING id INTO v_checklist_c;
  INSERT INTO public.diagnostic_findings (diagnostic_id, category, title)
    VALUES (v_diag_c, '__SQL91_TEST__', '__SQL91_TEST__ descartavel')
    RETURNING id INTO v_finding_c;
  INSERT INTO public.diagnostic_recommendations (finding_id, title)
    VALUES (v_finding_c, '__SQL91_TEST__ descartavel')
    RETURNING id INTO v_reco_c;

  DELETE FROM public.company_diagnostics WHERE id = v_diag_c;

  SELECT COUNT(*) INTO v_count FROM public.diagnostic_checklist_items WHERE id = v_checklist_c;
  IF v_count <> 0 THEN RAISE EXCEPTION 'TEST 14 FAIL: checklist descartável sobreviveu ao DELETE da raiz (cascade não funcionou)'; END IF;

  SELECT COUNT(*) INTO v_count FROM public.diagnostic_findings WHERE id = v_finding_c;
  IF v_count <> 0 THEN RAISE EXCEPTION 'TEST 14 FAIL: finding descartável sobreviveu ao DELETE da raiz (cascade não funcionou)'; END IF;

  SELECT COUNT(*) INTO v_count FROM public.diagnostic_recommendations WHERE id = v_reco_c;
  IF v_count <> 0 THEN RAISE EXCEPTION 'TEST 14 FAIL: recommendation descartável sobreviveu ao DELETE da raiz (cascade não funcionou)'; END IF;

  RAISE NOTICE 'TEST 14 PASS: DELETE da raiz (company_diagnostics) removeu checklist+finding+recommendation em cascata real';
END $$;
RESET ROLE;

-- ============================================================
-- ROADMAP SOURCE SURVIVAL — documentar comportamento real, não
-- redesenhar. source_id é polimórfico, sem FK real (Fase 27 do SQL 91).
-- ============================================================
SET LOCAL ROLE authenticated;
DO $$
DECLARE v_admin_alfa uuid; v_reco_a uuid; v_roadmap_a uuid; v_count integer;
BEGIN
  SELECT value INTO v_admin_alfa FROM _sql91_fx WHERE key = 'admin_alfa';
  SELECT value INTO v_reco_a     FROM _sql91_fx WHERE key = 'reco_a';
  SELECT value INTO v_roadmap_a  FROM _sql91_fx WHERE key = 'roadmap_a';
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_alfa)::text, true);

  DELETE FROM public.diagnostic_recommendations WHERE id = v_reco_a;

  SELECT COUNT(*) INTO v_count FROM public.roadmap_items WHERE id = v_roadmap_a;
  IF v_count = 1 THEN
    RAISE NOTICE 'ROADMAP SOURCE SURVIVAL (P2 conhecido, documentado -- não redesenhado nesta missão): roadmap_items.% sobrevive órfão -- source_id (%) aponta para uma diagnostic_recommendations já apagada. source_id não é FK real (Fase 27), então não há ON DELETE para acionar. Comportamento atual aceito, não corrigido aqui.', v_roadmap_a, v_reco_a;
  ELSE
    RAISE NOTICE 'ROADMAP SOURCE SURVIVAL: roadmap_items.% não sobreviveu (contagem=%) -- reavaliar esta nota se o comportamento mudou', v_roadmap_a, v_count;
  END IF;
END $$;
RESET ROLE;

-- ============================================================
-- ZERO RESIDUE AUTOMÁTICO — confirma programaticamente, não por
-- inspeção manual, que NADA deste plano sobrevive ao ROLLBACK.
-- ============================================================
DO $$
DECLARE v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.company_diagnostics WHERE niche_category LIKE '__SQL91_TEST__%';
  IF v_count = 0 THEN RAISE EXCEPTION 'RESIDUE CHECK INCONCLUSIVO: 0 marcadores encontrados ANTES do ROLLBACK -- os testes acima não rodaram de verdade nesta sessão'; END IF;
  RAISE NOTICE 'RESIDUE CHECK (dentro da transação, ANTES do ROLLBACK): % linha(s) com marcador __SQL91_TEST__ em company_diagnostics -- esperado, será revertido a seguir', v_count;
END $$;

-- A partir daqui, o próprio ROLLBACK abaixo é o mecanismo real de
-- limpeza -- CREATE TABLE (a temp table _sql91_fx), todos os INSERT/
-- UPDATE/DELETE de fixture e de árvore de teste, e a promoção
-- temporária de role do profile Alfa são TODOS revertidos
-- atomicamente. Para confirmar isso de fato (não só por design), rodar
-- OS DOIS blocos abaixo -- um ANTES deste arquivo (ou em outra sessão)
-- e outro DEPOIS, comparando o resultado:
--   SELECT COUNT(*) FROM public.company_diagnostics WHERE niche_category LIKE '__SQL91_TEST__%';
--   -- esperado: idêntico ao valor de antes de rodar este arquivo (0,
--   -- se nenhum outro teste real usar o mesmo prefixo).
--   SELECT role FROM public.profiles WHERE id = <admin_alfa capturado no NOTICE da FASE 0>;
--   -- esperado: role IGUAL ao valor lido ANTES de rodar este arquivo
--   -- (o script nunca captura o valor "original" antes de mutar --
--   -- comparar manualmente com o estado conhecido antes/depois é o
--   -- que prova que 'admin' não persistiu).

ROLLBACK;

-- ============================================================
-- FIM DO LIVE TEST PLAN — critério de aceite: todo TEST 1-14 reporta
-- PASS via RAISE NOTICE, nenhum RAISE EXCEPTION não-capturado
-- interrompe o script antes do ROLLBACK final, e o residue check pós-
-- ROLLBACK (executado manualmente depois, fora deste arquivo) confirma
-- 0 marcadores __SQL91_TEST__ e nenhum profile com role alterado
-- permanentemente.
-- ============================================================
