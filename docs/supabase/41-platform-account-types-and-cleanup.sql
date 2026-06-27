-- ============================================================
-- 41-platform-account-types-and-cleanup.sql
-- Adiciona campos de tipo de conta, status de plataforma,
-- soft delete e hierarquia de agência à tabela clients.
--
-- Rodar no Supabase SQL Editor APÓS os SQLs 01–40.
-- Idempotente: seguro rodar mais de uma vez.
-- ============================================================

-- ── 1. Tipo de conta ─────────────────────────────────────────

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'lokat_client';
-- valores: lokat_client | agency | direct_business | freelancer | internal

COMMENT ON COLUMN public.clients.account_type IS
  'Tipo da conta: lokat_client (padrão), agency, direct_business, freelancer, internal';

-- ── 2. Status de plataforma ───────────────────────────────────

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS platform_status text DEFAULT 'active';
-- valores: active | trial | suspended | churned | archived

COMMENT ON COLUMN public.clients.platform_status IS
  'Status da conta na plataforma: active, trial, suspended, churned, archived';

-- ── 3. Soft delete ───────────────────────────────────────────

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS deleted_at  timestamptz DEFAULT NULL;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.clients.deleted_at  IS 'Soft delete: preenchido quando o cliente é excluído via UI';
COMMENT ON COLUMN public.clients.archived_at IS 'Data em que o cliente foi arquivado (status = archived)';

-- ── 4. Hierarquia de agência ─────────────────────────────────

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS parent_agency_id uuid DEFAULT NULL
    REFERENCES public.clients(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.clients.parent_agency_id IS
  'Se preenchido, este cliente pertence a uma agência (account_type = agency) mãe';

CREATE INDEX IF NOT EXISTS idx_clients_account_type    ON public.clients(account_type);
CREATE INDEX IF NOT EXISTS idx_clients_parent_agency   ON public.clients(parent_agency_id);
CREATE INDEX IF NOT EXISTS idx_clients_deleted_at      ON public.clients(deleted_at);

-- ── 5. Atualizar a view v_real_clients para excluir soft-deleted ─

-- Verificar se a view já existe antes de recriar
-- A view deve filtrar: status != 'archived' E deleted_at IS NULL
-- Ajuste conforme a definição atual da sua v_real_clients

-- EXEMPLO (adaptar às colunas reais da sua view):
-- CREATE OR REPLACE VIEW public.v_real_clients AS
-- SELECT * FROM public.clients
-- WHERE status != 'archived'
--   AND deleted_at IS NULL
--   AND (company_name IS NULL OR company_name NOT ILIKE '%teste%')
--   AND (company_name IS NULL OR company_name NOT ILIKE '%test%');

-- ⚠️  Descomente e ajuste o bloco acima conforme a definição atual da view.
-- Nunca rodar DROP/recreate sem verificar dependências (políticas RLS, funções, etc.)

-- Notificar PostgREST
NOTIFY pgrst, 'reload schema';
