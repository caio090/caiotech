-- ============================================================
-- LOKAT OS - Debug 50: current_user_role e criacao de cliente
-- Execute manualmente no Supabase SQL Editor.
-- Este arquivo e somente diagnostico; nao altera dados por padrao.
-- ============================================================

-- IMPORTANTE:
-- public.current_user_role() depende de auth.uid().
-- No SQL Editor, auth.uid() pode retornar NULL por nao haver sessao JWT
-- igual a sessao real do app. Portanto, role_atual NULL no SQL Editor
-- nao prova que a role do usuario do app esta errada.

-- 1) Verificar contexto de auth no SQL Editor.
SELECT
  auth.uid() AS auth_uid_no_sql_editor,
  public.current_user_role() AS role_atual_no_sql_editor,
  current_setting('request.jwt.claim.sub', true) AS jwt_sub_claim;

-- 2) Listar perfis recentes para encontrar o usuario real.
SELECT id, email, name, role, account_type, created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 20;

-- 3) Procurar um usuario especifico por e-mail.
-- Troque o e-mail antes de rodar.
-- SELECT id, email, name, role, account_type, created_at
-- FROM public.profiles
-- WHERE lower(email) = lower('SEU_EMAIL_AQUI');

-- 4) Validar policies atuais em public.clients.
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'clients'
ORDER BY policyname;

-- 5) Validar se RLS esta ativo em clients.
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relname = 'clients';

-- 6) Ver rapidamente se as policies contemplam super_admin/admin.
SELECT
  policyname,
  cmd,
  (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ILIKE '%super_admin%' AS inclui_super_admin,
  (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ILIKE '%admin%' AS inclui_admin,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'clients'
ORDER BY policyname;

-- 7) Conferir definicao da funcao current_user_role().
SELECT
  n.nspname AS schema,
  p.proname AS function_name,
  p.prosecdef AS security_definer,
  pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'current_user_role';

-- 8) Atualizar manualmente o usuario dono para super_admin, se confirmado.
-- ATENCAO: troque o e-mail e rode somente se este for o usuario correto.
-- UPDATE public.profiles
-- SET role = 'super_admin',
--     account_type = coalesce(account_type, 'lokat_internal')
-- WHERE lower(email) = lower('SEU_EMAIL_AQUI')
-- RETURNING id, email, name, role, account_type;

-- 9) Depois de qualquer alteracao de policy/function, recarregar schema.
-- NOTIFY pgrst, 'reload schema';
