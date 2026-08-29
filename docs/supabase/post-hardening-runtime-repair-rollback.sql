-- ============================================================
-- POST-HARDENING RUNTIME REPAIR — ROLLBACK — PROMPT 05J (V3)
-- AINDA NÃO EXECUTADO.
--
-- ⚠ Este rollback NÃO é o rollback histórico do Security Hardening
-- (legacy-security-hardening-before-diagnostic-rollback.sql). Aquele
-- continua representando o estado PRÉ-security (reabre os P0/P1 de
-- autorização já documentados lá) e não foi alterado por esta missão.
--
-- ⚠ CORREÇÃO EM RELAÇÃO À V2 (PROMPT 05G): a V2 deste rollback foi
-- construída contra o commit aa750ce9 (PROMPT 05D), assumindo que os
-- bugfixes de 05D (cascata archived→inactive→pausado removida,
-- #variable_conflict use_column adicionado, 'active'→'ativo' no
-- OlaClick) já estavam LIVE em Production. Um audit independente
-- (Codex Web, PROMPT 05I) apontou que isso é FALSO: Production nunca
-- recebeu o apply de 05D. O estado LIVE real, confirmado via
-- pg_get_functiondef() read-only no project ziursnveqpvqkqmaacpl, é o
-- estado ANTERIOR a 05D -- que corresponde EXATAMENTE ao commit
-- 9d8de3c (fix(security): close final hardening test gaps), pai direto
-- de aa750ce9 nesta branch. Os 7 corpos abaixo foram extraídos
-- literalmente de `git show 9d8de3c:docs/supabase/legacy-security-
-- hardening-before-diagnostic.sql` -- não reconstruídos de memória --
-- e conferidos campo a campo contra a semântica reportada como LIVE
-- (status='archived' no archive, cascata archived→inactive→pausado no
-- delete, ('active','onboarding') no create e no check de status do
-- OlaClick, ausência da diretiva #variable_conflict use_column em
-- Meta/OlaClick). v_role já é `text` (nunca `integer`) em toda a
-- história deste arquivo -- o "repair pontual" mencionado no PROMPT
-- 05J não corresponde a nenhuma mudança rastreável neste arquivo; o
-- estado 9d8de3c já satisfaz essa propriedade sem qualquer ajuste
-- adicional.
--
-- Este rollback reverte SOMENTE post-hardening-runtime-repair.sql --
-- ou seja, volta as 7 funções para o estado LIVE real imediatamente
-- anterior ao Runtime Repair V3 (commit 9d8de3c), não para o estado
-- pré-hardening (que também revogaria toda a autorização Company-scoped
-- introduzida por este Security Hardening -- can_access_client,
-- ownership real em vez de role-only, etc. -- e essa NÃO é a intenção
-- deste rollback). Autorização/ownership/can_access_client permanecem
-- IDÊNTICOS em ambos os lados -- a única coisa que muda entre este
-- rollback e o repair é a semântica de status/archived_at/deleted_at
-- do archive/restore/delete, o vocabulário aceito por
-- admin_create_client, o vocabulário aceito pelo check de status do
-- OlaClick, e a presença/ausência de #variable_conflict use_column em
-- Meta/OlaClick.
--
-- Reverter para este estado significa voltar a:
--   • admin_archive_client(s) grava status='archived' (valor NUNCA
--     aceito por clients_status_check -- toda chamada real falha com
--     23514, exatamente o bug runtime original);
--   • admin_delete_client volta à cascata archived→inactive→pausado
--     (as duas primeiras tentativas sempre falham; resultado real é
--     sempre 'pausado', semanticamente errado para lixeira);
--   • admin_restore_client continua sem distinguir archive de lixeira
--     (sempre 'onboarding' -- isso NÃO muda entre este rollback e o
--     repair, listado aqui só por completude);
--   • admin_create_client volta a rejeitar 'ativo'/'aguardando_validacao'
--     como status inicial (só aceita 'active'/'onboarding', e 'active'
--     nunca é um valor válido -- cai sempre em 'onboarding');
--   • admin_link_meta_asset e admin_upsert_olaclick_connection voltam
--     a não ter #variable_conflict use_column -- todo ON CONFLICT nessas
--     duas funções volta a falhar com SQLSTATE 42702 (ambiguidade entre
--     OUT params e colunas reais);
--   • admin_upsert_olaclick_connection volta a checar
--     c.status IN ('active', 'onboarding') -- 'active' nunca é válido,
--     então todo client_id com status='ativo' de verdade (o caminho
--     legítimo mais comum) falha com client_not_active (P0004).
-- Use apenas se o repair causar uma regressão crítica.
-- ============================================================

BEGIN;

-- ── admin_archive_client (single) → estado LIVE real (9d8de3c) ──────
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
    status      = 'archived',
    archived_at = now(),
    deleted_at  = now()
  WHERE id = p_client_id;

  RETURN FOUND;
END;
$$;

-- ── admin_archive_clients (bulk) → estado LIVE real (9d8de3c) ───────
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
    status      = 'archived',
    archived_at = now(),
    deleted_at  = now()
  WHERE id = ANY(p_client_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ── admin_restore_client → estado LIVE real (sempre 'onboarding',
--    não distingue archive de lixeira -- idêntico entre 9d8de3c e
--    aa750ce9, só mudou no repair V2/V3) ──────────────────────────────
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

-- ── admin_delete_client → estado LIVE real (cascata
--    archived→inactive→pausado, 9d8de3c) ─────────────────────────────
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

-- ── admin_create_client → estado LIVE real (só aceita
--    'active'/'onboarding' -- 'active' nunca é válido, cai sempre em
--    'onboarding'; 9d8de3c) ────────────────────────────────────────────
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

-- ── admin_link_meta_asset → estado LIVE real (SEM
--    #variable_conflict use_column -- ON CONFLICT falha com 42702;
--    9d8de3c) ───────────────────────────────────────────────────────
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

-- ── admin_upsert_olaclick_connection → estado LIVE real (SEM
--    #variable_conflict use_column; status check ('active','onboarding')
--    -- 'active' nunca é válido; 9d8de3c) ──────────────────────────────
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
      AND c.status IN ('active', 'onboarding')
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
-- FIM DO ROLLBACK DO RUNTIME REPAIR (V3)
-- Restaura exatamente o estado LIVE real confirmado em Production
-- (equivalente ao commit 9d8de3c, pai de aa750ce9) -- NÃO o estado
-- pré-security. Para reabrir os P0/P1 de autorização, use
-- legacy-security-hardening-before-diagnostic-rollback.sql.
-- ============================================================
