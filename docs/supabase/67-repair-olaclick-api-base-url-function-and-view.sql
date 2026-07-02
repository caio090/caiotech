-- ============================================================
-- 67 - Repara overload de função e view de Cardápio Digital
--
-- Executar APÓS: 39, 59, 60
-- Não requer 63 nem 65 (substitui ambos de forma segura).
-- Idempotente. Sem dados reais de clientes.
--
-- DIAGNÓSTICO — por que SQL 63 e 65 falharam:
--
-- SQL 63 falhou (erro 42P16):
--   Tentou CREATE OR REPLACE VIEW v_olaclick_connections_safe inserindo
--   api_base_url na posição 5 (entre provider e token_last_four).
--   O PostgreSQL não permite mudar ordem/posição de colunas existentes
--   via CREATE OR REPLACE VIEW — só permite adicionar no FINAL.
--
-- SQL 65 falhou (erro 42725 "function name is not unique"):
--   SQL 60 criou admin_upsert_olaclick_connection com 4 parâmetros.
--   SQL 63 usou CREATE OR REPLACE com 5 parâmetros — isso não substitui
--   a função antiga, cria um OVERLOAD (segunda assinatura).
--   SQL 65 depois tentou REVOKE/GRANT sem assinatura explícita.
--   Com 2 overloads de mesmo nome, o PostgreSQL retorna 42725.
--
-- SOLUÇÃO DESTE SQL:
--   A) Garante api_base_url na tabela (idempotente).
--   B) DROP explícito das 2 assinaturas conhecidas.
--   C) CREATE de função canônica única (5 parâmetros).
--   D) REVOKE/GRANT com assinatura explícita.
--   E) DROP VIEW + CREATE com api_base_url no final.
--   F) GRANT na view. G) NOTIFY pgrst.
-- ============================================================


-- ── A. Garante coluna api_base_url (idempotente) ──────────────
-- Cobre o caso em que SQL 63 não chegou a rodar o ALTER TABLE.

ALTER TABLE public.olaclick_connections
  ADD COLUMN IF NOT EXISTS api_base_url text NULL;

COMMENT ON COLUMN public.olaclick_connections.api_base_url IS
  'URL base da API do provedor de cardápio digital '
  '(ex: https://api.olaclick.com.br). '
  'Se nulo, usa fallback OLACLICK_API_BASE_URL do ambiente. '
  'Não é obrigatório para provedores com URL preset interna.';


-- ── B. Remove overloads antigos com assinatura EXPLÍCITA ──────
--
-- Versão do SQL 60 — 4 parâmetros (sem api_base_url):
DROP FUNCTION IF EXISTS public.admin_upsert_olaclick_connection(
  uuid, text, text, text
);

-- Versão do SQL 63/65 — 5 parâmetros (com api_base_url):
DROP FUNCTION IF EXISTS public.admin_upsert_olaclick_connection(
  uuid, text, text, text, text
);


-- ── C. Função canônica única ───────────────────────────────────
--
-- Uma única assinatura: (uuid, text, text, text, text).
-- Parâmetros com DEFAULT NULL são compatíveis com chamadas que
-- não passam p_notes ou p_api_base_url.
-- Nunca retorna access_token.

CREATE FUNCTION public.admin_upsert_olaclick_connection(
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

  -- 3. Valida client_id (aceita active e onboarding)
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

  -- 4. Últimos 4 dígitos do token (nunca loga o token inteiro)
  v_last_four := CASE
    WHEN length(p_access_token) >= 4 THEN right(p_access_token, 4)
    ELSE '****'
  END;

  -- 5. Upsert (conflito = mesmo client_id + connection_name)
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

  -- 6. Retorna campos seguros (sem access_token)
  RETURN QUERY
  SELECT
    oc.id,
    oc.client_id,
    oc.provider,
    oc.connection_name,
    oc.status,
    oc.token_last_four,
    oc.api_base_url,
    oc.created_at,
    oc.updated_at
  FROM public.olaclick_connections oc
  WHERE oc.id = v_conn_id;
END;
$$;

COMMENT ON FUNCTION public.admin_upsert_olaclick_connection(uuid, text, text, text, text) IS
  'Salva ou atualiza conexão Cardápio Digital por client_id + connection_name. '
  'SECURITY DEFINER: bypassa RLS. Nunca retorna access_token. '
  'api_base_url opcional: URL da API do provedor salva por cliente.';


-- ── D. REVOKE / GRANT com assinatura explícita ────────────────
-- Assinatura explícita evita erro 42725 ("function name is not unique").

REVOKE ALL ON FUNCTION public.admin_upsert_olaclick_connection(
  uuid, text, text, text, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_upsert_olaclick_connection(
  uuid, text, text, text, text
) TO authenticated;


-- ── E. Recria view segura com api_base_url no final ───────────
--
-- DROP necessário porque CREATE OR REPLACE VIEW não permite
-- inserir coluna em posição existente (causa erro 42P16).
-- A view não é usada diretamente no código TypeScript —
-- as queries acessam a tabela diretamente. DROP é seguro.
--
-- Ordem das colunas: mantém a do SQL 39, api_base_url no FINAL.
-- Sem access_token.

DROP VIEW IF EXISTS public.v_olaclick_connections_safe;

CREATE VIEW public.v_olaclick_connections_safe AS
SELECT
  id,
  client_id,
  connection_name,
  provider,
  token_last_four,
  scopes,
  status,
  last_sync_at,
  last_error,
  notes,
  created_by,
  created_at,
  updated_at,
  api_base_url       -- nova, sempre no final
FROM public.olaclick_connections;

COMMENT ON VIEW public.v_olaclick_connections_safe IS
  'View segura de olaclick_connections. '
  'Nunca inclui access_token. '
  'Usar em queries do frontend/API que o cliente pode ver.';


-- ── F. Grant na view ──────────────────────────────────────────
GRANT SELECT ON public.v_olaclick_connections_safe TO authenticated;


-- ── G. Reload schema ──────────────────────────────────────────
NOTIFY pgrst, 'reload schema';


-- ── Resumo pós-execução ───────────────────────────────────────
-- 1. olaclick_connections.api_base_url existe (ADD COLUMN IF NOT EXISTS).
-- 2. Funções antigas removidas: (uuid,text,text,text) e (uuid,text,text,text,text).
-- 3. Uma única função canônica (uuid,text,text,text,text) com REVOKE/GRANT explícito.
-- 4. view v_olaclick_connections_safe recriada com api_base_url no final.
-- 5. access_token NUNCA aparece na view.
--
-- Ordem recomendada de SQLs manuais:
--   39 → 59 → 60 → 62 → 64 → 66 → 67
--   (63 e 65 NÃO precisam ser re-rodados — SQL 67 substitui ambos)
--
-- SQL 66 (report_source em client_report_uploads) é independente
-- e pode ser rodado antes ou depois do SQL 67.
-- ============================================================
