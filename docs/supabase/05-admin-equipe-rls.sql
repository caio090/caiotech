-- ============================================================
-- LOKAT OS — Fix 05: RLS para admin ler e alterar equipe
-- Execute no Supabase SQL Editor (após 01-04).
-- Seguro para rodar múltiplas vezes (IF NOT EXISTS via DO block).
-- ============================================================

-- ── profiles: admin lê todos os membros ──────────────────────
-- Permite que a tela /admin/equipe liste todos os usuários.
-- A função current_user_role() já é SECURITY DEFINER (Fix 03),
-- portanto não há risco de recursão.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'profiles: admin lê todos'
  ) THEN
    CREATE POLICY "profiles: admin lê todos" ON public.profiles
      FOR SELECT USING (public.current_user_role() = 'admin');
  END IF;
END $$;

-- ── profiles: admin atualiza role de qualquer usuário ────────
-- Permite que o admin altere o campo `role` pela tela /admin/equipe.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'profiles: admin atualiza role'
  ) THEN
    CREATE POLICY "profiles: admin atualiza role" ON public.profiles
      FOR UPDATE
      USING (public.current_user_role() = 'admin')
      WITH CHECK (public.current_user_role() = 'admin');
  END IF;
END $$;

-- ── profiles: usuário lê o próprio perfil ───────────────────
-- Garante que cada usuário consiga ler seu próprio profile
-- (necessário para o proxy.ts ler o role).

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'profiles: usuário lê o próprio'
  ) THEN
    CREATE POLICY "profiles: usuário lê o próprio" ON public.profiles
      FOR SELECT USING (id = auth.uid());
  END IF;
END $$;
