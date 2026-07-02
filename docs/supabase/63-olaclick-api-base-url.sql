-- ============================================================
-- 63 - OlaClick: campo api_base_url por conexão
--
-- Executar APÓS: 39, 59, 60
-- Idempotente. Sem dados reais de clientes.
--
-- Problema resolvido:
--   OLACLICK_API_BASE_URL era exigida como env na Vercel para cada
--   novo cliente — arquitetura incompatível com SaaS multi-cliente.
--
-- Solução:
--   Cada conexão OlaClick pode ter sua própria api_base_url salva
--   no banco pelo formulário de conexão em /admin/conexoes.
--   A env OLACLICK_API_BASE_URL continua existindo apenas como
--   fallback global OPCIONAL — não é requisito por cliente.
--
-- Prioridade no backend:
--   1. conn.api_base_url (salvo no banco para este cliente)
--   2. process.env.OLACLICK_API_BASE_URL (fallback global opcional)
--   3. Erro: "URL não configurada — edite em /admin/conexoes"
-- ============================================================

-- ── 1. Adiciona coluna api_base_url (idempotente) ─────────────
ALTER TABLE public.olaclick_connections
  ADD COLUMN IF NOT EXISTS api_base_url text NULL;

COMMENT ON COLUMN public.olaclick_connections.api_base_url IS
  'URL base da API do provedor (ex: https://api.olaclick.com.br). '
  'Se nulo, usa fallback OLACLICK_API_BASE_URL do ambiente. '
  'Não é obrigatório para provedores com preset interno.';

-- ── 2. Atualiza view segura para incluir api_base_url ─────────
CREATE OR REPLACE VIEW public.v_olaclick_connections_safe AS
SELECT
  id,
  client_id,
  connection_name,
  provider,
  api_base_url,
  token_last_four,
  scopes,
  status,
  last_sync_at,
  last_error,
  notes,
  created_by,
  created_at,
  updated_at
FROM public.olaclick_connections;

-- ── 3. RPC atualizada: aceita api_base_url opcional ───────────
--
-- Substitui a definida no SQL 60.
-- Compatível: p_api_base_url tem DEFAULT NULL — chamadas antigas
-- sem este parâmetro continuam funcionando.
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
  connection_name   text,
  status            text,
  token_last_four   text,
  api_base_url      text
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
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = 'P0001';
  END IF;

  SELECT p.role INTO v_role FROM public.profiles p WHERE p.id = v_caller_id;
  IF v_role NOT IN ('super_admin', 'admin', 'agency', 'operacional') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'P0002';
  END IF;

  SELECT c.id INTO v_client_row
  FROM public.clients c
  WHERE c.id = p_client_id AND c.status IN ('active', 'onboarding');

  IF v_client_row.id IS NULL THEN
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
    oc.id, oc.client_id, oc.connection_name, oc.status,
    oc.token_last_four, oc.api_base_url
  FROM public.olaclick_connections oc
  WHERE oc.id = v_conn_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_upsert_olaclick_connection FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_upsert_olaclick_connection TO authenticated;

-- ── 4. Reload schema ──────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ── Notas de uso ──────────────────────────────────────────────
-- Após rodar este SQL:
-- 1. O campo api_base_url pode ser preenchido no modal de conexão
--    em /admin/conexoes — nenhuma env na Vercel é obrigatória.
-- 2. Ordem de resolução no backend:
--    conn.api_base_url → OLACLICK_API_BASE_URL (env global) → erro claro
-- 3. OLACLICK_API_BASE_URL permanece suportada como fallback global
--    para agências que preferem não salvar a URL por cliente.
-- 4. Sem dados reais de clientes neste arquivo.
