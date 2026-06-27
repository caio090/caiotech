-- ============================================================
-- 39 - OlaClick / Cardápio Digital connections
-- Rodar manualmente no Supabase SQL Editor
-- Não rodar automaticamente
-- ============================================================

-- Tabela principal de conexões OlaClick por cliente
CREATE TABLE IF NOT EXISTS public.olaclick_connections (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         uuid        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  connection_name   text        NOT NULL,
  provider          text        NOT NULL DEFAULT 'olaclick',
  -- access_token armazenado criptografado no banco, nunca exposto no frontend
  access_token      text        NOT NULL,
  token_last_four   text,
  scopes            text[]      DEFAULT ARRAY['menu:read','orders:read','clients:read','companies:read'],
  status            text        NOT NULL DEFAULT 'connected' CHECK (status IN ('connected','error','disconnected','testing')),
  last_sync_at      timestamptz,
  last_error        text,
  notes             text,
  created_by        uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_olaclick_connections_client_id ON public.olaclick_connections(client_id);
CREATE INDEX IF NOT EXISTS idx_olaclick_connections_status    ON public.olaclick_connections(status);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_olaclick_connections_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_olaclick_connections_updated_at ON public.olaclick_connections;
CREATE TRIGGER trg_olaclick_connections_updated_at
  BEFORE UPDATE ON public.olaclick_connections
  FOR EACH ROW EXECUTE FUNCTION update_olaclick_connections_updated_at();

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.olaclick_connections ENABLE ROW LEVEL SECURITY;

-- Admin vê e gerencia tudo
DROP POLICY IF EXISTS "admin_all_olaclick" ON public.olaclick_connections;
CREATE POLICY "admin_all_olaclick"
  ON public.olaclick_connections
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'agency')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'agency')
    )
  );

-- Cliente vê apenas o status da própria conexão — NUNCA acessa access_token
-- (O SELECT via RLS não filtra colunas; a API server-side nunca retorna access_token)
DROP POLICY IF EXISTS "client_read_own_olaclick" ON public.olaclick_connections;
CREATE POLICY "client_read_own_olaclick"
  ON public.olaclick_connections
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM public.clients WHERE owner_id = auth.uid()
    )
  );

-- ── View segura (sem access_token) ───────────────────────────
-- Usar esta view nas queries do frontend/API que o cliente pode ver
CREATE OR REPLACE VIEW public.v_olaclick_connections_safe AS
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
  updated_at
FROM public.olaclick_connections;

-- Comentário de segurança
COMMENT ON TABLE public.olaclick_connections IS
  'Conexões OlaClick/Cardápio Digital por cliente. access_token nunca é exposto via API ou frontend.';

COMMENT ON COLUMN public.olaclick_connections.access_token IS
  'Token de acesso OlaClick — lido apenas server-side. Nunca retornar em JSON de API pública.';
