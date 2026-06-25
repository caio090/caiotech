-- ============================================================
-- SQL 31 — Leads de novos cadastros (v2 — compatível)
--
-- Correções em relação à v1:
--   ✗ op.user_id          → ✓ op.client_id = c.id
--   ✗ op.objective        → ✓ op.objective_primary
--   ✗ op.updated_at       → coluna não existe, removida
--   ✗ p.deleted_at        → coluna não existe, removida do WHERE
--
-- Cadeia de JOINs correta (do schema real):
--   profiles.id
--     ← clients.owner_id       (1:1 por cliente)
--       ← onboarding_profiles.client_id   (1:1 por client)
--
-- Safe to re-run:
--   ALTER TABLE ADD COLUMN IF NOT EXISTS
--   CREATE OR REPLACE VIEW / FUNCTION
--   CREATE INDEX IF NOT EXISTS
-- ============================================================

-- ── 1. Adicionar campos de lead em profiles (se não existirem) ─

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS source           text    DEFAULT 'signup',
  ADD COLUMN IF NOT EXISTS lead_status      text    DEFAULT 'novo_cadastro',
  ADD COLUMN IF NOT EXISTS converted_at     timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS lead_notes       text    DEFAULT NULL;

-- ── 2. View de cadastros para o painel Admin → Leads ──────────

CREATE OR REPLACE VIEW public.admin_signups_view AS
SELECT
  p.id                      AS profile_id,
  p.name,
  p.email,
  p.role,
  p.source,
  p.lead_status,
  p.lead_notes,
  p.converted_at,
  p.created_at              AS signup_at,
  -- Client info
  c.id                      AS client_id,
  c.company_name,
  c.segment,
  c.status                  AS client_status,
  -- Onboarding info (linked via clients.id, NOT via user_id)
  op.id                     AS onboarding_id,
  op.brand_name,
  op.objective_primary      AS onboarding_objective,
  op.completed              AS onboarding_completed
FROM public.profiles p
LEFT JOIN public.clients c
  ON c.owner_id = p.id
LEFT JOIN public.onboarding_profiles op
  ON op.client_id = c.id          -- ← JOIN correto: op.client_id, não op.user_id
WHERE p.role = 'cliente'
ORDER BY p.created_at DESC;

-- ── 3. RPC segura: listar cadastros (apenas admin) ────────────

CREATE OR REPLACE FUNCTION public.get_admin_signups(
  p_limit  int DEFAULT 50,
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
  client_status         text,
  onboarding_id         uuid,
  brand_name            text,
  onboarding_objective  text,
  onboarding_completed  boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.email,
    p.role,
    p.source,
    p.lead_status,
    p.lead_notes,
    p.converted_at,
    p.created_at,
    c.id,
    c.company_name,
    c.segment,
    c.status,
    op.id,
    op.brand_name,
    op.objective_primary,
    op.completed
  FROM public.profiles p
  LEFT JOIN public.clients c  ON c.owner_id  = p.id
  LEFT JOIN public.onboarding_profiles op ON op.client_id = c.id
  WHERE p.role = 'cliente'
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_signups(int, int) TO authenticated;

-- ── 4. RPC: atualizar status do lead ─────────────────────────

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
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  UPDATE public.profiles
  SET
    lead_status  = p_lead_status,
    lead_notes   = COALESCE(p_notes, lead_notes),
    converted_at = CASE
                     WHEN p_lead_status = 'convertido' AND converted_at IS NULL
                     THEN NOW()
                     ELSE converted_at
                   END
  WHERE id = p_profile_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_lead_status(uuid, text, text) TO authenticated;

-- ── 5. Índices ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_profiles_lead_status
  ON public.profiles (lead_status, created_at DESC)
  WHERE role = 'cliente';

CREATE INDEX IF NOT EXISTS idx_profiles_source
  ON public.profiles (source)
  WHERE role = 'cliente';

-- ── 6. Notificar PostgREST ───────────────────────────────────

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- RELATÓRIO DE CORREÇÕES
-- ============================================================
--
-- Coluna errada (v1)   → Coluna correta (v2)
-- ─────────────────────────────────────────
-- op.user_id           → op.client_id = c.id
-- op.objective         → op.objective_primary
-- op.updated_at        → removida (coluna não existe)
-- p.deleted_at         → removida do WHERE (coluna não existe)
--
-- Colunas NOVAS adicionadas em profiles (com IF NOT EXISTS):
--   source, lead_status, converted_at, lead_notes
--
-- ─────────────────────────────────────────
-- ORDEM DE EXECUÇÃO:
--   1. SQL 29 (notificações) — pode rodar antes ou depois
--   2. SQL 31 (este arquivo)
--
-- COMO TESTAR NO PAINEL:
--   1. Acessar Supabase → SQL Editor → rodar:
--      SELECT * FROM admin_signups_view LIMIT 10;
--   2. No frontend (admin), usar:
--      supabase.rpc('get_admin_signups', { p_limit: 50, p_offset: 0 })
--   3. Para atualizar status:
--      supabase.rpc('admin_update_lead_status', {
--        p_profile_id: '<uuid>',
--        p_lead_status: 'convertido',
--        p_notes: 'Fechou contrato em junho/2026'
--      })
--
-- STATUS DISPONÍVEIS:
--   novo_cadastro | onboarding_iniciado | diagnostico_concluido
--   convertido | sem_acao | arquivado
-- ============================================================
