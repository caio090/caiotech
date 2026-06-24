-- =============================================================================
-- SQL 10: Multi-role support + Account management fields
-- Run after: 09-admin-notifications-and-cleanup.sql
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PROFILE_ROLES — extra roles per user (many-to-many)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profile_roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        text NOT NULL,
  department  text,
  is_primary  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Only valid roles
ALTER TABLE profile_roles
  DROP CONSTRAINT IF EXISTS profile_roles_role_check;
ALTER TABLE profile_roles
  ADD CONSTRAINT profile_roles_role_check
  CHECK (role IN (
    'admin','cliente','social_media','financeiro','aluno',
    'designer','videomaker','trafego','comercial','operacional','suporte'
  ));

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS idx_profile_roles_user_id ON profile_roles (user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ACCOUNT MANAGEMENT FIELDS on profiles
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_test     boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at  timestamptz;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS: profile_roles
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE profile_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own extra roles"   ON profile_roles;
DROP POLICY IF EXISTS "Admin can read all extra roles"   ON profile_roles;
DROP POLICY IF EXISTS "Admin can manage extra roles"     ON profile_roles;

CREATE POLICY "Users can read own extra roles"
  ON profile_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admin can read all extra roles"
  ON profile_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Admin can manage extra roles"
  ON profile_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. HELPER RPCs (SECURITY DEFINER so they bypass RLS safely)
-- ─────────────────────────────────────────────────────────────────────────────

-- Returns all roles for the current user (primary + extras)
CREATE OR REPLACE FUNCTION current_user_roles()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY(
    SELECT p.role FROM profiles p WHERE p.id = auth.uid()
    UNION
    SELECT pr.role FROM profile_roles pr WHERE pr.user_id = auth.uid()
  );
$$;

-- Returns true if the current user has a specific role
CREATE OR REPLACE FUNCTION current_user_has_role(p_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = p_role
    UNION
    SELECT 1 FROM profile_roles WHERE user_id = auth.uid() AND role = p_role
  );
$$;

-- Returns true if the current user is any operational role
CREATE OR REPLACE FUNCTION current_user_is_operational()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role IN ('social_media','designer','videomaker','trafego','comercial','operacional','suporte')
  );
$$;

-- Returns true if the current user is admin
CREATE OR REPLACE FUNCTION current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ADMIN: manage member roles
-- ─────────────────────────────────────────────────────────────────────────────

-- Set primary role for a user (admin only, RPC)
CREATE OR REPLACE FUNCTION admin_set_primary_role(
  p_user_id uuid,
  p_role     text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT current_user_is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  UPDATE profiles SET role = p_role WHERE id = p_user_id;
END;
$$;

-- Archive a user account (sets archived_at, does NOT delete auth)
CREATE OR REPLACE FUNCTION admin_archive_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT current_user_is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  -- Prevent archiving own account
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot archive your own account';
  END IF;
  UPDATE profiles SET archived_at = now() WHERE id = p_user_id;
END;
$$;

-- Unarchive a user account
CREATE OR REPLACE FUNCTION admin_unarchive_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT current_user_is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  UPDATE profiles SET archived_at = null WHERE id = p_user_id;
END;
$$;

-- Mark a user as test account
CREATE OR REPLACE FUNCTION admin_mark_test_account(p_user_id uuid, p_is_test boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT current_user_is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  UPDATE profiles SET is_test = p_is_test WHERE id = p_user_id;
END;
$$;

-- Soft-delete (mark deleted_at); hard delete must go through API route with SERVICE_ROLE_KEY
CREATE OR REPLACE FUNCTION admin_soft_delete_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT current_user_is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;
  UPDATE profiles SET deleted_at = now() WHERE id = p_user_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. UPDATE v_real_clients VIEW (exclude archived/deleted)
-- ─────────────────────────────────────────────────────────────────────────────

DROP VIEW IF EXISTS v_real_clients;

CREATE VIEW v_real_clients AS
SELECT
  c.id,
  c.company_name,
  c.owner_id,
  p.name       AS owner_name,
  p.email      AS owner_email
FROM clients c
JOIN profiles p ON p.id = c.owner_id
WHERE p.role = 'cliente'
  AND p.archived_at IS NULL
  AND p.deleted_at  IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. GRANT execute on RPCs to authenticated role
-- ─────────────────────────────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION current_user_roles()              TO authenticated;
GRANT EXECUTE ON FUNCTION current_user_has_role(text)       TO authenticated;
GRANT EXECUTE ON FUNCTION current_user_is_operational()     TO authenticated;
GRANT EXECUTE ON FUNCTION current_user_is_admin()           TO authenticated;
GRANT EXECUTE ON FUNCTION admin_set_primary_role(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_archive_user(uuid)          TO authenticated;
GRANT EXECUTE ON FUNCTION admin_unarchive_user(uuid)        TO authenticated;
GRANT EXECUTE ON FUNCTION admin_mark_test_account(uuid,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_soft_delete_user(uuid)      TO authenticated;
