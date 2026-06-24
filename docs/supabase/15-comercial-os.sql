-- ============================================================
-- LOKAT OS — SQL 15: ComercialOS
-- File: docs/supabase/15-comercial-os.sql
--
-- Tabelas para o módulo comercial interno.
-- Safe to re-run: IF NOT EXISTS em tudo.
-- ============================================================

-- ── 1. Leads comerciais ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.commercial_leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name    TEXT NOT NULL,
  contact_name    TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,
  origin          TEXT,         -- ex: indicação, instagram, cold outreach
  interest        TEXT,         -- ex: gestão de redes, tráfego, branding
  pipeline_stage  TEXT NOT NULL DEFAULT 'novo_lead',
  -- novo_lead | pre_qualificacao | contato_feito | reuniao_agendada |
  -- diagnostico_realizado | proposta_enviada | negociacao |
  -- fechado | perdido | onboarding
  responsible_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  next_action     TEXT,
  next_action_at  TIMESTAMPTZ,
  notes           TEXT,
  lost_reason     TEXT,
  converted_at    TIMESTAMPTZ,   -- quando virou cliente
  client_id       UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. Atividades comerciais ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.commercial_activities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES public.commercial_leads(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type        TEXT NOT NULL,   -- ligacao | whatsapp | email | reuniao | proposta | nota | outro
  description TEXT,
  happened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 3. Reuniões ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.commercial_meetings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      UUID REFERENCES public.commercial_leads(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_min INT DEFAULT 60,
  meet_link    TEXT,
  status       TEXT NOT NULL DEFAULT 'agendada',
  -- agendada | realizada | cancelada | reagendada
  responsible_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes        TEXT,
  created_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 4. Propostas ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.commercial_proposals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       UUID REFERENCES public.commercial_leads(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  value         NUMERIC(12, 2),
  recurrence    TEXT,           -- mensal | trimestral | anual | único
  services      TEXT[],         -- ex: ['gestão_redes', 'trafego']
  status        TEXT NOT NULL DEFAULT 'rascunho',
  -- rascunho | enviada | visualizada | aceita | recusada | expirada
  valid_until   DATE,
  sent_at       TIMESTAMPTZ,
  responded_at  TIMESTAMPTZ,
  notes         TEXT,
  created_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 5. Índices ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_commercial_leads_stage
  ON public.commercial_leads(pipeline_stage);

CREATE INDEX IF NOT EXISTS idx_commercial_leads_responsible
  ON public.commercial_leads(responsible_id);

CREATE INDEX IF NOT EXISTS idx_commercial_leads_created_at
  ON public.commercial_leads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_commercial_activities_lead
  ON public.commercial_activities(lead_id, happened_at DESC);

CREATE INDEX IF NOT EXISTS idx_commercial_meetings_scheduled
  ON public.commercial_meetings(scheduled_at)
  WHERE status = 'agendada';

CREATE INDEX IF NOT EXISTS idx_commercial_proposals_lead
  ON public.commercial_proposals(lead_id);

-- ── 6. RLS ────────────────────────────────────────────────────

ALTER TABLE public.commercial_leads       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_activities  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_meetings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_proposals   ENABLE ROW LEVEL SECURITY;

-- Helper: verifica se o usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Helper: verifica se o usuário tem role comercial (primary OU extra)
CREATE OR REPLACE FUNCTION public.has_comercial_role()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('comercial', 'sdr', 'closer')
  )
  OR EXISTS (
    SELECT 1 FROM public.profile_roles
    WHERE user_id = auth.uid() AND role IN ('comercial', 'sdr', 'closer')
  );
$$;

-- commercial_leads
DROP POLICY IF EXISTS "admin_all_leads" ON public.commercial_leads;
CREATE POLICY "admin_all_leads" ON public.commercial_leads
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "comercial_own_leads" ON public.commercial_leads;
CREATE POLICY "comercial_own_leads" ON public.commercial_leads
  FOR ALL TO authenticated
  USING (
    public.has_comercial_role()
    AND (responsible_id = auth.uid() OR created_by = auth.uid())
  )
  WITH CHECK (
    public.has_comercial_role()
  );

-- commercial_activities
DROP POLICY IF EXISTS "admin_all_activities" ON public.commercial_activities;
CREATE POLICY "admin_all_activities" ON public.commercial_activities
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "comercial_own_activities" ON public.commercial_activities;
CREATE POLICY "comercial_own_activities" ON public.commercial_activities
  FOR ALL TO authenticated
  USING (
    public.has_comercial_role()
    AND user_id = auth.uid()
  )
  WITH CHECK (public.has_comercial_role());

-- commercial_meetings
DROP POLICY IF EXISTS "admin_all_meetings" ON public.commercial_meetings;
CREATE POLICY "admin_all_meetings" ON public.commercial_meetings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "comercial_own_meetings" ON public.commercial_meetings;
CREATE POLICY "comercial_own_meetings" ON public.commercial_meetings
  FOR ALL TO authenticated
  USING (
    public.has_comercial_role()
    AND (responsible_id = auth.uid() OR created_by = auth.uid())
  )
  WITH CHECK (public.has_comercial_role());

-- commercial_proposals
DROP POLICY IF EXISTS "admin_all_proposals" ON public.commercial_proposals;
CREATE POLICY "admin_all_proposals" ON public.commercial_proposals
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "comercial_own_proposals" ON public.commercial_proposals;
CREATE POLICY "comercial_own_proposals" ON public.commercial_proposals
  FOR ALL TO authenticated
  USING (
    public.has_comercial_role()
    AND created_by = auth.uid()
  )
  WITH CHECK (public.has_comercial_role());

-- ── 7. Notificar PostgREST ────────────────────────────────────

NOTIFY pgrst, 'reload schema';
