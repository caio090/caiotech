-- ════════════════════════════════════════════════════════════════════════════════
-- SQL 82 — Especialidades de profissionais e comentários em tarefas
-- PROPOSTA — não executar sem revisão do time
-- Gerado em: 2026-07-13
-- ════════════════════════════════════════════════════════════════════════════════
--
-- Objetivo: adicionar sistema de especialidades ao perfil de profissionais
--   e habilitar comentários em tarefas operacionais.
--
-- Dependências: SQL 06 (operational_tasks), SQL 10 (profiles/roles)
-- ════════════════════════════════════════════════════════════════════════════════

-- ── 1. Especialidades de profissionais ───────────────────────────────────────
--
--   Tabela de especialidades disponíveis na plataforma.

CREATE TABLE IF NOT EXISTS professional_specialties (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  label       text NOT NULL,
  description text,
  category    text CHECK (category IN (
    'producao_audiovisual', 'marketing_digital', 'design', 'gestao',
    'comercial', 'tecnologia', 'conteudo', 'outros'
  )),
  active      boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0
);

-- Especialidades iniciais
INSERT INTO professional_specialties (slug, label, category, sort_order) VALUES
  ('video_editing',       'Edição de Vídeo',            'producao_audiovisual', 10),
  ('motion_graphics',     'Motion Graphics / After Effects', 'producao_audiovisual', 20),
  ('camera_operator',     'Operador de Câmera',          'producao_audiovisual', 30),
  ('photo_editing',       'Edição de Foto',              'producao_audiovisual', 40),
  ('social_media',        'Social Media',                'marketing_digital',    10),
  ('traffic_manager',     'Gestor de Tráfego Pago',      'marketing_digital',    20),
  ('seo_specialist',      'Especialista SEO',            'marketing_digital',    30),
  ('content_writer',      'Copywriter / Redator',        'conteudo',             10),
  ('graphic_design',      'Design Gráfico',              'design',               10),
  ('ui_ux',               'UI / UX Design',              'design',               20),
  ('account_manager',     'Atendimento / Account',       'gestao',               10),
  ('project_manager',     'Gestão de Projetos',          'gestao',               20),
  ('sales',               'Vendas / Comercial',          'comercial',            10),
  ('web_dev',             'Desenvolvimento Web',         'tecnologia',           10)
ON CONFLICT (slug) DO NOTHING;

-- Tabela de vínculo perfil ↔ especialidade (N:N)
CREATE TABLE IF NOT EXISTS profile_specialties (
  profile_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  specialty_id  uuid NOT NULL REFERENCES professional_specialties(id) ON DELETE CASCADE,
  proficiency   text CHECK (proficiency IN ('iniciante', 'intermediario', 'avancado', 'especialista')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, specialty_id)
);

ALTER TABLE profile_specialties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profile_specialties_own_read" ON profile_specialties
  FOR SELECT USING (profile_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

CREATE POLICY "profile_specialties_own_write" ON profile_specialties
  FOR ALL USING (profile_id = auth.uid());

-- ── 2. Comentários em tarefas operacionais ────────────────────────────────────

CREATE TABLE IF NOT EXISTS operational_task_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid NOT NULL REFERENCES operational_tasks(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  body        text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,  -- true = só equipe interna vê
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS otc_task_id_idx ON operational_task_comments (task_id, created_at);

ALTER TABLE operational_task_comments ENABLE ROW LEVEL SECURITY;

-- Equipe interna vê todos os comentários; clientes só veem is_internal=false
CREATE POLICY "otc_team_read" ON operational_task_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin', 'agency', 'operacional', 'team')
    )
  );

CREATE POLICY "otc_client_read" ON operational_task_comments
  FOR SELECT USING (
    is_internal = false
    AND EXISTS (
      SELECT 1 FROM operational_tasks ot
      JOIN clients c ON c.id = ot.client_id
      WHERE ot.id = task_id
        AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "otc_author_insert" ON operational_task_comments
  FOR INSERT WITH CHECK (author_id = auth.uid());

CREATE POLICY "otc_author_update" ON operational_task_comments
  FOR UPDATE USING (author_id = auth.uid());

-- ── 3. Campo profile_id em tarefas (assignment melhorado) ────────────────────
--
--   operational_tasks já tem assigned_to (text). Este campo liga ao profiles.id
--   para permitir avatar, nome e especialidade do responsável.

ALTER TABLE operational_tasks
  ADD COLUMN IF NOT EXISTS assigned_profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ot_assigned_profile_id_idx ON operational_tasks (assigned_profile_id)
  WHERE assigned_profile_id IS NOT NULL;

-- ════════════════════════════════════════════════════════════════════════════════
-- Fim SQL 82
-- ════════════════════════════════════════════════════════════════════════════════
