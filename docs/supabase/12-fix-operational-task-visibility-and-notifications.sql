-- ============================================================
-- LOKAT OS — Fix: Operational Task Visibility & Notifications
-- File: docs/supabase/12-fix-operational-task-visibility-and-notifications.sql
--
-- ROOT CAUSE (fixed in app code):
--   select("*, profiles(name)") was AMBIGUOUS because operational_tasks
--   has two FKs to profiles (assigned_to AND created_by).
--   PostgREST returned an error → data = null → 0 tasks shown.
--   Fix: use "profiles!assigned_to(name)" in the Supabase JS client.
--
-- This SQL adds missing indexes and verifies/fixes required columns.
-- Safe to re-run: uses IF NOT EXISTS and DROP...IF EXISTS for policies.
-- ============================================================

-- ── 1. Add created_at index (used by notification queries) ────

CREATE INDEX IF NOT EXISTS idx_operational_tasks_created_at
  ON public.operational_tasks(created_at DESC);

-- ── 2. Add priority index (used by "urgentes" filter) ─────────

CREATE INDEX IF NOT EXISTS idx_operational_tasks_priority
  ON public.operational_tasks(priority);

-- ── 3. Composite index: status + assigned_role ────────────────
--    Speeds up the most common query pattern for staff views.

CREATE INDEX IF NOT EXISTS idx_op_tasks_status_role
  ON public.operational_tasks(status, assigned_role);

-- ── 4. Composite index: assigned_to + status ─────────────────

CREATE INDEX IF NOT EXISTS idx_op_tasks_assigned_to_status
  ON public.operational_tasks(assigned_to, status);

-- ── 5. Verify operational_tasks has all required columns ──────
--    These use ALTER TABLE ... ADD COLUMN IF NOT EXISTS.
--    Safe to run even if columns already exist.

ALTER TABLE public.operational_tasks
  ADD COLUMN IF NOT EXISTS priority       text DEFAULT 'media',
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS channel        text,
  ADD COLUMN IF NOT EXISTS format         text,
  ADD COLUMN IF NOT EXISTS brief          jsonb,
  ADD COLUMN IF NOT EXISTS checklist      jsonb,
  ADD COLUMN IF NOT EXISTS due_date       date,
  ADD COLUMN IF NOT EXISTS start_date     date,
  ADD COLUMN IF NOT EXISTS assigned_role  text,
  ADD COLUMN IF NOT EXISTS department     text,
  ADD COLUMN IF NOT EXISTS task_type      text,
  ADD COLUMN IF NOT EXISTS content_item_id uuid REFERENCES public.content_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by     uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ── 6. Re-apply RLS policies (idempotent) ─────────────────────
--    Ensures admin full access and staff filtered access are in sync.

-- Admin: full access (already in SQL 06, re-applied for safety)
DROP POLICY IF EXISTS "op_tasks: admin full access" ON public.operational_tasks;
CREATE POLICY "op_tasks: admin full access"
  ON public.operational_tasks
  FOR ALL
  TO authenticated
  USING     (current_user_role() = 'admin')
  WITH CHECK(current_user_role() = 'admin');

-- Staff read: uses get_user_operational_roles() from SQL 11
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

-- Staff update: allowed for tasks in their scope
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

-- ── 7. Notify PostgREST to reload schema ─────────────────────

NOTIFY pgrst, 'reload schema';
