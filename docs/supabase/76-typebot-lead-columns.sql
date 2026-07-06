-- ============================================================
-- SQL 76 — Colunas adicionais para integração Typebot
-- Seguro: ADD COLUMN IF NOT EXISTS, indexes IF NOT EXISTS.
-- Não modifica colunas existentes nem remove dados.
-- ============================================================

-- ── 1. Colunas de contato e negócio ──────────────────────────
ALTER TABLE public.launch_waitlist
  ADD COLUMN IF NOT EXISTS whatsapp      text NULL,
  ADD COLUMN IF NOT EXISTS business_name text NULL,
  ADD COLUMN IF NOT EXISTS business_type text NULL,
  ADD COLUMN IF NOT EXISTS main_problem  text NULL;

-- ── 2. Colunas de canal e pipeline ───────────────────────────
ALTER TABLE public.launch_waitlist
  ADD COLUMN IF NOT EXISTS channel    text NOT NULL DEFAULT 'site',
  ADD COLUMN IF NOT EXISTS stage      text NOT NULL DEFAULT 'captured',
  ADD COLUMN IF NOT EXISTS lead_score integer NOT NULL DEFAULT 0;

-- ── 3. UTM estendido ─────────────────────────────────────────
ALTER TABLE public.launch_waitlist
  ADD COLUMN IF NOT EXISTS utm_content text NULL,
  ADD COLUMN IF NOT EXISTS utm_term    text NULL;

-- ── 4. Rastreamento de origem ─────────────────────────────────
ALTER TABLE public.launch_waitlist
  ADD COLUMN IF NOT EXISTS referrer     text NULL,
  ADD COLUMN IF NOT EXISTS landing_path text NULL;

-- ── 5. IDs do Typebot ─────────────────────────────────────────
ALTER TABLE public.launch_waitlist
  ADD COLUMN IF NOT EXISTS typebot_session_id text NULL,
  ADD COLUMN IF NOT EXISTS typebot_result_id  text NULL;

-- ── 6. Payloads JSON ──────────────────────────────────────────
ALTER TABLE public.launch_waitlist
  ADD COLUMN IF NOT EXISTS metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ── 7. Índices simples ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_waitlist_source
  ON public.launch_waitlist(source);

CREATE INDEX IF NOT EXISTS idx_waitlist_channel
  ON public.launch_waitlist(channel);

CREATE INDEX IF NOT EXISTS idx_waitlist_lead_score
  ON public.launch_waitlist(lead_score DESC);

CREATE INDEX IF NOT EXISTS idx_waitlist_typebot_result
  ON public.launch_waitlist(typebot_result_id)
  WHERE typebot_result_id IS NOT NULL;

-- ── 8. Unique index parcial em typebot_result_id ─────────────
-- Usa DO block para evitar o erro "ADD CONSTRAINT IF NOT EXISTS"
-- que não é SQL padrão no PostgreSQL.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename   = 'launch_waitlist'
      AND indexname   = 'idx_waitlist_typebot_result_id_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_waitlist_typebot_result_id_unique
      ON public.launch_waitlist(typebot_result_id)
      WHERE typebot_result_id IS NOT NULL;
  END IF;
END $$;

-- ── 9. Diagnóstico: lista colunas após alteração ──────────────
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'launch_waitlist'
ORDER BY ordinal_position;

-- ============================================================
-- COMO RODAR
-- 1. Abra o Supabase SQL Editor em nova aba.
-- 2. Cole este arquivo inteiro e clique em Run.
-- 3. Resultado esperado: lista das colunas da tabela (sem erro).
-- 4. Após rodar, o endpoint /api/leads/typebot pode salvar
--    raw_payload, lead_score, typebot_session_id etc.
-- ============================================================
