-- ============================================================
-- SQL 87 — EditorOS Foundation
-- Tabelas para projetos de design, versões, templates e
-- diretrizes de marca.
-- ============================================================
-- STATUS: PROPOSTA — NÃO EXECUTAR
-- Criado em: 2026-07-13
-- Sprint: V2.1 — EditorOS
-- Bloqueador: motor de design não licenciado; SQL 86 não executado
-- ============================================================

-- =============================================
-- BLOCO 1: design_projects
-- =============================================

CREATE TABLE IF NOT EXISTS design_projects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  campaign_id     uuid,                             -- futuro: campaigns.id
  content_id      uuid,                             -- futuro: content_items.id
  briefing_id     uuid,                             -- futuro: briefings.id
  title           text NOT NULL,
  format          text NOT NULL,                    -- feed_square, story_vertical, etc.
  width           int NOT NULL,
  height          int NOT NULL,
  provider        text NOT NULL DEFAULT 'disabled', -- provider ativo no momento da criação
  external_project_id text,                         -- ID do projeto no provider externo
  thumbnail_url   text,
  status          text NOT NULL DEFAULT 'draft',    -- draft, in_review, approved, archived
  created_by      uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_design_projects_client
  ON design_projects (client_id, status, created_at DESC);

ALTER TABLE design_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages design projects"
  ON design_projects
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
-- BLOCO 2: design_versions
-- =============================================

CREATE TABLE IF NOT EXISTS design_versions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  design_project_id uuid NOT NULL REFERENCES design_projects(id) ON DELETE CASCADE,
  version         int NOT NULL DEFAULT 1,
  provider_data   jsonb DEFAULT '{}',               -- estado do projeto no provider
  preview_url     text,
  export_url      text,
  created_by      uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_design_versions_project
  ON design_versions (design_project_id, version DESC);

ALTER TABLE design_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages design versions"
  ON design_versions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN design_projects dp ON dp.id = design_versions.design_project_id
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'super_admin')
    )
  );

-- =============================================
-- BLOCO 3: design_templates
-- =============================================

CREATE TABLE IF NOT EXISTS design_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid REFERENCES clients(id) ON DELETE CASCADE,   -- NULL = global
  agency_id       uuid,                             -- futuro: agencies.id
  name            text NOT NULL,
  category        text,
  format          text NOT NULL,
  provider        text NOT NULL,
  provider_template_id text,
  thumbnail_url   text,
  is_global       boolean NOT NULL DEFAULT false,
  created_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE design_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages templates"
  ON design_templates
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
-- DROP TABLE IF EXISTS design_templates;
-- DROP TABLE IF EXISTS design_versions;
-- DROP TABLE IF EXISTS design_projects;
