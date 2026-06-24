-- ============================================================
-- LOKAT OS — SQL 14: ContentOS Approval & Production Flow
-- File: docs/supabase/14-contentos-approval-production-flow.sql
--
-- Adiciona colunas de tempo de aprovação e agendamento.
-- Safe to re-run: uses ADD COLUMN IF NOT EXISTS + UPDATE WHERE NULL.
-- ============================================================

-- ── 1. approvals: timing de envio e prazo ────────────────────
--    approval_sent_at: quando o conteúdo foi enviado ao cliente
--    approval_due_at:  prazo de 48h para o cliente responder

ALTER TABLE public.approvals
  ADD COLUMN IF NOT EXISTS approval_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_due_at  TIMESTAMPTZ;

-- Backfill: registros existentes usam created_at como sent_at
-- e created_at + 48h como prazo
UPDATE public.approvals
SET
  approval_sent_at = created_at,
  approval_due_at  = created_at + INTERVAL '48 hours'
WHERE approval_sent_at IS NULL;

-- ── 2. content_items: campos de agendamento com hora ─────────
--    scheduled_at:     data + hora exata de publicação
--    scheduled_format: formato final (Reels, Feed, Story, etc.)

ALTER TABLE public.content_items
  ADD COLUMN IF NOT EXISTS scheduled_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_format TEXT;

-- ── 3. Índices de performance ─────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_approvals_approval_sent_at
  ON public.approvals(approval_sent_at);

CREATE INDEX IF NOT EXISTS idx_approvals_approval_due_at
  ON public.approvals(approval_due_at);

CREATE INDEX IF NOT EXISTS idx_content_items_status
  ON public.content_items(status);

CREATE INDEX IF NOT EXISTS idx_content_items_scheduled_at
  ON public.content_items(scheduled_at)
  WHERE scheduled_at IS NOT NULL;

-- ── 4. Notificar PostgREST ────────────────────────────────────

NOTIFY pgrst, 'reload schema';
