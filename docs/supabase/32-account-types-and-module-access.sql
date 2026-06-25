-- ============================================================
-- SQL 32 — Tipos de conta e controle de módulos
--
-- Adiciona account_type em profiles e onboarding_profiles
-- para separar: empresa, agencia, cliente_atendido
--
-- Safe to re-run:
--   ALTER TABLE ADD COLUMN IF NOT EXISTS
--   CREATE INDEX IF NOT EXISTS
--   DROP POLICY IF EXISTS + CREATE POLICY
--   CREATE OR REPLACE FUNCTION
-- ============================================================

-- ── 1. account_type em profiles ──────────────────────────────
--
-- Valores:
--   empresa          → empresário/autônomo usando a plataforma
--   agencia          → agência ou produtora gerenciando clientes
--   cliente_atendido → cliente de uma agência/Lokat, sem acesso operacional
--   lokat            → usuário interno da Lokat (admin/operacional)
--   nao_definido     → padrão para contas antigas

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'nao_definido';

-- ── 2. account_type em onboarding_profiles ────────────────────

ALTER TABLE public.onboarding_profiles
  ADD COLUMN IF NOT EXISTS account_type text DEFAULT NULL;

-- ── 3. Índices ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_profiles_account_type
  ON public.profiles (account_type)
  WHERE account_type IS NOT NULL;

-- ── 4. Função: buscar perfil completo para o painel ───────────

CREATE OR REPLACE FUNCTION public.get_my_profile_with_account_type()
RETURNS TABLE (
  id            uuid,
  name          text,
  email         text,
  role          text,
  account_type  text,
  avatar_url    text,
  created_at    timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.email, p.role, p.account_type, p.avatar_url, p.created_at
  FROM public.profiles p
  WHERE p.id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_profile_with_account_type() TO authenticated;

-- ── 5. Função: atualizar account_type do próprio perfil ───────

CREATE OR REPLACE FUNCTION public.set_my_account_type(p_account_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_account_type NOT IN ('empresa', 'agencia', 'cliente_atendido', 'lokat', 'nao_definido') THEN
    RAISE EXCEPTION 'Tipo de conta inválido: %', p_account_type;
  END IF;

  UPDATE public.profiles
  SET account_type = p_account_type
  WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_my_account_type(text) TO authenticated;

-- ── 6. Tabela de controle de módulos por plano (preparação) ──
--
-- Estrutura preparatória — não usada pelo sistema ainda,
-- mas documenta a intenção de controle granular.

CREATE TABLE IF NOT EXISTS public.plan_module_access (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name    text NOT NULL,
  module_key   text NOT NULL,
  enabled      boolean NOT NULL DEFAULT true,
  limit_value  int DEFAULT NULL,     -- ex: limite de clientes, de créditos IA
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_name, module_key)
);

ALTER TABLE public.plan_module_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan_module: apenas admin lê" ON public.plan_module_access;
CREATE POLICY "plan_module: apenas admin lê"
  ON public.plan_module_access FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Seed: módulos por plano (INSERT só se ainda não existir)
INSERT INTO public.plan_module_access (plan_name, module_key, enabled, limit_value)
VALUES
  -- Diagnóstico grátis
  ('diagnostico_gratis', 'diagnostico',  true, 1),
  ('diagnostico_gratis', 'content_os',   false, null),
  ('diagnostico_gratis', 'calendario',   false, null),
  ('diagnostico_gratis', 'leads',        false, null),
  ('diagnostico_gratis', 'equipe',       false, null),
  ('diagnostico_gratis', 'rec_os',       false, null),
  ('diagnostico_gratis', 'ia_creditos',  true, 5),

  -- Autonomia (empresa/autônomo)
  ('autonomia', 'diagnostico',           true, null),
  ('autonomia', 'content_os',            true, null),
  ('autonomia', 'calendario',            true, null),
  ('autonomia', 'leads',                 true, null),
  ('autonomia', 'relatorios',            true, null),
  ('autonomia', 'ia_creditos',           true, 50),
  ('autonomia', 'equipe',                false, null),
  ('autonomia', 'rec_os',                false, null),
  ('autonomia', 'financeiro',            false, null),

  -- Empresa
  ('empresa', 'diagnostico',             true, null),
  ('empresa', 'content_os',              true, null),
  ('empresa', 'calendario',              true, null),
  ('empresa', 'leads',                   true, null),
  ('empresa', 'relatorios',              true, null),
  ('empresa', 'financeiro',              true, null),
  ('empresa', 'aprovacoes',             true, null),
  ('empresa', 'arquivos',               true, null),
  ('empresa', 'ia_creditos',            true, 150),
  ('empresa', 'equipe',                  false, null),
  ('empresa', 'rec_os',                  false, null),

  -- Agência
  ('agencia', 'diagnostico',             true, null),
  ('agencia', 'content_os',              true, null),
  ('agencia', 'calendario',              true, null),
  ('agencia', 'leads',                   true, null),
  ('agencia', 'relatorios',              true, null),
  ('agencia', 'financeiro',              true, null),
  ('agencia', 'aprovacoes',             true, null),
  ('agencia', 'arquivos',               true, null),
  ('agencia', 'equipe',                  true, null),
  ('agencia', 'operacional',             true, null),
  ('agencia', 'rec_os',                  true, null),
  ('agencia', 'clientes',                true, null),
  ('agencia', 'ia_creditos',            true, 500)
ON CONFLICT (plan_name, module_key) DO NOTHING;

-- ── 7. Notificar PostgREST ───────────────────────────────────

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- INSTRUÇÕES
-- ============================================================
--
-- 1. Rodar este SQL no Supabase SQL Editor
--
-- 2. O campo account_type é salvo no onboarding via:
--    sessionStorage.setItem('lokat_account_type', 'empresa')
--    e depois no perfil via:
--    supabase.rpc('set_my_account_type', { p_account_type: 'empresa' })
--
-- 3. Para verificar:
--    SELECT id, name, role, account_type FROM profiles ORDER BY created_at DESC LIMIT 20;
--
-- 4. A tabela plan_module_access é preparatória —
--    o controle de módulos ainda é feito por role/account_type no código.
--    Será usado para controle granular em releases futuros.
-- ============================================================
