-- ============================================================
-- 61 - Diagnóstico e complemento de políticas para OlaClick e Meta
--
-- Executar APÓS: 37, 39, 59, 60
-- Idempotente. Sem dados reais de clientes.
-- ============================================================

-- ── 1. meta_connections: garante que super_admin pode ler ────────
-- (Mesmo que SQL 60 já aplique, replica aqui como garantia)
DROP POLICY IF EXISTS "meta_connections_select_own" ON public.meta_connections;
CREATE POLICY "meta_connections_select_own"
  ON public.meta_connections FOR SELECT
  USING (
    connected_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'admin')
    )
  );

-- ── 2. olaclick_connections: garante acesso completo para leitura ─
DROP POLICY IF EXISTS "admin_all_olaclick" ON public.olaclick_connections;
CREATE POLICY "admin_all_olaclick"
  ON public.olaclick_connections
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'admin', 'agency', 'operacional')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'admin', 'agency')
    )
  );

-- ── 3. client_meta_assets: garante acesso completo para admin ─────
DROP POLICY IF EXISTS "client_meta_assets_select" ON public.client_meta_assets;
CREATE POLICY "client_meta_assets_select"
  ON public.client_meta_assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'admin', 'agency', 'team', 'operacional')
    )
  );

DROP POLICY IF EXISTS "client_meta_assets_insert" ON public.client_meta_assets;
CREATE POLICY "client_meta_assets_insert"
  ON public.client_meta_assets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'admin', 'agency')
    )
  );

DROP POLICY IF EXISTS "client_meta_assets_update" ON public.client_meta_assets;
CREATE POLICY "client_meta_assets_update"
  ON public.client_meta_assets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'admin', 'agency')
    )
  );

DROP POLICY IF EXISTS "client_meta_assets_delete" ON public.client_meta_assets;
CREATE POLICY "client_meta_assets_delete"
  ON public.client_meta_assets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'admin')
    )
  );

-- ── 4. RPC de diagnóstico: lista conexões sem expor tokens ───────
CREATE OR REPLACE FUNCTION public.admin_list_olaclick_connections()
RETURNS TABLE(
  id              uuid,
  client_id       uuid,
  client_name     text,
  connection_name text,
  token_last_four text,
  status          text,
  created_at      timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_role      text;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = 'P0001';
  END IF;

  SELECT p.role INTO v_role FROM public.profiles p WHERE p.id = v_caller_id;
  IF v_role NOT IN ('super_admin', 'admin', 'agency', 'operacional') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'P0002';
  END IF;

  RETURN QUERY
  SELECT
    oc.id,
    oc.client_id,
    c.company_name::text AS client_name,
    oc.connection_name::text,
    oc.token_last_four::text,
    oc.status::text,
    oc.created_at
  FROM public.olaclick_connections oc
  LEFT JOIN public.clients c ON c.id = oc.client_id
  WHERE oc.status = 'connected'
  ORDER BY oc.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_olaclick_connections FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_olaclick_connections TO authenticated;

-- ── 5. RPC de diagnóstico: status Meta por client_id ─────────────
CREATE OR REPLACE FUNCTION public.get_client_meta_status(p_client_id uuid)
RETURNS TABLE(
  asset_type  text,
  asset_name  text,
  username    text,
  linked_at   timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_role      text;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = 'P0001';
  END IF;

  SELECT p.role INTO v_role FROM public.profiles p WHERE p.id = v_caller_id;
  IF v_role NOT IN ('super_admin', 'admin', 'agency', 'team', 'operacional') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'P0002';
  END IF;

  RETURN QUERY
  SELECT
    cma.asset_type::text,
    cma.asset_name::text,
    cma.username::text,
    cma.created_at AS linked_at
  FROM public.client_meta_assets cma
  WHERE cma.client_id = p_client_id
  ORDER BY cma.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_meta_status FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_meta_status TO authenticated;

-- ── 6. Reload schema ──────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ── Notas de uso ──────────────────────────────────────────────────
-- Este SQL é complementar a 59 e 60.
-- Após rodar:
-- 1. GET /api/olaclick/connections lê conexões via session client (policy atualizada).
-- 2. GET /api/olaclick/env-status verifica presença da OLACLICK_API_BASE_URL.
-- 3. POST /api/meta/assets/link vincula ativos Meta via RPC ou service role.
-- 4. /admin/contentos/insights reconhece client_meta_assets via session client.
-- Não contém dados reais de clientes.
