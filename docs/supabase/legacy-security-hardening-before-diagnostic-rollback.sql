-- ============================================================
-- ROLLBACK — legacy-security-hardening-before-diagnostic.sql
-- AINDA NÃO EXECUTADO (só faz sentido executar depois da migration
-- correspondente ter sido aplicada).
--
-- ⚠ AVISO DE SEGURANÇA (Fase 40): este rollback restaura o
-- comportamento anterior à correção -- ou seja, restaura
-- deliberadamente os P0/P1 confirmados ao vivo (anon podendo ler
-- views sensíveis, finance_mark_overdue() executável por qualquer
-- visitante, create_client_on_signup() aceitando p_user_id arbitrário,
-- RPCs de Meta/OlaClick sem ownership real de Company). Isso é
-- tecnicamente esperado de um rollback, mas nunca deve ser executado
-- sem entender que reabre exatamente essas exposições.
--
-- Não contém nenhum DROP destrutivo em ponto algum -- apenas restaura as
-- definições/grants exatamente como estavam nos arquivos históricos
-- correspondentes, objeto por objeto, na ordem inversa da migration.
-- Nenhuma tabela ou coluna foi criada pela migration corretiva, então não
-- há estrutura nenhuma para remover aqui -- só CREATE OR REPLACE / REVOKE / GRANT
-- revertendo cada objeto tocado.
-- ============================================================

BEGIN;

-- 7. get_request_owner_for_client → estado anterior (docs/supabase/45)
--    sem auth check, sem search_path.
CREATE OR REPLACE FUNCTION public.get_request_owner_for_client(p_client_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_agency_id  uuid;
  v_owner_id   uuid;
  v_super_id   uuid;
BEGIN
  SELECT agency_id, owner_id INTO v_agency_id, v_owner_id
  FROM public.clients WHERE id = p_client_id;

  IF v_agency_id IS NOT NULL THEN RETURN v_agency_id; END IF;
  IF v_owner_id  IS NOT NULL THEN RETURN v_owner_id;  END IF;

  SELECT id INTO v_super_id FROM public.profiles WHERE role = 'super_admin' LIMIT 1;
  RETURN v_super_id;
END;
$$;

-- 6.4 get_client_meta_status → estado anterior (docs/supabase/61)
--     role-only, aceitava valores de role inexistentes.
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
  SELECT cma.asset_type::text, cma.asset_name::text, cma.username::text, cma.created_at AS linked_at
  FROM public.client_meta_assets cma
  WHERE cma.client_id = p_client_id
  ORDER BY cma.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_meta_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_meta_status(uuid) TO authenticated;

-- 6.3 admin_list_olaclick_connections → estado anterior (docs/supabase/61)
--     role-only, cross-company.
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
    oc.id, oc.client_id, c.company_name::text AS client_name,
    oc.connection_name::text, oc.token_last_four::text, oc.status::text, oc.created_at
  FROM public.olaclick_connections oc
  LEFT JOIN public.clients c ON c.id = oc.client_id
  WHERE oc.status = 'connected'
  ORDER BY oc.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_olaclick_connections() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_olaclick_connections() TO authenticated;

-- 6.2 admin_upsert_olaclick_connection → estado anterior (docs/supabase/67)
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
  v_role       text;
  v_last_four  text;
  v_conn_id    uuid;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = 'P0001';
  END IF;

  SELECT p.role INTO v_role
  FROM public.profiles p
  WHERE p.id = v_caller_id;

  IF v_role NOT IN ('super_admin', 'admin', 'agency', 'operacional') THEN
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

REVOKE ALL ON FUNCTION public.admin_upsert_olaclick_connection(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_upsert_olaclick_connection(uuid, text, text, text, text) TO authenticated;

-- 6.1 admin_link_meta_asset → estado anterior (docs/supabase/60)
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
  v_role          text;
  v_conn_id       uuid;
  v_result_id     uuid;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = 'P0001';
  END IF;

  SELECT p.role INTO v_role
  FROM public.profiles p
  WHERE p.id = v_caller_id;

  IF v_role NOT IN ('super_admin', 'admin', 'agency') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client_id) THEN
    RAISE EXCEPTION 'client_not_found' USING ERRCODE = 'P0003';
  END IF;

  IF p_asset_type NOT IN ('facebook_page', 'instagram_business', 'ad_account', 'business_manager') THEN
    RAISE EXCEPTION 'invalid_asset_type' USING ERRCODE = 'P0005';
  END IF;

  v_conn_id := p_meta_connection_id;

  IF v_conn_id IS NULL THEN
    SELECT id INTO v_conn_id
    FROM public.meta_connections
    WHERE status = 'active'
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

REVOKE ALL ON FUNCTION public.admin_link_meta_asset(uuid, text, text, text, text, text, uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_link_meta_asset(uuid, text, text, text, text, text, uuid, boolean) TO authenticated;

-- 5. create_client_on_signup → estado anterior (docs/supabase/02)
--    ⚠ reabre P0.6: aceita p_user_id arbitrário.
CREATE OR REPLACE FUNCTION public.create_client_on_signup(
  p_user_id        uuid,
  p_company_name   text,
  p_responsible    text,
  p_email          text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
BEGIN
  SELECT id INTO v_client_id
  FROM public.clients
  WHERE owner_id = p_user_id;

  IF v_client_id IS NOT NULL THEN
    RETURN v_client_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'user_not_found: usuário % não existe em auth.users', p_user_id;
  END IF;

  INSERT INTO public.clients (owner_id, company_name, responsible_name, email, status)
  VALUES (p_user_id, p_company_name, p_responsible, p_email, 'onboarding')
  RETURNING id INTO v_client_id;

  RETURN v_client_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_client_on_signup(uuid, text, text, text)
  TO anon, authenticated;

-- 4. finance_mark_overdue → estado anterior (docs/supabase/33)
--    ⚠ reabre P0.5: executável por anon e authenticated.
GRANT EXECUTE ON FUNCTION public.finance_mark_overdue() TO authenticated, anon;

-- 3. Views P0 → estado anterior (security_invoker padrão + grants amplos)
--    ⚠ reabre P0.1-P0.4 e P1.8: anon volta a poder ler estas views.
ALTER VIEW public.v_olaclick_connections_safe RESET (security_invoker);
GRANT SELECT ON public.v_olaclick_connections_safe TO authenticated, anon;

ALTER VIEW public.v_platform_accounts_overview RESET (security_invoker);
GRANT SELECT ON public.v_platform_accounts_overview TO authenticated, anon;

ALTER VIEW public.admin_signups_view RESET (security_invoker);
GRANT SELECT ON public.admin_signups_view TO authenticated, anon;

ALTER VIEW public.v_orphan_client_invites RESET (security_invoker);
GRANT SELECT ON public.v_orphan_client_invites TO authenticated, anon;

GRANT SELECT ON public.v_billing_mrr_summary TO anon;

-- 2. current_user_role → estado anterior (docs/supabase/06/07, sem search_path)
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 1. can_access_client → estado anterior (docs/supabase/40)
--    ⚠ reabre P1.2: admin/super_admin global, sem client_user_access
--    nem agency_workspaces/agency_clients.
CREATE OR REPLACE FUNCTION public.can_access_client(target_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE id = target_client_id
        AND owner_id = auth.uid()
    );
$$;

COMMIT;

-- ============================================================
-- FIM DO ROLLBACK
-- Restaura exatamente o comportamento vivo anterior à correção,
-- objeto por objeto, sem CASCADE. Nenhuma tabela/coluna é apagada
-- porque a migration corretiva não criou nenhuma.
-- ============================================================
