-- ============================================================
-- LOKAT OS - Fix 53: ferramentas admin para limpeza de clientes
-- Execute manualmente no Supabase SQL Editor.
-- Idempotente: pode rodar mais de uma vez.
-- ============================================================
--
-- Este arquivo NAO apaga clientes automaticamente.
-- Ele cria RPCs seguras para listar candidatos, arquivar em massa
-- e apagar definitivamente apenas por super_admin.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_list_clients_for_cleanup()
RETURNS TABLE (
  id uuid,
  company_name text,
  responsible_name text,
  email text,
  status text,
  segment text,
  deleted_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz,
  reason text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.company_name,
    c.responsible_name,
    c.email,
    c.status,
    c.segment,
    c.deleted_at,
    c.archived_at,
    c.created_at,
    concat_ws(', ',
      CASE WHEN c.status IN ('inactive', 'archived', 'deleted', 'cancelled', 'canceled', 'test', 'pausado')
        THEN 'status ' || c.status END,
      CASE WHEN c.deleted_at IS NOT NULL THEN 'deleted_at preenchido' END,
      CASE WHEN c.archived_at IS NOT NULL THEN 'archived_at preenchido' END,
      CASE WHEN NULLIF(trim(coalesce(c.segment, '')), '') IS NULL THEN 'sem segmento' END,
      CASE WHEN c.company_name ILIKE ANY (ARRAY[
        '%Candy%',
        '%Pizzaria Sousa%',
        '%clienteautono%',
        '%lokat.rec%',
        '%Op lokat%',
        '%Opelokat%',
        '%Operaos%',
        '%tete%',
        '%Tete%',
        '%Gravonem%'
      ]) THEN 'nome parece teste/antigo' END
    ) AS reason
  FROM public.clients c
  WHERE public.current_user_role() IN ('admin', 'super_admin')
    AND (
      c.status IN ('inactive', 'archived', 'deleted', 'cancelled', 'canceled', 'test', 'pausado')
      OR c.deleted_at IS NOT NULL
      OR c.archived_at IS NOT NULL
      OR NULLIF(trim(coalesce(c.segment, '')), '') IS NULL
      OR c.company_name ILIKE ANY (ARRAY[
        '%Candy%',
        '%Pizzaria Sousa%',
        '%clienteautono%',
        '%lokat.rec%',
        '%Op lokat%',
        '%Opelokat%',
        '%Operaos%',
        '%tete%',
        '%Tete%',
        '%Gravonem%'
      ])
    )
  ORDER BY c.created_at DESC NULLS LAST, c.company_name;
$$;

CREATE OR REPLACE FUNCTION public.admin_archive_clients(p_client_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_count integer := 0;
BEGIN
  v_role := public.current_user_role();
  IF v_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'permission_denied: role % nao pode arquivar clientes', v_role;
  END IF;

  BEGIN
    UPDATE public.clients
       SET status = 'archived',
           archived_at = now(),
           deleted_at = NULL
     WHERE id = ANY(p_client_ids);
  EXCEPTION WHEN check_violation THEN
    BEGIN
      UPDATE public.clients
         SET status = 'inactive',
             archived_at = now(),
             deleted_at = NULL
       WHERE id = ANY(p_client_ids);
    EXCEPTION WHEN check_violation THEN
      UPDATE public.clients
         SET status = 'pausado',
             archived_at = now(),
             deleted_at = NULL
       WHERE id = ANY(p_client_ids);
    END;
  END;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_hard_delete_clients(p_client_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_count integer := 0;
BEGIN
  v_role := public.current_user_role();
  IF v_role <> 'super_admin' THEN
    RAISE EXCEPTION 'permission_denied: role % nao pode apagar definitivamente clientes', v_role;
  END IF;

  IF to_regclass('public.client_diagnosis_files') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'client_diagnosis_files' AND column_name = 'client_id') THEN
    DELETE FROM public.client_diagnosis_files WHERE client_id = ANY(p_client_ids);
  END IF;

  IF to_regclass('public.client_meta_assets') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'client_meta_assets' AND column_name = 'client_id') THEN
    DELETE FROM public.client_meta_assets WHERE client_id = ANY(p_client_ids);
  END IF;

  IF to_regclass('public.olaclick_connections') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'olaclick_connections' AND column_name = 'client_id') THEN
    DELETE FROM public.olaclick_connections WHERE client_id = ANY(p_client_ids);
  END IF;

  IF to_regclass('public.client_portal_settings') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'client_portal_settings' AND column_name = 'client_id') THEN
    DELETE FROM public.client_portal_settings WHERE client_id = ANY(p_client_ids);
  END IF;

  IF to_regclass('public.client_user_access') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'client_user_access' AND column_name = 'client_id') THEN
    DELETE FROM public.client_user_access WHERE client_id = ANY(p_client_ids);
  END IF;

  IF to_regclass('public.client_files') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'client_files' AND column_name = 'client_id') THEN
    DELETE FROM public.client_files WHERE client_id = ANY(p_client_ids);
  END IF;

  IF to_regclass('public.client_project_tasks') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'client_project_tasks' AND column_name = 'client_id') THEN
    DELETE FROM public.client_project_tasks WHERE client_id = ANY(p_client_ids);
  END IF;

  IF to_regclass('public.client_projects') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'client_projects' AND column_name = 'client_id') THEN
    DELETE FROM public.client_projects WHERE client_id = ANY(p_client_ids);
  END IF;

  IF to_regclass('public.client_requests') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'client_requests' AND column_name = 'client_id') THEN
    DELETE FROM public.client_requests WHERE client_id = ANY(p_client_ids);
  END IF;

  IF to_regclass('public.client_invites') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'client_invites' AND column_name = 'client_id') THEN
    DELETE FROM public.client_invites WHERE client_id = ANY(p_client_ids);
  END IF;

  DELETE FROM public.clients WHERE id = ANY(p_client_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_clients_for_cleanup() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_archive_clients(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_hard_delete_clients(uuid[]) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_list_clients_for_cleanup() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_archive_clients(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_hard_delete_clients(uuid[]) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- Conferir candidatos sem alterar nada:
-- SELECT * FROM public.admin_list_clients_for_cleanup();
--
-- Arquivar depois de conferir manualmente:
-- SELECT public.admin_archive_clients(ARRAY['uuid-aqui']::uuid[]);
--
-- Apagar definitivamente apenas com backup/conferencia:
-- SELECT public.admin_hard_delete_clients(ARRAY['uuid-aqui']::uuid[]);
