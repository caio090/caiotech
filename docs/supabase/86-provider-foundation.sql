-- ============================================================
-- SQL 86 — Provider Foundation
-- Tabelas para registro de conexões com providers externos,
-- links de recursos e eventos de webhook.
-- ============================================================
-- STATUS: PROPOSTA — NÃO EXECUTAR
-- Criado em: 2026-07-13
-- Sprint: V2.1 — Arquitetura Modular
-- Bloqueado: aguarda aprovação do time
-- ============================================================

-- =============================================
-- BLOCO 1: integration_connections
-- Registra conexões ativas com providers externos
-- =============================================

CREATE TABLE IF NOT EXISTS integration_connections (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  profile_id      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  provider        text NOT NULL,                    -- 'chatwoot', 'postiz', 'cesdk', etc.
  category        text NOT NULL,                    -- 'design_editor', 'customer_inbox', 'social_scheduler'
  status          text NOT NULL DEFAULT 'not_configured',
  external_account_id text,                         -- ID da conta no sistema externo
  external_workspace_id text,                       -- ID do workspace no sistema externo
  capabilities    jsonb NOT NULL DEFAULT '[]',      -- capabilities disponíveis
  metadata        jsonb DEFAULT '{}',               -- configurações não-sensíveis
  secret_reference text,                            -- referência ao secret (ex: AWS Secrets Manager key) — nunca o valor
  connected_by    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  connected_at    timestamptz,
  last_sync_at    timestamptz,
  error_code      text,
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_connections_client
  ON integration_connections (client_id);

CREATE INDEX IF NOT EXISTS idx_integration_connections_provider
  ON integration_connections (provider, status);

-- RLS
ALTER TABLE integration_connections ENABLE ROW LEVEL SECURITY;

-- Admins e super_admin veem todas as conexões
CREATE POLICY "Admin can manage integration connections"
  ON integration_connections
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
-- BLOCO 2: integration_webhook_events
-- Registro de eventos recebidos de providers externos
-- =============================================

CREATE TABLE IF NOT EXISTS integration_webhook_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider        text NOT NULL,
  event_type      text NOT NULL,
  idempotency_key text UNIQUE,                      -- previne processamento duplo
  client_id       uuid REFERENCES clients(id) ON DELETE SET NULL,
  status          text NOT NULL DEFAULT 'received', -- received, processed, failed, dead_letter
  attempts        int NOT NULL DEFAULT 0,
  received_at     timestamptz NOT NULL DEFAULT now(),
  processed_at    timestamptz,
  error           text,
  payload_sanitized jsonb DEFAULT '{}'              -- payload sem secrets/tokens
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_provider
  ON integration_webhook_events (provider, status, received_at);

CREATE INDEX IF NOT EXISTS idx_webhook_events_idempotency
  ON integration_webhook_events (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE integration_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view webhook events"
  ON integration_webhook_events
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
-- BLOCO 3: provider_user_links
-- Mapeamento de usuários LOKAT OS para usuários em sistemas externos (SSO)
-- =============================================

CREATE TABLE IF NOT EXISTS provider_user_links (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider            text NOT NULL,
  external_user_id    text NOT NULL,
  external_workspace_id text,
  status              text NOT NULL DEFAULT 'active', -- active, revoked, expired
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, provider)
);

ALTER TABLE provider_user_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own provider links"
  ON provider_user_links
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Admin manages provider links"
  ON provider_user_links
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
-- ROLLBACK (comentado — executar se necessário reverter)
-- =============================================
-- DROP TABLE IF EXISTS provider_user_links;
-- DROP TABLE IF EXISTS integration_webhook_events;
-- DROP TABLE IF EXISTS integration_connections;
