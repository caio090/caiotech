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


-- ── 3. create_client_on_signup -- p_user_id arbitrário bloqueado ──
-- Simula: authenticated user A tentando criar client para o
-- <USER_B_ID> de outro usuário real (nunca o próprio auth.uid()).
-- Espera-se EXCEPTION 'unauthorized: ...'.
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<USER_A_ID>"}';
  SELECT public.create_client_on_signup(
    '<USER_B_ID>'::uuid, 'Empresa Forjada', 'Teste', 'forjado@example.com'
  );  -- deve levantar EXCEPTION unauthorized
ROLLBACK;

-- Caminho legítimo (deve continuar funcionando): authenticated user
-- criando client para o PRÓPRIO id.
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub": "<USER_A_ID>"}';
  SELECT public.create_client_on_signup(
    '<USER_A_ID>'::uuid, 'Empresa Legítima', 'Teste', 'legitimo@example.com'
  ) IS NOT NULL AS legitimate_signup_still_works;  -- deve retornar true
ROLLBACK;

-- Caminho anon documentado (session ainda não confirmada, logo após
-- signUp): só funciona se <USER_B_ID> foi criado nos últimos 10
-- minutos. Contra um usuário antigo, deve falhar.
BEGIN;
  SET LOCAL ROLE anon;
  SELECT public.create_client_on_signup(
    '<OLD_EXISTING_USER_ID>'::uuid, 'Empresa Forjada Anon', 'Teste', 'anon@example.com'
  );  -- deve levantar EXCEPTION unauthorized (conta não é recente)
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


-- ── 7. Após aplicar: Advisor deve estar limpo para estes itens ──
-- Rodar get_advisors (Supabase) e confirmar:
--   0 findings de security para: v_olaclick_connections_safe,
--   v_platform_accounts_overview, admin_signups_view,
--   v_orphan_client_invites, finance_mark_overdue,
--   create_client_on_signup, can_access_client,
--   admin_link_meta_asset, admin_upsert_olaclick_connection,
--   admin_list_olaclick_connections, get_client_meta_status,
--   get_request_owner_for_client.
-- ============================================================
