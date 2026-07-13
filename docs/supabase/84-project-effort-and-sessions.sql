-- ════════════════════════════════════════════════════════════════════════════════
-- SQL 84 — Time tracking, esforço por área e previsão de entrega
-- PROPOSTA — não executar sem revisão do time
-- Gerado em: 2026-07-13
-- ════════════════════════════════════════════════════════════════════════════════
--
-- Objetivo: registrar sessões de trabalho por tarefa/área, calcular esforço
--   acumulado e gerar previsão de entrega baseada em velocidade histórica.
--
-- Dependências: SQL 06 (operational_tasks), SQL 10 (profiles)
-- ════════════════════════════════════════════════════════════════════════════════

-- ── 1. Sessões de trabalho ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS work_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         uuid REFERENCES operational_tasks(id) ON DELETE SET NULL,
  client_id       uuid REFERENCES clients(id) ON DELETE SET NULL,
  profile_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  area            text CHECK (area IN (
    'contentos', 'rec_os', 'crm', 'onboarding', 'meta',
    'relatorios', 'billing', 'suporte', 'reuniao', 'outros'
  )),
  started_at      timestamptz NOT NULL DEFAULT now(),
  ended_at        timestamptz,
  duration_min    integer GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (ended_at - started_at)) / 60
  ) STORED,
  notes           text,
  source          text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'git_commit', 'calendar'))
);

CREATE INDEX IF NOT EXISTS ws_profile_idx ON work_sessions (profile_id, started_at DESC);
CREATE INDEX IF NOT EXISTS ws_task_idx    ON work_sessions (task_id) WHERE task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ws_client_idx  ON work_sessions (client_id) WHERE client_id IS NOT NULL;

ALTER TABLE work_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ws_own_read" ON work_sessions
  FOR SELECT USING (
    profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "ws_own_write" ON work_sessions
  FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "ws_own_update" ON work_sessions
  FOR UPDATE USING (profile_id = auth.uid() AND ended_at IS NULL);

-- ── 2. Estimativas de esforço por tarefa ──────────────────────────────────────

ALTER TABLE operational_tasks
  ADD COLUMN IF NOT EXISTS estimated_hours  numeric(5,1),
  ADD COLUMN IF NOT EXISTS actual_hours     numeric(5,1),
  ADD COLUMN IF NOT EXISTS deadline         date;

-- ── 3. View de previsão de entrega por área ───────────────────────────────────
--
--   Agrega sessões por área e calcula velocidade média (horas/dia) nos
--   últimos 30 dias. Útil para estimar quando áreas pendentes serão concluídas.

CREATE OR REPLACE VIEW v_area_effort_forecast AS
SELECT
  area,
  COUNT(*)                                                           AS session_count,
  ROUND(SUM(duration_min)::numeric / 60, 1)                         AS total_hours,
  ROUND(AVG(duration_min)::numeric / 60, 2)                         AS avg_hours_per_session,
  ROUND(
    SUM(duration_min) FILTER (WHERE started_at > now() - interval '30 days')::numeric / 60 / 30,
    2
  )                                                                  AS hours_per_day_30d,
  MAX(started_at)                                                    AS last_session_at
FROM work_sessions
WHERE ended_at IS NOT NULL
GROUP BY area;

-- ── 4. Registro de sessões derivadas de commits (estimativa histórica) ─────────
--
--   Permite importar dados históricos com base em commits do git.
--   A resolução é 1 commit = 1 sessão estimada de 45min na área mapeada.
--
--   Uso: INSERT INTO work_sessions (profile_id, area, started_at, ended_at, source, notes)
--     VALUES ('<uuid>', 'contentos', '<commit_date>', '<commit_date + 45min>', 'git_commit', '<sha> <msg>');

-- Nenhum DDL adicional necessário — o campo `source = 'git_commit'` cobre esse caso.

-- ════════════════════════════════════════════════════════════════════════════════
-- Fim SQL 84
-- ════════════════════════════════════════════════════════════════════════════════
