-- ============================================================
-- LOKAT OS — Fix: Client/Team/ContentOS/Operational Separation
-- File: docs/supabase/11-fix-client-team-contentos-operational-flow.sql
-- Safe to re-run: uses CREATE OR REPLACE, DROP IF EXISTS,
-- and IF NOT EXISTS for indexes.
-- ============================================================

-- ── 1. Helper: get all operational roles for current user ─────
--    Returns primary role + any extra roles from profile_roles.
--    Used in RLS to support multi-role staff.

CREATE OR REPLACE FUNCTION get_user_operational_roles()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT ARRAY(
    SELECT DISTINCT role FROM (
      SELECT role FROM public.profiles WHERE id = auth.uid()
      UNION ALL
      SELECT role FROM public.profile_roles WHERE user_id = auth.uid()
    ) r
    WHERE role IN ('operacional','social_media','designer','editor','videomaker','gestor_trafego','financeiro','comercial')
  );
$$;

-- ── 2. Helper: check if current user is operational staff ──────

CREATE OR REPLACE FUNCTION current_user_is_operational_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid()
      AND role IN ('operacional','social_media','designer','editor','videomaker','gestor_trafego','financeiro','comercial','admin')
  )
  OR EXISTS (
    SELECT 1 FROM public.profile_roles WHERE user_id = auth.uid()
      AND role IN ('operacional','social_media','designer','editor','videomaker','gestor_trafego','financeiro','comercial')
  );
$$;

-- ── 3. Fix v_real_clients: exclude is_test, archived, deleted ─
--    DROP first to allow column order/name changes.

DROP VIEW IF EXISTS public.v_real_clients;

CREATE VIEW public.v_real_clients
WITH (security_invoker = true)
AS
  SELECT
    c.id,
    c.owner_id,
    c.company_name,
    c.responsible_name,
    c.segment,
    c.status,
    c.created_at,
    p.name  AS owner_name,
    p.email AS owner_email
  FROM public.clients c
  JOIN public.profiles p ON p.id = c.owner_id
  WHERE p.role = 'cliente'
    AND p.deleted_at  IS NULL
    AND p.archived_at IS NULL
    AND (p.is_test IS NULL OR p.is_test = false);

-- ── 4. Fix RLS: op_tasks: staff reads own ─────────────────────
--    Now checks all roles (primary + profile_roles) via helper.

DROP POLICY IF EXISTS "op_tasks: staff reads own" ON public.operational_tasks;
CREATE POLICY "op_tasks: staff reads own"
  ON public.operational_tasks
  FOR SELECT
  TO authenticated
  USING (
    (
      current_user_role() IN ('operacional','social_media','designer','editor','videomaker','gestor_trafego','financeiro','comercial')
      OR EXISTS (
        SELECT 1 FROM public.profile_roles
        WHERE user_id = auth.uid()
          AND role IN ('operacional','social_media','designer','editor','videomaker','gestor_trafego','financeiro','comercial')
      )
    )
    AND (
      assigned_to   = auth.uid()
      OR assigned_role = ANY(get_user_operational_roles())
      OR assigned_role IS NULL
    )
  );

-- ── 5. Fix RLS: op_tasks: staff updates own ───────────────────

DROP POLICY IF EXISTS "op_tasks: staff updates own" ON public.operational_tasks;
CREATE POLICY "op_tasks: staff updates own"
  ON public.operational_tasks
  FOR UPDATE
  TO authenticated
  USING (
    (
      current_user_role() IN ('operacional','social_media','designer','editor','videomaker','gestor_trafego','financeiro','comercial')
      OR EXISTS (
        SELECT 1 FROM public.profile_roles
        WHERE user_id = auth.uid()
          AND role IN ('operacional','social_media','designer','editor','videomaker','gestor_trafego','financeiro','comercial')
      )
    )
    AND (
      assigned_to   = auth.uid()
      OR assigned_role = ANY(get_user_operational_roles())
    )
  )
  WITH CHECK(true);

-- ── 6. Add missing index on department ────────────────────────

CREATE INDEX IF NOT EXISTS idx_operational_tasks_department
  ON public.operational_tasks(department);

-- ── 7. Ensure profile_roles has index for fast lookup ─────────

CREATE INDEX IF NOT EXISTS idx_profile_roles_user_id
  ON public.profile_roles(user_id);

CREATE INDEX IF NOT EXISTS idx_profile_roles_role
  ON public.profile_roles(role);

-- ── 8. Notify PostgREST to reload schema ─────────────────────

NOTIFY pgrst, 'reload schema';
