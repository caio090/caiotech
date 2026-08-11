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


-- ── 12. Após aplicar: Advisor deve estar limpo para estes itens ──
-- Rodar get_advisors (Supabase) e confirmar:
--   0 findings de security para: v_olaclick_connections_safe,
--   v_platform_accounts_overview, admin_signups_view,
--   v_orphan_client_invites, v_billing_mrr_summary,
--   finance_mark_overdue, create_client_on_signup, can_access_client,
--   admin_link_meta_asset, admin_upsert_olaclick_connection,
--   admin_list_olaclick_connections, get_client_meta_status,
--   get_request_owner_for_client, admin_archive_client,
--   admin_archive_clients, admin_restore_client, admin_delete_client,
--   admin_hard_delete_client, admin_hard_delete_clients.
-- ============================================================
