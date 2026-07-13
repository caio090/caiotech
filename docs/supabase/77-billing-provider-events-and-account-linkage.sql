-- ============================================================
-- 77 · Billing: eventos de provider, linkage conta-assinatura
--     e campos expandidos de pagamento
--
-- NÃO EXECUTAR AUTOMATICAMENTE.
-- Rodar manualmente no Supabase SQL Editor após revisão.
-- Execução segura após SQL 68.
--
-- Justificativa:
--   - client_subscriptions atual usa client_id → obriga assinatura
--     por cliente local. Precisamos suportar assinatura por conta
--     de plataforma (agência, empresário, autônomo) sem criar
--     cliente local automático.
--   - billing_payments atual não tem campos de taxas e conciliação.
--   - Falta tabela de eventos brutos de webhook (idempotência).
--   - Falta tabela de customers de provider.
-- ============================================================

-- ── 1. billing_provider_customers ────────────────────────────
-- Mapeia conta da plataforma (profile) para customer no gateway.
-- Separada de clients — uma conta pode existir sem cliente local.

CREATE TABLE IF NOT EXISTS public.billing_provider_customers (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id            uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider              text        NOT NULL, -- 'asaas' | 'stripe_future' | 'manual'
  provider_customer_id  text        NOT NULL,
  environment           text        NOT NULL DEFAULT 'sandbox'
                                    CHECK (environment IN ('sandbox','production')),
  status                text        NOT NULL DEFAULT 'active'
                                    CHECK (status IN ('active','deleted')),
  metadata              jsonb       NOT NULL DEFAULT '{}',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_customer_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_customers_profile ON public.billing_provider_customers (profile_id);
CREATE INDEX IF NOT EXISTS idx_billing_customers_provider ON public.billing_provider_customers (provider, provider_customer_id);

ALTER TABLE public.billing_provider_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage provider customers"
  ON public.billing_provider_customers FOR ALL
  USING (public.current_user_role() IN ('super_admin','admin'))
  WITH CHECK (public.current_user_role() IN ('super_admin','admin'));

COMMENT ON TABLE public.billing_provider_customers IS
  'Mapeia profiles (contas da plataforma) para customers no gateway. '
  'Separa identidade da plataforma do cliente local (clients).';


-- ── 2. account_subscriptions ─────────────────────────────────
-- Assinaturas vinculadas à conta da plataforma (profile_id),
-- não ao cliente local (client_id).
-- Mantém compatibilidade com client_subscriptions existente.

CREATE TABLE IF NOT EXISTS public.account_subscriptions (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id              uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_slug               text        NOT NULL,
  status                  text        NOT NULL DEFAULT 'trialing'
                                      CHECK (status IN (
                                        'trialing','incomplete','active','past_due',
                                        'unpaid','paused','canceled','expired','beta_free'
                                      )),
  billing_mode            text        NOT NULL DEFAULT 'manual'
                                      CHECK (billing_mode IN (
                                        'card_recurring','pix_automatic','pix_one_time',
                                        'boleto','manual_pix','manual_invoice',
                                        'coupon_free','beta_free'
                                      )),
  trial_start_at          timestamptz,
  trial_end_at            timestamptz,
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  grace_period_end_at     timestamptz,
  amount_monthly          numeric(10,2),
  amount_yearly           numeric(10,2),
  currency                text        NOT NULL DEFAULT 'BRL',
  coupon_id               uuid        REFERENCES public.billing_coupons(id),
  provider_customer_id    text        NULL, -- ref a billing_provider_customers
  provider_subscription_id text       NULL, -- ID no gateway
  metadata                jsonb       NOT NULL DEFAULT '{}',
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_subs_profile ON public.account_subscriptions (profile_id);
CREATE INDEX IF NOT EXISTS idx_account_subs_status  ON public.account_subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_account_subs_plan    ON public.account_subscriptions (plan_slug);

ALTER TABLE public.account_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage account subscriptions"
  ON public.account_subscriptions FOR ALL
  USING (public.current_user_role() IN ('super_admin','admin'))
  WITH CHECK (public.current_user_role() IN ('super_admin','admin'));
CREATE POLICY "own account subscription select"
  ON public.account_subscriptions FOR SELECT
  USING (profile_id = auth.uid());

COMMENT ON TABLE public.account_subscriptions IS
  'Assinaturas por conta da plataforma (profile_id). '
  'Separada de client_subscriptions que vincula por cliente local. '
  'Uma agência tem uma account_subscription e vários clients.';


-- ── 3. billing_provider_events ────────────────────────────────
-- Registra eventos brutos de webhook antes de processar.
-- Garante idempotência — evento não é processado duas vezes.

CREATE TABLE IF NOT EXISTS public.billing_provider_events (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key  text        NOT NULL UNIQUE,
  provider         text        NOT NULL,
  event_type       text        NOT NULL,
  raw_payload      jsonb       NOT NULL DEFAULT '{}',
  customer_id      text        NULL,
  subscription_id  text        NULL,
  payment_id       text        NULL,
  processed        boolean     NOT NULL DEFAULT false,
  processed_at     timestamptz NULL,
  error_message    text        NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_provider     ON public.billing_provider_events (provider);
CREATE INDEX IF NOT EXISTS idx_billing_events_event_type   ON public.billing_provider_events (event_type);
CREATE INDEX IF NOT EXISTS idx_billing_events_processed    ON public.billing_provider_events (processed);
CREATE INDEX IF NOT EXISTS idx_billing_events_created_at   ON public.billing_provider_events (created_at DESC);

ALTER TABLE public.billing_provider_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read billing events"
  ON public.billing_provider_events FOR SELECT
  USING (public.current_user_role() IN ('super_admin','admin'));

COMMENT ON TABLE public.billing_provider_events IS
  'Eventos brutos de webhook do gateway. idempotency_key garante que '
  'o mesmo evento não seja processado duas vezes mesmo com retentativas.';


-- ── 4. Expandir billing_payments com campos de taxas ─────────
-- Adiciona campos necessários para conciliação e receita líquida.
-- ALTER TABLE seguro com IF NOT EXISTS em cada coluna.

ALTER TABLE public.billing_payments
  ADD COLUMN IF NOT EXISTS profile_id            uuid        NULL REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS provider              text        NULL,
  ADD COLUMN IF NOT EXISTS provider_payment_id   text        NULL,
  ADD COLUMN IF NOT EXISTS gross_amount          numeric(10,2) NULL, -- alias de amount para clareza
  ADD COLUMN IF NOT EXISTS gateway_fee           numeric(10,2) NULL,
  ADD COLUMN IF NOT EXISTS interest_amount       numeric(10,2) NULL,
  ADD COLUMN IF NOT EXISTS net_amount            numeric(10,2) NULL,
  ADD COLUMN IF NOT EXISTS installments          integer     NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS due_date_expanded     date        NULL, -- renomeia conflito com due_date
  ADD COLUMN IF NOT EXISTS settlement_date       date        NULL,
  ADD COLUMN IF NOT EXISTS refunded_at           timestamptz NULL,
  ADD COLUMN IF NOT EXISTS chargeback_at         timestamptz NULL,
  ADD COLUMN IF NOT EXISTS invoice_url           text        NULL;

CREATE INDEX IF NOT EXISTS idx_billing_payments_provider    ON public.billing_payments (provider)
  WHERE provider IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_billing_payments_profile     ON public.billing_payments (profile_id)
  WHERE profile_id IS NOT NULL;

COMMENT ON COLUMN public.billing_payments.gateway_fee IS
  'Taxa cobrada pelo gateway. Não inventar — vem do provider ou conciliação.';
COMMENT ON COLUMN public.billing_payments.net_amount IS
  'Receita líquida = gross_amount - gateway_fee - interest_amount.';


-- ── 5. billing_plan_prices (versionamento de preço) ──────────
-- Histórico de preços para auditar quando um plano foi atualizado.
-- Assinantes antigos mantêm amount_monthly contratado.

CREATE TABLE IF NOT EXISTS public.billing_plan_prices (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_slug      text        NOT NULL,
  price_monthly  numeric(10,2) NOT NULL,
  price_yearly   numeric(10,2) NULL,
  currency       text        NOT NULL DEFAULT 'BRL',
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to   timestamptz NULL, -- NULL = preço atual
  created_by     uuid        NULL REFERENCES auth.users(id),
  note           text        NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_prices_slug ON public.billing_plan_prices (plan_slug);
CREATE INDEX IF NOT EXISTS idx_plan_prices_current ON public.billing_plan_prices (plan_slug, effective_to)
  WHERE effective_to IS NULL;

ALTER TABLE public.billing_plan_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage plan prices"
  ON public.billing_plan_prices FOR ALL
  USING (public.current_user_role() IN ('super_admin','admin'))
  WITH CHECK (public.current_user_role() IN ('super_admin','admin'));

COMMENT ON TABLE public.billing_plan_prices IS
  'Histórico de preços por plano. Mudança no catálogo afeta apenas novas assinaturas. '
  'Assinante antigo mantém amount_monthly da account_subscriptions (valor contratado).';


-- ── 6. Reload schema ──────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ── ROLLBACK (se necessário) ──────────────────────────────────
-- DROP TABLE IF EXISTS public.billing_plan_prices CASCADE;
-- DROP TABLE IF EXISTS public.billing_provider_events CASCADE;
-- DROP TABLE IF EXISTS public.account_subscriptions CASCADE;
-- DROP TABLE IF EXISTS public.billing_provider_customers CASCADE;
-- ALTER TABLE public.billing_payments
--   DROP COLUMN IF EXISTS profile_id,
--   DROP COLUMN IF EXISTS provider,
--   DROP COLUMN IF EXISTS provider_payment_id,
--   DROP COLUMN IF EXISTS gross_amount,
--   DROP COLUMN IF EXISTS gateway_fee,
--   DROP COLUMN IF EXISTS interest_amount,
--   DROP COLUMN IF EXISTS net_amount,
--   DROP COLUMN IF EXISTS installments,
--   DROP COLUMN IF EXISTS settlement_date,
--   DROP COLUMN IF EXISTS refunded_at,
--   DROP COLUMN IF EXISTS chargeback_at,
--   DROP COLUMN IF EXISTS invoice_url;

-- ── Notas ─────────────────────────────────────────────────────
-- 1. account_subscriptions: assinaturas por conta da plataforma.
--    Agência paga uma assinatura; seus clientes locais não geram cobranças individuais.
-- 2. billing_provider_customers: um profile pode ter customers em providers distintos.
-- 3. billing_provider_events: webhook idempotente — não processa dois vezes.
-- 4. billing_payments expandido: gateway_fee e net_amount vêm do provider, não são calculados.
-- 5. billing_plan_prices: muda preço para novos clientes sem afetar assinantes antigos.
-- 6. Sem dados reais neste arquivo.
