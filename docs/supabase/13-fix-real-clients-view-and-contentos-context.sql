-- ============================================================
-- LOKAT OS — SQL 13: Fix v_real_clients + ContentOS Context
-- File: docs/supabase/13-fix-real-clients-view-and-contentos-context.sql
--
-- Problema anterior:
--   A tabela public.clients NÃO possui as colunas deleted_at,
--   archived_at nem is_test. O PostgreSQL valida colunas em tempo
--   de parse — antes da execução — então mesmo um OR NOT EXISTS
--   em information_schema não evita o erro 42703.
--
-- Solução:
--   Filtrar SOMENTE por colunas que existem em clients
--   (id, owner_id, company_name, responsible_name, segment,
--    status, created_at) e delegar os filtros de arquivamento
--   e teste inteiramente para a tabela profiles, onde essas
--   colunas já existem e são usadas pelo sistema.
--
-- Safe to re-run: DROP IF EXISTS + CREATE VIEW.
-- ============================================================

-- ── 1. Recriar v_real_clients sem referências a colunas inexistentes ──

DROP VIEW IF EXISTS public.v_real_clients;

CREATE VIEW public.v_real_clients
WITH (security_invoker = true)
AS
  SELECT
    c.id,
    c.owner_id,
    c.company_name,
    c.responsible_name,
    c.segment,
    c.status,
    c.created_at,
    p.name  AS owner_name,
    p.email AS owner_email
  FROM public.clients c
  JOIN public.profiles p ON p.id = c.owner_id
  WHERE
    -- Owner deve ter role 'cliente' — exclui operacional, admin, aluno, equipe
    p.role = 'cliente'

    -- Owner não pode estar marcado como conta de teste
    AND (p.is_test IS NULL OR p.is_test = false)

    -- Owner não pode estar arquivado
    AND p.archived_at IS NULL

    -- Owner não pode estar deletado
    AND p.deleted_at IS NULL

    -- Excluir registros de clients com status inválido
    -- (a coluna status existe em clients conforme schema inicial)
    AND c.status NOT IN ('deleted', 'archived', 'test', 'cancelled');

-- ── 2. Notificar PostgREST para recarregar schema ─────────────

NOTIFY pgrst, 'reload schema';

-- ── 3. Verificação rápida (execute manualmente para confirmar) ─
-- SELECT count(*) FROM v_real_clients;
-- SELECT id, company_name, status, owner_name FROM v_real_clients ORDER BY company_name;
