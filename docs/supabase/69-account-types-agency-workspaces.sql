-- ============================================================
-- SQL 69 — Account Types + Agency Workspaces
-- Execução: Supabase SQL Editor (manual)
-- Propósito: Suportar tipos de conta (empresa, agência, invited_client, diagnostic)
--            e espaços de trabalho de agência com limite de clientes por plano.
-- ============================================================

-- ── 1. Adicionar account_type em profiles (se não existir) ────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'empresa'
  CHECK (account_type IN ('empresa', 'agencia', 'invited_client', 'diagnostic_only', 'super_admin'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_type text DEFAULT NULL;

-- Índice para filtros por tipo de conta
CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON public.profiles(account_type);

-- ── 2. Tabela agency_workspaces ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agency_workspaces (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  status          text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'trial', 'suspended', 'canceled')),
  plan_slug       text NOT NULL DEFAULT 'start',
  max_clients     int  NOT NULL DEFAULT 5,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_workspaces_owner ON public.agency_workspaces(owner_user_id);

-- ── 3. Tabela agency_clients (vínculo agência ↔ client) ────────
CREATE TABLE IF NOT EXISTS public.agency_clients (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   uuid NOT NULL REFERENCES public.agency_workspaces(id) ON DELETE CASCADE,
  client_id   uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  status      text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'archived')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_agency_clients_agency ON public.agency_clients(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_clients_client ON public.agency_clients(client_id);

-- ── 4. RLS — agency_workspaces ─────────────────────────────────
ALTER TABLE public.agency_workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_workspaces_owner_all"  ON public.agency_workspaces;
DROP POLICY IF EXISTS "agency_workspaces_super_admin" ON public.agency_workspaces;

CREATE POLICY "agency_workspaces_owner_all"
  ON public.agency_workspaces
  FOR ALL
  USING (owner_user_id = auth.uid());

CREATE POLICY "agency_workspaces_super_admin"
  ON public.agency_workspaces
  FOR ALL
  USING (public.current_user_role() = 'super_admin');

-- ── 5. RLS — agency_clients ────────────────────────────────────
ALTER TABLE public.agency_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_clients_via_workspace"  ON public.agency_clients;
DROP POLICY IF EXISTS "agency_clients_super_admin"    ON public.agency_clients;

CREATE POLICY "agency_clients_via_workspace"
  ON public.agency_clients
  FOR ALL
  USING (
    agency_id IN (
      SELECT id FROM public.agency_workspaces WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "agency_clients_super_admin"
  ON public.agency_clients
  FOR ALL
  USING (public.current_user_role() = 'super_admin');

-- ── 6. Limites padrão por plano ────────────────────────────────
-- Tabela de referência de limites (sem dados de clientes reais)
CREATE TABLE IF NOT EXISTS public.plan_limits (
  plan_slug   text PRIMARY KEY,
  max_clients int NOT NULL DEFAULT 1,
  max_team    int NOT NULL DEFAULT 1
);

INSERT INTO public.plan_limits (plan_slug, max_clients, max_team) VALUES
  ('comunidade', 1, 1),
  ('start',      5, 3),
  ('pro',        15, 10),
  ('agencia',    50, 25)
ON CONFLICT (plan_slug) DO UPDATE SET
  max_clients = EXCLUDED.max_clients,
  max_team    = EXCLUDED.max_team;

-- ── 7. Comentários ─────────────────────────────────────────────
COMMENT ON TABLE  public.agency_workspaces IS 'Espaços de trabalho de agência — um por dono';
COMMENT ON TABLE  public.agency_clients    IS 'Vínculo entre agência e clientes atendidos';
COMMENT ON COLUMN public.profiles.account_type IS 'Tipo de conta: empresa | agencia | invited_client | diagnostic_only | super_admin';
COMMENT ON TABLE  public.plan_limits IS 'Limites padrão por plano (sem dados de clientes reais)';
