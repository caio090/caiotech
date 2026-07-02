-- ============================================================
-- 65 - Corrige v_olaclick_connections_safe com api_base_url
--
-- Por que o SQL 63 falhou:
--   O SQL 39 criou a view com colunas nesta ordem:
--     id, client_id, connection_name, provider, token_last_four,
--     scopes, status, last_sync_at, last_error, notes, created_by,
--     created_at, updated_at
--
--   O SQL 63 tentou CREATE OR REPLACE VIEW inserindo api_base_url
--   na posição 5 (entre provider e token_last_four). O PostgreSQL
--   viu que a coluna 5 mudou de nome (token_last_four → api_base_url)
--   e retornou:
--     ERROR 42P16: cannot change name of view column "token_last_four"
--     to "api_base_url"
--
--   CREATE OR REPLACE VIEW só permite ADICIONAR colunas no final.
--   Não permite reordenar, remover ou renomear colunas existentes.
--
-- Como este SQL corrige:
--   1. Adiciona api_base_url na tabela (idempotente, seguro).
--   2. DROPa a view antiga.
--   3. Cria a view nova com api_base_url NO FINAL, mantendo toda a
--      ordem original das colunas existentes.
--
-- Recomendação de ordem:
--   Não é necessário re-rodar o SQL 63 — basta rodar o SQL 65.
--   Se o SQL 63 foi parcialmente executado (ADD COLUMN funcionou
--   mas CREATE OR REPLACE VIEW falhou), o SQL 65 também cobre.
--
-- Ordem manual recomendada (se começar do zero):
--   39 → 59 → 60 → 61 → 62 → 65 (pular 63 ou rodar 63 após 65)
-- ============================================================

-- ── 1. Garante coluna api_base_url na tabela (idempotente) ────
ALTER TABLE public.olaclick_connections
  ADD COLUMN IF NOT EXISTS api_base_url text NULL;

COMMENT ON COLUMN public.olaclick_connections.api_base_url IS
  'URL base da API do provedor (ex: https://api.olaclick.com.br). '
  'Se nulo, usa fallback OLACLICK_API_BASE_URL do ambiente. '
  'Não é obrigatório para provedores com preset interno.';

-- ── 2. Recria view com coluna no final ────────────────────────
-- DROP necessário porque não é possível reordenar colunas via
-- CREATE OR REPLACE VIEW. A view não tem dependências no código
-- (queries usam a tabela diretamente, não esta view).
DROP VIEW IF EXISTS public.v_olaclick_connections_safe;

CREATE VIEW public.v_olaclick_connections_safe AS
SELECT
  id,
  client_id,
  connection_name,
  provider,
  token_last_four,   -- mantém posição original
  scopes,
  status,
  last_sync_at,
  last_error,
  notes,
  created_by,
  created_at,
  updated_at,
  api_base_url       -- nova coluna, sempre no final
FROM public.olaclick_connections;

COMMENT ON VIEW public.v_olaclick_connections_safe IS
  'View segura de olaclick_connections. Exclui access_token. '
  'Use em queries que não precisam do token.';

-- ── 3. Grant de leitura para authenticated ─────────────────────
GRANT SELECT ON public.v_olaclick_connections_safe TO authenticated;

-- ── 4. Atualiza RPC admin_upsert_olaclick_connection ──────────
-- Mesma função do SQL 63, incluída aqui para garantir que a
-- coluna api_base_url seja persistida mesmo se SQL 63 não rodou.
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

-- ── 5. Reload schema ──────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ── Resumo ────────────────────────────────────────────────────
-- Após rodar este SQL:
-- 1. Coluna api_base_url existe em olaclick_connections.
-- 2. View v_olaclick_connections_safe recriada com api_base_url no final.
-- 3. RPC admin_upsert_olaclick_connection aceita p_api_base_url.
-- 4. SQL 63 não precisa ser re-rodado — SQL 65 é suficiente.
-- Sem dados reais de clientes.
