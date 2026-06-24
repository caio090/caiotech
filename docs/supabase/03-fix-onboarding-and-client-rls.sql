-- ============================================================
-- LOKAT OS — Fix 03: recursão RLS + constraint de upsert
-- Execute no Supabase SQL Editor (após 01 e 02).
-- Seguro para rodar múltiplas vezes.
-- ============================================================

-- ── Fix 1: current_user_role → SECURITY DEFINER ──────────────
--
-- Problema: current_user_role() lê public.profiles.
-- A policy "profiles: admin vê todos" chama current_user_role() novamente.
-- Isso cria recursão infinita → erro 54001 stack depth limit exceeded.
-- Solução: rodar como SECURITY DEFINER bypassa RLS ao ler profiles.

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ── Fix 2: current_client_id → SECURITY DEFINER ──────────────
--
-- Problema: current_client_id() lê public.clients.
-- A policy "clients: admin/equipe vê todos" chama current_user_role()
-- que por sua vez lê profiles → RLS de profiles → recursão.
-- Solução: mesma — SECURITY DEFINER bypassa RLS ao ler clients.

CREATE OR REPLACE FUNCTION public.current_client_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.clients WHERE owner_id = auth.uid() LIMIT 1;
$$;

-- ── Fix 3: UNIQUE index em onboarding_profiles.client_id ─────
--
-- Problema: upsert com onConflict: "client_id" exige constraint/index único.
-- Sem ele, Supabase/PostgREST retorna erro 42P10.
-- Regra de negócio: cada client tem exatamente 1 onboarding_profile.

CREATE UNIQUE INDEX IF NOT EXISTS onboarding_profiles_client_id_key
  ON public.onboarding_profiles (client_id);

-- ── Verificação (opcional) ────────────────────────────────────
-- Após rodar, valide com:
--   SELECT proname, prosecdef FROM pg_proc WHERE proname IN ('current_user_role','current_client_id');
--   -- prosecdef deve ser true para ambas
--
--   SELECT indexname FROM pg_indexes WHERE tablename = 'onboarding_profiles';
--   -- deve aparecer onboarding_profiles_client_id_key
