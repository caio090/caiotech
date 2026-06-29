-- ============================================================
-- LOKAT OS — SQL 49: Diagnóstico de Marketing Local (público)
-- Execute no Supabase SQL Editor.
-- Safe to re-run: IF NOT EXISTS em tudo.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.marketing_diagnostics (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  full_name           TEXT NOT NULL,
  company_name        TEXT NOT NULL,
  instagram           TEXT,
  whatsapp            TEXT NOT NULL,
  best_contact_time   TEXT,
  business_type       TEXT NOT NULL,
  marketing_responsible TEXT,
  main_problem        TEXT NOT NULL,
  lead_score          INTEGER DEFAULT 0,
  lead_temperature    TEXT,
  offer_suggestion    TEXT,
  advice              TEXT,
  status              TEXT NOT NULL DEFAULT 'new',
  source              TEXT NOT NULL DEFAULT 'diagnostico-marketing',
  utm_source          TEXT,
  utm_medium          TEXT,
  utm_campaign        TEXT,
  raw_payload         JSONB,
  commercial_lead_id  UUID REFERENCES public.commercial_leads(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_mktdiag_created_at    ON public.marketing_diagnostics (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mktdiag_temperature   ON public.marketing_diagnostics (lead_temperature);
CREATE INDEX IF NOT EXISTS idx_mktdiag_status        ON public.marketing_diagnostics (status);
CREATE INDEX IF NOT EXISTS idx_mktdiag_whatsapp      ON public.marketing_diagnostics (whatsapp);
CREATE INDEX IF NOT EXISTS idx_mktdiag_company       ON public.marketing_diagnostics (company_name);

ALTER TABLE public.marketing_diagnostics ENABLE ROW LEVEL SECURITY;

-- Anônimo pode inserir (funil público), não pode ler
DROP POLICY IF EXISTS "mktdiag_public_insert" ON public.marketing_diagnostics;
CREATE POLICY "mktdiag_public_insert" ON public.marketing_diagnostics
  FOR INSERT WITH CHECK (true);

-- Admin e equipe podem ler e atualizar status
DROP POLICY IF EXISTS "mktdiag_admin_select" ON public.marketing_diagnostics;
CREATE POLICY "mktdiag_admin_select" ON public.marketing_diagnostics
  FOR SELECT USING (
    public.current_user_role() IN ('super_admin', 'admin', 'operacional', 'financeiro')
  );

DROP POLICY IF EXISTS "mktdiag_admin_update" ON public.marketing_diagnostics;
CREATE POLICY "mktdiag_admin_update" ON public.marketing_diagnostics
  FOR UPDATE USING (
    public.current_user_role() IN ('super_admin', 'admin', 'operacional')
  );
