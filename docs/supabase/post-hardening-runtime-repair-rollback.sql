-- ============================================================
-- POST-HARDENING RUNTIME REPAIR — ROLLBACK — PROMPT 05G
-- AINDA NÃO EXECUTADO.
--
-- ⚠ Este rollback NÃO é o rollback histórico do Security Hardening
-- (legacy-security-hardening-before-diagnostic-rollback.sql). Aquele
-- continua representando o estado PRÉ-security (reabre os P0/P1 de
-- autorização já documentados lá) e não foi alterado por esta missão.
--
-- Este rollback reverte SOMENTE post-hardening-runtime-repair.sql --
-- ou seja, volta as 7 funções para o estado exatamente como estavam no
-- commit aa750ce9 (PROMPT 05D, já publicado em
-- github.com/caio090/lokat-os antes deste repair), não para o estado
-- pré-hardening. Autorização/ownership/can_access_client permanecem
-- IDÊNTICOS em ambos os lados -- a única coisa que muda é a semântica
-- de status/archived_at/deleted_at do archive/restore, o vocabulário
-- aceito por admin_create_client, e (nas 3 funções que não mudaram
-- entre aa750ce9 e este repair) nada.
--
-- Reverter para aa750ce9 significa voltar a misturar archive/delete
-- (admin_archive_client(s) volta a gravar status='encerrado'), e
-- admin_create_client volta a não aceitar 'ativo' como estado inicial.
-- Use apenas se o repair causar uma regressão crítica.
-- ============================================================

BEGIN;

-- ── admin_archive_client (single) → estado aa750ce9 ──────────────────
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
  IF v_role IS NULL OR v_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'permission_denied: role % nao pode arquivar clientes', v_role;
  END IF;
  IF v_role <> 'super_admin' AND NOT public.can_access_client(p_client_id) THEN
    RAISE EXCEPTION 'permission_denied: sem acesso a este client_id' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.clients
  SET
    status      = 'encerrado',
    archived_at = now(),
    deleted_at  = now()
  WHERE id = p_client_id;

  RETURN FOUND;
END;
$$;

-- ── admin_archive_clients (bulk) → estado aa750ce9 ───────────────────
CREATE OR REPLACE FUNCTION public.admin_archive_clients(p_client_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role             text;
  v_count            integer;
  v_unauthorized_id  uuid;
BEGIN
  v_role := public.current_user_role();
  IF v_role IS NULL OR v_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'permission_denied: role % nao pode arquivar clientes', v_role;
  END IF;

  IF v_role <> 'super_admin' THEN
    SELECT cid INTO v_unauthorized_id
    FROM unnest(p_client_ids) AS cid
    WHERE NOT public.can_access_client(cid)
    LIMIT 1;
    IF v_unauthorized_id IS NOT NULL THEN
      RAISE EXCEPTION 'permission_denied: sem acesso a um ou mais client_ids do lote' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  UPDATE public.clients
  SET
    status      = 'encerrado',
    archived_at = now(),
    deleted_at  = now()
  WHERE id = ANY(p_client_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ── admin_restore_client → estado aa750ce9 (sempre 'onboarding') ────
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
  IF v_role IS NULL OR v_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'permission_denied: role % nao pode restaurar clientes', v_role;
  END IF;
  IF v_role <> 'super_admin' AND NOT public.can_access_client(p_client_id) THEN
    RAISE EXCEPTION 'permission_denied: sem acesso a este client_id' USING ERRCODE = 'P0002';
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

-- ── admin_delete_client → idêntico (nunca mudou entre aa750ce9 e o repair) ──
CREATE OR REPLACE FUNCTION public.admin_delete_client(p_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role       text;
  v_deleted_at timestamptz := now();
BEGIN
  v_role := public.current_user_role();
  IF v_role IS NULL OR v_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'permission_denied: role % nao pode apagar clientes', v_role;
  END IF;
  IF v_role <> 'super_admin' AND NOT public.can_access_client(p_client_id) THEN
    RAISE EXCEPTION 'permission_denied: sem acesso a este client_id' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.clients
     SET deleted_at  = v_deleted_at,
         archived_at = v_deleted_at,
         status      = 'encerrado'
   WHERE id = p_client_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- ── admin_create_client → estado aa750ce9 (sem 'ativo' como criação) ──
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
  v_role         text;
  v_client_id    uuid;
  v_status       text;
  v_created_by   uuid;
BEGIN
  v_role := public.current_user_role();
  IF v_role IS NULL OR v_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'permission_denied: role % nao pode criar clientes', v_role;
  END IF;

  IF p_created_by IS NOT NULL AND p_created_by <> auth.uid() THEN
    RAISE EXCEPTION 'unauthorized: p_created_by must match the caller' USING ERRCODE = 'P0002';
  END IF;
  v_created_by := COALESCE(p_created_by, auth.uid());

  IF v_role <> 'super_admin' AND p_agency_id IS NOT NULL AND p_agency_id <> auth.uid() THEN
    RAISE EXCEPTION 'unauthorized: cannot attribute a new client to another workspace' USING ERRCODE = 'P0002';
  END IF;

  IF p_status NOT IN ('onboarding', 'aguardando_validacao') THEN
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
    v_created_by,
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

-- ── admin_link_meta_asset → idêntico (nunca mudou entre aa750ce9 e o repair) ──
CREATE OR REPLACE FUNCTION public.admin_link_meta_asset(
  p_client_id                      uuid,
  p_asset_type                     text,
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
#variable_conflict use_column
DECLARE
  v_caller_id     uuid;
  v_is_super      boolean;
  v_conn_id       uuid;
  v_result_id     uuid;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = 'P0001';
  END IF;

  IF NOT public.can_access_client(p_client_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client_id) THEN
    RAISE EXCEPTION 'client_not_found' USING ERRCODE = 'P0003';
  END IF;

  IF p_asset_type NOT IN ('facebook_page', 'instagram_business', 'ad_account', 'business_manager') THEN
    RAISE EXCEPTION 'invalid_asset_type' USING ERRCODE = 'P0005';
  END IF;

  SELECT (p.role = 'super_admin') INTO v_is_super FROM public.profiles p WHERE p.id = v_caller_id;

  v_conn_id := p_meta_connection_id;

  IF v_conn_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.meta_connections mc
      WHERE mc.id = v_conn_id
        AND mc.status = 'active'
        AND (COALESCE(v_is_super, false) OR mc.connected_by = v_caller_id)
    ) THEN
      RAISE EXCEPTION 'connection_not_found' USING ERRCODE = 'P0006';
    END IF;
  ELSE
    SELECT id INTO v_conn_id
    FROM public.meta_connections
    WHERE status = 'active'
      AND (COALESCE(v_is_super, false) OR connected_by = v_caller_id)
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

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

-- ── admin_upsert_olaclick_connection → idêntico (nunca mudou entre
--    aa750ce9 e o repair) ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_upsert_olaclick_connection(
  p_client_id        uuid,
  p_connection_name  text,
  p_access_token     text,
  p_notes            text    DEFAULT NULL,
  p_api_base_url     text    DEFAULT NULL
)
RETURNS TABLE(
  id                uuid,
  client_id         uuid,
  provider          text,
  connection_name   text,
  status            text,
  token_last_four   text,
  api_base_url      text,
  created_at        timestamptz,
  updated_at        timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_caller_id  uuid;
  v_last_four  text;
  v_conn_id    uuid;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = 'P0001';
  END IF;

  IF NOT public.can_access_client(p_client_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = p_client_id
      AND c.status IN ('ativo', 'onboarding')
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client_id) THEN
      RAISE EXCEPTION 'client_not_found' USING ERRCODE = 'P0003';
    ELSE
      RAISE EXCEPTION 'client_not_active' USING ERRCODE = 'P0004';
    END IF;
  END IF;

  v_last_four := CASE
    WHEN length(p_access_token) >= 4 THEN right(p_access_token, 4)
    ELSE '****'
  END;

  INSERT INTO public.olaclick_connections (
    client_id, connection_name, access_token, token_last_four,
    api_base_url, notes, created_by, status, scopes
  ) VALUES (
    p_client_id, p_connection_name, p_access_token, v_last_four,
    p_api_base_url, p_notes, v_caller_id, 'connected',
    ARRAY['menu:read', 'orders:read', 'clients:read', 'companies:read']
  )
  ON CONFLICT (client_id, connection_name)
  DO UPDATE SET
    access_token    = EXCLUDED.access_token,
    token_last_four = EXCLUDED.token_last_four,
    api_base_url    = EXCLUDED.api_base_url,
    notes           = EXCLUDED.notes,
    status          = 'connected',
    updated_at      = now()
  RETURNING olaclick_connections.id INTO v_conn_id;

  RETURN QUERY
  SELECT
    oc.id, oc.client_id, oc.provider, oc.connection_name, oc.status,
    oc.token_last_four, oc.api_base_url, oc.created_at, oc.updated_at
  FROM public.olaclick_connections oc
  WHERE oc.id = v_conn_id;
END;
$$;

COMMIT;

-- ============================================================
-- FIM DO ROLLBACK DO RUNTIME REPAIR
-- Restaura exatamente o estado do commit aa750ce9 (PROMPT 05D) --
-- NÃO o estado pré-security. Para reabrir os P0/P1 de autorização,
-- use legacy-security-hardening-before-diagnostic-rollback.sql.
-- ============================================================
