-- ============================================================
-- LOKAT OS — SQL 95 ROLLBACK (Personal Strategy OS — Fase 1A.3)
-- Reverte docs/supabase/95-personal-core-gratitude.sql
-- ============================================================

BEGIN;

DROP TABLE IF EXISTS public.gratitude_entries;

-- public.set_updated_at() NUNCA é tocada -- ver nota no rollback do SQL 93.
--
-- Fase 1A.3 — o GRANT/REVOKE explícito não precisa de reversão própria:
-- DROP TABLE remove a tabela e todos os privilégios sobre ela junto.

COMMIT;

-- FIM DO ROLLBACK
