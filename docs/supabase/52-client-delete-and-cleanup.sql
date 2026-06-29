-- ============================================================
-- LOKAT OS - Fix 52: exclusao e visibilidade de clientes
-- Execute manualmente no Supabase SQL Editor.
-- Idempotente: pode rodar mais de uma vez.
-- ============================================================
--
-- Regra definitiva:
-- - clientes visiveis: status IN ('active', 'onboarding')
-- - clientes invisiveis: deleted_at IS NOT NULL, archived_at IS NOT NULL,
--   status inactive/archived/deleted/cancelled/canceled/test
-- - apagar pelo painel = soft delete com deleted_at + archived_at
--
-- Este arquivo NAO limpa clientes antigos automaticamente.
-- O bloco de limpeza manual no final fica comentado.
-- ============================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_clients_visible_status_deleted
  ON public.clients (status, deleted_at, archived_at);

CREATE INDEX IF NOT EXISTS idx_clients_deleted_at
  ON public.clients (deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clients_archived_at
  ON public.clients (archived_at)
  WHERE archived_at IS NOT NULL;

-- View oficial de clientes reais visiveis.
-- security_invoker evita bypass acidental de RLS em Postgres 15+.
DROP VIEW IF EXISTS public.v_real_clients;

CREATE VIEW public.v_real_clients
WITH (security_invoker = true)
AS
SELECT
  c.id,
  c.company_name,
  c.responsible_name,
  c.email,
  c.phone,
  c.segment,
  c.status,
  c.owner_id,
  c.created_at
FROM public.clients c
WHERE c.status IN ('active', 'onboarding')
  AND c.deleted_at IS NULL
  AND c.archived_at IS NULL;

GRANT SELECT ON public.v_real_clients TO authenticated;

-- RPC segura para a lixeira do painel.
CREATE OR REPLACE FUNCTION public.admin_delete_client(p_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_deleted_at timestamptz := now();
BEGIN
  v_role := public.current_user_role();
  IF v_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'permission_denied: role % nao pode apagar clientes', v_role;
  END IF;

  BEGIN
    UPDATE public.clients
       SET deleted_at = v_deleted_at,
           archived_at = v_deleted_at,
           status = 'archived'
     WHERE id = p_client_id;
  EXCEPTION WHEN check_violation THEN
    BEGIN
      UPDATE public.clients
         SET deleted_at = v_deleted_at,
             archived_at = v_deleted_at,
             status = 'inactive'
       WHERE id = p_client_id;
    EXCEPTION WHEN check_violation THEN
      UPDATE public.clients
         SET deleted_at = v_deleted_at,
             archived_at = v_deleted_at,
             status = 'pausado'
       WHERE id = p_client_id;
    END;
  END;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_client(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_client(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- Validacao rapida:
-- SELECT id, company_name, status, deleted_at, archived_at
-- FROM public.clients
-- WHERE status NOT IN ('active', 'onboarding')
--    OR deleted_at IS NOT NULL
--    OR archived_at IS NOT NULL
-- ORDER BY created_at DESC;

-- ============================================================
-- LIMPEZA MANUAL OPCIONAL - NAO EXECUTAR SEM CONFERIR O SELECT
-- ============================================================
-- SELECT id, company_name, email, status, created_at, deleted_at, archived_at
-- FROM public.clients
-- WHERE company_name IN (
--   'Candy',
--   'clienteautono',
--   'Lokat Rec',
--   'lokat.rec',
--   'Op lokat',
--   'Opelokat',
--   'Operaos',
--   'Pizzaria Sousa',
--   'tete'
-- )
-- ORDER BY company_name;
--
-- UPDATE public.clients
-- SET deleted_at = now(),
--     archived_at = now(),
--     status = 'archived'
-- WHERE company_name IN (
--   'Candy',
--   'clienteautono',
--   'Lokat Rec',
--   'lokat.rec',
--   'Op lokat',
--   'Opelokat',
--   'Operaos',
--   'Pizzaria Sousa',
--   'tete'
-- );
