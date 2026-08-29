-- ============================================================
-- POST-HARDENING RUNTIME REPAIR — PROMPT 05G
-- AINDA NÃO EXECUTADO.
--
-- Este arquivo NÃO é o Security Hardening (legacy-security-hardening-
-- before-diagnostic.sql) -- esse já foi aplicado em Production. Este é
-- um repair MÍNIMO que transforma o estado LIVE atual pós-hardening
-- (que ainda pode ter os bugs de runtime do PROMPT 05D/05G -- cascata
-- de status inválido, ON CONFLICT ambíguo, ou a mistura archive/delete
-- que o Codex Web sinalizou como P1 no commit aa750ce9) para o estado
-- final corrigido.
--
-- Contém SOMENTE CREATE OR REPLACE das 7 funções realmente afetadas por
-- essas correções -- nenhuma RLS, view, índice, hard delete, finance,
-- can_access_client, SQL 91, diagnostic ou dado. As 3 primeiras (archive
-- single/bulk, restore) e admin_create_client tiveram mudança de
-- comportamento real entre o commit anterior (aa750ce9) e este; as
-- outras 3 (admin_delete_client, admin_link_meta_asset,
-- admin_upsert_olaclick_connection) já estavam corretas desde aa750ce9
-- -- incluídas aqui só como salvaguarda, já que não há confirmação de
-- que aa750ce9 chegou a ser aplicado ao vivo antes deste repair
-- (CREATE OR REPLACE é idempotente -- reaplicar uma definição já
-- correta não tem efeito).
--
-- Contrato final (docs/supabase/legacy-security-hardening-before-
-- diagnostic.sql, seções 6, 8, 9, já contém a mesma versão -- uma
-- instalação nova a partir de zero já nasce correta; este arquivo serve
-- só para transformar o que já está em produção):
--   • clients.status: aguardando_validacao | onboarding | ativo |
--     pausado | inadimplente | encerrado -- nunca active/archived/inactive.
--   • archive (admin_archive_client/s): NUNCA toca status -- só
--     archived_at=now(), deleted_at=NULL.
--   • restore (admin_restore_client): deleted_at preenchido → status
--     volta a 'onboarding'; deleted_at NULL (só arquivada) → preserva o
--     status atual. Sempre limpa archived_at/deleted_at.
--   • logical delete (admin_delete_client): status='encerrado',
--     archived_at=now(), deleted_at=now() -- ação terminal, distinta de
--     archive.
--   • admin_create_client: aceita onboarding/aguardando_validacao/ativo
--     como estado inicial; qualquer outro cai em 'onboarding'.
--   • admin_link_meta_asset / admin_upsert_olaclick_connection:
--     #variable_conflict use_column (resolve SQLSTATE 42702 sem alterar
--     schema nem assinatura pública).
--
-- Rollback correspondente: post-hardening-runtime-repair-rollback.sql
-- (reverte SOMENTE este repair -- não confundir com o rollback
-- histórico do Security Hardening, que continua representando o estado
-- pré-security).
-- ============================================================

BEGIN;

-- ── admin_archive_client (single) — Regra 1: nunca toca status ──────
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
    archived_at = now(),
    deleted_at  = NULL
  WHERE id = p_client_id;

  RETURN FOUND;
END;
$$;

-- ── admin_archive_clients (bulk) — Regra 1: idem, preserva status ───
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
    archived_at = now(),
    deleted_at  = NULL
  WHERE id = ANY(p_client_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ── admin_restore_client — Regra 2: distingue archived vs. lixeira ──
CREATE OR REPLACE FUNCTION public.admin_restore_client(p_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role         text;
  v_was_deleted  boolean;
BEGIN
  v_role := public.current_user_role();
  IF v_role IS NULL OR v_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'permission_denied: role % nao pode restaurar clientes', v_role;
  END IF;
  IF v_role <> 'super_admin' AND NOT public.can_access_client(p_client_id) THEN
    RAISE EXCEPTION 'permission_denied: sem acesso a este client_id' USING ERRCODE = 'P0002';
  END IF;

  SELECT (deleted_at IS NOT NULL) INTO v_was_deleted
  FROM public.clients WHERE id = p_client_id;

  IF v_was_deleted IS NULL THEN
    RETURN false;
  END IF;

  IF v_was_deleted THEN
    UPDATE public.clients
    SET status = 'onboarding', archived_at = NULL, deleted_at = NULL
    WHERE id = p_client_id;
  ELSE
    UPDATE public.clients
    SET archived_at = NULL, deleted_at = NULL
    WHERE id = p_client_id;
  END IF;

  RETURN FOUND;
END;
$$;

-- ── admin_delete_client — Regra 3: ação terminal (salvaguarda, corpo
--    idêntico ao já commitado em aa750ce9; CREATE OR REPLACE idempotente) ──
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

-- ── admin_create_client — Regra 5: aceita ativo como estado inicial ──
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

  IF p_status NOT IN ('onboarding', 'aguardando_validacao', 'ativo') THEN
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

-- ── admin_link_meta_asset — salvaguarda (corpo idêntico ao já
--    commitado em aa750ce9; CREATE OR REPLACE idempotente) ───────────
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

-- ── admin_upsert_olaclick_connection — salvaguarda (corpo idêntico ao
--    já commitado em aa750ce9; CREATE OR REPLACE idempotente) ────────
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
-- FIM DO REPAIR — status: SQL_READY_FOR_MANUAL_APPROVAL
-- Nenhum GRANT/REVOKE incluído -- CREATE OR REPLACE FUNCTION preserva
-- os grants já existentes; o Security Hardening já os configurou.
-- ============================================================
