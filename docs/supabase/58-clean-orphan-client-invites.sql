-- ══════════════════════════════════════════════════════════════
-- SQL 58 — Limpeza de convites órfãos de clientes
-- Propósito: marcar como 'expired' convites cujo client_id não
--            existe mais em public.clients.
-- Idempotente. Não faz hard delete. Não contém dados reais.
-- ══════════════════════════════════════════════════════════════

-- ── 1. View de diagnóstico (somente leitura) ──────────────────
-- Mostra convites órfãos sem apagá-los.
CREATE OR REPLACE VIEW public.v_orphan_client_invites AS
SELECT
  ci.id,
  ci.email,
  ci.client_id,
  ci.status,
  ci.created_at,
  ci.expires_at,
  ci.accepted_by
FROM public.client_invites ci
LEFT JOIN public.clients c ON c.id = ci.client_id
WHERE c.id IS NULL
  AND ci.status IN ('pending', 'accepted');

COMMENT ON VIEW public.v_orphan_client_invites IS
  'Convites cujo client_id não existe mais em public.clients. Use admin_cleanup_orphan_client_invites() para marcar como expired.';

-- ── 2. RPC de limpeza — apenas admin/super_admin ──────────────
CREATE OR REPLACE FUNCTION public.admin_cleanup_orphan_client_invites()
RETURNS TABLE(cleaned_count int, invite_ids uuid[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role  text;
  v_ids   uuid[];
  v_count int := 0;
BEGIN
  -- Valida que o chamador é admin ou super_admin
  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Apenas admin ou super_admin pode executar limpeza de convites.';
  END IF;

  -- Coleta ids de convites órfãos pendentes/aceitos
  SELECT array_agg(ci.id)
  INTO v_ids
  FROM public.client_invites ci
  LEFT JOIN public.clients c ON c.id = ci.client_id
  WHERE c.id IS NULL
    AND ci.status IN ('pending', 'accepted');

  IF v_ids IS NOT NULL THEN
    -- Marca como expirados (não apaga)
    UPDATE public.client_invites
    SET status = 'expired'
    WHERE id = ANY(v_ids);

    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;

  RETURN QUERY SELECT v_count, COALESCE(v_ids, ARRAY[]::uuid[]);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_cleanup_orphan_client_invites() TO authenticated;

-- ── 3. Recarregar schema do PostgREST ────────────────────────
NOTIFY pgrst, 'reload schema';

-- ── Uso manual (não rodar automaticamente) ───────────────────
-- Ver convites órfãos:
--   SELECT * FROM public.v_orphan_client_invites;
--
-- Limpar convites órfãos (apenas se logado como admin/super_admin):
--   SELECT * FROM public.admin_cleanup_orphan_client_invites();
