-- ============================================================
-- LOKAT OS - SQL 55: lixeira de clientes (restaurar / hard-delete)
-- Execute manualmente no Supabase SQL Editor.
-- Idempotente: pode rodar mais de uma vez com segurança.
-- ============================================================
--
-- Adiciona duas RPCs SECURITY DEFINER:
--   admin_restore_client(uuid)     → restaura cliente arquivado/deletado
--   admin_hard_delete_client(uuid) → apaga definitivamente (super_admin)
--
-- Complementa SQL 54 que cria admin_archive_client / admin_hard_delete_clients
-- ============================================================

-- ── 1. RPC admin_restore_client ───────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_restore_client(p_client_id uuid)
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
    RAISE EXCEPTION 'permission_denied: role % nao pode restaurar clientes', v_role;
  END IF;

  UPDATE public.clients
  SET
    status      = 'onboarding',
    archived_at = NULL,
    deleted_at  = NULL
  WHERE id = p_client_id;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_restore_client(uuid) TO authenticated;

-- ── 2. RPC admin_hard_delete_client (single, super_admin only) ─
CREATE OR REPLACE FUNCTION public.admin_hard_delete_client(p_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := public.current_user_role();
  IF v_role != 'super_admin' THEN
    RAISE EXCEPTION 'permission_denied: apenas super_admin pode apagar clientes definitivamente';
  END IF;

  DELETE FROM public.clients WHERE id = p_client_id;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_hard_delete_client(uuid) TO authenticated;

-- ── 3. Recarrega schema do PostgREST ──────────────────────────
NOTIFY pgrst, 'reload schema';

-- ── Validação ─────────────────────────────────────────────────
SELECT
  p.proname  AS funcao,
  p.prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('admin_restore_client', 'admin_hard_delete_client')
ORDER BY p.proname;
