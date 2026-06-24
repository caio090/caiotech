-- ============================================================
-- SQL 19 — AI Suggestions & Lokat Voice Tech
-- ============================================================
-- Adds: ai_suggestions table with RLS, indexes, and triggers.
-- Safe to re-run: all guards use IF NOT EXISTS / IF EXISTS.
-- ============================================================

-- ── 1. ai_suggestions ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_suggestions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID        REFERENCES clients(id) ON DELETE SET NULL,
  user_id          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  module           TEXT        NOT NULL,
  entity_type      TEXT,
  entity_id        UUID,
  title            TEXT        NOT NULL,
  description      TEXT,
  suggestion_type  TEXT,
  priority         TEXT        NOT NULL DEFAULT 'media'
    CHECK (priority IN ('baixa', 'media', 'alta', 'urgente')),
  source           TEXT,
  status           TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending', 'accepted', 'dismissed',
      'converted_to_task', 'converted_to_content',
      'converted_to_reminder', 'converted_to_followup'
    )),
  action_label     TEXT,
  action_url       TEXT,
  metadata         JSONB,
  created_by       TEXT        NOT NULL DEFAULT 'system',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  dismissed_at     TIMESTAMPTZ,
  accepted_at      TIMESTAMPTZ
);

-- ── 2. Indexes ──────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_client_id
  ON ai_suggestions (client_id);

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user_id
  ON ai_suggestions (user_id);

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_module
  ON ai_suggestions (module);

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_status
  ON ai_suggestions (status);

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_priority
  ON ai_suggestions (priority);

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_entity
  ON ai_suggestions (entity_type, entity_id);

-- ── 3. updated_at trigger ───────────────────────────────────

-- Reuse set_updated_at() from SQL 18 (already exists)
-- Only create trigger if not already present

DROP TRIGGER IF EXISTS trg_ai_suggestions_updated_at ON ai_suggestions;
CREATE TRIGGER trg_ai_suggestions_updated_at
  BEFORE UPDATE ON ai_suggestions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 4. RLS ──────────────────────────────────────────────────

ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;

-- Admin: full access
DROP POLICY IF EXISTS "ai_suggestions_admin_all" ON ai_suggestions;
CREATE POLICY "ai_suggestions_admin_all"
  ON ai_suggestions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Internal staff: read own module suggestions (linked by user_id or role)
DROP POLICY IF EXISTS "ai_suggestions_staff_read" ON ai_suggestions;
CREATE POLICY "ai_suggestions_staff_read"
  ON ai_suggestions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN (
          'operacional', 'social_media', 'designer',
          'editor', 'videomaker', 'gestor_trafego'
        )
    )
    AND (
      user_id = auth.uid()
      OR user_id IS NULL
    )
  );

-- Staff: update own suggestions (accept/dismiss)
DROP POLICY IF EXISTS "ai_suggestions_staff_update" ON ai_suggestions;
CREATE POLICY "ai_suggestions_staff_update"
  ON ai_suggestions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN (
          'operacional', 'social_media', 'designer',
          'editor', 'videomaker', 'gestor_trafego'
        )
    )
    AND user_id = auth.uid()
  );

-- Staff: insert own suggestions
DROP POLICY IF EXISTS "ai_suggestions_staff_insert" ON ai_suggestions;
CREATE POLICY "ai_suggestions_staff_insert"
  ON ai_suggestions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN (
          'operacional', 'social_media', 'designer',
          'editor', 'videomaker', 'gestor_trafego'
        )
    )
  );

-- Client: read ONLY safe external suggestions for own client_id
-- Never exposes internal team info, financial info, or gargalos
DROP POLICY IF EXISTS "ai_suggestions_client_read" ON ai_suggestions;
CREATE POLICY "ai_suggestions_client_read"
  ON ai_suggestions FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE owner_id = auth.uid()
    )
    AND module = 'cliente'
    AND suggestion_type NOT IN ('financial', 'commercial', 'productivity', 'workflow')
  );

-- ── 5. Reload PostgREST schema cache ────────────────────────

NOTIFY pgrst, 'reload schema';
