-- ============================================================
-- LOKAT OS — Área Operacional V1
-- File: docs/supabase/06-operacional-v1.sql
-- Run this in Supabase SQL editor to create operational tables.
-- Safe to re-run: uses IF NOT EXISTS for tables/indexes,
-- and DROP...IF EXISTS before each CREATE POLICY.
-- Does NOT modify or drop existing tables.
-- ============================================================

-- ── Helpers (reused from earlier migrations) ─────────────────

-- Helper: get current user role (SECURITY DEFINER prevents RLS recursion)
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ── operational_tasks ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.operational_tasks (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         uuid          REFERENCES public.clients(id) ON DELETE SET NULL,
  content_item_id   uuid          REFERENCES public.content_items(id) ON DELETE SET NULL,
  approval_id       uuid          REFERENCES public.approvals(id) ON DELETE SET NULL,
  title             text          NOT NULL,
  description       text,
  task_type         text,         -- arte | video | roteiro | legenda | planejamento | trafego | publicacao | revisao | ajuste | outro
  department        text,         -- design | video | roteiro | social_media | trafego | atendimento | estrategia | financeiro | geral
  status            text          NOT NULL DEFAULT 'backlog',
                                  -- backlog | briefing | em_producao | revisao_interna | ajuste |
                                  -- aguardando_cliente | aprovado | agendado | publicado | concluido | pausado | cancelado
  priority          text          DEFAULT 'media',
                                  -- baixa | media | alta | urgente
  assigned_to       uuid          REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_role     text,         -- designer | editor | videomaker | social_media | gestor_trafego | operacional
  due_date          date,
  start_date        date,
  channel           text,
  format            text,
  brief             jsonb,
  checklist         jsonb,        -- array of { label: text, done: bool }
  attachments       jsonb,
  internal_notes    text,
  client_notes      text,
  created_by        uuid          REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_operational_task_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS operational_tasks_updated_at ON public.operational_tasks;
CREATE TRIGGER operational_tasks_updated_at
  BEFORE UPDATE ON public.operational_tasks
  FOR EACH ROW EXECUTE FUNCTION update_operational_task_timestamp();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_operational_tasks_client_id      ON public.operational_tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_operational_tasks_status         ON public.operational_tasks(status);
CREATE INDEX IF NOT EXISTS idx_operational_tasks_assigned_to    ON public.operational_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_operational_tasks_assigned_role  ON public.operational_tasks(assigned_role);
CREATE INDEX IF NOT EXISTS idx_operational_tasks_due_date       ON public.operational_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_operational_tasks_content_item   ON public.operational_tasks(content_item_id);

-- ── operational_task_comments ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.operational_task_comments (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid        NOT NULL REFERENCES public.operational_tasks(id) ON DELETE CASCADE,
  user_id     uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  comment     text        NOT NULL,
  visibility  text        NOT NULL DEFAULT 'internal',  -- internal | client
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.operational_task_comments(task_id);

-- ── operational_task_activity ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.operational_task_activity (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid        NOT NULL REFERENCES public.operational_tasks(id) ON DELETE CASCADE,
  user_id     uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  action      text        NOT NULL,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_activity_task_id ON public.operational_task_activity(task_id);

-- ── Enable Row Level Security ─────────────────────────────────

ALTER TABLE public.operational_tasks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_task_activity ENABLE ROW LEVEL SECURITY;

-- ── RLS Policies — operational_tasks ─────────────────────────

-- Admin: full access
DROP POLICY IF EXISTS "op_tasks: admin full access" ON public.operational_tasks;
CREATE POLICY "op_tasks: admin full access"
  ON public.operational_tasks
  FOR ALL
  TO authenticated
  USING     (current_user_role() = 'admin')
  WITH CHECK(current_user_role() = 'admin');

-- Operational staff: read tasks assigned to them or their role
DROP POLICY IF EXISTS "op_tasks: staff reads own" ON public.operational_tasks;
CREATE POLICY "op_tasks: staff reads own"
  ON public.operational_tasks
  FOR SELECT
  TO authenticated
  USING (
    current_user_role() IN ('operacional','social_media','designer','editor','videomaker','gestor_trafego')
    AND (
      assigned_to = auth.uid()
      OR assigned_role = current_user_role()
      OR assigned_role IS NULL
    )
  );

-- Operational staff: update tasks assigned to them or their role
DROP POLICY IF EXISTS "op_tasks: staff updates own" ON public.operational_tasks;
CREATE POLICY "op_tasks: staff updates own"
  ON public.operational_tasks
  FOR UPDATE
  TO authenticated
  USING (
    current_user_role() IN ('operacional','social_media','designer','editor','videomaker','gestor_trafego')
    AND (
      assigned_to = auth.uid()
      OR assigned_role = current_user_role()
    )
  )
  WITH CHECK(true);

-- Client: NO access to operational_tasks
-- (no policy = no access by default when RLS is enabled)

-- ── RLS Policies — operational_task_comments ─────────────────

DROP POLICY IF EXISTS "op_comments: admin full access" ON public.operational_task_comments;
CREATE POLICY "op_comments: admin full access"
  ON public.operational_task_comments
  FOR ALL
  TO authenticated
  USING     (current_user_role() = 'admin')
  WITH CHECK(current_user_role() = 'admin');

DROP POLICY IF EXISTS "op_comments: staff reads internal" ON public.operational_task_comments;
CREATE POLICY "op_comments: staff reads internal"
  ON public.operational_task_comments
  FOR SELECT
  TO authenticated
  USING (
    current_user_role() IN ('operacional','social_media','designer','editor','videomaker','gestor_trafego')
    AND visibility = 'internal'
  );

DROP POLICY IF EXISTS "op_comments: staff inserts" ON public.operational_task_comments;
CREATE POLICY "op_comments: staff inserts"
  ON public.operational_task_comments
  FOR INSERT
  TO authenticated
  WITH CHECK(
    current_user_role() IN ('operacional','social_media','designer','editor','videomaker','gestor_trafego')
  );

-- ── RLS Policies — operational_task_activity ─────────────────

DROP POLICY IF EXISTS "op_activity: admin full access" ON public.operational_task_activity;
CREATE POLICY "op_activity: admin full access"
  ON public.operational_task_activity
  FOR ALL
  TO authenticated
  USING     (current_user_role() = 'admin')
  WITH CHECK(current_user_role() = 'admin');

DROP POLICY IF EXISTS "op_activity: staff reads" ON public.operational_task_activity;
CREATE POLICY "op_activity: staff reads"
  ON public.operational_task_activity
  FOR SELECT
  TO authenticated
  USING (
    current_user_role() IN ('operacional','social_media','designer','editor','videomaker','gestor_trafego')
  );

DROP POLICY IF EXISTS "op_activity: staff inserts" ON public.operational_task_activity;
CREATE POLICY "op_activity: staff inserts"
  ON public.operational_task_activity
  FOR INSERT
  TO authenticated
  WITH CHECK(
    current_user_role() IN ('operacional','social_media','designer','editor','videomaker','gestor_trafego')
  );
