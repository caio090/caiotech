-- ============================================================
-- LOKAT OS - Fix 48: permissoes administrativas em clients
-- Execute manualmente no Supabase SQL Editor.
-- Idempotente: pode rodar mais de uma vez.
-- ============================================================

-- Contexto:
-- O painel /admin/clientes precisa criar clientes reais sem depender de
-- insert direto no browser. A API server-side usa service role quando a
-- variavel SUPABASE_SERVICE_ROLE_KEY esta configurada. Quando ela nao
-- existe, estas policies permitem o fallback seguro via usuario autenticado.

-- Remove policies antigas deste fix, se ja existirem.
DROP POLICY IF EXISTS "clients: admin insere" ON public.clients;
DROP POLICY IF EXISTS "clients: admin/super_admin/equipe ve todos" ON public.clients;
DROP POLICY IF EXISTS "clients: admin/super_admin/equipe insere" ON public.clients;
DROP POLICY IF EXISTS "clients: admin/super_admin/equipe atualiza" ON public.clients;
DROP POLICY IF EXISTS "clients: admin/super_admin remove" ON public.clients;

-- Leitura para painel admin, equipe operacional e super_admin.
CREATE POLICY "clients: admin/super_admin/equipe ve todos" ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN (
      'super_admin',
      'admin',
      'operacional',
      'social_media',
      'designer',
      'editor',
      'videomaker',
      'gestor_trafego',
      'financeiro'
    )
  );

-- Criacao manual pelo painel /admin/clientes.
CREATE POLICY "clients: admin/super_admin/equipe insere" ON public.clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('super_admin', 'admin', 'operacional')
  );

-- Edicao e soft delete administrativo.
CREATE POLICY "clients: admin/super_admin/equipe atualiza" ON public.clients
  FOR UPDATE
  TO authenticated
  USING (
    public.current_user_role() IN ('super_admin', 'admin', 'operacional')
  )
  WITH CHECK (
    public.current_user_role() IN ('super_admin', 'admin', 'operacional')
  );

-- Hard delete fica restrito. A aplicacao prefere soft delete.
CREATE POLICY "clients: admin/super_admin remove" ON public.clients
  FOR DELETE
  TO authenticated
  USING (
    public.current_user_role() IN ('super_admin', 'admin')
  );

NOTIFY pgrst, 'reload schema';

-- Validacao rapida:
-- No SQL Editor, auth.uid() pode estar NULL. Se role_atual vier NULL
-- ali, isso nao prova problema no usuario real logado pelo app.
SELECT public.current_user_role() AS role_atual;

-- Para conferir o usuario esperado, troque o e-mail:
-- SELECT id, email, role, account_type
-- FROM public.profiles
-- WHERE email = 'SEU_EMAIL_AQUI';
