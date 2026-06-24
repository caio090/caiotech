-- ============================================================
-- LOKAT OS — Schema Inicial
-- Execute no Supabase SQL Editor (app.supabase.com → SQL Editor)
-- ============================================================

-- ── 1. PROFILES ──────────────────────────────────────────────
-- Criado automaticamente via trigger em auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text,
  email       text,
  phone       text,
  role        text NOT NULL DEFAULT 'cliente'
                   CHECK (role IN (
                     'admin','operacional','social_media','designer',
                     'editor','videomaker','gestor_trafego','financeiro',
                     'cliente','aluno'
                   )),
  avatar_url  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Trigger: cria profile automaticamente após signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'cliente')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 2. CLIENTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clients (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  company_name      text NOT NULL,
  responsible_name  text,
  email             text,
  phone             text,
  instagram         text,
  segment           text,
  city              text,
  plan              text,
  status            text NOT NULL DEFAULT 'onboarding'
                         CHECK (status IN (
                           'aguardando_validacao','onboarding','ativo',
                           'pausado','inadimplente','encerrado'
                         )),
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ── 3. ONBOARDING_PROFILES ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.onboarding_profiles (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             uuid REFERENCES public.clients(id) ON DELETE CASCADE,

  -- Objetivo
  objective_primary     text,
  objective_secondary   text[],

  -- Marca
  brand_name            text,
  country               text,
  state                 text,
  city                  text,
  segment               text,
  description           text,
  products_services     text,
  instagram             text,
  whatsapp              text,
  website               text,

  -- Público
  ideal_customer        text,
  age_range             text,
  audience_location     text,
  pains                 text,
  desires               text,
  objections            text,
  contact_behavior      text,

  -- Identidade visual
  logo_url              text,
  brand_colors          jsonb,
  visual_references     text,
  canva_link            text,
  drive_link            text,
  visual_style          text,

  -- Tom de voz / estilo
  tone_of_voice         text[],
  words_use             text,
  words_avoid           text,
  formality_level       text,
  cta_style             text,

  -- Operação
  approval_responsible  text,
  approval_phone        text,
  best_contact_time     text,
  content_frequency     text,
  social_channels       text[],
  uses_canva            boolean DEFAULT false,
  uses_meta_business    boolean DEFAULT false,
  uses_drive            boolean DEFAULT false,
  uses_paid_traffic     boolean DEFAULT false,
  has_internal_team     boolean DEFAULT false,

  completed             boolean DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- ── 4. CONTENT_ITEMS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.content_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  title            text NOT NULL,
  type             text,
  channel          text,
  objective        text,
  caption          text,
  script           text,
  status           text NOT NULL DEFAULT 'ideia'
                        CHECK (status IN (
                          'ideia','briefing','roteiro','producao','edicao',
                          'revisao_interna','enviado_aprovacao',
                          'alteracao_solicitada','aprovado','agendado','publicado'
                        )),
  scheduled_date   timestamptz,
  responsible_id   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ── 5. APPROVALS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.approvals (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id       uuid REFERENCES public.content_items(id) ON DELETE CASCADE,
  client_id        uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  public_token     text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  status           text NOT NULL DEFAULT 'aguardando'
                        CHECK (status IN (
                          'aguardando','aprovado','alteracao_solicitada','reprovado'
                        )),
  client_comment   text,
  approved_by      text,
  approved_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ── 6. ACTIVITY_LOGS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  client_id    uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  action       text NOT NULL,
  entity_type  text,
  entity_id    uuid,
  metadata     jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- RLS — Row Level Security
-- ============================================================

ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs     ENABLE ROW LEVEL SECURITY;

-- Helper: retorna role do usuário logado
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Helper: retorna client_id do usuário logado (para role=cliente)
CREATE OR REPLACE FUNCTION public.current_client_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT id FROM public.clients WHERE owner_id = auth.uid() LIMIT 1;
$$;

-- ── profiles ──────────────────────────────────────────────────
-- Admin vê todos; usuário vê apenas o próprio
CREATE POLICY "profiles: admin vê todos" ON public.profiles
  FOR SELECT USING (public.current_user_role() = 'admin');

CREATE POLICY "profiles: usuário vê o próprio" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles: usuário edita o próprio" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "profiles: insert via trigger" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- ── clients ───────────────────────────────────────────────────
-- Admin e equipe veem todos; cliente vê apenas o próprio
CREATE POLICY "clients: admin/equipe vê todos" ON public.clients
  FOR SELECT USING (
    public.current_user_role() IN (
      'admin','operacional','social_media','designer',
      'editor','videomaker','gestor_trafego','financeiro'
    )
  );

CREATE POLICY "clients: cliente vê o próprio" ON public.clients
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "clients: cliente insere o próprio" ON public.clients
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "clients: admin/equipe atualiza" ON public.clients
  FOR UPDATE USING (
    public.current_user_role() IN ('admin','operacional')
    OR owner_id = auth.uid()
  );

-- ── onboarding_profiles ───────────────────────────────────────
CREATE POLICY "onboarding: admin/equipe vê todos" ON public.onboarding_profiles
  FOR SELECT USING (
    public.current_user_role() IN (
      'admin','operacional','social_media','designer',
      'editor','videomaker','gestor_trafego'
    )
  );

CREATE POLICY "onboarding: cliente vê o próprio" ON public.onboarding_profiles
  FOR SELECT USING (client_id = public.current_client_id());

CREATE POLICY "onboarding: cliente insere o próprio" ON public.onboarding_profiles
  FOR INSERT WITH CHECK (client_id = public.current_client_id());

CREATE POLICY "onboarding: cliente atualiza o próprio" ON public.onboarding_profiles
  FOR UPDATE USING (client_id = public.current_client_id());

-- ── content_items ─────────────────────────────────────────────
CREATE POLICY "content: admin/equipe vê todos" ON public.content_items
  FOR ALL USING (
    public.current_user_role() IN (
      'admin','operacional','social_media','designer',
      'editor','videomaker','gestor_trafego'
    )
  );

CREATE POLICY "content: cliente vê o próprio" ON public.content_items
  FOR SELECT USING (client_id = public.current_client_id());

-- ── approvals ─────────────────────────────────────────────────
CREATE POLICY "approvals: equipe vê todos" ON public.approvals
  FOR ALL USING (
    public.current_user_role() IN (
      'admin','operacional','social_media','designer',
      'editor','videomaker'
    )
  );

CREATE POLICY "approvals: cliente vê o próprio" ON public.approvals
  FOR SELECT USING (client_id = public.current_client_id());

CREATE POLICY "approvals: cliente atualiza (feedback)" ON public.approvals
  FOR UPDATE USING (client_id = public.current_client_id());

-- ── activity_logs ─────────────────────────────────────────────
CREATE POLICY "logs: apenas admin vê" ON public.activity_logs
  FOR SELECT USING (public.current_user_role() = 'admin');

CREATE POLICY "logs: qualquer autenticado insere" ON public.activity_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- Índices de performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_clients_owner     ON public.clients(owner_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_client ON public.onboarding_profiles(client_id);
CREATE INDEX IF NOT EXISTS idx_content_client    ON public.content_items(client_id);
CREATE INDEX IF NOT EXISTS idx_content_status    ON public.content_items(status);
CREATE INDEX IF NOT EXISTS idx_approvals_client  ON public.approvals(client_id);
CREATE INDEX IF NOT EXISTS idx_approvals_token   ON public.approvals(public_token);
CREATE INDEX IF NOT EXISTS idx_logs_client       ON public.activity_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_logs_user         ON public.activity_logs(user_id);

-- ============================================================
-- Políticas adicionais para página pública de aprovação /aprovar/[token]
-- Usuários sem login (anon) precisam ler e atualizar via token público
-- ============================================================

-- Qualquer pessoa pode ler aprovação pelo token público
CREATE POLICY "approvals: leitura pública por token" ON public.approvals
  FOR SELECT TO anon USING (public_token IS NOT NULL);

-- Qualquer pessoa pode ler o conteúdo vinculado a uma aprovação pública
CREATE POLICY "content: leitura pública via aprovação" ON public.content_items
  FOR SELECT TO anon USING (
    EXISTS (SELECT 1 FROM public.approvals WHERE content_id = id AND public_token IS NOT NULL)
  );

-- Cliente sem login pode atualizar status da aprovação (aprovar/reprovar)
CREATE POLICY "approvals: atualização pública por token" ON public.approvals
  FOR UPDATE TO anon
  USING (public_token IS NOT NULL)
  WITH CHECK (true);

-- Atualização pública de status do conteúdo via aprovação
CREATE POLICY "content: atualização pública via aprovação" ON public.content_items
  FOR UPDATE TO anon
  USING (
    EXISTS (SELECT 1 FROM public.approvals WHERE content_id = id AND public_token IS NOT NULL)
  )
  WITH CHECK (true);

-- Log anônimo de ações de aprovação (sem login)
CREATE POLICY "logs: inserção anônima" ON public.activity_logs
  FOR INSERT TO anon WITH CHECK (true);

-- ============================================================
-- Função para criar client no cadastro sem depender de sessão ativa
--
-- Contexto: após supabase.auth.signUp(), se o projeto tiver
-- "Email Confirmation" habilitado, a sessão é null (auth.uid() = null)
-- e o INSERT em clients é bloqueado pela RLS mesmo com a policy correta.
-- Esta função SECURITY DEFINER roda como o owner do schema (postgres)
-- e bypassa RLS, mas valida que o user_id existe em auth.users.
-- Acessível ao role anon para ser chamada logo após o signUp.
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_client_on_signup(
  p_user_id        uuid,
  p_company_name   text,
  p_responsible    text,
  p_email          text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
BEGIN
  -- Garante idempotência: retorna o client existente se já foi criado
  SELECT id INTO v_client_id
  FROM public.clients
  WHERE owner_id = p_user_id;

  IF v_client_id IS NOT NULL THEN
    RETURN v_client_id;
  END IF;

  -- Valida que o usuário existe em auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'user_not_found: usuário % não existe em auth.users', p_user_id;
  END IF;

  INSERT INTO public.clients (owner_id, company_name, responsible_name, email, status)
  VALUES (p_user_id, p_company_name, p_responsible, p_email, 'onboarding')
  RETURNING id INTO v_client_id;

  RETURN v_client_id;
END;
$$;

-- Permite chamada pelo role anon (logo após signUp, sem sessão confirmada)
-- e pelo role authenticated (fluxo normal com sessão ativa)
GRANT EXECUTE ON FUNCTION public.create_client_on_signup(uuid, text, text, text)
  TO anon, authenticated;
