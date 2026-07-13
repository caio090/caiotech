-- ════════════════════════════════════════════════════════════════════════════════
-- SQL 81 — Aquisição, CRM e rastreamento de origem
-- PROPOSTA — não executar sem revisão do time
-- Gerado em: 2026-07-13
-- ════════════════════════════════════════════════════════════════════════════════
--
-- Objetivo: expandir launch_waitlist com campos de Instagram e UTM,
--   adicionar perfis "company" e "lokat_client" ao check constraint,
--   e criar tabela de eventos de CRM para rastrear ações sobre leads.
--
-- Dependências: SQL 73 (launch_waitlist), SQL 74 (policies)
-- ════════════════════════════════════════════════════════════════════════════════

-- ── 1. Ampliar campos de identificação em launch_waitlist ─────────────────────

ALTER TABLE launch_waitlist
  ADD COLUMN IF NOT EXISTS instagram_username  text,
  ADD COLUMN IF NOT EXISTS utm_source          text,
  ADD COLUMN IF NOT EXISTS utm_medium          text,
  ADD COLUMN IF NOT EXISTS utm_campaign        text,
  ADD COLUMN IF NOT EXISTS utm_content         text,
  ADD COLUMN IF NOT EXISTS utm_term            text,
  ADD COLUMN IF NOT EXISTS referrer            text;

-- ── 2. Ampliar enum de account_type para incluir company e lokat_client ───────
--
--   Remover constraint antiga e adicionar nova com os 6 valores válidos.
--   ATENÇÃO: valores existentes 'business' e 'interested' permanecem válidos
--   (dados históricos não são afetados).

ALTER TABLE launch_waitlist
  DROP CONSTRAINT IF EXISTS launch_waitlist_account_type_check;

ALTER TABLE launch_waitlist
  ADD CONSTRAINT launch_waitlist_account_type_check
  CHECK (account_type IN (
    'agency',
    'business',
    'company',
    'professional',
    'interested',
    'lokat_client'
  ));

-- ── 3. Tabela de eventos de CRM ───────────────────────────────────────────────
--
--   Registra ações sobre leads: contato, convite, agendamento, conversão.

CREATE TABLE IF NOT EXISTS crm_lead_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      uuid NOT NULL REFERENCES launch_waitlist(id) ON DELETE CASCADE,
  actor_id     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  event_type   text NOT NULL CHECK (event_type IN (
    'contacted', 'invited', 'demo_scheduled', 'converted',
    'archived', 'note', 'status_changed', 'profile_changed'
  )),
  previous_value text,
  new_value      text,
  notes          text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_lead_events_lead_id_idx ON crm_lead_events (lead_id);
CREATE INDEX IF NOT EXISTS crm_lead_events_created_at_idx ON crm_lead_events (created_at DESC);

-- RLS: leitura para admin/super_admin/agency; escrita para o mesmo grupo
ALTER TABLE crm_lead_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_events_read" ON crm_lead_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin', 'agency', 'operacional')
    )
  );

CREATE POLICY "crm_events_insert" ON crm_lead_events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin', 'agency')
    )
  );

-- ── 4. Índices adicionais em launch_waitlist ──────────────────────────────────

CREATE INDEX IF NOT EXISTS launch_waitlist_source_idx        ON launch_waitlist (source);
CREATE INDEX IF NOT EXISTS launch_waitlist_account_type_idx  ON launch_waitlist (account_type);
CREATE INDEX IF NOT EXISTS launch_waitlist_instagram_idx      ON launch_waitlist (instagram_username)
  WHERE instagram_username IS NOT NULL;

-- ════════════════════════════════════════════════════════════════════════════════
-- Fim SQL 81
-- ════════════════════════════════════════════════════════════════════════════════
