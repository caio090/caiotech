-- ============================================================
-- LOKAT OS — SQL 95 (PERSONAL STRATEGY OS — FASE 1A.3 — PROPOSTA)
-- gratitude_entries
--
-- PROPOSTA — NÃO EXECUTAR SEM APROVAÇÃO EXPLÍCITA DO USUÁRIO.
-- Ver docs/supabase/95-personal-core-gratitude-rollback.sql.
--
-- Este arquivo não depende de 93/94 terem rodado antes -- pré-check
-- próprio de public.set_updated_at() (baseline do projeto, docs 18/33;
-- nunca redefinida pelo Personal Core).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'set_updated_at'
  ) THEN
    RAISE EXCEPTION 'public.set_updated_at() não existe. Aplique docs/supabase/18 e/ou /33 (ou a baseline equivalente do ambiente) antes deste SQL.';
  END IF;
END $$;
--
-- PERSONAL ONLY, sem exceção. RLS restringe acesso authenticated ao
-- próprio dono; NÃO protege contra service role -- ver regra de
-- aplicação completa no cabeçalho do SQL 93.
--
-- Preenchimento progressivo (item 8, 1A.2) — gratitude_1/2/3 são
-- NULLABLE por desenho (nenhuma mudança de schema necessária): o
-- usuário pode salvar com só um campo preenchido e completar depois na
-- mesma entry_date (mesmo UNIQUE, via UPDATE). "Preenchido hoje" é
-- regra de API/UI (ao menos um entre gratitude_1/2/3/best_moment/
-- learning com conteúdo significativo), nunca um CHECK -- um CHECK "at
-- least one NOT NULL" impediria criar o draft vazio inicial que o
-- upsert progressivo precisa.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.gratitude_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- DATE representando o DIA CIVIL LOCAL (fuso fixo America/Fortaleza,
  -- mesmo definido em global-calendar.ts::GLOBAL_CALENDAR_TIMEZONE/
  -- getFortalezaToday()). A aplicação SEMPRE calcula este valor via
  -- getFortalezaToday() (ou equivalente), NUNCA via CURRENT_DATE do
  -- Postgres -- o fuso da sessão do banco pode divergir do fuso fixo do
  -- produto e gerar um "dia" errado perto da virada da meia-noite.
  entry_date    DATE NOT NULL,
  gratitude_1   TEXT,
  gratitude_2   TEXT,
  gratitude_3   TEXT,
  best_moment   TEXT,
  learning      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, entry_date)
);

-- Fase 1A.2 (item 1) — NENHUM índice adicional aqui. O UNIQUE(user_id,
-- entry_date) acima já cria um índice B-tree composto com exatamente
-- essas colunas na frente -- toda query real desta tabela (buscar a
-- entrada de hoje de um usuário; listar as últimas entradas de um
-- usuário) é atendida por ele, inclusive em ORDER BY entry_date DESC
-- (um índice B-tree é percorrível para trás sem custo extra relevante
-- no volume esperado desta tabela). Um segundo índice (user_id,
-- entry_date DESC) seria estritamente redundante -- removido do draft
-- anterior por não haver nenhuma query concreta que o UNIQUE não atenda.

-- Privilégios explícitos (Fase 1A.3) — ver evidência/decisão completa
-- no cabeçalho do SQL 93.
REVOKE ALL ON TABLE public.gratitude_entries FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.gratitude_entries TO authenticated;

ALTER TABLE public.gratitude_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gratitude_entries_owner_all" ON public.gratitude_entries;
CREATE POLICY "gratitude_entries_owner_all" ON public.gratitude_entries
  FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

COMMENT ON TABLE public.gratitude_entries IS
  'Diário da gratidão -- PERSONAL ONLY. RLS restringe a authenticated + '
  'dono; NÃO protege contra service role (ver cabeçalho do SQL 93). '
  'Nunca exposta a Jarvis Global Business, relatórios de Company, ou '
  'qualquer outro usuário -- nenhuma policy de admin/bypass aqui.';

COMMENT ON COLUMN public.gratitude_entries.entry_date IS
  'Dia civil local (fuso America/Fortaleza, via getFortalezaToday() da '
  'aplicação) -- nunca CURRENT_DATE do Postgres.';

CREATE TRIGGER trg_gratitude_entries_updated_at BEFORE UPDATE ON public.gratitude_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
