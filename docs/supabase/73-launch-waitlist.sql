-- ============================================================
-- SQL 73 — Launch Waitlist
-- Tabela para inscrições de pré-acesso beta da Lokat OS.
-- Idempotente: IF NOT EXISTS em tudo.
-- ============================================================

-- ── 1. Tabela principal ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.launch_waitlist (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text        NOT NULL,
  email           text        NOT NULL,
  phone           text        NULL,
  account_type    text        NOT NULL DEFAULT 'interested'
    CHECK (account_type IN ('agency', 'business', 'professional', 'interested')),
  city            text        NULL,
  segment         text        NULL,
  interest        text        NULL,
  social_or_site  text        NULL,
  source          text        NULL,
  utm_source      text        NULL,
  utm_medium      text        NULL,
  utm_campaign    text        NULL,
  status          text        NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'invited', 'accepted', 'rejected', 'archived')),
  beta_months_granted integer NOT NULL DEFAULT 0,
  notes           text        NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 2. Índices ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_waitlist_email      ON public.launch_waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_status     ON public.launch_waitlist(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_created    ON public.launch_waitlist(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waitlist_acct_type  ON public.launch_waitlist(account_type);

-- ── 3. RLS ────────────────────────────────────────────────────
ALTER TABLE public.launch_waitlist ENABLE ROW LEVEL SECURITY;

-- Apenas super_admin e admin podem SELECT/UPDATE/DELETE
DROP POLICY IF EXISTS "waitlist_admin_all"   ON public.launch_waitlist;
CREATE POLICY "waitlist_admin_all"
  ON public.launch_waitlist FOR ALL
  USING (public.current_user_role() IN ('super_admin', 'admin'));

-- Insert público controlado (a API valida campos antes de inserir)
DROP POLICY IF EXISTS "waitlist_public_insert" ON public.launch_waitlist;
CREATE POLICY "waitlist_public_insert"
  ON public.launch_waitlist FOR INSERT
  WITH CHECK (true);

-- ── 4. Trigger de updated_at ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_waitlist_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_waitlist_updated_at ON public.launch_waitlist;
CREATE TRIGGER trg_waitlist_updated_at
  BEFORE UPDATE ON public.launch_waitlist
  FOR EACH ROW EXECUTE FUNCTION public.set_waitlist_updated_at();

-- ============================================================
-- COMO RODAR
-- 1. Abra uma NOVA query no Supabase SQL Editor (aba nova!).
-- 2. Cole este arquivo inteiro.
-- 3. Clique em "Run".
-- 4. Resultado esperado: "Success. No rows returned."
-- ============================================================
