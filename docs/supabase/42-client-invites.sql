-- LOKAT OS — SQL 42: Client Invites
-- Cria tabela de convites para clientes (painel espelho).
-- Diferente de team_invites (equipe interna), estes convites são para donos de empresa.
-- Safe to re-run: DROP IF EXISTS + CREATE.
-- Rodar no SQL Editor do Supabase.

-- ── 1. Tabela client_invites ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_invites (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  token       uuid DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  client_id   uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  email       text NOT NULL,
  role        text NOT NULL DEFAULT 'cliente' CHECK (role = 'cliente'),
  status      text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid REFERENCES public.profiles(id),
  created_by  uuid REFERENCES public.profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── 2. RLS ────────────────────────────────────────────────────
ALTER TABLE public.client_invites ENABLE ROW LEVEL SECURITY;

-- Admin e super_admin veem todos os convites
CREATE POLICY "admin_all_client_invites" ON public.client_invites
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Anônimo pode verificar token para aceitar convite
CREATE POLICY "anon_verify_client_invite" ON public.client_invites
  FOR SELECT USING (status = 'pending' AND expires_at > now());

-- ── 3. Índices ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_client_invites_token     ON public.client_invites(token);
CREATE INDEX IF NOT EXISTS idx_client_invites_client_id ON public.client_invites(client_id);
CREATE INDEX IF NOT EXISTS idx_client_invites_email     ON public.client_invites(email);

-- ── 4. RPC: get_client_invite_by_token ───────────────────────
CREATE OR REPLACE FUNCTION public.get_client_invite_by_token(p_token uuid)
RETURNS TABLE (
  id          uuid,
  client_id   uuid,
  company_name text,
  email       text,
  role        text,
  status      text,
  expires_at  timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ci.id,
    ci.client_id,
    c.company_name,
    ci.email,
    ci.role,
    ci.status,
    ci.expires_at
  FROM public.client_invites ci
  JOIN public.clients c ON c.id = ci.client_id
  WHERE ci.token = p_token
    AND ci.status = 'pending'
    AND ci.expires_at > now();
$$;

GRANT EXECUTE ON FUNCTION public.get_client_invite_by_token(uuid) TO anon, authenticated;

-- ── 5. RPC: accept_client_invite ─────────────────────────────
CREATE OR REPLACE FUNCTION public.accept_client_invite(p_token uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.client_invites%ROWTYPE;
BEGIN
  SELECT * INTO v_invite
  FROM public.client_invites
  WHERE token = p_token AND status = 'pending' AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite inválido ou expirado.';
  END IF;

  -- Atualiza profile do usuário autenticado com role cliente e client_id
  UPDATE public.profiles
  SET
    role      = 'cliente',
    client_id = v_invite.client_id
  WHERE id = auth.uid();

  -- Marca convite como aceito
  UPDATE public.client_invites
  SET
    status      = 'accepted',
    accepted_at = now(),
    accepted_by = auth.uid()
  WHERE id = v_invite.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_client_invite(uuid) TO authenticated;

-- ── 6. Adicionar client_id em profiles se não existir ─────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;
    CREATE INDEX idx_profiles_client_id ON public.profiles(client_id);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
