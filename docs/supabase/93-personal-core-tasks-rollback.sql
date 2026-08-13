-- ============================================================
-- LOKAT OS — SQL 93 ROLLBACK (Personal Strategy OS — Fase 1A.2)
-- Reverte docs/supabase/93-personal-core-tasks.sql
--
-- IMPORTANTE: este domínio NUNCA cria/redefine public.set_updated_at()
-- (ela já existe na baseline do projeto, docs/supabase/18 e /33) --
-- este rollback nunca a toca, dropa ou modifica. Nunca toca em
-- auth.users, Company, Calendário Global, ou na frente de tracking/
-- Tayannara -- só remove o que este arquivo especificamente cria.
--
-- Fase 1A.3 — os GRANT/REVOKE explícitos de 93-personal-core-tasks.sql
-- não precisam de reversão própria: DROP TABLE remove a tabela e todos
-- os privilégios concedidos sobre ela junto, atomicamente. Nenhuma
-- lógica adicional de REVOKE é necessária ou criada aqui.
-- ============================================================

BEGIN;

DROP TABLE IF EXISTS public.personal_tasks;

COMMIT;

-- FIM DO ROLLBACK
