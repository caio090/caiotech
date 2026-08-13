-- ============================================================
-- LOKAT OS — SQL 94 ROLLBACK (Personal Strategy OS — Fase 1A.3)
-- Reverte docs/supabase/94-personal-core-routines.sql
-- ============================================================

BEGIN;

DROP TABLE IF EXISTS public.personal_routine_entries;
DROP TABLE IF EXISTS public.personal_routines;
DROP FUNCTION IF EXISTS public.forbid_routine_entry_reassignment();

-- public.set_updated_at() NUNCA é tocada -- não é possuída por este
-- domínio, já existia na baseline do projeto (18/33). Nunca toca em
-- auth.users, Company, Calendário Global, ou tracking/Tayannara.
--
-- Fase 1A.3 — os GRANT/REVOKE explícitos das duas tabelas não precisam
-- de reversão própria: DROP TABLE remove a tabela e todos os
-- privilégios concedidos sobre ela junto, atomicamente.

COMMIT;

-- FIM DO ROLLBACK
