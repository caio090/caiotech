-- ============================================================
-- 40-png-vidigal-assets-and-ai-credits.sql
-- PNG Vidigal: ativos visuais do cliente, perfil visual,
-- carteira de créditos de IA, ledger e histórico de geração.
--
-- Rodar no Supabase SQL Editor APÓS os SQLs 01–39.
-- Idempotente: seguro rodar mais de uma vez.
--
-- SCHEMA REAL:
--   - public.profiles  (id, role, ...)
--   - public.profile_roles (user_id, role, ...)
--   - public.clients   (id, owner_id, ...)
--   - NÃO existe public.client_access (não referenciar)
--
-- ACESSO:
--   - Admin / super_admin  → acesso total
--   - Staff operacional    → acesso total (gerenciam os clientes)
--   - Cliente              → acessa apenas dados do próprio client_id
--                            via clients.owner_id = auth.uid()
-- ============================================================

-- ── 0. Funções helper de acesso ──────────────────────────────
-- Criadas aqui pois podem não existir ainda.
-- SECURITY DEFINER + search_path fixo = seguro contra privilege escalation.

-- Retorna true se o usuário logado for admin ou super_admin
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
  );
$$;

-- Retorna true se o usuário logado for staff operacional
CREATE OR REPLACE FUNCTION public.is_operational_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN (
        'operacional', 'social_media', 'designer', 'editor',
        'videomaker', 'gestor_trafego', 'financeiro', 'comercial',
        'sdr', 'closer'
      )
  )
  OR EXISTS (
    SELECT 1 FROM public.profile_roles
    WHERE user_id = auth.uid()
      AND role IN (
        'operacional', 'social_media', 'designer', 'editor',
        'videomaker', 'gestor_trafego', 'financeiro', 'comercial',
        'sdr', 'closer'
      )
  );
$$;

-- Retorna true se o usuário logado puder acessar um client_id específico.
-- Regra: admin/super_admin vê tudo.
--        Cliente vê apenas se for o owner_id do client.
--        Staff operacional vê (tratado separadamente nas policies).
CREATE OR REPLACE FUNCTION public.can_access_client(target_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- admin/super_admin acessa tudo
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
    OR
    -- cliente acessa apenas o próprio registro
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE id = target_client_id
        AND owner_id = auth.uid()
    );
$$;

-- ── 1. Ativos visuais do cliente ─────────────────────────────

CREATE TABLE IF NOT EXISTS public.client_visual_assets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  asset_type    text NOT NULL,
  -- logo | person | product | reference | campaign | background
  -- brand_asset | video_reference | carousel_reference | print_reference
  asset_name    text NOT NULL,
  file_url      text,           -- URL pública ou assinada
  storage_path  text,           -- caminho no Supabase Storage
  source        text DEFAULT 'upload', -- upload | url | google_drive | generated
  tags          text[],
  is_global     boolean DEFAULT true,   -- herdado por todos os fluxos do cliente
  is_primary    boolean DEFAULT false,  -- ativo principal desse tipo
  metadata      jsonb,          -- campos extras (dimensões, cor dominante, etc.)
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_visual_assets_client_id  ON public.client_visual_assets(client_id);
CREATE INDEX IF NOT EXISTS idx_client_visual_assets_asset_type ON public.client_visual_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_client_visual_assets_is_global  ON public.client_visual_assets(is_global);

ALTER TABLE public.client_visual_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "visual_assets: admin full access"        ON public.client_visual_assets;
DROP POLICY IF EXISTS "visual_assets: staff full access"        ON public.client_visual_assets;
DROP POLICY IF EXISTS "visual_assets: client reads own"         ON public.client_visual_assets;
DROP POLICY IF EXISTS "visual_assets: staff access own clients" ON public.client_visual_assets;

CREATE POLICY "visual_assets: admin full access"
  ON public.client_visual_assets
  FOR ALL TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE POLICY "visual_assets: staff full access"
  ON public.client_visual_assets
  FOR ALL TO authenticated
  USING (public.is_operational_staff())
  WITH CHECK (public.is_operational_staff());

CREATE POLICY "visual_assets: client reads own"
  ON public.client_visual_assets
  FOR SELECT TO authenticated
  USING (public.can_access_client(client_id));

-- ── 2. Perfil visual do cliente ──────────────────────────────

CREATE TABLE IF NOT EXISTS public.client_visual_profiles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           uuid NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
  main_subject_type   text,
  -- logo | product | person | person_product | person_environment | product_environment
  visual_style        text,
  -- fotorrealista | minimalista | colorido | dark | editorial | flat_design
  color_palette       jsonb,  -- { primary, secondary, accent, background }
  typography          jsonb,  -- { heading, body, accent }
  preferred_formats   jsonb,  -- ["feed_1x1", "stories_9x16", "reels_9x16"]
  banned_elements     jsonb,  -- elementos que não devem aparecer
  notes               text,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

ALTER TABLE public.client_visual_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "visual_profiles: admin full access" ON public.client_visual_profiles;
DROP POLICY IF EXISTS "visual_profiles: staff full access" ON public.client_visual_profiles;
DROP POLICY IF EXISTS "visual_profiles: client reads own"  ON public.client_visual_profiles;
DROP POLICY IF EXISTS "visual_profiles: staff select"      ON public.client_visual_profiles;

CREATE POLICY "visual_profiles: admin full access"
  ON public.client_visual_profiles
  FOR ALL TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE POLICY "visual_profiles: staff full access"
  ON public.client_visual_profiles
  FOR ALL TO authenticated
  USING (public.is_operational_staff())
  WITH CHECK (public.is_operational_staff());

CREATE POLICY "visual_profiles: client reads own"
  ON public.client_visual_profiles
  FOR SELECT TO authenticated
  USING (public.can_access_client(client_id));

-- ── 3. Carteira de créditos de IA ────────────────────────────

CREATE TABLE IF NOT EXISTS public.ai_credit_wallet (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id            uuid NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
  agency_id            uuid,           -- nullable, sem FK por enquanto
  plan_key             text NOT NULL DEFAULT 'basic',  -- basic | pro | agency
  monthly_quota        int  NOT NULL DEFAULT 50,
  extra_credits        int  NOT NULL DEFAULT 0,
  used_credits         int  NOT NULL DEFAULT 0,
  remaining_credits    int  GENERATED ALWAYS AS (monthly_quota + extra_credits - used_credits) STORED,
  reset_day            int  NOT NULL DEFAULT 1,
  current_period_start timestamptz,
  current_period_end   timestamptz,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_credit_wallet_client_id ON public.ai_credit_wallet(client_id);

ALTER TABLE public.ai_credit_wallet ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_credit_wallet: admin full access"  ON public.ai_credit_wallet;
DROP POLICY IF EXISTS "ai_credit_wallet: staff full access"  ON public.ai_credit_wallet;
DROP POLICY IF EXISTS "ai_credit_wallet: client select own"  ON public.ai_credit_wallet;

CREATE POLICY "ai_credit_wallet: admin full access"
  ON public.ai_credit_wallet
  FOR ALL TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE POLICY "ai_credit_wallet: staff full access"
  ON public.ai_credit_wallet
  FOR ALL TO authenticated
  USING (public.is_operational_staff())
  WITH CHECK (public.is_operational_staff());

CREATE POLICY "ai_credit_wallet: client select own"
  ON public.ai_credit_wallet
  FOR SELECT TO authenticated
  USING (public.can_access_client(client_id));

-- ── 4. Ledger de movimentação de créditos ────────────────────

CREATE TABLE IF NOT EXISTS public.ai_credit_ledger (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id     uuid NOT NULL REFERENCES public.ai_credit_wallet(id) ON DELETE CASCADE,
  client_id     uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  amount        int  NOT NULL,
  -- positivo = entrada, negativo = débito
  movement_type text NOT NULL,
  -- monthly_grant | generation_debit | extra_purchase
  -- manual_adjustment | refund | failed_generation_refund
  source        text,   -- png_vidigal | manual | system
  description   text,
  metadata      jsonb,
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_credit_ledger_wallet_id ON public.ai_credit_ledger(wallet_id);
CREATE INDEX IF NOT EXISTS idx_ai_credit_ledger_client_id ON public.ai_credit_ledger(client_id);
CREATE INDEX IF NOT EXISTS idx_ai_credit_ledger_movement  ON public.ai_credit_ledger(movement_type);

ALTER TABLE public.ai_credit_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_credit_ledger: admin full access" ON public.ai_credit_ledger;
DROP POLICY IF EXISTS "ai_credit_ledger: staff full access" ON public.ai_credit_ledger;
DROP POLICY IF EXISTS "ai_credit_ledger: client select own" ON public.ai_credit_ledger;

CREATE POLICY "ai_credit_ledger: admin full access"
  ON public.ai_credit_ledger
  FOR ALL TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE POLICY "ai_credit_ledger: staff full access"
  ON public.ai_credit_ledger
  FOR ALL TO authenticated
  USING (public.is_operational_staff())
  WITH CHECK (public.is_operational_staff());

CREATE POLICY "ai_credit_ledger: client select own"
  ON public.ai_credit_ledger
  FOR SELECT TO authenticated
  USING (public.can_access_client(client_id));

-- ── 5. Histórico de geração de imagens ───────────────────────

CREATE TABLE IF NOT EXISTS public.ai_generation_jobs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id               uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  campaign_id           uuid,   -- nullable, sem FK por enquanto
  content_item_id       uuid REFERENCES public.content_items(id) ON DELETE SET NULL,
  provider              text NOT NULL DEFAULT 'google-gemini',
  -- google-gemini | openai-images
  model                 text,
  mode                  text NOT NULL,
  -- image_simple_1x | image_with_reference
  -- image_with_person_or_product | batch_4_variations
  prompt                text,       -- prompt escrito pelo usuário
  final_prompt          text,       -- prompt final enviado ao provider
  input_assets          jsonb,      -- ativos usados { logo, person, product, reference }
  output_assets         jsonb,      -- imagens geradas { url, width, height }
  resolution            text,
  aspect_ratio          text,
  output_count          int DEFAULT 1,
  estimated_provider_cost numeric(10,6),
  -- custo em USD — interno, nunca mostrar ao cliente
  credits_used          int DEFAULT 0,
  status                text NOT NULL DEFAULT 'draft',
  -- draft | queued | running | completed | failed | cancelled
  error_message         text,
  created_at            timestamptz DEFAULT now(),
  completed_at          timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ai_gen_jobs_client_id  ON public.ai_generation_jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_ai_gen_jobs_status     ON public.ai_generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ai_gen_jobs_created_at ON public.ai_generation_jobs(created_at DESC);

ALTER TABLE public.ai_generation_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_gen_jobs: admin full access"  ON public.ai_generation_jobs;
DROP POLICY IF EXISTS "ai_gen_jobs: staff full access"  ON public.ai_generation_jobs;
DROP POLICY IF EXISTS "ai_gen_jobs: client select own"  ON public.ai_generation_jobs;

CREATE POLICY "ai_gen_jobs: admin full access"
  ON public.ai_generation_jobs
  FOR ALL TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE POLICY "ai_gen_jobs: staff full access"
  ON public.ai_generation_jobs
  FOR ALL TO authenticated
  USING (public.is_operational_staff())
  WITH CHECK (public.is_operational_staff());

CREATE POLICY "ai_gen_jobs: client select own"
  ON public.ai_generation_jobs
  FOR SELECT TO authenticated
  USING (public.can_access_client(client_id));

-- Notificar PostgREST do schema update
NOTIFY pgrst, 'reload schema';
