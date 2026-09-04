-- ============================================================
-- LOKAT OS — SQL 92 ROLLBACK — Feed DNA + Creative Series
-- Prompt 13 (REC OS Core Experience & Social Intelligence)
--
-- Reverte exatamente docs/supabase/92-feed-dna-and-creative-series.sql.
-- Ordem inversa de dependência (items -> series -> feed_dna, sem FK
-- cruzada entre feed_dna_profiles e as outras duas). NUNCA remove
-- clients/content_items/auth.users nem os helpers de SQL 91
-- (can_access_client_company/can_write_client_company/set_updated_at/
-- forbid_client_id_change) -- são compartilhados por outros domínios,
-- fora do escopo deste rollback.
-- ============================================================

BEGIN;

DROP TABLE IF EXISTS public.creative_series_items CASCADE;
DROP TABLE IF EXISTS public.creative_series CASCADE;
DROP TABLE IF EXISTS public.feed_dna_profiles CASCADE;

COMMIT;

-- ── Validação pós-rollback (rodar manualmente) ──
-- SELECT to_regclass('public.feed_dna_profiles');       -- esperado: NULL
-- SELECT to_regclass('public.creative_series');          -- esperado: NULL
-- SELECT to_regclass('public.creative_series_items');    -- esperado: NULL
