-- Migration 20: Operational attachments and work session tracking
-- Creates tables for delivery files and non-invasive work journey structure.

-- ── operational_attachments ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS operational_attachments (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id          uuid        REFERENCES operational_tasks(id) ON DELETE CASCADE,
  content_item_id  uuid        REFERENCES content_items(id)   ON DELETE SET NULL,
  client_id        uuid        REFERENCES clients(id)          ON DELETE CASCADE,
  attachment_url   text        NOT NULL,
  attachment_name  text,
  attachment_type  text,
  attachment_notes text,
  is_final_file    boolean     DEFAULT false,
  delivered_by     uuid        REFERENCES profiles(id)         ON DELETE SET NULL,
  delivered_at     timestamptz DEFAULT now(),
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_op_attachments_task_id
  ON operational_attachments(task_id);

CREATE INDEX IF NOT EXISTS idx_op_attachments_content_item_id
  ON operational_attachments(content_item_id);

-- ── work_sessions ────────────────────────────────────────────────────────────
-- Non-invasive: tracks when a user explicitly starts/ends a session.
-- No keystrokes, no activity monitoring.

CREATE TABLE IF NOT EXISTS work_sessions (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        REFERENCES profiles(id) ON DELETE CASCADE,
  started_at  timestamptz DEFAULT now(),
  ended_at    timestamptz,
  notes       text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_sessions_user_id
  ON work_sessions(user_id);

-- ── RLS: operational_attachments ─────────────────────────────────────────────

ALTER TABLE operational_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff read own task attachments" ON operational_attachments;
CREATE POLICY "staff read own task attachments"
  ON operational_attachments FOR SELECT
  USING (
    auth.uid() IN (
      SELECT p.id FROM profiles p WHERE p.role IN ('admin', 'designer', 'videomaker', 'editor', 'social_media', 'gestor_trafego', 'operacional')
    )
  );

DROP POLICY IF EXISTS "staff insert own task attachments" ON operational_attachments;
CREATE POLICY "staff insert own task attachments"
  ON operational_attachments FOR INSERT
  WITH CHECK (
    auth.uid() = delivered_by OR
    auth.uid() IN (
      SELECT p.id FROM profiles p WHERE p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "admin manage attachments" ON operational_attachments;
CREATE POLICY "admin manage attachments"
  ON operational_attachments FOR ALL
  USING (
    auth.uid() IN (SELECT p.id FROM profiles p WHERE p.role = 'admin')
  );

-- ── RLS: work_sessions ────────────────────────────────────────────────────────

ALTER TABLE work_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user manage own sessions" ON work_sessions;
CREATE POLICY "user manage own sessions"
  ON work_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin read all sessions" ON work_sessions;
CREATE POLICY "admin read all sessions"
  ON work_sessions FOR SELECT
  USING (
    auth.uid() IN (SELECT p.id FROM profiles p WHERE p.role = 'admin')
  );

-- ── Reload PostgREST schema cache ─────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
