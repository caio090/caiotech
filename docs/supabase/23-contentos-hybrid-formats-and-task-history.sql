-- 23-contentos-hybrid-formats-and-task-history.sql
-- Adds metadata to content_items for hybrid/multichannel formats
-- operational_tasks.brief (already jsonb) stores hybrid format info
-- Run once in Supabase SQL Editor

ALTER TABLE content_items ADD COLUMN IF NOT EXISTS metadata jsonb;

CREATE INDEX IF NOT EXISTS idx_content_items_metadata ON content_items USING GIN (metadata);

-- operational_tasks already has brief jsonb — hybrid data stored there:
-- brief.formats = ["feed","stories","ads"]
-- brief.is_hybrid = true
-- brief.carousel_pages_count = 3
-- brief.required_assets = ["feed","stories","ads"]

NOTIFY pgrst, 'reload schema';
