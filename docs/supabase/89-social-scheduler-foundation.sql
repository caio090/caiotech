-- ============================================================
-- SQL 89 — Social Scheduler Foundation
-- Tabelas para publicações agendadas, tentativas e
-- links de canais sociais.
-- ============================================================
-- STATUS: PROPOSTA — NÃO EXECUTAR
-- Criado em: 2026-07-13
-- Sprint: V2.1 — Social Scheduler
-- Bloqueador: Postiz não instalado; aprovação de fluxo pendente
-- ============================================================

-- =============================================
-- BLOCO 1: scheduled_publications
-- =============================================

CREATE TABLE IF NOT EXISTS scheduled_publications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  content_id          uuid,                         -- futuro: content_items.id
  campaign_id         uuid,                         -- futuro: campaigns.id
  provider            text NOT NULL DEFAULT 'postiz-disabled',
  external_post_id    text,                         -- ID do post no provider externo
  channel             text NOT NULL,                -- instagram_feed, tiktok, etc.
  status              text NOT NULL DEFAULT 'draft',
  -- draft, internal_review, internal_approved, client_review,
  -- client_approved, ready_to_schedule, scheduled, published, failed
  approved_by         uuid REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at         timestamptz,
  scheduled_at        timestamptz,
  published_at        timestamptz,
  copy_snapshot       text,                         -- cópia do texto no momento do agendamento
  assets_snapshot     jsonb DEFAULT '[]',           -- URLs dos arquivos aprovados
  error_message       text,
  attempts            int NOT NULL DEFAULT 0,
  created_by          uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_publications_client
  ON scheduled_publications (client_id, status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_scheduled_publications_external
  ON scheduled_publications (provider, external_post_id)
  WHERE external_post_id IS NOT NULL;

ALTER TABLE scheduled_publications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages scheduled publications"
  ON scheduled_publications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- =============================================
-- BLOCO 2: publication_attempts
-- Registro de cada tentativa de publicação
-- =============================================

CREATE TABLE IF NOT EXISTS publication_attempts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id      uuid NOT NULL REFERENCES scheduled_publications(id) ON DELETE CASCADE,
  attempt_number      int NOT NULL,
  status              text NOT NULL,               -- success, failed, timeout
  error               text,
  provider_response   jsonb DEFAULT '{}',          -- resposta sanitizada do provider
  attempted_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_publication_attempts_pub
  ON publication_attempts (publication_id, attempt_number);

ALTER TABLE publication_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin views publication attempts"
  ON publication_attempts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- =============================================
-- BLOCO 3: social_channel_links
-- Registra os canais sociais conectados por cliente
-- =============================================

CREATE TABLE IF NOT EXISTS social_channel_links (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  provider            text NOT NULL DEFAULT 'postiz-disabled',
  channel             text NOT NULL,
  external_channel_id text,
  status              text NOT NULL DEFAULT 'not_configured',
  display_name        text,
  avatar_url          text,
  connected_by        uuid REFERENCES profiles(id) ON DELETE SET NULL,
  connected_at        timestamptz,
  last_sync_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, provider, channel)
);

ALTER TABLE social_channel_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages social channel links"
  ON social_channel_links
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- =============================================
-- ROLLBACK
-- =============================================
-- DROP TABLE IF EXISTS social_channel_links;
-- DROP TABLE IF EXISTS publication_attempts;
-- DROP TABLE IF EXISTS scheduled_publications;
