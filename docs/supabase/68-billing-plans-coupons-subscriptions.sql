-- ── 68 · Billing: planos, cupons, assinaturas e pagamentos ──────────────────────
-- RODADO MANUALMENTE no Supabase SQL Editor.
-- NÃO contém dados reais de clientes.
-- Valores e planos são genéricos e editáveis.
-- Executar na ordem abaixo (sem pular).

-- ── 1. billing_plans ──────────────────────────────────────────────────────────
create table if not exists public.billing_plans (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  name            text not null,
  description     text,
  price_monthly   numeric(10,2),
  price_yearly    numeric(10,2),
  currency        text not null default 'BRL',
  trial_days      integer not null default 14,
  status          text not null default 'active'
                  check (status in ('active','beta','coming_soon','archived')),
  entitlements    jsonb not null default '[]',
  limits          jsonb not null default '{}',
  metadata        jsonb not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── 2. billing_coupons ────────────────────────────────────────────────────────
create table if not exists public.billing_coupons (
  id                uuid primary key default gen_random_uuid(),
  code              text unique not null,
  description       text,
  discount_type     text not null
                    check (discount_type in ('percent','fixed','free_trial','free_period')),
  discount_value    numeric(10,2),
  duration_type     text not null
                    check (duration_type in ('once','forever','repeating','trial_extension')),
  duration_months   integer,
  max_redemptions   integer,
  redeemed_count    integer not null default 0,
  starts_at         timestamptz,
  expires_at        timestamptz,
  status            text not null default 'active'
                    check (status in ('active','inactive','expired')),
  metadata          jsonb not null default '{}',
  created_by        uuid references auth.users(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── 3. client_subscriptions ───────────────────────────────────────────────────
create table if not exists public.client_subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  client_id             uuid not null references public.clients(id) on delete cascade,
  plan_slug             text not null,
  status                text not null default 'trialing'
                        check (status in ('trialing','active','past_due','canceled','expired','beta_free')),
  trial_start_at        timestamptz,
  trial_end_at          timestamptz,
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  coupon_id             uuid references public.billing_coupons(id),
  billing_mode          text not null default 'manual'
                        check (billing_mode in ('manual_pix','manual_invoice','gateway','coupon_free')),
  amount_monthly        numeric(10,2),
  amount_yearly         numeric(10,2),
  currency              text not null default 'BRL',
  metadata              jsonb not null default '{}',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_client_subs_client   on public.client_subscriptions(client_id);
create index if not exists idx_client_subs_status   on public.client_subscriptions(status);
create index if not exists idx_client_subs_plan     on public.client_subscriptions(plan_slug);

-- ── 4. billing_payments ───────────────────────────────────────────────────────
create table if not exists public.billing_payments (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  subscription_id uuid references public.client_subscriptions(id),
  amount          numeric(10,2) not null,
  currency        text not null default 'BRL',
  status          text not null default 'pending'
                  check (status in ('pending','paid','failed','canceled','refunded')),
  method          text
                  check (method in ('pix_manual','pix_gateway','card','boleto','coupon',null)),
  due_date        date,
  paid_at         timestamptz,
  reference       text,
  receipt_url     text,
  metadata        jsonb not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_billing_payments_client on public.billing_payments(client_id);
create index if not exists idx_billing_payments_status on public.billing_payments(status);

-- ── 5. coupon_redemptions ─────────────────────────────────────────────────────
create table if not exists public.coupon_redemptions (
  id          uuid primary key default gen_random_uuid(),
  coupon_id   uuid not null references public.billing_coupons(id),
  client_id   uuid not null references public.clients(id) on delete cascade,
  user_id     uuid references auth.users(id),
  redeemed_at timestamptz not null default now(),
  metadata    jsonb not null default '{}',
  unique(coupon_id, client_id)
);

-- ── 6. RLS ────────────────────────────────────────────────────────────────────
alter table public.billing_plans          enable row level security;
alter table public.billing_coupons        enable row level security;
alter table public.client_subscriptions   enable row level security;
alter table public.billing_payments       enable row level security;
alter table public.coupon_redemptions     enable row level security;

-- billing_plans: público pode ler planos ativos
create policy "public read active plans"
  on public.billing_plans for select
  using (status in ('active','beta'));

-- billing_plans: super_admin gerencia
create policy "super_admin manage plans"
  on public.billing_plans for all
  using (public.current_user_role() in ('super_admin','admin'))
  with check (public.current_user_role() in ('super_admin','admin'));

-- billing_coupons: super_admin gerencia
create policy "super_admin manage coupons"
  on public.billing_coupons for all
  using (public.current_user_role() in ('super_admin','admin'))
  with check (public.current_user_role() in ('super_admin','admin'));

-- billing_coupons: validar código (select) para usuários autenticados
create policy "auth users validate coupons"
  on public.billing_coupons for select
  using (auth.uid() is not null and status = 'active');

-- client_subscriptions: admin gerencia
create policy "admin manage subscriptions"
  on public.client_subscriptions for all
  using (public.current_user_role() in ('super_admin','admin'))
  with check (public.current_user_role() in ('super_admin','admin'));

-- billing_payments: admin gerencia
create policy "admin manage payments"
  on public.billing_payments for all
  using (public.current_user_role() in ('super_admin','admin'))
  with check (public.current_user_role() in ('super_admin','admin'));

-- coupon_redemptions: admin gerencia
create policy "admin manage redemptions"
  on public.coupon_redemptions for all
  using (public.current_user_role() in ('super_admin','admin'))
  with check (public.current_user_role() in ('super_admin','admin'));

-- ── 7. MRR summary view ───────────────────────────────────────────────────────
create or replace view public.v_billing_mrr_summary as
select
  count(*)                                              as total_subscriptions,
  count(*) filter (where status = 'active')             as active_subscriptions,
  count(*) filter (where status = 'trialing')           as trialing_subscriptions,
  count(*) filter (where status = 'beta_free')          as beta_free_subscriptions,
  count(*) filter (where status = 'past_due')           as overdue_subscriptions,
  coalesce(sum(amount_monthly) filter (where status = 'active'), 0)    as mrr_estimated,
  coalesce(sum(amount_monthly) filter (where status = 'active'), 0)*12 as arr_estimated
from public.client_subscriptions;

-- ── 8. Seed genérico de planos (inativo por padrão) ──────────────────────────
-- Valores editáveis antes de ativar. Status: beta/active.
insert into public.billing_plans (slug, name, description, price_monthly, trial_days, status, entitlements, limits)
values
  ('start',   'Start · Beta',  '1 cliente, fontes manuais, busca IA — beta aberto',       49,  14, 'beta',
   '["dashboard_basic","data_sources_manual","digital_menu","meta_connection","approvals","ai_search","contentos"]',
   '{"max_clients":1,"max_team_members":1}'),
  ('pro',     'Pro',           'Meta Insights, Cardápio Digital, relatórios avançados',   149, 14, 'active',
   '["dashboard_basic","data_sources_manual","digital_menu","meta_connection","meta_insights","approvals","ai_search","contentos","advanced_reports","whatsapp_placeholder"]',
   '{"max_clients":5,"max_team_members":3}'),
  ('agencia', 'Agência',       'Multi-clientes, equipe, CRM e operacional',               349,  7, 'active',
   '["dashboard_basic","data_sources_manual","digital_menu","meta_connection","meta_insights","approvals","ai_search","contentos","commercial_crm","multi_client","team_members","advanced_reports"]',
   '{"max_team_members":null}')
on conflict (slug) do nothing;

-- ── FIM ───────────────────────────────────────────────────────────────────────
-- Próximos passos:
-- 1. Rodar este SQL no Supabase SQL Editor.
-- 2. Verificar view v_billing_mrr_summary.
-- 3. Ajustar preços nas rows de billing_plans conforme decisão comercial.
-- 4. Criar cupons via /admin/super/billing.
