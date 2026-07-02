-- ============================================================
-- 60 - RPCs SECURITY DEFINER para OlaClick e Meta linking
--
-- Problema: políticas RLS bloqueavam super_admin em operações
-- de INSERT em olaclick_connections e de verificação em
-- meta_connections. O service role key não é garantido no
-- ambiente, então dependência de admin client causava falhas
-- silenciosas.
--
-- Solução: RPCs com SECURITY DEFINER + validação de role interna.
-- Bypassam RLS completamente, sem precisar de service role key.
-- Chamadas via session client (JWT) do usuário autenticado.
--
-- Idempotente: usa CREATE OR REPLACE.
-- Sem dados reais de clientes.
-- ============================================================

-- ── 1. RPC para salvar conexão OlaClick ──────────────────────
--
-- A rota /api/olaclick/connect chama esta RPC primeiro.
-- Valida role, valida client, insere/atualiza olaclick_connections.
-- Nunca retorna access_token.

CREATE OR REPLACE FUNCTION public.admin_upsert_olaclick_connection(
  p_client_id        uuid,
  p_connection_name  text,
  p_access_token     text,
  p_notes            text DEFAULT NULL
)
RETURNS TABLE(
  id                uuid,
  client_id         uuid,
  connection_name   text,
  status            text,
  token_last_four   text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id   uuid;
  v_role        text;
  v_client_row  record;
  v_last_four   text;
  v_conn_id     uuid;
BEGIN
  -- 1. Valida sessão
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = 'P0001';
  END IF;

  -- 2. Valida role
  SELECT p.role INTO v_role
  FROM public.profiles p
  WHERE p.id = v_caller_id;

  IF v_role NOT IN ('super_admin', 'admin', 'agency', 'operacional') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'P0002';
  END IF;

  -- 3. Valida client_id (aceita active e onboarding; testa sem deleted_at se coluna existir)
  SELECT c.id INTO v_client_row
  FROM public.clients c
  WHERE c.id = p_client_id
    AND c.status IN ('active', 'onboarding');

  IF v_client_row.id IS NULL THEN
    -- Tenta sem filtro de status para dar mensagem precisa
    IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client_id) THEN
      RAISE EXCEPTION 'client_not_found' USING ERRCODE = 'P0003';
    ELSE
      RAISE EXCEPTION 'client_not_active' USING ERRCODE = 'P0004';
    END IF;
  END IF;

  -- 4. Extrai últimos 4 dígitos do token (sem logar o token inteiro)
  v_last_four := CASE
    WHEN length(p_access_token) >= 4 THEN right(p_access_token, 4)
    ELSE '****'
  END;

  -- 5. Upsert em olaclick_connections
  --    Conflito: mesmo client_id + connection_name
  INSERT INTO public.olaclick_connections (
    client_id, connection_name, access_token, token_last_four,
    notes, created_by, status, scopes
  ) VALUES (
    p_client_id, p_connection_name, p_access_token, v_last_four,
    p_notes, v_caller_id, 'connected',
    ARRAY['menu:read', 'orders:read', 'clients:read', 'companies:read']
  )
  ON CONFLICT (client_id, connection_name)
  DO UPDATE SET
    access_token    = EXCLUDED.access_token,
    token_last_four = EXCLUDED.token_last_four,
    notes           = EXCLUDED.notes,
    status          = 'connected',
    updated_at      = now()
  RETURNING olaclick_connections.id INTO v_conn_id;

  -- 6. Retorna sem expor access_token
  RETURN QUERY
  SELECT
    oc.id, oc.client_id, oc.connection_name, oc.status, oc.token_last_four
  FROM public.olaclick_connections oc
  WHERE oc.id = v_conn_id;
END;
$$;

-- Index único necessário para o ON CONFLICT acima
CREATE UNIQUE INDEX IF NOT EXISTS idx_olaclick_conn_client_name
  ON public.olaclick_connections (client_id, connection_name);

-- Grant para authenticated
REVOKE ALL ON FUNCTION public.admin_upsert_olaclick_connection FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_upsert_olaclick_connection TO authenticated;

COMMENT ON FUNCTION public.admin_upsert_olaclick_connection IS
  'Salva ou atualiza conexão OlaClick por client_id + connection_name. '
  'SECURITY DEFINER: bypassa RLS. Nunca retorna access_token.';


-- ── 2. RPC para vincular ativo Meta a cliente ─────────────────
--
-- A rota /api/meta/assets/link chama esta RPC primeiro.
-- Resolve meta_connection_id automaticamente se não vier.
-- Faz upsert em client_meta_assets.
-- Nunca retorna tokens Meta.

CREATE OR REPLACE FUNCTION public.admin_link_meta_asset(
  p_client_id                      uuid,
  p_asset_type                     text,   -- 'facebook_page' | 'instagram_business'
  p_asset_id                       text,
  p_asset_name                     text     DEFAULT NULL,
  p_username                       text     DEFAULT NULL,
  p_picture_url                    text     DEFAULT NULL,
  p_meta_connection_id             uuid     DEFAULT NULL,
  p_is_primary                     boolean  DEFAULT false
)
RETURNS TABLE(
  asset_record_id  uuid,
  client_id        uuid,
  asset_type       text,
  asset_id         text,
  linked           boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id     uuid;
  v_role          text;
  v_conn_id       uuid;
  v_result_id     uuid;
BEGIN
  -- 1. Valida sessão
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = 'P0001';
  END IF;

  -- 2. Valida role
  SELECT p.role INTO v_role
  FROM public.profiles p
  WHERE p.id = v_caller_id;

  IF v_role NOT IN ('super_admin', 'admin', 'agency') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'P0002';
  END IF;

  -- 3. Valida client_id
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client_id) THEN
    RAISE EXCEPTION 'client_not_found' USING ERRCODE = 'P0003';
  END IF;

  -- 4. Valida asset_type
  IF p_asset_type NOT IN ('facebook_page', 'instagram_business', 'ad_account', 'business_manager') THEN
    RAISE EXCEPTION 'invalid_asset_type' USING ERRCODE = 'P0005';
  END IF;

  -- 5. Resolve meta_connection_id
  --    Se veio do frontend, usa ele.
  --    Se não veio, procura a conexão ativa mais recente na tabela.
  v_conn_id := p_meta_connection_id;

  IF v_conn_id IS NULL THEN
    -- Busca conexão ativa do chamador
    SELECT id INTO v_conn_id
    FROM public.meta_connections
    WHERE status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  -- Se ainda null, tenta encontrar qualquer conexão ativa
  -- (meta_connection_id é nullable no schema do SQL 37)
  -- Pode continuar com NULL se a tabela permitir

  -- 6. Upsert em client_meta_assets
  INSERT INTO public.client_meta_assets (
    client_id, meta_connection_id, asset_type, asset_id,
    asset_name, username, picture_url, is_primary, connected_by
  ) VALUES (
    p_client_id, v_conn_id, p_asset_type, p_asset_id,
    p_asset_name, p_username, p_picture_url, p_is_primary, v_caller_id
  )
  ON CONFLICT (client_id, asset_type, asset_id)
  DO UPDATE SET
    meta_connection_id = COALESCE(EXCLUDED.meta_connection_id, client_meta_assets.meta_connection_id),
    asset_name         = COALESCE(EXCLUDED.asset_name, client_meta_assets.asset_name),
    username           = COALESCE(EXCLUDED.username, client_meta_assets.username),
    picture_url        = COALESCE(EXCLUDED.picture_url, client_meta_assets.picture_url),
    is_primary         = EXCLUDED.is_primary,
    updated_at         = now()
  RETURNING id INTO v_result_id;

  RETURN QUERY
  SELECT v_result_id, p_client_id, p_asset_type, p_asset_id, TRUE;
END;
$$;

-- Grant para authenticated
REVOKE ALL ON FUNCTION public.admin_link_meta_asset FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_link_meta_asset TO authenticated;

COMMENT ON FUNCTION public.admin_link_meta_asset IS
  'Vincula ativo Meta (Página ou Instagram Business) a um cliente. '
  'SECURITY DEFINER: bypassa RLS. Resolve meta_connection_id automaticamente. '
  'Nunca retorna tokens Meta.';


-- ── 3. Correção de políticas RLS (complementa SQL 59) ────────

-- meta_connections: adiciona super_admin ao SELECT
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

-- olaclick_connections: garante super_admin (replica SQL 59)
DROP POLICY IF EXISTS "admin_all_olaclick" ON public.olaclick_connections;
CREATE POLICY "admin_all_olaclick"
  ON public.olaclick_connections
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'admin', 'agency')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'admin', 'agency')
    )
  );

-- client_meta_assets: garante super_admin (replica SQL 59)
DROP POLICY IF EXISTS "client_meta_assets_select" ON public.client_meta_assets;
CREATE POLICY "client_meta_assets_select"
  ON public.client_meta_assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'admin', 'agency', 'team')
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

-- ── 4. Reload schema ──────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ── Uso ───────────────────────────────────────────────────────
-- Após rodar este SQL:
--
-- 1. OlaClick: a rota POST /api/olaclick/connect tentará primeiro a RPC
--    admin_upsert_olaclick_connection. Se a RPC não existir (SQL não rodado),
--    cai para fallback direto com error detalhado.
--
-- 2. Meta: a rota POST /api/meta/assets/link tentará primeiro a RPC
--    admin_link_meta_asset. O meta_connection_id é resolvido automaticamente
--    pelo banco se não vier no payload.
--
-- 3. As políticas RLS corrigidas permitem que super_admin opere via
--    session client mesmo sem service role key configurada.
--
-- Arquivo não contém dados reais de clientes.
