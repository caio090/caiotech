-- ============================================================
-- LOKAT OS - SQL 54: fluxo final de clientes (consolidado)
-- Execute manualmente no Supabase SQL Editor.
-- Idempotente: pode rodar mais de uma vez com segurança.
-- ============================================================
--
-- O que este arquivo faz:
-- 1. Garante colunas de ownership e soft-delete na tabela clients
-- 2. Cria/atualiza a RPC admin_create_client (bypassa RLS via SECURITY DEFINER)
-- 3. Cria/atualiza a RPC admin_archive_client (soft delete seguro)
-- 4. Cria/atualiza a RPC admin_hard_delete_client (só super_admin)
-- 5. Garante policies mínimas para admin/super_admin criarem/verem/atualizarem clientes
-- 6. Garante policy pública de insert em marketing_diagnostics
--
-- Substitui a necessidade de rodar individualmente os arquivos
-- 48, 51, 52 e 53 para o fluxo de clients funcionar.
-- ============================================================

-- ── 1. Colunas de ownership e soft-delete ─────────────────────
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS agency_id   uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS deleted_at  timestamptz DEFAULT NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_clients_visible
  ON public.clients (status, deleted_at, archived_at);

-- ── 2. RPC admin_create_client (SECURITY DEFINER) ─────────────
-- Bypassa RLS completamente. Valida role internamente.
CREATE OR REPLACE FUNCTION public.admin_create_client(
  p_company_name     text,
  p_responsible_name text DEFAULT NULL,
  p_email            text DEFAULT NULL,
  p_phone            text DEFAULT NULL,
  p_segment          text DEFAULT NULL,
  p_status           text DEFAULT 'onboarding',
  p_created_by       uuid DEFAULT NULL,
  p_agency_id        uuid DEFAULT NULL
)
RETURNS TABLE (
  id               uuid,
  company_name     text,
  responsible_name text,
  email            text,
  phone            text,
  segment          text,
  status           text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role      text;
  v_client_id uuid;
  v_status    text;
BEGIN
  v_role := public.current_user_role();
  IF v_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'permission_denied: role % nao pode criar clientes', v_role;
  END IF;

  IF p_status NOT IN ('active', 'onboarding') THEN
    v_status := 'onboarding';
  ELSE
    v_status := p_status;
  END IF;

  INSERT INTO public.clients (
    company_name, responsible_name, email, phone,
    segment, status, created_by, agency_id
  ) VALUES (
    p_company_name, p_responsible_name, p_email, p_phone,
    p_segment, v_status,
    COALESCE(p_created_by, auth.uid()),
    p_agency_id
  )
  RETURNING public.clients.id INTO v_client_id;

  RETURN QUERY
    SELECT c.id, c.company_name, c.responsible_name,
           c.email, c.phone, c.segment, c.status
    FROM public.clients c
    WHERE c.id = v_client_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_client(
  text, text, text, text, text, text, uuid, uuid
) TO authenticated;

-- ── 3. RPC admin_archive_client (soft delete) ─────────────────
CREATE OR REPLACE FUNCTION public.admin_archive_client(p_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := public.current_user_role();
  IF v_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'permission_denied: role % nao pode arquivar clientes', v_role;
  END IF;

  UPDATE public.clients
  SET
    status      = 'archived',
    archived_at = now(),
    deleted_at  = now()
  WHERE id = p_client_id;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_archive_client(uuid) TO authenticated;

-- ── 4. RPC admin_archive_clients (bulk, compatível com SQL 53) ─
CREATE OR REPLACE FUNCTION public.admin_archive_clients(p_client_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role    text;
  v_count   integer;
BEGIN
  v_role := public.current_user_role();
  IF v_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'permission_denied: role % nao pode arquivar clientes', v_role;
  END IF;

  UPDATE public.clients
  SET
    status      = 'archived',
    archived_at = now(),
    deleted_at  = now()
  WHERE id = ANY(p_client_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_archive_clients(uuid[]) TO authenticated;

-- ── 5. RPC admin_hard_delete_clients (bulk, apenas super_admin) ─
CREATE OR REPLACE FUNCTION public.admin_hard_delete_clients(p_client_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role  text;
  v_count integer;
BEGIN
  v_role := public.current_user_role();
  IF v_role != 'super_admin' THEN
    RAISE EXCEPTION 'permission_denied: apenas super_admin pode apagar clientes definitivamente';
  END IF;

  DELETE FROM public.clients WHERE id = ANY(p_client_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_hard_delete_clients(uuid[]) TO authenticated;

-- ── 6. Policies mínimas para admin/super_admin ─────────────────
-- Leitura
DROP POLICY IF EXISTS "clients: admin/super_admin/equipe ve todos"        ON public.clients;
CREATE POLICY "clients: admin/super_admin/equipe ve todos" ON public.clients
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN (
      'super_admin', 'admin', 'operacional',
      'social_media', 'designer', 'editor',
      'videomaker', 'gestor_trafego', 'financeiro'
    )
  );

-- Criação manual (fallback quando RPC ou service role não estiver disponível)
DROP POLICY IF EXISTS "clients: admin/super_admin/equipe insere"          ON public.clients;
CREATE POLICY "clients: admin/super_admin/equipe insere" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('super_admin', 'admin', 'operacional')
  );

-- Edição
DROP POLICY IF EXISTS "clients: admin/super_admin/equipe atualiza"        ON public.clients;
CREATE POLICY "clients: admin/super_admin/equipe atualiza" ON public.clients
  FOR UPDATE TO authenticated
  USING  (public.current_user_role() IN ('super_admin', 'admin', 'operacional'))
  WITH CHECK (public.current_user_role() IN ('super_admin', 'admin', 'operacional'));

-- Hard delete (só super_admin via policy; RPC é mais segura)
DROP POLICY IF EXISTS "clients: admin/super_admin remove"                 ON public.clients;
CREATE POLICY "clients: admin/super_admin remove" ON public.clients
  FOR DELETE TO authenticated
  USING (public.current_user_role() IN ('super_admin', 'admin'));

-- ── 7. marketing_diagnostics: insert público ──────────────────
-- Garante que o funil /diagnostico-marketing funcione sem login.
DROP POLICY IF EXISTS "mktdiag_public_insert" ON public.marketing_diagnostics;
CREATE POLICY "mktdiag_public_insert" ON public.marketing_diagnostics
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "mktdiag_admin_select" ON public.marketing_diagnostics;
CREATE POLICY "mktdiag_admin_select" ON public.marketing_diagnostics
  FOR SELECT USING (
    public.current_user_role() IN ('super_admin', 'admin', 'operacional', 'financeiro')
  );

DROP POLICY IF EXISTS "mktdiag_admin_update" ON public.marketing_diagnostics;
CREATE POLICY "mktdiag_admin_update" ON public.marketing_diagnostics
  FOR UPDATE USING (
    public.current_user_role() IN ('super_admin', 'admin', 'operacional')
  );

-- ── 8. Recarrega schema do PostgREST ──────────────────────────
NOTIFY pgrst, 'reload schema';

-- ── Validação ─────────────────────────────────────────────────
SELECT
  p.proname  AS funcao,
  p.prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'admin_create_client',
    'admin_archive_client',
    'admin_archive_clients',
    'admin_hard_delete_clients'
  )
ORDER BY p.proname;
