-- ============================================================
-- SQL 74 — Reparo das políticas da launch_waitlist
-- Idempotente. Rodar se o SQL 73 foi aplicado mas inscrições
-- públicas ainda falham ou o painel admin mostra 0 registros.
-- ============================================================

-- ── 1. Garantir que a tabela existe (se SQL 73 não rodou) ────
CREATE TABLE IF NOT EXISTS public.launch_waitlist (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text        NOT NULL,
  email           text        NOT NULL,
  phone           text        NULL,
  account_type    text        NOT NULL DEFAULT 'interested'
    CHECK (account_type IN ('agency', 'business', 'professional', 'interested')),
  city            text        NULL,
  segment         text        NULL,
  interest        text        NULL,
  social_or_site  text        NULL,
  source          text        NULL,
  utm_source      text        NULL,
  utm_medium      text        NULL,
  utm_campaign    text        NULL,
  status          text        NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'invited', 'accepted', 'rejected', 'archived')),
  beta_months_granted integer NOT NULL DEFAULT 0,
  notes           text        NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 2. Índice único de e-mail (idempotente, via DO block) ────
-- Verifica duplicatas antes de criar o índice.
-- Se houver duplicatas, emite NOTICE e NÃO altera dados.
DO $$
DECLARE
  duplicate_count integer;
BEGIN
  SELECT count(*)
  INTO duplicate_count
  FROM (
    SELECT lower(trim(email)) AS normalized_email
    FROM public.launch_waitlist
    WHERE email IS NOT NULL AND trim(email) <> ''
    GROUP BY lower(trim(email))
    HAVING count(*) > 1
  ) d;

  IF duplicate_count = 0 THEN
    -- Sem duplicatas: cria o índice único com segurança
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE tablename = 'launch_waitlist'
        AND indexname  = 'launch_waitlist_email_unique_idx'
    ) THEN
      EXECUTE 'CREATE UNIQUE INDEX launch_waitlist_email_unique_idx
               ON public.launch_waitlist (lower(trim(email)))';
      RAISE NOTICE 'Índice único criado: launch_waitlist_email_unique_idx';
    ELSE
      RAISE NOTICE 'Índice launch_waitlist_email_unique_idx já existe — nenhuma alteração.';
    END IF;
  ELSE
    RAISE NOTICE 'launch_waitlist possui % email(s) duplicado(s). Índice único não criado automaticamente. Resolva as duplicatas manualmente antes de rodar novamente.', duplicate_count;
  END IF;
END $$;

-- ── 3. Índices auxiliares ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_waitlist_status    ON public.launch_waitlist(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_created   ON public.launch_waitlist(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waitlist_acct_type ON public.launch_waitlist(account_type);

-- ── 4. Habilitar RLS ──────────────────────────────────────────
ALTER TABLE public.launch_waitlist ENABLE ROW LEVEL SECURITY;

-- ── 5. Recriar políticas de forma limpa ──────────────────────

-- Admin via RLS (service role bypassa RLS, mas mantido para consistência)
DROP POLICY IF EXISTS "waitlist_admin_all"    ON public.launch_waitlist;
CREATE POLICY "waitlist_admin_all"
  ON public.launch_waitlist FOR ALL
  USING (public.current_user_role() IN ('super_admin', 'admin'));

-- Insert público controlado (API valida e usa service role;
-- policy como garantia para fallback com anon key)
DROP POLICY IF EXISTS "waitlist_public_insert" ON public.launch_waitlist;
CREATE POLICY "waitlist_public_insert"
  ON public.launch_waitlist FOR INSERT
  WITH CHECK (true);

-- ── 6. Grants explícitos ──────────────────────────────────────
GRANT INSERT ON public.launch_waitlist TO anon;
GRANT ALL    ON public.launch_waitlist TO service_role;

-- ── 7. Trigger de updated_at ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_waitlist_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_waitlist_updated_at ON public.launch_waitlist;
CREATE TRIGGER trg_waitlist_updated_at
  BEFORE UPDATE ON public.launch_waitlist
  FOR EACH ROW EXECUTE FUNCTION public.set_waitlist_updated_at();

-- ── 8. Diagnóstico: contagem de registros ─────────────────────
SELECT
  count(*)                                              AS total_registros,
  count(*) FILTER (WHERE status = 'new')               AS novos,
  count(*) FILTER (WHERE status = 'contacted')         AS contatados,
  count(*) FILTER (WHERE status = 'invited')           AS convidados,
  count(*) FILTER (WHERE status = 'accepted')          AS aceitos,
  min(created_at)                                       AS primeiro_registro,
  max(created_at)                                       AS ultimo_registro
FROM public.launch_waitlist;

-- ============================================================
-- COMO RODAR
-- 1. Abra uma NOVA query no Supabase SQL Editor (aba nova!).
-- 2. Cole este arquivo inteiro.
-- 3. Clique em Run.
-- 4. Resultado esperado: Success. + uma linha com contagem.
-- 5. Se houver emails duplicados, o SQL exibirá NOTICE e não
--    criará o índice único até resolver manualmente.
--    Nenhum dado é apagado ou alterado automaticamente.
-- 6. Se total_registros = 0 após inscrição real → confirmar que
--    SUPABASE_SERVICE_ROLE_KEY está configurada na Vercel
--    (Settings → Environment Variables → All environments).
-- ============================================================
