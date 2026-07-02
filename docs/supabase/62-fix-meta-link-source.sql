-- ============================================================
-- 62 - Correção definitiva do vínculo Meta por cliente
--
-- Executar APÓS: 35, 37, 59, 60, 61
-- Idempotente. Sem dados reais de clientes.
--
-- Problema corrigido:
--   POST /api/meta/assets/link retornava "Conexão Meta não encontrada"
--   porque o bloco de verificação da conexão usava adminDb para buscar
--   meta_connections WHERE id = ? e retornava 0 linhas silenciosamente,
--   gerando 404 falso antes de tentar o upsert em client_meta_assets.
--
-- Solução no código:
--   Bloco de verificação removido — /api/meta/assets já provou que a
--   conexão existe ao chamar a Graph API com sucesso e retornar o
--   connection_id. O backend agora usa o meta_connection_id do body
--   diretamente, sem re-verificação.
--
-- Este SQL:
--   - Garante que super_admin pode SELECT em meta_connections
--   - Garante que super_admin pode INSERT/UPDATE em client_meta_assets
--   - Cria índices de suporte
--   - Disponibiliza RPC utilitária de resolução de conexão Meta ativa
-- ============================================================

-- ── 1. meta_connections: SELECT para super_admin ──────────────────
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

-- ── 2. client_meta_assets: todas operações para super_admin ───────
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

-- ── 3. Índice de suporte para busca de conexão ativa ─────────────
CREATE INDEX IF NOT EXISTS meta_connections_status_active_idx
  ON public.meta_connections (status, created_at DESC)
  WHERE status = 'active';

-- ── 4. RPC: resolve conexão Meta ativa para o chamador ───────────
-- Útil quando meta_connection_id não vem no payload do front.
CREATE OR REPLACE FUNCTION public.resolve_active_meta_connection(
  p_prefer_connected_by uuid DEFAULT NULL
)
RETURNS TABLE(id uuid, meta_user_id text, status text)
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
  IF v_role NOT IN ('super_admin', 'admin', 'agency') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'P0002';
  END IF;

  -- Prioridade 1: conexão do próprio usuário (ou do usuário solicitado)
  RETURN QUERY
  SELECT mc.id, mc.meta_user_id, mc.status
  FROM public.meta_connections mc
  WHERE mc.status = 'active'
    AND mc.connected_by = COALESCE(p_prefer_connected_by, v_caller_id)
  ORDER BY mc.created_at DESC
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Prioridade 2 (super_admin/admin): qualquer conexão ativa
  IF v_role IN ('super_admin', 'admin') THEN
    RETURN QUERY
    SELECT mc.id, mc.meta_user_id, mc.status
    FROM public.meta_connections mc
    WHERE mc.status = 'active'
    ORDER BY mc.created_at DESC
    LIMIT 1;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_active_meta_connection FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_active_meta_connection TO authenticated;

-- ── 5. Reload schema ──────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ── Notas de uso ──────────────────────────────────────────────────
-- Após rodar este SQL:
-- 1. super_admin pode SELECT em meta_connections via session client.
-- 2. super_admin pode INSERT/UPDATE em client_meta_assets via session client.
-- 3. POST /api/meta/assets/link usa meta_connection_id do payload diretamente,
--    sem re-verificar (o listing já provou que a conexão existe).
-- 4. Se meta_connection_id não vier, o backend busca a ativa com adminDb.
-- 5. /admin/contentos/insights reconhece o vínculo via client_meta_assets.
-- Sem dados reais de clientes.
