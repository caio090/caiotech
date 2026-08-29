-- ============================================================
-- LIVE TEST PLAN — legacy-security-hardening-before-diagnostic.sql
-- NÃO EXECUTAR AGORA. Só faz sentido DEPOIS que a migration
-- correspondente tiver sido aplicada manualmente e aprovada.
--
-- Objetivo (Fase 44/45): plano de verificação manual pós-apply,
-- executado pelo CODEX WEB (ou humano) no Supabase SQL Editor.
-- Nunca SELECT email/token/PII -- só EXISTS/COUNT/boolean. Cada bloco
-- é independente e usa BEGIN;/ROLLBACK; para nunca persistir estado,
-- mesmo que alguém rode por engano.
--
-- Pré-requisito para os blocos "Company A / Company B": substituir os
-- placeholders <COMPANY_A_ID>/<COMPANY_B_ID>/<USER_A_ID>/<USER_B_ID>
-- por dois clients e dois usuários reais de teste (nunca Companies de
-- produção reais) antes de rodar manualmente.
-- ============================================================


-- ── 1. Views P0 -- anon não pode SELECT ───────────────────────
-- Espera-se ERRO "permission denied" em cada bloco (sucesso do teste
-- = erro de permissão, não um resultado com linhas).
BEGIN;
  SET LOCAL ROLE anon;
  SELECT COUNT(*) FROM public.v_olaclick_connections_safe;  -- deve falhar
ROLLBACK;

BEGIN;
  SET LOCAL ROLE anon;
  SELECT COUNT(*) FROM public.v_platform_accounts_overview;  -- deve falhar
ROLLBACK;

BEGIN;
  SET LOCAL ROLE anon;
  SELECT COUNT(*) FROM public.admin_signups_view;  -- deve falhar
ROLLBACK;

BEGIN;
  SET LOCAL ROLE anon;
  SELECT COUNT(*) FROM public.v_orphan_client_invites;  -- deve falhar
ROLLBACK;

BEGIN;
  SET LOCAL ROLE anon;
  SELECT COUNT(*) FROM public.v_billing_mrr_summary;  -- deve falhar
ROLLBACK;


-- ── 2. finance_mark_overdue -- nem anon nem authenticated executam ──
-- Espera-se ERRO "permission denied for function" nos dois blocos.
BEGIN;
  SET LOCAL ROLE anon;
  SELECT public.finance_mark_overdue();  -- deve falhar
ROLLBACK;

BEGIN;
  SET LOCAL ROLE authenticated;
  SELECT public.finance_mark_overdue();  -- deve falhar
ROLLBACK;


-- ── 3. create_client_on_signup -- V2: sem caminho anônimo, sem janela
-- temporal (Fase 35). p_user_id arbitrário bloqueado; anon não tem
-- EXECUTE de forma nenhuma.
--
-- Ataque original (Fase 35): anon + UUID válido recém-criado de OUTRO
-- usuário → DENIED. Na V2, isso é verdade estruturalmente: anon não
-- tem EXECUTE na função, então nem chega a avaliar p_user_id. Espera-se
-- ERRO "permission denied for function", não mais uma EXCEPTION
-- aplicativa vinda de dentro da função.
BEGIN;
  SET LOCAL ROLE anon;
  SELECT public.create_client_on_signup(
    '<USER_B_ID>'::uuid, 'Empresa Forjada Anon', 'Teste', 'anon@example.com'
  );  -- deve falhar com permission denied for function (EXECUTE revogado de anon)
ROLLBACK;

-- authenticated user A tentando criar client para o <USER_B_ID> de
-- outro usuário real (nunca o próprio auth.uid()). Espera-se EXCEPTION
-- 'unauthorized: ...'.
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<USER_A_ID>"}';
  SELECT public.create_client_on_signup(
    '<USER_B_ID>'::uuid, 'Empresa Forjada', 'Teste', 'forjado@example.com'
  );  -- deve levantar EXCEPTION unauthorized
ROLLBACK;

-- Caminho legítimo (deve continuar funcionando): authenticated user
-- criando client para o PRÓPRIO id -- cobre tanto o caso "confirmação
-- de e-mail desligada" (chamada em criar-conta, sessão já ativa)
-- quanto "confirmação ligada" (chamada em onboarding/conclusao, depois
-- do login pós-confirmação).
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<USER_A_ID>"}';
  SELECT public.create_client_on_signup(
    '<USER_A_ID>'::uuid, 'Empresa Legítima', 'Teste', 'legitimo@example.com'
  ) IS NOT NULL AS legitimate_signup_still_works;  -- deve retornar true
ROLLBACK;


-- ── 4. Cross-company: Meta/OlaClick (Fase 43) ─────────────────
-- Company A autorizado não pode ler/escrever dados de Company B.
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<USER_A_ID>"}';
  SELECT public.get_client_meta_status('<COMPANY_B_ID>'::uuid);  -- deve levantar EXCEPTION forbidden
ROLLBACK;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<USER_A_ID>"}';
  SELECT public.admin_upsert_olaclick_connection(
    '<COMPANY_B_ID>'::uuid, 'conexao-forjada', 'fake-token-0000'
  );  -- deve levantar EXCEPTION forbidden
ROLLBACK;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<USER_A_ID>"}';
  SELECT public.admin_link_meta_asset(
    '<COMPANY_B_ID>'::uuid, 'facebook_page', 'fake-asset-id'
  );  -- deve levantar EXCEPTION forbidden
ROLLBACK;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<USER_A_ID>"}';
  SELECT public.get_request_owner_for_client('<COMPANY_B_ID>'::uuid);  -- deve levantar EXCEPTION forbidden
ROLLBACK;

-- Caminho legítimo (deve continuar funcionando): Company A autorizado
-- lendo o próprio status Meta.
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<USER_A_ID>"}';
  SELECT public.get_client_meta_status('<COMPANY_A_ID>'::uuid);  -- deve retornar linhas (ou vazio), nunca erro
ROLLBACK;


-- ── 5. can_access_client -- fail closed + super admin global ───
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<USER_A_ID>"}';
  SELECT public.can_access_client('<COMPANY_B_ID>'::uuid) AS company_a_sees_company_b;  -- deve ser false
ROLLBACK;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<SUPER_ADMIN_USER_ID>"}';
  SELECT public.can_access_client('<COMPANY_A_ID>'::uuid) AS super_admin_sees_company_a,
         public.can_access_client('<COMPANY_B_ID>'::uuid) AS super_admin_sees_company_b;  -- ambos devem ser true
ROLLBACK;

BEGIN;
  SET LOCAL ROLE anon;
  SELECT public.can_access_client('<COMPANY_A_ID>'::uuid) AS anon_sees_anything;  -- deve ser false (auth.uid() é null)
ROLLBACK;


-- ── 6. admin_list_olaclick_connections -- escopo por Company ───
-- Company A autorizado só vê conexões que pode acessar; super_admin
-- vê tudo (Fase 29).
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<USER_A_ID>"}';
  SELECT COUNT(*) FROM public.admin_list_olaclick_connections() WHERE client_id = '<COMPANY_B_ID>'::uuid;  -- deve ser 0
ROLLBACK;


-- ── 8. Billing (Fase 36) -- authenticated não acessa a view direto ──
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<USER_A_ID>"}';
  SELECT COUNT(*) FROM public.v_billing_mrr_summary;  -- deve falhar (permission denied)
ROLLBACK;

-- Caminho oficial (nível de aplicação, não SQL puro -- testar via
-- HTTP): GET /api/admin/billing/mrr-summary
--   • sem sessão                → 401 unauthenticated
--   • authenticated não-super_admin → 403 forbidden
--   • authenticated super_admin     → 200 ok, mrr presente/null


-- ── 9. Meta: conexão explícita cross-context (Fase 37) ──────────
-- Company A autorizado, mas informando um meta_connection_id que
-- pertence a outro usuário/contexto (<OTHER_USER_CONNECTION_ID>) →
-- DENIED, nunca silently resolve outra conexão.
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<USER_A_ID>"}';
  SELECT public.admin_link_meta_asset(
    '<COMPANY_A_ID>'::uuid, 'facebook_page', 'fake-asset-id',
    NULL, NULL, NULL, '<OTHER_USER_CONNECTION_ID>'::uuid, false
  );  -- deve levantar EXCEPTION connection_not_found (P0006)
ROLLBACK;


-- ── 10. Service-role fallback guard order (Fase 38) ──────────────
-- Nível de aplicação, não SQL puro -- testar via HTTP:
--   POST /api/meta/assets/link      com client_id de Company B, sessão
--     autorizada só para Company A → 403 forbidden ANTES de qualquer
--     query/mutação privilegiada (nenhuma linha tocada em
--     client_meta_assets para Company B).
--   POST /api/olaclick/connect      mesmo teste, mesmo resultado
--     esperado, para client_meta_assets/olaclick_connections.
--   DELETE /api/meta/assets/link?id=<asset de Company B>  com sessão
--     de Company A → 403 forbidden.
--   DELETE /api/olaclick/connect?id=<conexão de Company B> com sessão
--     de Company A → 403 forbidden.


-- ── 11. Archive / Restore / Delete -- ownership real (Fase 39-41) ──
-- Admin autorizado A: archive/restore/delete de Company A → PASS.
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_A_USER_ID>"}';
  SELECT public.admin_archive_client('<COMPANY_A_ID>'::uuid) AS archive_own_company;  -- deve retornar true
ROLLBACK;

-- Admin A (autorizado só para Company A): archive de Company B → DENIED.
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_A_USER_ID>"}';
  SELECT public.admin_archive_client('<COMPANY_B_ID>'::uuid);  -- deve levantar EXCEPTION permission_denied
ROLLBACK;

-- Bulk: um único id não autorizado aborta o lote inteiro (Fase 26/27
-- -- fail closed, nunca resultado parcial).
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_A_USER_ID>"}';
  SELECT public.admin_archive_clients(ARRAY['<COMPANY_A_ID>'::uuid, '<COMPANY_B_ID>'::uuid]);  -- deve levantar EXCEPTION, nenhuma linha alterada
ROLLBACK;

-- Restore: mesmo contrato de ownership do archive.
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_A_USER_ID>"}';
  SELECT public.admin_restore_client('<COMPANY_B_ID>'::uuid);  -- deve levantar EXCEPTION permission_denied
ROLLBACK;

-- Logical delete: mesmo contrato de ownership.
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_A_USER_ID>"}';
  SELECT public.admin_delete_client('<COMPANY_B_ID>'::uuid);  -- deve levantar EXCEPTION permission_denied
ROLLBACK;

-- Hard delete: super_admin-only, intencionalmente global (Fase 22) --
-- admin comum autorizado para a própria Company A ainda assim é
-- DENIED (hard delete nunca é delegado a admin comum).
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_A_USER_ID>"}';
  SELECT public.admin_hard_delete_client('<COMPANY_A_ID>'::uuid);  -- deve levantar EXCEPTION (apenas super_admin)
ROLLBACK;

-- NULL-bypass fechado (achado adicional desta correção): anon não
-- consegue mais nem executar (EXECUTE revogado), então o bug de
-- "IF NULL" nunca é alcançável por um chamador anônimo.
BEGIN;
  SET LOCAL ROLE anon;
  SELECT public.admin_hard_delete_client('<COMPANY_A_ID>'::uuid);  -- deve falhar com permission denied for function
ROLLBACK;


-- ── 11b. admin_create_client -- Final Closure (Fase 11) ──────────
BEGIN;
  SET LOCAL ROLE anon;
  SELECT public.admin_create_client('Empresa Forjada Anon');  -- deve falhar com permission denied for function
ROLLBACK;

BEGIN;
  SET LOCAL ROLE authenticated;
  SELECT public.admin_create_client('Empresa Sem Sessao');  -- sem request.jwt.claims -- deve levantar EXCEPTION permission_denied (role NULL)
ROLLBACK;

-- Admin comum tentando atribuir a criação a outro usuário/agência --
-- nunca aceito, mesmo sendo admin de verdade.
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_A_USER_ID>"}';
  SELECT public.admin_create_client(
    'Empresa Atribuida a Outro', NULL, NULL, NULL, NULL, 'onboarding',
    '<OTHER_USER_ID>'::uuid, NULL
  );  -- deve levantar EXCEPTION unauthorized (p_created_by != caller)
ROLLBACK;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_A_USER_ID>"}';
  SELECT public.admin_create_client(
    'Empresa Agencia Alheia', NULL, NULL, NULL, NULL, 'onboarding',
    NULL, '<OTHER_AGENCY_USER_ID>'::uuid
  );  -- deve levantar EXCEPTION unauthorized (p_agency_id != caller, role != super_admin)
ROLLBACK;

-- Caminho legítimo: super_admin cria client em nome de uma agência real.
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<SUPER_ADMIN_USER_ID>"}';
  SELECT public.admin_create_client(
    'Empresa Legitima Super Admin', NULL, NULL, NULL, NULL, 'onboarding',
    NULL, '<AGENCY_USER_ID>'::uuid
  ) IS NOT NULL AS super_admin_can_attribute_to_any_agency;  -- deve retornar true
ROLLBACK;

-- Caminho legítimo real: admin cria client para o próprio workspace,
-- exatamente como src/app/api/admin/clients/route.ts POST faz hoje.
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_A_USER_ID>"}';
  SELECT public.admin_create_client(
    'Empresa Legitima Admin A', NULL, NULL, NULL, NULL, 'onboarding',
    '<ADMIN_A_USER_ID>'::uuid, '<ADMIN_A_USER_ID>'::uuid
  ) IS NOT NULL AS legitimate_client_creation_still_works;  -- deve retornar true
ROLLBACK;


-- ── 13. Data API direta client_meta_assets -- SELECT cross-company (P0-A) ──
-- Admin A (autorizado só para Company A) não pode ler ativos Meta de
-- Company B via PostgREST direto (bypass que as RPCs corrigidas não
-- cobrem sozinhas).
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_A_USER_ID>"}';
  SELECT COUNT(*) FROM public.client_meta_assets WHERE client_id = '<COMPANY_B_ID>'::uuid;  -- deve ser 0 (RLS filtra, não erro)
ROLLBACK;

-- ── 14. Data API direta client_meta_assets -- INSERT cross-company (P0-A) ──
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_A_USER_ID>"}';
  INSERT INTO public.client_meta_assets (client_id, asset_type, asset_id)
  VALUES ('<COMPANY_B_ID>'::uuid, 'facebook_page', 'forjado-via-data-api');  -- deve falhar (RLS WITH CHECK)
ROLLBACK;

-- ── 15. Data API direta client_meta_assets -- UPDATE cross-company (P0-A) ──
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_A_USER_ID>"}';
  UPDATE public.client_meta_assets SET asset_name = 'forjado'
  WHERE client_id = '<COMPANY_B_ID>'::uuid;  -- deve afetar 0 linhas (RLS filtra o USING antes do WITH CHECK)
ROLLBACK;

-- ── 16. Data API direta client_meta_assets -- DELETE cross-company (P0-A) ──
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_A_USER_ID>"}';
  DELETE FROM public.client_meta_assets WHERE client_id = '<COMPANY_B_ID>'::uuid;  -- deve afetar 0 linhas
ROLLBACK;

-- ── 17. Data API direta olaclick_connections -- cross-company (P0-B) ──
-- Cobre SELECT/INSERT/UPDATE/DELETE nas 4 policies novas
-- (olaclick_connections_select/insert/update/delete) -- executável de
-- verdade, não apenas comentário (PROMPT 04E, Fase 20/21).
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_A_USER_ID>"}';
  SELECT COUNT(*) FROM public.olaclick_connections WHERE client_id = '<COMPANY_B_ID>'::uuid;  -- deve ser 0
ROLLBACK;

-- Fase 20 (PROMPT 04E): INSERT cross-company real, não só SELECT/UPDATE/
-- DELETE -- admin_A (autorizado só para Company A) tentando criar uma
-- conexão diretamente via Data API para Company B.
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_A_USER_ID>"}';
  INSERT INTO public.olaclick_connections (client_id, connection_name, access_token, token_last_four, status)
  VALUES ('<COMPANY_B_ID>'::uuid, 'forjado-via-data-api', 'fake-token-0000', '0000', 'connected');  -- deve falhar: RLS WITH CHECK nega (olaclick_connections_insert)
ROLLBACK;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_A_USER_ID>"}';
  UPDATE public.olaclick_connections SET connection_name = 'forjado'
  WHERE client_id = '<COMPANY_B_ID>'::uuid;  -- deve afetar 0 linhas
ROLLBACK;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_A_USER_ID>"}';
  DELETE FROM public.olaclick_connections WHERE client_id = '<COMPANY_B_ID>'::uuid;  -- deve afetar 0 linhas
ROLLBACK;

-- ── 18. v_olaclick_connections_safe -- escrita negada pós-patch ─────────
-- View nunca deve mais aceitar mutação alguma, de nenhum role client-side.
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_A_USER_ID>"}';
  UPDATE public.v_olaclick_connections_safe SET connection_name = 'forjado'
  WHERE client_id = '<COMPANY_A_ID>'::uuid;  -- deve falhar: permission denied (REVOKE ALL)
ROLLBACK;

-- ── 19. v_olaclick_connections_safe -- ACL pós-patch dos browser roles ──
-- Verificação estrutural (read-only, não muta nada). PROMPT 04E, Fase 22:
-- NÃO espera zero linhas globalmente -- service_role e postgres
-- preservam seu ACL normalmente (o patch nunca os revoga, seção 12).
-- Filtra explicitamente aos 3 roles que o browser pode assumir: PUBLIC,
-- anon, authenticated. Para esses três, nenhum privilégio deve restar --
-- nem SELECT, nem os demais (INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/
-- TRIGGER). MAINTAIN não faz parte da checagem porque nunca esteve
-- presente no ACL real auditado (Fase 23) -- não inventar privilégio.
SELECT grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'v_olaclick_connections_safe'
  AND grantee IN ('PUBLIC', 'anon', 'authenticated');
-- esperado: 0 linhas (nenhum privilégio de nenhum tipo para PUBLIC/anon/authenticated)

-- Confirma em separado que service_role/postgres NÃO foram afetados
-- (positivo, não apenas ausência) -- o patch nunca revoga deles.
SELECT grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'v_olaclick_connections_safe'
  AND grantee IN ('service_role', 'postgres')
ORDER BY grantee, privilege_type;
-- esperado: 7 linhas por grantee (SELECT/INSERT/UPDATE/DELETE/TRUNCATE/
-- REFERENCES/TRIGGER), preservadas exatamente como capturado em 28/08/2026.

-- ── 20. Restore cross-company: RPC deny, SEM fallback service-role (P0-C) ──
-- Nível de aplicação (HTTP), não SQL puro -- testar via:
--   POST /api/admin/clients/<COMPANY_B_ID>/restore, sessão de ADMIN_A
--   (autorizado só para Company A) → 403 forbidden. Confirmar que
--   clients.status/archived_at/deleted_at de Company B NÃO mudou (nenhum
--   fallback service_role deve ter rodado -- ver
--   src/app/api/admin/clients/[id]/restore/route.ts, isAuthorizationDeniedError).

-- ── 21. Archive/delete cross-company: RPC deny, SEM fallback service-role (P0-C) ──
-- Nível de aplicação (HTTP): DELETE /api/admin/clients/<COMPANY_B_ID>
-- (mode=archive), sessão de ADMIN_A → 403 forbidden. Confirmar que
-- clients de Company B NÃO mudou (ver src/app/api/admin/clients/[id]/route.ts,
-- isAuthorizationDeniedError + canAccessClientIndependently).

-- ── 22. Meta delete: lookup não encontra ownership → fail closed (Fase 12) ──
-- Nível de aplicação (HTTP): DELETE /api/meta/assets/link?id=<uuid
-- inexistente>, sessão de ADMIN_A autorizado → 404 not_found, nenhuma
-- mutação. DELETE /api/meta/assets/link?id=<asset de Company B>, sessão
-- de ADMIN_A → 403 forbidden, nenhuma mutação (ver
-- src/app/api/meta/assets/link/route.ts DELETE, lookupError/not_found/
-- forbidden antes de qualquer .delete()).

-- ── 23. OlaClick delete: lookup não resolve → fail closed (Fase 13) ─────
-- Nível de aplicação (HTTP): mesmo teste do item 22 para
-- DELETE /api/olaclick/connect?id=... (ver src/app/api/olaclick/connect/route.ts).

-- ── 24. Signup pós-confirmação legítimo sem passar por onboarding/conclusao (Fase 15) ──
-- Usuário com sessão real, sem client vinculado por nenhuma das 5 fontes
-- de resolveCurrentClient(): a RPC ainda cria a Company (bootstrap,
-- fonte "signup_bootstrap" em src/lib/client/resolve-client.ts).
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<USER_B_ID>"}';
  SELECT public.create_client_on_signup(
    '<USER_B_ID>'::uuid, 'Empresa Bootstrap Tardio', 'Teste', 'bootstrap@example.com'
  ) IS NOT NULL AS late_bootstrap_still_works;  -- deve retornar true
ROLLBACK;

-- ── 25. Signup idempotente: repetição não duplica Company (Fase 16) ────
-- Chamar duas vezes com o mesmo p_user_id deve retornar o MESMO client_id
-- (create_client_on_signup já faz lookup por owner_id antes de inserir).
-- ATUALIZADO (PROMPT 04E): a seção 13 do patch principal agora adiciona
-- clients_owner_id_unique_idx (unique partial index) com preflight
-- fail-closed de duplicatas, e create_client_on_signup (seção 5) ganhou
-- tratamento específico de unique_violation nesse constraint exato --
-- fecha a janela de corrida que a idempotência sequencial sozinha não
-- cobria. Este teste sequencial continua válido; os itens 26-27 abaixo
-- cobrem o estado pós-apply do índice.
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<USER_B_ID>"}';
  WITH first_call AS (
    SELECT public.create_client_on_signup(
      '<USER_B_ID>'::uuid, 'Empresa Idempotente', 'Teste', 'idempotente@example.com'
    ) AS client_id
  ),
  second_call AS (
    SELECT public.create_client_on_signup(
      '<USER_B_ID>'::uuid, 'Empresa Idempotente Repetida', 'Teste', 'idempotente@example.com'
    ) AS client_id
  )
  SELECT (SELECT client_id FROM first_call) = (SELECT client_id FROM second_call) AS idempotent;  -- deve ser true
ROLLBACK;

-- ── 26. owner_id: unique partial index existe pós-apply (Fase 19) ──────
-- Verificação estrutural (read-only, não muta nada).
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'clients'
  AND indexname = 'clients_owner_id_unique_idx';
-- esperado: 1 linha, indexdef contém "UNIQUE" e "WHERE (owner_id IS NOT NULL)".
-- idx_clients_owner (comum, não único) deve continuar existindo também --
-- este patch nunca o remove.

-- ── 27. owner_id: sem duplicatas pós-apply (Fase 19) ────────────────────
-- Verificação estrutural (read-only, não muta nada) -- reconfirma o que
-- o preflight do patch já teria abortado se fosse falso.
SELECT owner_id, COUNT(*) AS cnt
FROM public.clients
WHERE owner_id IS NOT NULL
GROUP BY owner_id
HAVING COUNT(*) > 1;
-- esperado: 0 linhas.


-- ── 28. Archive de Company com status='ativo' preserva o status (PROMPT 05G, Regra 1) ──
-- Correção do P1 apontado pelo Codex Web no commit aa750ce9: archive
-- deixou de gravar status='encerrado' -- agora NUNCA toca status.
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_A_USER_ID>"}';
  UPDATE public.clients SET status = 'ativo' WHERE id = '<COMPANY_A_ID>'::uuid;
  SELECT public.admin_archive_client('<COMPANY_A_ID>'::uuid) AS archived;  -- deve retornar true, nunca SQLSTATE 23514
  SELECT status = 'ativo' AS status_preservado, archived_at IS NOT NULL AS archived_at_setado, deleted_at IS NULL AS deleted_at_nulo
  FROM public.clients WHERE id = '<COMPANY_A_ID>'::uuid;  -- os três devem ser true
ROLLBACK;

-- ── 29. Archive de Company com status='onboarding' preserva o status (PROMPT 05G, Regra 1) ──
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_A_USER_ID>"}';
  UPDATE public.clients SET status = 'onboarding' WHERE id = '<COMPANY_A_ID>'::uuid;
  SELECT public.admin_archive_client('<COMPANY_A_ID>'::uuid) AS archived;  -- deve retornar true
  SELECT status = 'onboarding' AS status_preservado, archived_at IS NOT NULL AS archived_at_setado, deleted_at IS NULL AS deleted_at_nulo
  FROM public.clients WHERE id = '<COMPANY_A_ID>'::uuid;  -- os três devem ser true
ROLLBACK;

-- ── 30. Bulk archive: todos os IDs autorizados preservam seu próprio status (PROMPT 05G) ──
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<SUPER_ADMIN_USER_ID>"}';
  UPDATE public.clients SET status = 'ativo' WHERE id = '<COMPANY_A_ID>'::uuid;
  UPDATE public.clients SET status = 'pausado' WHERE id = '<COMPANY_B_ID>'::uuid;
  SELECT public.admin_archive_clients(ARRAY['<COMPANY_A_ID>'::uuid, '<COMPANY_B_ID>'::uuid]) AS affected;  -- deve retornar 2, nunca SQLSTATE 23514
  SELECT id, status FROM public.clients WHERE id IN ('<COMPANY_A_ID>'::uuid, '<COMPANY_B_ID>'::uuid);  -- A continua 'ativo', B continua 'pausado'
ROLLBACK;

-- ── 31. Restore de Company só arquivada preserva o status anterior (PROMPT 05G, Regra 2A) ──
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_A_USER_ID>"}';
  UPDATE public.clients SET status = 'pausado', archived_at = now(), deleted_at = NULL WHERE id = '<COMPANY_A_ID>'::uuid;
  SELECT public.admin_restore_client('<COMPANY_A_ID>'::uuid) AS restored;  -- deve retornar true
  SELECT status = 'pausado' AS status_preservado, archived_at IS NULL AS archived_at_limpo, deleted_at IS NULL AS deleted_at_limpo
  FROM public.clients WHERE id = '<COMPANY_A_ID>'::uuid;  -- os três devem ser true (NUNCA vira 'onboarding' aqui)
ROLLBACK;

-- ── 32. Restore da lixeira (deleted_at preenchido) volta para 'onboarding' (PROMPT 05G, Regra 2B) ──
-- Conservador de propósito -- nunca tenta adivinhar o status anterior.
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_A_USER_ID>"}';
  UPDATE public.clients SET status = 'encerrado', archived_at = now(), deleted_at = now() WHERE id = '<COMPANY_A_ID>'::uuid;
  SELECT public.admin_restore_client('<COMPANY_A_ID>'::uuid) AS restored;  -- deve retornar true
  SELECT status = 'onboarding' AS status_correto, archived_at IS NULL AS archived_at_limpo, deleted_at IS NULL AS deleted_at_limpo
  FROM public.clients WHERE id = '<COMPANY_A_ID>'::uuid;  -- os três devem ser true
ROLLBACK;

-- ── 33. Logical delete legítimo continua funcionando (PROMPT 05D/05G, Regra 3) ──
-- Ação TERMINAL, distinta de archive -- status='encerrado',
-- archived_at e deleted_at ambos preenchidos.
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_A_USER_ID>"}';
  SELECT public.admin_delete_client('<COMPANY_A_ID>'::uuid) AS deleted;  -- deve retornar true, nunca SQLSTATE 23514
  SELECT status = 'encerrado' AS status_correto, archived_at IS NOT NULL AS archived_at_setado, deleted_at IS NOT NULL AS deleted_at_setado
  FROM public.clients WHERE id = '<COMPANY_A_ID>'::uuid;  -- os três devem ser true
ROLLBACK;

-- ── 34. Nenhuma ocorrência mutante de status inválido em public.clients (PROMPT 05G) ──
-- Verificação estrutural (read-only, não muta nada): confirma que
-- nenhuma linha real do banco tem um valor de status que nunca foi
-- aceito pelo constraint -- prova que nenhuma correção regrediu.
SELECT COUNT(*) = 0 AS nenhum_status_invalido
FROM public.clients
WHERE status IN ('archived', 'inactive', 'active');

-- ── HTTP fallback parity (nível de aplicação, não SQL puro -- PROMPT 05G, Regra 4) ──
-- Testar via HTTP com RPC temporariamente indisponível (ou SET LOCAL
-- ROLE authenticated direto no fallback, se isolável):
--   DELETE /api/admin/clients/<COMPANY_A_ID> (mode=archive) → mesmo
--     contrato do admin_archive_clients: status preservado,
--     archived_at=now(), deleted_at=NULL. Nunca mais tenta
--     admin_delete_client como alternativa (removido -- semânticas
--     divergentes agora).
--   POST /api/admin/clients/<COMPANY_A_ID>/restore → mesmo contrato do
--     admin_restore_client: verifica deleted_at antes de decidir
--     status.
--   Nenhum dos dois grava mais 'archived'/'inactive'/'pausado' em
--     cascata -- removido de src/app/api/admin/clients/[id]/route.ts e
--     .../[id]/restore/route.ts.

-- ── 35. admin_link_meta_asset: Company própria → sucesso, sem ambiguidade de coluna (PROMPT 05D) ──
-- Bug real confirmado ao vivo: SQLSTATE 42702 "column reference
-- client_id is ambiguous" no ON CONFLICT. Corrigido com
-- #variable_conflict use_column.
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_A_USER_ID>"}';
  SELECT * FROM public.admin_link_meta_asset(
    '<COMPANY_A_ID>'::uuid, 'facebook_page', 'fixture-asset-1'
  );  -- deve retornar 1 linha, nunca SQLSTATE 42702
ROLLBACK;

-- ── 36. admin_link_meta_asset repetido: ON CONFLICT atualiza, não duplica (PROMPT 05D) ──
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_A_USER_ID>"}';
  SELECT public.admin_link_meta_asset('<COMPANY_A_ID>'::uuid, 'facebook_page', 'fixture-asset-1');
  SELECT public.admin_link_meta_asset('<COMPANY_A_ID>'::uuid, 'facebook_page', 'fixture-asset-1', 'Nome Atualizado');
  SELECT COUNT(*) = 1 AS sem_duplicata FROM public.client_meta_assets
  WHERE client_id = '<COMPANY_A_ID>'::uuid AND asset_type = 'facebook_page' AND asset_id = 'fixture-asset-1';  -- deve ser true
ROLLBACK;

-- ── 37. admin_upsert_olaclick_connection: Company própria → sucesso, sem ambiguidade de coluna (PROMPT 05D) ──
-- Bug real confirmado ao vivo: SQLSTATE 42702 no ON CONFLICT
-- (client_id, connection_name). Corrigido com #variable_conflict
-- use_column (não existe CONSTRAINT nomeada aqui, só um índice único --
-- ON CONFLICT ON CONSTRAINT não se aplicava).
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_A_USER_ID>"}';
  SELECT * FROM public.admin_upsert_olaclick_connection(
    '<COMPANY_A_ID>'::uuid, 'conexao-fixture', 'fake-token-0000'
  );  -- deve retornar 1 linha, nunca SQLSTATE 42702
ROLLBACK;

-- ── 38. OlaClick upsert repetido: atualiza a mesma conexão, não duplica (PROMPT 05D) ──
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<ADMIN_A_USER_ID>"}';
  SELECT public.admin_upsert_olaclick_connection('<COMPANY_A_ID>'::uuid, 'conexao-fixture', 'fake-token-0000');
  SELECT public.admin_upsert_olaclick_connection('<COMPANY_A_ID>'::uuid, 'conexao-fixture', 'fake-token-1111');
  SELECT COUNT(*) = 1 AS sem_duplicata FROM public.olaclick_connections
  WHERE client_id = '<COMPANY_A_ID>'::uuid AND connection_name = 'conexao-fixture';  -- deve ser true
ROLLBACK;


-- ── 39. Após aplicar: Advisor deve estar limpo para estes itens ──
-- Rodar get_advisors (Supabase) e confirmar:
--   0 findings de security para: v_olaclick_connections_safe,
--   v_platform_accounts_overview, admin_signups_view,
--   v_orphan_client_invites, v_billing_mrr_summary,
--   finance_mark_overdue, create_client_on_signup, can_access_client,
--   admin_link_meta_asset, admin_upsert_olaclick_connection,
--   admin_list_olaclick_connections, get_client_meta_status,
--   get_request_owner_for_client, admin_archive_client,
--   admin_archive_clients, admin_restore_client, admin_delete_client,
--   admin_hard_delete_client, admin_hard_delete_clients,
--   admin_create_client, client_meta_assets (table), olaclick_connections
--   (table).
-- ============================================================
