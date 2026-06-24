-- ── SQL 16: ContentOS Production Cycle Columns ───────────────────────────────
-- Run this migration after SQL 14 (approval timing columns).
-- Adds production tracking fields to content_items and operational_tasks.

-- 1. production_completed_at — timestamp when operacional marked task concluido
ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS production_completed_at TIMESTAMPTZ;

-- 2. scheduled_channel — channel confirmed at scheduling time (may differ from original)
ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS scheduled_channel TEXT;

-- 3. content_item_id on operational_tasks (FK back to content_items)
--    May already exist; IF NOT EXISTS guard prevents errors.
ALTER TABLE operational_tasks
  ADD COLUMN IF NOT EXISTS content_item_id UUID REFERENCES content_items(id) ON DELETE SET NULL;

-- 4. Index for joining operational_tasks → content_items
CREATE INDEX IF NOT EXISTS idx_operational_tasks_content_item_id
  ON operational_tasks(content_item_id)
  WHERE content_item_id IS NOT NULL;

-- 5. Index for filtering content_items by status (used in pronto_para_agendar queries)
CREATE INDEX IF NOT EXISTS idx_content_items_status
  ON content_items(status);

-- 6. RLS: ensure content_items policies allow status updates from authenticated users
--    (policies already exist from SQL 05/06 — no changes needed)
