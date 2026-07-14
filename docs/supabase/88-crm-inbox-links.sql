-- ============================================================
-- SQL 88 — CRM Inbox Links
-- Vincula conversas de atendimento (Chatwoot) a entidades
-- do LOKAT OS (leads, clientes, tarefas, campanhas).
-- ============================================================
-- STATUS: PROPOSTA — NÃO EXECUTAR
-- Criado em: 2026-07-13
-- Sprint: V2.1 — CRM Inbox
-- Bloqueador: Chatwoot não instalado; SQL 86 não executado
-- ============================================================

-- =============================================
-- BLOCO 1: conversation_links
-- =============================================

CREATE TABLE IF NOT EXISTS conversation_links (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider                text NOT NULL DEFAULT 'chatwoot',
  external_conversation_id text NOT NULL,           -- ID da conversa no Chatwoot
  client_id               uuid REFERENCES clients(id) ON DELETE SET NULL,
  lead_id                 uuid,                     -- futuro: launch_waitlist.id
  opportunity_id          uuid,                     -- futuro: opportunities.id
  task_id                 uuid REFERENCES operational_tasks(id) ON DELETE SET NULL,
  campaign_id             uuid,                     -- futuro: campaigns.id
  assigned_profile_id     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status                  text NOT NULL DEFAULT 'open',  -- open, resolved, pending
  last_message_at         timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_links_client
  ON conversation_links (client_id, status, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_links_assigned
  ON conversation_links (assigned_profile_id, status);

ALTER TABLE conversation_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages conversation links"
  ON conversation_links
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Assigned user can view own conversations"
  ON conversation_links
  FOR SELECT
  TO authenticated
  USING (assigned_profile_id = auth.uid());

-- =============================================
-- ROLLBACK
-- =============================================
-- DROP TABLE IF EXISTS conversation_links;
