-- ============================================================
-- LOKAT OS - SQL 56: Corrige vínculo convite → profile → portal
-- Execute manualmente no Supabase SQL Editor.
-- Idempotente: pode rodar mais de uma vez com segurança.
-- ============================================================
--
-- Problema corrigido:
--   Quando um usuário já existia no Supabase (email já cadastrado) e
--   aceitava um convite, o signUp retornava "sucesso falso" (sem sessão)
--   para evitar enumeração de emails. Sem sessão, auth.uid() = null
--   dentro do RPC accept_client_invite → UPDATE atualizava 0 linhas →
--   profiles.client_id ficava null → portal não achava o cliente.
--
-- O que este SQL faz:
--   1. Redefine accept_client_invite com validação de uid e INSERT ON CONFLICT
--   2. Garante coluna client_id em profiles (idempotente)
--   3. Adiciona policy para usuário ler seus próprios convites aceitos
--      (necessário para o fallback via client_invites.accepted_by no portal)
--   4. Cria helper RPC get_my_client_id() para resolução centralizada
-- ============================================================

-- ── 1. Garante coluna client_id em profiles ────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_profiles_client_id ON public.profiles(client_id);
  END IF;
END $$;

-- ── 2. RPC accept_client_invite (versão robusta) ───────────────
-- Melhorias vs SQL 42:
--   - Valida auth.uid() antes de executar (lança exceção se null)
--   - Usa INSERT ON CONFLICT para criar profile se ainda não existe
--   - role = 'client' (inglês, consistente com o resto do sistema)
CREATE OR REPLACE FUNCTION public.accept_client_invite(p_token uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.client_invites%ROWTYPE;
  v_uid    uuid;
BEGIN
  v_uid := auth.uid();

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado. Faça login antes de aceitar o convite.';
  END IF;

  SELECT * INTO v_invite
  FROM public.client_invites
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite inválido ou expirado.';
  END IF;

  -- Cria profile se não existe; atualiza client_id e role se já existe
  INSERT INTO public.profiles (id, role, client_id)
  VALUES (v_uid, 'client', v_invite.client_id)
  ON CONFLICT (id) DO UPDATE SET
    role      = 'client',
    client_id = EXCLUDED.client_id;

  -- Marca convite como aceito
  UPDATE public.client_invites
  SET
    status      = 'accepted',
    accepted_at = now(),
    accepted_by = v_uid
  WHERE id = v_invite.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_client_invite(uuid) TO authenticated;

-- ── 3. Policy: usuário lê seus próprios convites aceitos ───────
-- Necessário para o fallback no portal (client_invites.accepted_by = auth.uid())
DROP POLICY IF EXISTS "user_read_own_accepted_invite" ON public.client_invites;
CREATE POLICY "user_read_own_accepted_invite" ON public.client_invites
  FOR SELECT TO authenticated
  USING (accepted_by = auth.uid() AND status = 'accepted');

-- ── 4. RPC helper: get_my_client_id() ─────────────────────────
-- Resolve o client_id do usuário autenticado em ordem de prioridade:
--   1. profiles.client_id
--   2. client_invites.accepted_by
-- Útil para server components que precisam do client_id sem múltiplas queries.
CREATE OR REPLACE FUNCTION public.get_my_client_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_uid       uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RETURN NULL; END IF;

  -- Prioridade 1: profiles.client_id
  SELECT client_id INTO v_client_id
  FROM public.profiles
  WHERE id = v_uid AND client_id IS NOT NULL;

  IF v_client_id IS NOT NULL THEN
    RETURN v_client_id;
  END IF;

  -- Prioridade 2: convite aceito
  SELECT ci.client_id INTO v_client_id
  FROM public.client_invites ci
  WHERE ci.accepted_by = v_uid AND ci.status = 'accepted'
  ORDER BY ci.accepted_at DESC
  LIMIT 1;

  -- Se encontrou via invite, repara o profiles.client_id
  IF v_client_id IS NOT NULL THEN
    UPDATE public.profiles
    SET client_id = v_client_id, role = 'client'
    WHERE id = v_uid;
  END IF;

  RETURN v_client_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_client_id() TO authenticated;

-- ── 5. Recarrega schema do PostgREST ──────────────────────────
NOTIFY pgrst, 'reload schema';

-- ── Validação ─────────────────────────────────────────────────
SELECT
  p.proname       AS funcao,
  p.prosecdef     AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('accept_client_invite', 'get_my_client_id')
ORDER BY p.proname;
