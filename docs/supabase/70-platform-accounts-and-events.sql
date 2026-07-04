-- ============================================================
-- SQL 70 — Platform Accounts & Events
-- Execução: Supabase SQL Editor (manual)
-- Propósito: Rastrear cadastros, tipos de conta, eventos,
--            notas administrativas e status de bloqueio.
-- Defensivo/idempotente: usa IF NOT EXISTS e ON CONFLICT.
-- ============================================================

-- ── 1. Adicionar account_status em profiles (se não existir) ──
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status text DEFAULT 'active'
  CHECK (account_status IN ('active', 'trialing', 'beta_free', 'suspended', 'blocked', 'pending_setup'));

CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles(account_status);

-- ── 2. Tabela platform_account_events ─────────────────────────
CREATE TABLE IF NOT EXISTS public.platform_account_events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id    uuid        REFERENCES public.clients(id) ON DELETE SET NULL,
  agency_id    uuid        REFERENCES public.agency_workspaces(id) ON DELETE SET NULL,
  event_type   text        NOT NULL,
  account_type text        NULL,
  metadata     jsonb       NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Valores esperados para event_type:
-- signup_started | signup_completed | onboarding_completed | plan_selected
-- coupon_entered | trial_started | account_blocked | account_unblocked
-- account_suspended | account_reactivated | login

CREATE INDEX IF NOT EXISTS idx_platform_events_user    ON public.platform_account_events(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_events_type    ON public.platform_account_events(event_type);
CREATE INDEX IF NOT EXISTS idx_platform_events_created ON public.platform_account_events(created_at DESC);

-- ── 3. Tabela platform_admin_notes ────────────────────────────
CREATE TABLE IF NOT EXISTS public.platform_admin_notes (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id   uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  target_client_id uuid        REFERENCES public.clients(id) ON DELETE SET NULL,
  target_agency_id uuid        REFERENCES public.agency_workspaces(id) ON DELETE SET NULL,
  note             text        NOT NULL,
  created_by       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_notes_target_user ON public.platform_admin_notes(target_user_id);

-- ── 4. Tabela platform_notifications (interno, super_admin) ───
CREATE TABLE IF NOT EXISTS public.platform_notifications (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  type         text        NOT NULL,
  title        text        NOT NULL,
  body         text        NULL,
  user_id      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  read         boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Valores esperados para type:
-- new_signup | new_agency_signup | new_business_signup | account_blocked | account_reactivated

CREATE INDEX IF NOT EXISTS idx_platform_notif_read    ON public.platform_notifications(read);
CREATE INDEX IF NOT EXISTS idx_platform_notif_created ON public.platform_notifications(created_at DESC);

-- ── 5. RLS — platform_account_events ─────────────────────────
ALTER TABLE public.platform_account_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_super_admin_all" ON public.platform_account_events;
DROP POLICY IF EXISTS "events_user_own"        ON public.platform_account_events;

CREATE POLICY "events_super_admin_all"
  ON public.platform_account_events FOR ALL
  USING (public.current_user_role() IN ('super_admin', 'admin'));

CREATE POLICY "events_user_own"
  ON public.platform_account_events FOR SELECT
  USING (user_id = auth.uid());

-- ── 6. RLS — platform_admin_notes ────────────────────────────
ALTER TABLE public.platform_admin_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notes_super_admin_all" ON public.platform_admin_notes;

CREATE POLICY "notes_super_admin_all"
  ON public.platform_admin_notes FOR ALL
  USING (public.current_user_role() IN ('super_admin', 'admin'));

-- ── 7. RLS — platform_notifications ──────────────────────────
ALTER TABLE public.platform_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_super_admin_all" ON public.platform_notifications;

CREATE POLICY "notif_super_admin_all"
  ON public.platform_notifications FOR ALL
  USING (public.current_user_role() IN ('super_admin', 'admin'));

-- ── 8. View v_platform_accounts_overview ─────────────────────
CREATE OR REPLACE VIEW public.v_platform_accounts_overview AS
SELECT
  p.id                                      AS user_id,
  p.email,
  p.name,
  p.role,
  p.account_type,
  p.account_status,
  p.created_at,
  c.company_name,
  c.segment,
  aw.name                                   AS agency_name,
  cs.plan_slug,
  cs.status                                 AS subscription_status,
  cs.trial_end_at,
  cr.code                                   AS coupon_code
FROM public.profiles p
LEFT JOIN public.clients c
  ON c.owner_id = p.id AND c.deleted_at IS NULL
LEFT JOIN public.agency_workspaces aw
  ON aw.owner_user_id = p.id
LEFT JOIN public.client_subscriptions cs
  ON cs.client_id = c.id
LEFT JOIN public.coupon_redemptions cred
  ON cred.user_id = p.id
LEFT JOIN public.billing_coupons cr
  ON cr.id = cred.coupon_id;

-- Nota: a view pode retornar múltiplas linhas por usuário se houver
-- mais de um client/subscription/redemption. Use DISTINCT em queries.

-- ── 9. Comentários ────────────────────────────────────────────
COMMENT ON TABLE  public.platform_account_events   IS 'Rastreia eventos de ciclo de vida de contas (signup, onboarding, bloqueio, etc.)';
COMMENT ON TABLE  public.platform_admin_notes      IS 'Notas internas do super_admin sobre usuários/clientes/agências';
COMMENT ON TABLE  public.platform_notifications    IS 'Notificações internas para super_admin (novos cadastros, bloqueios, etc.)';
COMMENT ON COLUMN public.profiles.account_status   IS 'Status administrativo: active | trialing | beta_free | suspended | blocked | pending_setup';
