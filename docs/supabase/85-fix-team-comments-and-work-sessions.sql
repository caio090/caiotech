-- ════════════════════════════════════════════════════════════════════════════════
-- SQL 85 — Correção: comentários em tarefas (SQL 82) e sessões de trabalho (SQL 84)
-- PROPOSTA — não executar sem revisão do time
-- Gerado em: 2026-07-13
-- ════════════════════════════════════════════════════════════════════════════════
--
-- Contexto: SQL 82 e SQL 84 falharam com ERROR 42703 porque as tabelas
-- operational_task_comments e work_sessions já existiam no banco sem as
-- colunas is_internal e profile_id respectivamente. O CREATE TABLE IF NOT EXISTS
-- pulou a criação; as referências a essas colunas em índices e políticas falharam.
--
-- Este script adiciona as colunas faltantes e recria os objetos dependentes.
-- É idempotente: usa ADD COLUMN IF NOT EXISTS, DROP/CREATE para policies e
-- CREATE INDEX IF NOT EXISTS.
-- ════════════════════════════════════════════════════════════════════════════════

-- ── BLOCO 1: operational_task_comments — coluna is_internal (SQL 82) ─────────

-- 1a. Adicionar coluna faltante
ALTER TABLE operational_task_comments
  ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false;

-- 1b. Recriar políticas de RLS que referenciam is_internal
--     (dropar primeiro para garantir estado limpo caso alguma tenha sido criada parcialmente)

DROP POLICY IF EXISTS "otc_team_read"     ON operational_task_comments;
DROP POLICY IF EXISTS "otc_client_read"   ON operational_task_comments;
DROP POLICY IF EXISTS "otc_author_insert" ON operational_task_comments;
DROP POLICY IF EXISTS "otc_author_update" ON operational_task_comments;

-- Equipe interna vê todos os comentários
CREATE POLICY "otc_team_read" ON operational_task_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin', 'agency', 'operacional', 'team')
    )
  );

-- Clientes veem apenas comentários não-internos vinculados aos seus projetos
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

-- ── BLOCO 2: work_sessions — coluna profile_id (SQL 84) ─────────────────────

-- 2a. Adicionar coluna faltante
--     ATENÇÃO: se a tabela existente já tem uma coluna com semântica de "usuário"
--     (ex: user_id ou created_by), rever se um alias é mais adequado do que nova coluna.
ALTER TABLE work_sessions
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE;

-- 2b. Recriar índice que falhou (o CREATE no SQL 84 não foi executado)
CREATE INDEX IF NOT EXISTS ws_profile_idx ON work_sessions (profile_id, started_at DESC);

-- 2c. Recriar políticas de RLS para work_sessions (podem ter falhado após o índice)
DROP POLICY IF EXISTS "ws_own_read"   ON work_sessions;
DROP POLICY IF EXISTS "ws_own_write"  ON work_sessions;
DROP POLICY IF EXISTS "ws_own_update" ON work_sessions;

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

-- ════════════════════════════════════════════════════════════════════════════════
-- Fim SQL 85
-- ════════════════════════════════════════════════════════════════════════════════
