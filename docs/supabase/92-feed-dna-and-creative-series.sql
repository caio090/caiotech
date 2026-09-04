-- ============================================================
-- LOKAT OS — SQL 92 (Feed DNA + Creative Series — AINDA NÃO EXECUTADO)
-- Prompt 13 (REC OS Core Experience & Social Intelligence)
--
-- NÃO EXECUTAR AUTOMATICAMENTE. Este arquivo segue o processo manual
-- documentado em docs/checklists/manual-supabase-v1.md: revisão humana
-- (+ gate de segurança) antes de rodar no SQL Editor do Supabase, em
-- Staging/Production. Rollback correspondente:
-- docs/supabase/92-feed-dna-and-creative-series-rollback.sql.
--
-- DEPENDÊNCIA: usa public.can_access_client_company(uuid) e
-- public.can_write_client_company(uuid), definidos em
-- docs/supabase/91-company-diagnostic-roadmap.sql (auditado nesta
-- sprint: aquele arquivo também está marcado "AINDA NÃO EXECUTADO" no
-- próprio cabeçalho). Se SQL 91 ainda não tiver sido aplicado quando
-- este arquivo for executado, aplique-o PRIMEIRO -- sem os dois
-- helpers, as CREATE POLICY abaixo falham explicitamente (erro "função
-- não existe"), nunca criam uma policy quebrada em silêncio.
--
-- Reaproveita o modelo canônico já auditado nesta sprint (nunca um
-- segundo modelo de autorização):
--   • clients(id) = a "Company" (nenhuma tabela de Company nova).
--   • client_meta_assets/meta_connections = a fonte real de "Social
--     Profile" -- este arquivo NÃO cria uma tabela social_profiles;
--     src/lib/rec-os/social-profile/resolve.ts já projeta
--     client_meta_assets no contrato canônico em runtime.
--
-- Três tabelas novas:
--   1. feed_dna_profiles      -- 1 por Company (V1: um Social Profile
--                                 relevante por Company, Instagram).
--   2. creative_series        -- uma Série Visual (1/3/6/9 peças).
--   3. creative_series_items  -- os itens independentes da série
--                                 (REGRA ABSOLUTA: N peças = N linhas,
--                                 nunca um mosaico/prancha única).
-- ============================================================

BEGIN;

-- ── 1. feed_dna_profiles ──────────────────────────────────────
-- Um Feed DNA por Company (V1: 1 Social Profile relevante por Company).
-- UNIQUE(client_id) reflete isso -- se/quando existir suporte a
-- múltiplos Social Profiles por Company, este UNIQUE precisa mudar pra
-- (client_id, social_profile_id) numa migration futura, nunca alterado
-- em silêncio aqui.
CREATE TABLE IF NOT EXISTS public.feed_dna_profiles (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id            UUID NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
  -- Referência de texto opaca (id projetado por resolveSocialProfileContext,
  -- ex. a linha de client_meta_assets) -- nunca uma FK pra uma tabela
  -- social_profiles que não existe.
  social_profile_id    TEXT,
  pattern_type         TEXT NOT NULL DEFAULT 'FREE'
                       CHECK (pattern_type IN (
                         'FREE', 'ALTERNATING', 'CHECKERBOARD', 'COLUMN_RHYTHM',
                         'ROW_BLOCKS', 'COLOR_SEQUENCE', 'CAMPAIGN_BLOCKS', 'CUSTOM'
                       )),
  pattern_config       JSONB,
  dominant_palette     TEXT[] NOT NULL DEFAULT '{}',
  secondary_palette    TEXT[] NOT NULL DEFAULT '{}',
  photo_ratio          NUMERIC,
  graphic_ratio        NUMERIC,
  text_density         TEXT,
  logo_behavior        TEXT,
  background_behavior  TEXT,
  composition_rhythm   TEXT,
  campaign_rhythm       TEXT,
  content_mix          JSONB,
  -- Fase 42: confiança da inferência -- baixa confiança nunca vira fato
  -- na UI (o TypeScript resolver já trata isso, aqui só armazenamos).
  confidence           NUMERIC CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  source               TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai_suggested')),
  -- Fase 12/32: MANUAL OVERRIDE > AI SUGGESTION -- sugestão automática
  -- nunca sobrescreve silenciosamente quando user_override = true (a
  -- aplicação, nunca o banco, decide não chamar update com source=
  -- ai_suggested quando este flag estiver true -- documentado aqui pra
  -- quem for escrever a rotina de auto-detecção no futuro).
  user_override        BOOLEAN NOT NULL DEFAULT false,
  last_analysis_at     TIMESTAMPTZ,
  updated_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feed_dna_profiles_client ON public.feed_dna_profiles (client_id);

ALTER TABLE public.feed_dna_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feed_dna_profiles_select" ON public.feed_dna_profiles;
DROP POLICY IF EXISTS "feed_dna_profiles_insert" ON public.feed_dna_profiles;
DROP POLICY IF EXISTS "feed_dna_profiles_update" ON public.feed_dna_profiles;
DROP POLICY IF EXISTS "feed_dna_profiles_delete" ON public.feed_dna_profiles;

CREATE POLICY "feed_dna_profiles_select"
  ON public.feed_dna_profiles FOR SELECT TO authenticated
  USING (public.can_access_client_company(client_id));

CREATE POLICY "feed_dna_profiles_insert"
  ON public.feed_dna_profiles FOR INSERT TO authenticated
  WITH CHECK (public.can_write_client_company(client_id));

CREATE POLICY "feed_dna_profiles_update"
  ON public.feed_dna_profiles FOR UPDATE TO authenticated
  USING (public.can_write_client_company(client_id))
  WITH CHECK (public.can_write_client_company(client_id));

CREATE POLICY "feed_dna_profiles_delete"
  ON public.feed_dna_profiles FOR DELETE TO authenticated
  USING (public.can_write_client_company(client_id));

CREATE TRIGGER trg_feed_dna_profiles_updated_at
  BEFORE UPDATE ON public.feed_dna_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_feed_dna_profiles_immutable_client
  BEFORE UPDATE ON public.feed_dna_profiles
  FOR EACH ROW EXECUTE FUNCTION public.forbid_client_id_change();

COMMENT ON TABLE public.feed_dna_profiles IS
  'Prompt 13 -- padrão/ritmo de expressão de um perfil social ao longo '
  'do tempo. Nunca substitui onboarding_profiles (Company DNA) nem o '
  'subconjunto usado como Creative DNA -- ver src/lib/rec-os/social-profile/feed-dna.ts.';

-- ── 2. creative_series ────────────────────────────────────────
-- content_id/campaign_id nullable (Free Mode, ou série sem vínculo
-- ainda) -- campaign_id sem FK, mesmo precedente já usado em
-- ai_generation_jobs.campaign_id (nenhuma tabela de Campaign canônica
-- existe nesta base -- auditado nesta sprint).
CREATE TABLE IF NOT EXISTS public.creative_series (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id          UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  content_id         UUID REFERENCES public.content_items(id) ON DELETE SET NULL,
  campaign_id        UUID,
  title              TEXT,
  count              INTEGER NOT NULL CHECK (count IN (1, 3, 6, 9)),
  placement          TEXT,
  format             TEXT,
  creative_direction TEXT,
  status             TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'generating', 'ready', 'error')),
  created_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creative_series_client ON public.creative_series (client_id);
CREATE INDEX IF NOT EXISTS idx_creative_series_content ON public.creative_series (content_id);

ALTER TABLE public.creative_series ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "creative_series_select" ON public.creative_series;
DROP POLICY IF EXISTS "creative_series_insert" ON public.creative_series;
DROP POLICY IF EXISTS "creative_series_update" ON public.creative_series;
DROP POLICY IF EXISTS "creative_series_delete" ON public.creative_series;

-- Free Mode (client_id IS NULL): só o próprio criador acessa -- nunca
-- global, nunca outra Company vê uma série sem Company (mesmo
-- princípio de "nunca Company fictícia" já aplicado ao Studio).
CREATE POLICY "creative_series_select"
  ON public.creative_series FOR SELECT TO authenticated
  USING (
    (client_id IS NOT NULL AND public.can_access_client_company(client_id))
    OR (client_id IS NULL AND created_by = auth.uid())
  );

CREATE POLICY "creative_series_insert"
  ON public.creative_series FOR INSERT TO authenticated
  WITH CHECK (
    (client_id IS NOT NULL AND public.can_write_client_company(client_id))
    OR (client_id IS NULL AND created_by = auth.uid())
  );

CREATE POLICY "creative_series_update"
  ON public.creative_series FOR UPDATE TO authenticated
  USING (
    (client_id IS NOT NULL AND public.can_write_client_company(client_id))
    OR (client_id IS NULL AND created_by = auth.uid())
  )
  WITH CHECK (
    (client_id IS NOT NULL AND public.can_write_client_company(client_id))
    OR (client_id IS NULL AND created_by = auth.uid())
  );

CREATE POLICY "creative_series_delete"
  ON public.creative_series FOR DELETE TO authenticated
  USING (
    (client_id IS NOT NULL AND public.can_write_client_company(client_id))
    OR (client_id IS NULL AND created_by = auth.uid())
  );

CREATE TRIGGER trg_creative_series_updated_at
  BEFORE UPDATE ON public.creative_series
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.creative_series IS
  'Prompt 13 -- uma Série Visual (1/3/6/9 peças). REGRA ABSOLUTA: cada '
  'peça é um item independente em creative_series_items, nunca um '
  'mosaico/prancha em arquivo único.';

-- ── 3. creative_series_items ──────────────────────────────────
-- visual_asset_id é TEXT opaco (referência a um asset futuro em
-- client_visual_assets, quando o Studio passar a persistir lá -- fora
-- do escopo desta sprint) -- nunca uma FK forçada pra uma tabela ainda
-- não wired na aplicação.
CREATE TABLE IF NOT EXISTS public.creative_series_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id             UUID NOT NULL REFERENCES public.creative_series(id) ON DELETE CASCADE,
  position              INTEGER NOT NULL CHECK (position >= 1),
  role                  TEXT,
  brief                 TEXT,
  headline              TEXT,
  cta                   TEXT,
  status                TEXT NOT NULL DEFAULT 'planned'
                        CHECK (status IN ('planned', 'generating', 'ready', 'error', 'canceled')),
  visual_asset_id       TEXT,
  generation_metadata   JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (series_id, position)
);

CREATE INDEX IF NOT EXISTS idx_creative_series_items_series ON public.creative_series_items (series_id);

ALTER TABLE public.creative_series_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "creative_series_items_select" ON public.creative_series_items;
DROP POLICY IF EXISTS "creative_series_items_insert" ON public.creative_series_items;
DROP POLICY IF EXISTS "creative_series_items_update" ON public.creative_series_items;
DROP POLICY IF EXISTS "creative_series_items_delete" ON public.creative_series_items;

-- Ownership vem sempre do pai (creative_series) -- nunca um client_id
-- duplicado nem acesso global por role (mesmo padrão de
-- diagnostic_checklist_items em SQL 91).
CREATE POLICY "creative_series_items_select"
  ON public.creative_series_items FOR SELECT TO authenticated
  USING (
    series_id IN (
      SELECT id FROM public.creative_series
      WHERE (client_id IS NOT NULL AND public.can_access_client_company(client_id))
         OR (client_id IS NULL AND created_by = auth.uid())
    )
  );

CREATE POLICY "creative_series_items_insert"
  ON public.creative_series_items FOR INSERT TO authenticated
  WITH CHECK (
    series_id IN (
      SELECT id FROM public.creative_series
      WHERE (client_id IS NOT NULL AND public.can_write_client_company(client_id))
         OR (client_id IS NULL AND created_by = auth.uid())
    )
  );

CREATE POLICY "creative_series_items_update"
  ON public.creative_series_items FOR UPDATE TO authenticated
  USING (
    series_id IN (
      SELECT id FROM public.creative_series
      WHERE (client_id IS NOT NULL AND public.can_write_client_company(client_id))
         OR (client_id IS NULL AND created_by = auth.uid())
    )
  )
  WITH CHECK (
    series_id IN (
      SELECT id FROM public.creative_series
      WHERE (client_id IS NOT NULL AND public.can_write_client_company(client_id))
         OR (client_id IS NULL AND created_by = auth.uid())
    )
  );

CREATE POLICY "creative_series_items_delete"
  ON public.creative_series_items FOR DELETE TO authenticated
  USING (
    series_id IN (
      SELECT id FROM public.creative_series
      WHERE (client_id IS NOT NULL AND public.can_write_client_company(client_id))
         OR (client_id IS NULL AND created_by = auth.uid())
    )
  );

CREATE TRIGGER trg_creative_series_items_updated_at
  BEFORE UPDATE ON public.creative_series_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.creative_series_items IS
  'Prompt 13 -- item independente de uma Série Visual. Cada linha = uma '
  'imagem própria (REGRA ABSOLUTA, ver creative_series).';

COMMIT;

-- ── Validação pós-apply (rodar manualmente, nunca automatizado) ──
-- SELECT count(*) FROM public.feed_dna_profiles;
-- SELECT count(*) FROM public.creative_series;
-- SELECT count(*) FROM public.creative_series_items;
-- SELECT tablename, policyname FROM pg_policies
--   WHERE tablename IN ('feed_dna_profiles', 'creative_series', 'creative_series_items')
--   ORDER BY tablename, policyname;
