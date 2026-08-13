-- ============================================================
-- LOKAT OS — SQL 96 ROLLBACK (Personal Strategy OS — Fase 1A.3)
-- Reverte docs/supabase/96-personal-core-events.sql
-- ============================================================

BEGIN;

DROP TABLE IF EXISTS public.personal_events;

-- public.set_updated_at() NUNCA é tocada -- ver nota no rollback do SQL 93.
--
-- Fase 1A.3 — o GRANT/REVOKE explícito não precisa de reversão própria:
-- DROP TABLE remove a tabela e todos os privilégios sobre ela junto.

COMMIT;

-- FIM DO ROLLBACK
