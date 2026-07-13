-- ════════════════════════════════════════════════════════════════════════════════
-- SQL 83 — REC OS: Reference Board aprimorado
-- PROPOSTA — não executar sem revisão do time
-- Gerado em: 2026-07-13
-- ════════════════════════════════════════════════════════════════════════════════
--
-- Objetivo: adicionar Pinterest como referência externa (link externo, sem scraping),
--   tags e coleções ao sistema de referências do REC OS.
--
-- Dependências: SQL 25 (recos / storyboard base)
-- ════════════════════════════════════════════════════════════════════════════════

-- ── 1. Verificar tabela de referências existente ──────────────────────────────
--
-- A tabela rec_references (ou similar) foi criada no SQL 25.
-- Este script a amplia sem destruir dados existentes.

-- Adicionar campos de metadata e Pinterest
ALTER TABLE rec_references
  ADD COLUMN IF NOT EXISTS reference_url    text,          -- link externo (Pinterest, Vimeo, Behance, etc.)
  ADD COLUMN IF NOT EXISTS platform         text CHECK (platform IN (
    'pinterest', 'instagram', 'vimeo', 'youtube', 'behance',
    'dribbble', 'tiktok', 'upload', 'link', 'outro'
  )),
  ADD COLUMN IF NOT EXISTS tags             text[],        -- ex: ['moody', 'neon', 'minimalista']
  ADD COLUMN IF NOT EXISTS color_palette    text[],        -- hex colors extraídos da referência
  ADD COLUMN IF NOT EXISTS mood             text,          -- ex: 'energético', 'suave', 'dramático'
  ADD COLUMN IF NOT EXISTS is_approved      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at      timestamptz;

-- ── 2. Tabela de coleções de referências ─────────────────────────────────────
--
--   Agrupa referências em boards temáticos por projeto.

CREATE TABLE IF NOT EXISTS rec_reference_collections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  cover_url   text,
  created_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Vínculo referência ↔ coleção (N:N)
CREATE TABLE IF NOT EXISTS rec_reference_collection_items (
  collection_id uuid NOT NULL REFERENCES rec_reference_collections(id) ON DELETE CASCADE,
  reference_id  uuid NOT NULL REFERENCES rec_references(id) ON DELETE CASCADE,
  sort_order    integer NOT NULL DEFAULT 0,
  PRIMARY KEY (collection_id, reference_id)
);

-- RLS para coleções (mesma política do cliente)
ALTER TABLE rec_reference_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rrc_team_access" ON rec_reference_collections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin', 'agency', 'operacional', 'team')
    )
  );

ALTER TABLE rec_reference_collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rrc_items_team_access" ON rec_reference_collection_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin', 'agency', 'operacional', 'team')
    )
  );

-- ── 3. Índices ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS rec_ref_platform_idx ON rec_references (platform)
  WHERE platform IS NOT NULL;

CREATE INDEX IF NOT EXISTS rec_ref_tags_idx ON rec_references USING GIN (tags)
  WHERE tags IS NOT NULL;

-- ════════════════════════════════════════════════════════════════════════════════
-- Fim SQL 83
-- ════════════════════════════════════════════════════════════════════════════════
