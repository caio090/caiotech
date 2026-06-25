-- ============================================================
-- SQL 31 — Leads de novos cadastros
--
-- Cria uma view/tabela para unificar:
--   - profiles recém-criados (novos cadastros)
--   - clients associados
--   - status do onboarding
--   - fonte do lead
--
-- Safe to re-run:
--   CREATE TABLE IF NOT EXISTS
--   ALTER TABLE ADD COLUMN IF NOT EXISTS
--   CREATE INDEX IF NOT EXISTS
--   DROP POLICY IF EXISTS + CREATE POLICY
-- ============================================================

-- ── 1. Adicionar campos úteis em profiles (se não existirem) ─

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS source       text    DEFAULT 'signup',
  ADD COLUMN IF NOT EXISTS lead_status  text    DEFAULT 'novo_cadastro',
  ADD COLUMN IF NOT EXISTS converted_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS archived_at_lead timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS lead_notes   text    DEFAULT NULL;

-- ── 2. View de leads/cadastros (para o painel Admin → Leads) ─

CREATE OR REPLACE VIEW public.admin_signups_view AS
SELECT
  p.id                  AS profile_id,
  p.name,
  p.email,
  p.role,
  p.source,
  p.lead_status,
  p.lead_notes,
  p.converted_at,
  p.created_at          AS signup_at,
  -- Client info, se existir
  c.id                  AS client_id,
  c.company_name,
  c.segment,
  -- Onboarding info
  op.completed          AS onboarding_completed,
  op.brand_name,
  op.objective          AS onboarding_objective,
  op.updated_at         AS onboarding_updated_at
FROM public.profiles p
LEFT JOIN public.clients c       ON c.owner_id  = p.id
LEFT JOIN public.onboarding_profiles op ON op.user_id = p.id
WHERE p.deleted_at IS NULL
  AND p.role = 'cliente'
ORDER BY p.created_at DESC;

-- ── 3. RLS — apenas admin visualiza ──────────────────────────

-- A view herda as políticas das tabelas base.
-- Para restringir acesso direto à view, criar função SECURITY DEFINER:

CREATE OR REPLACE FUNCTION public.get_admin_signups(
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  profile_id            uuid,
  name                  text,
  email                 text,
  role                  text,
  source                text,
  lead_status           text,
  lead_notes            text,
  converted_at          timestamptz,
  signup_at             timestamptz,
  client_id             uuid,
  company_name          text,
  segment               text,
  onboarding_completed  boolean,
  brand_name            text,
  onboarding_objective  text,
  onboarding_updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se solicitante é admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    p.id, p.name, p.email, p.role, p.source, p.lead_status, p.lead_notes,
    p.converted_at, p.created_at,
    c.id, c.company_name, c.segment,
    op.completed, op.brand_name, op.objective, op.updated_at
  FROM public.profiles p
  LEFT JOIN public.clients c ON c.owner_id = p.id
  LEFT JOIN public.onboarding_profiles op ON op.user_id = p.id
  WHERE p.deleted_at IS NULL
    AND p.role = 'cliente'
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ── 4. Função para atualizar status do lead ───────────────────

CREATE OR REPLACE FUNCTION public.admin_update_lead_status(
  p_profile_id  uuid,
  p_lead_status text,
  p_notes       text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  UPDATE public.profiles
  SET
    lead_status  = p_lead_status,
    lead_notes   = COALESCE(p_notes, lead_notes),
    converted_at = CASE WHEN p_lead_status = 'convertido' THEN NOW() ELSE converted_at END
  WHERE id = p_profile_id;
END;
$$;

-- ── 5. Índice para busca eficiente de novos cadastros ────────

CREATE INDEX IF NOT EXISTS idx_profiles_lead_status
  ON public.profiles (lead_status, created_at DESC)
  WHERE deleted_at IS NULL AND role = 'cliente';

CREATE INDEX IF NOT EXISTS idx_profiles_source
  ON public.profiles (source)
  WHERE deleted_at IS NULL;

-- ── 6. Notificar PostgREST ───────────────────────────────────

NOTIFY pgrst, 'reload schema';

-- ── INSTRUÇÕES ────────────────────────────────────────────────
-- 1. Rodar este SQL no Supabase SQL Editor
-- 2. Para ver novos cadastros no frontend, usar:
--    supabase.rpc('get_admin_signups', { p_limit: 50, p_offset: 0 })
-- 3. Para atualizar status do lead:
--    supabase.rpc('admin_update_lead_status', { p_profile_id, p_lead_status, p_notes })
-- 4. Status disponíveis:
--    novo_cadastro | onboarding_iniciado | diagnostico_concluido
--    convertido | sem_acao | arquivado
-- ============================================================
