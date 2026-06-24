-- ============================================================
-- SQL 18 — ContentOS Architecture & Permissions
-- ============================================================
-- Adds: content_campaigns table, content_distribution table,
--       campaign_id FK on content_items, indexes, and RLS.
-- Safe to re-run: uses IF NOT EXISTS / IF EXISTS guards.
-- ============================================================

-- ── 1. content_campaigns ────────────────────────────────────

CREATE TABLE IF NOT EXISTS content_campaigns (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  objective    TEXT,
  status       TEXT        NOT NULL DEFAULT 'planejada'
    CHECK (status IN ('planejada', 'ativa', 'pausada', 'finalizada')),
  start_date   DATE,
  end_date     DATE,
  budget       NUMERIC(12, 2),
  channel      TEXT,
  notes        TEXT,
  created_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_campaigns_client_id
  ON content_campaigns (client_id);

CREATE INDEX IF NOT EXISTS idx_content_campaigns_status
  ON content_campaigns (status);

-- ── 2. campaign_id FK on content_items ──────────────────────

ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES content_campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_content_items_campaign_id
  ON content_items (campaign_id);

-- ── 3. content_distribution ─────────────────────────────────

CREATE TABLE IF NOT EXISTS content_distribution (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id  UUID        NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  client_id        UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  campaign_id      UUID        REFERENCES content_campaigns(id) ON DELETE SET NULL,
  objective        TEXT,
  audience         TEXT,
  budget           NUMERIC(12, 2),
  channel          TEXT,
  status           TEXT        NOT NULL DEFAULT 'sugerido'
    CHECK (status IN ('sugerido', 'aprovado', 'rodando', 'pausado', 'finalizado')),
  approved_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at      TIMESTAMPTZ,
  external_ad_id   TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_distribution_client_id
  ON content_distribution (client_id);

CREATE INDEX IF NOT EXISTS idx_content_distribution_content_item_id
  ON content_distribution (content_item_id);

CREATE INDEX IF NOT EXISTS idx_content_distribution_status
  ON content_distribution (status);

-- ── 4. updated_at triggers ──────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_content_campaigns_updated_at ON content_campaigns;
CREATE TRIGGER trg_content_campaigns_updated_at
  BEFORE UPDATE ON content_campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_content_distribution_updated_at ON content_distribution;
CREATE TRIGGER trg_content_distribution_updated_at
  BEFORE UPDATE ON content_distribution
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 5. RLS — content_campaigns ──────────────────────────────

ALTER TABLE content_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "content_campaigns_admin_all"  ON content_campaigns;
DROP POLICY IF EXISTS "content_campaigns_staff_read" ON content_campaigns;
DROP POLICY IF EXISTS "content_campaigns_client_read" ON content_campaigns;

CREATE POLICY "content_campaigns_admin_all"
  ON content_campaigns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "content_campaigns_staff_read"
  ON content_campaigns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('operacional','social_media','designer','editor','videomaker','gestor_trafego')
    )
  );

CREATE POLICY "content_campaigns_client_read"
  ON content_campaigns FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE owner_id = auth.uid()
    )
  );

-- ── 6. RLS — content_distribution ───────────────────────────

ALTER TABLE content_distribution ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "content_distribution_admin_all"  ON content_distribution;
DROP POLICY IF EXISTS "content_distribution_staff_read" ON content_distribution;
DROP POLICY IF EXISTS "content_distribution_client_read" ON content_distribution;

CREATE POLICY "content_distribution_admin_all"
  ON content_distribution FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "content_distribution_staff_read"
  ON content_distribution FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('operacional','social_media','designer','editor','videomaker','gestor_trafego')
    )
  );

CREATE POLICY "content_distribution_client_read"
  ON content_distribution FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE owner_id = auth.uid()
    )
  );

-- ── 7. Reload PostgREST schema cache ────────────────────────

NOTIFY pgrst, 'reload schema';
