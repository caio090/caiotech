-- 21-operational-format-based-attachments.sql
-- Adds format-aware delivery tracking columns to operational_attachments
-- and carousel_pages_count to operational_tasks / content_items.
-- Safe to run multiple times (IF NOT EXISTS / DROP POLICY + CREATE POLICY).

-- ── operational_attachments: asset variant & carousel page ────

ALTER TABLE operational_attachments ADD COLUMN IF NOT EXISTS asset_variant text;
ALTER TABLE operational_attachments ADD COLUMN IF NOT EXISTS page_number   int;

COMMENT ON COLUMN operational_attachments.asset_variant IS
  'Variant type: feed, stories, reels, carousel_page, thumbnail, ads, print, outdoor, banner, other';
COMMENT ON COLUMN operational_attachments.page_number IS
  'Page index for carousel deliveries (1-based). NULL for non-carousel formats.';

CREATE INDEX IF NOT EXISTS idx_op_attachments_task_variant
  ON operational_attachments(task_id, asset_variant);

-- ── operational_tasks: carousel page count ────────────────────

ALTER TABLE operational_tasks ADD COLUMN IF NOT EXISTS carousel_pages_count int;

COMMENT ON COLUMN operational_tasks.carousel_pages_count IS
  'Number of pages expected for carousel deliveries. Populated from ContentOS.';

-- ── content_items: carousel page count (optional mirror) ──────

ALTER TABLE content_items ADD COLUMN IF NOT EXISTS carousel_pages_count int;

COMMENT ON COLUMN content_items.carousel_pages_count IS
  'Number of slides for carousel content type. Set during content creation.';

-- ── Reload PostgREST schema cache ─────────────────────────────

NOTIFY pgrst, 'reload schema';
