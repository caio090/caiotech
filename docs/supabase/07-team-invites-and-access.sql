-- ============================================================
-- LOKAT OS — Team Invites & Extended Role Support
-- File: docs/supabase/07-team-invites-and-access.sql
-- Run AFTER 06-operacional-v1.sql
-- Safe to re-run: IF NOT EXISTS on tables/indexes,
-- DROP ... IF EXISTS before each CREATE POLICY.
-- ============================================================

-- ── 1. Add 'comercial' to profiles.role CHECK constraint ─────
-- Safely drop and recreate; update the list as roles grow.

DO $$
BEGIN
  -- Find and drop the existing role check constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'profiles'
      AND constraint_type = 'CHECK'
      AND constraint_name LIKE '%role%'
  ) THEN
    EXECUTE (
      SELECT format('ALTER TABLE public.profiles DROP CONSTRAINT %I', constraint_name)
      FROM information_schema.table_constraints
      WHERE table_name = 'profiles'
        AND constraint_type = 'CHECK'
        AND constraint_name LIKE '%role%'
      LIMIT 1
    );
  END IF;
END;
$$;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'admin',
    'cliente',
    'operacional',
    'social_media',
    'designer',
    'editor',
    'videomaker',
    'gestor_trafego',
    'financeiro',
    'aluno',
    'comercial'
  ));

-- ── 2. team_invites table ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.team_invites (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  token        uuid         NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  email        text,
  name         text,
  role         text         NOT NULL,
  department   text,
  notes        text,
  status       text         NOT NULL DEFAULT 'pending',
                            -- pending | accepted | revoked | expired
  expires_at   timestamptz,
  accepted_at  timestamptz,
  accepted_by  uuid         REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by   uuid         REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_invites_token  ON public.team_invites(token);
CREATE INDEX IF NOT EXISTS idx_team_invites_email  ON public.team_invites(email);
CREATE INDEX IF NOT EXISTS idx_team_invites_status ON public.team_invites(status);

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- Admin: full access
DROP POLICY IF EXISTS "team_invites: admin full access" ON public.team_invites;
CREATE POLICY "team_invites: admin full access"
  ON public.team_invites
  FOR ALL
  TO authenticated
  USING     (current_user_role() = 'admin')
  WITH CHECK(current_user_role() = 'admin');

-- Team member: read their own accepted invite
DROP POLICY IF EXISTS "team_invites: member reads own" ON public.team_invites;
CREATE POLICY "team_invites: member reads own"
  ON public.team_invites
  FOR SELECT
  TO authenticated
  USING (accepted_by = auth.uid());

-- ── 3. Helper function — current_user_role ────────────────────
-- Recreate defensively (already exists from 06, but safe to redo)

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ── 4. RPC: get_invite_by_token (anon callable) ───────────────
-- Returns limited fields of a pending invite by its UUID token.
-- Callable by anonymous users so the invite page can show details
-- before the user creates an account.

CREATE OR REPLACE FUNCTION get_invite_by_token(p_token text)
RETURNS TABLE (
  id          uuid,
  email       text,
  name        text,
  role        text,
  department  text,
  status      text,
  expires_at  timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id, email, name, role, department, status, expires_at
  FROM public.team_invites
  WHERE token = p_token::uuid
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_invite_by_token(text) TO anon, authenticated;

-- ── 5. RPC: accept_team_invite (authenticated only) ──────────
-- Called after signUp to set the user's role from the invite.

CREATE OR REPLACE FUNCTION accept_team_invite(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite  public.team_invites%ROWTYPE;
  v_uid     uuid := auth.uid();
  v_email   text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  SELECT * INTO v_invite
  FROM public.team_invites
  WHERE token = p_token::uuid
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_or_expired');
  END IF;

  -- Verify email matches if invite specifies one
  IF v_invite.email IS NOT NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
    IF lower(v_email) IS DISTINCT FROM lower(v_invite.email) THEN
      RETURN jsonb_build_object('error', 'email_mismatch');
    END IF;
  END IF;

  -- Update the new member's profile
  UPDATE public.profiles
  SET
    role = v_invite.role,
    name = COALESCE(NULLIF(trim(name), ''), v_invite.name)
  WHERE id = v_uid;

  -- Mark invite as accepted
  UPDATE public.team_invites
  SET
    status      = 'accepted',
    accepted_at = now(),
    accepted_by = v_uid
  WHERE id = v_invite.id;

  RETURN jsonb_build_object('success', true, 'role', v_invite.role);
END;
$$;

GRANT EXECUTE ON FUNCTION accept_team_invite(text) TO authenticated;

-- ── 6. RPC: create_team_invite (admin only) ──────────────────
-- Admin generates a token; front-end builds the invite URL.

CREATE OR REPLACE FUNCTION create_team_invite(
  p_email      text    DEFAULT NULL,
  p_name       text    DEFAULT NULL,
  p_role       text    DEFAULT 'operacional',
  p_department text    DEFAULT NULL,
  p_notes      text    DEFAULT NULL,
  p_expires_h  int     DEFAULT 168   -- 7 days; 0 = no expiry
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token uuid := gen_random_uuid();
  v_exp   timestamptz;
BEGIN
  IF current_user_role() != 'admin' THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  v_exp := CASE WHEN p_expires_h > 0
                THEN now() + (p_expires_h || ' hours')::interval
                ELSE NULL END;

  INSERT INTO public.team_invites
    (token, email, name, role, department, notes, expires_at, created_by)
  VALUES
    (v_token, p_email, p_name, p_role, p_department, p_notes, v_exp, auth.uid());

  RETURN jsonb_build_object('success', true, 'token', v_token::text);
END;
$$;

GRANT EXECUTE ON FUNCTION create_team_invite(text, text, text, text, text, int) TO authenticated;

-- ── 7. Update op_tasks RLS to include 'comercial' ────────────
-- comercial role should see tasks in their department.

DROP POLICY IF EXISTS "op_tasks: staff reads own" ON public.operational_tasks;
CREATE POLICY "op_tasks: staff reads own"
  ON public.operational_tasks
  FOR SELECT
  TO authenticated
  USING (
    current_user_role() IN (
      'operacional','social_media','designer','editor',
      'videomaker','gestor_trafego','comercial','financeiro'
    )
    AND (
      assigned_to   = auth.uid()
      OR assigned_role = current_user_role()
      OR assigned_role IS NULL
    )
  );

DROP POLICY IF EXISTS "op_tasks: staff updates own" ON public.operational_tasks;
CREATE POLICY "op_tasks: staff updates own"
  ON public.operational_tasks
  FOR UPDATE
  TO authenticated
  USING (
    current_user_role() IN (
      'operacional','social_media','designer','editor',
      'videomaker','gestor_trafego','comercial','financeiro'
    )
    AND (
      assigned_to  = auth.uid()
      OR assigned_role = current_user_role()
    )
  )
  WITH CHECK(true);
