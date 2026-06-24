-- ============================================================
-- LOKAT OS — Team Access Requests
-- File: docs/supabase/08-team-access-requests.sql
-- Run AFTER 07-team-invites-and-access.sql
-- Safe to re-run: IF NOT EXISTS on tables/indexes,
-- DROP...IF EXISTS before each CREATE POLICY.
-- ============================================================

-- ── 1. team_access_requests table ────────────────────────────

CREATE TABLE IF NOT EXISTS public.team_access_requests (
  id                  uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text         NOT NULL,
  email               text         NOT NULL,
  phone               text,
  city                text,
  birthday            date,
  desired_role        text         NOT NULL,
  desired_department  text,
  portfolio_url       text,
  tools               text,
  availability        text,
  notes               text,
  -- Status: pending | approved | rejected | converted_to_invite
  status              text         NOT NULL DEFAULT 'pending',
  reviewed_by         uuid         REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at         timestamptz,
  created_user_id     uuid         REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz  NOT NULL DEFAULT now(),
  updated_at          timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tar_status    ON public.team_access_requests(status);
CREATE INDEX IF NOT EXISTS idx_tar_email     ON public.team_access_requests(email);
CREATE INDEX IF NOT EXISTS idx_tar_created   ON public.team_access_requests(created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_tar_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tar_updated_at ON public.team_access_requests;
CREATE TRIGGER tar_updated_at
  BEFORE UPDATE ON public.team_access_requests
  FOR EACH ROW EXECUTE FUNCTION update_tar_timestamp();

-- ── 2. Row Level Security ─────────────────────────────────────

ALTER TABLE public.team_access_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can INSERT a request
DROP POLICY IF EXISTS "tar: public insert" ON public.team_access_requests;
CREATE POLICY "tar: public insert"
  ON public.team_access_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Admin: full access (SELECT, UPDATE, DELETE)
DROP POLICY IF EXISTS "tar: admin full access" ON public.team_access_requests;
CREATE POLICY "tar: admin full access"
  ON public.team_access_requests
  FOR ALL
  TO authenticated
  USING     (current_user_role() = 'admin')
  WITH CHECK(current_user_role() = 'admin');

-- ── 3. RPC: create_team_access_request (public) ──────────────
-- Callable by anon users — no auth required.
-- Stores the request; does NOT grant access.

CREATE OR REPLACE FUNCTION create_team_access_request(
  p_name               text,
  p_email              text,
  p_phone              text    DEFAULT NULL,
  p_city               text    DEFAULT NULL,
  p_birthday           date    DEFAULT NULL,
  p_desired_role       text    DEFAULT 'operacional',
  p_desired_department text    DEFAULT NULL,
  p_portfolio_url      text    DEFAULT NULL,
  p_tools              text    DEFAULT NULL,
  p_availability       text    DEFAULT NULL,
  p_notes              text    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Basic validation
  IF trim(p_name) = '' OR trim(p_email) = '' THEN
    RETURN jsonb_build_object('error', 'name_and_email_required');
  END IF;

  -- Prevent duplicate pending requests from same email
  IF EXISTS (
    SELECT 1 FROM public.team_access_requests
    WHERE lower(email) = lower(trim(p_email))
      AND status = 'pending'
  ) THEN
    RETURN jsonb_build_object('error', 'duplicate_pending_request');
  END IF;

  INSERT INTO public.team_access_requests (
    name, email, phone, city, birthday,
    desired_role, desired_department,
    portfolio_url, tools, availability, notes,
    created_user_id
  )
  VALUES (
    trim(p_name), lower(trim(p_email)), p_phone, p_city, p_birthday,
    p_desired_role, p_desired_department,
    p_portfolio_url, p_tools, p_availability, p_notes,
    auth.uid()
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION create_team_access_request(
  text, text, text, text, date, text, text, text, text, text, text
) TO anon, authenticated;

-- ── 4. RPC: admin_update_access_request (admin only) ─────────
-- Admin calls this to approve, reject, or mark converted_to_invite.

CREATE OR REPLACE FUNCTION admin_update_access_request(
  p_id      uuid,
  p_status  text,
  p_notes   text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF current_user_role() != 'admin' THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  IF p_status NOT IN ('approved', 'rejected', 'converted_to_invite', 'pending') THEN
    RETURN jsonb_build_object('error', 'invalid_status');
  END IF;

  UPDATE public.team_access_requests
  SET
    status      = p_status,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    notes       = COALESCE(p_notes, notes),
    updated_at  = now()
  WHERE id = p_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_update_access_request(uuid, text, text) TO authenticated;

-- ── 5. Helper view for admin — pending count ─────────────────
-- Useful for badge counters without fetching full list.

CREATE OR REPLACE VIEW public.pending_access_requests_count AS
SELECT count(*)::int AS count
FROM public.team_access_requests
WHERE status = 'pending';

-- Admin-only access to the view
REVOKE ALL ON public.pending_access_requests_count FROM anon, authenticated;
GRANT SELECT ON public.pending_access_requests_count TO authenticated;
