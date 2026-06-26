-- ============================================================
-- 35-meta-connections.sql
-- Tabela de conexoes Meta / Instagram Business para LOKAT OS
--
-- ATENCAO: NAO executar automaticamente.
-- Rodar manualmente no Supabase SQL Editor.
--
-- Contexto de uso:
--   connected_by  → o usuario autenticado que conectou a conta Meta
--   client_id     → o cliente da agencia associado a conexao (nullable)
--   account_type  → contexto da conexao: 'agency' | 'client' | 'personal'
--
-- PENDENCIA FUTURA:
--   Quando a tabela public.organizations existir no projeto,
--   adicionar coluna organization_id uuid references public.organizations(id).
--   Por enquanto, o isolamento e feito via connected_by + client_id.
--
-- Idempotente: pode ser rodado mais de uma vez sem erro.
-- Usa IF NOT EXISTS, DO $$ para colunas novas, DROP POLICY IF EXISTS.
-- NAO usa CREATE POLICY IF NOT EXISTS (invalido no PostgreSQL).
-- NAO usa CASCADE em DROP.
-- ============================================================

create table if not exists public.meta_connections (
  id                              uuid primary key default gen_random_uuid(),

  -- Quem conectou (dono da conexao)
  connected_by                    uuid references auth.users(id) on delete set null,

  -- Cliente associado (opcional — usado quando a conexao pertence a um cliente especifico)
  client_id                       uuid references public.clients(id) on delete set null,

  -- Tipo de conta: 'agency' | 'client' | 'personal'
  account_type                    text,

  -- Identificacao do provider
  provider                        text not null default 'meta',

  -- Dados do App Meta (NAO armazenar o secret — fica nas env vars)
  meta_app_id                     text not null,

  -- Dados da conta Meta do usuario autorizado
  meta_user_id                    text,

  -- Pagina do Facebook
  page_id                         text,
  page_name                       text,

  -- Conta Instagram Business
  instagram_business_account_id   text,
  instagram_username              text,

  -- Token de acesso (criptografar em producao — usar Vault ou pgcrypto)
  access_token                    text,
  refresh_token                   text,
  token_expires_at                timestamptz,

  -- Escopos concedidos (texto separado por virgula, ex: "instagram_basic,pages_show_list")
  scopes                          text,

  -- Status da conexao
  -- Valores possiveis: pending | active | expired | revoked | error
  status                          text not null default 'pending'
    check (status in ('pending', 'active', 'expired', 'revoked', 'error')),

  -- Atalho de atividade (true = conexao primaria ativa do usuario)
  is_active                       boolean not null default true,

  -- Timestamps
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now()
);

-- ── Colunas adicionais (idempotente via bloco DO) ─────────────────────────────
-- Garante que colunas introduzidas em revisoes posteriores existam
-- sem quebrar caso a tabela ja tenha sido criada anteriormente.
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public'
                   and table_name   = 'meta_connections'
                   and column_name  = 'page_name') then
    alter table public.meta_connections add column page_name text;
  end if;

  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public'
                   and table_name   = 'meta_connections'
                   and column_name  = 'instagram_username') then
    alter table public.meta_connections add column instagram_username text;
  end if;

  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public'
                   and table_name   = 'meta_connections'
                   and column_name  = 'scopes') then
    alter table public.meta_connections add column scopes text;
  end if;

  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public'
                   and table_name   = 'meta_connections'
                   and column_name  = 'is_active') then
    alter table public.meta_connections add column is_active boolean not null default true;
  end if;

  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public'
                   and table_name   = 'meta_connections'
                   and column_name  = 'account_type') then
    alter table public.meta_connections add column account_type text;
  end if;

  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public'
                   and table_name   = 'meta_connections'
                   and column_name  = 'ad_account_id') then
    alter table public.meta_connections add column ad_account_id text;
  end if;

  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public'
                   and table_name   = 'meta_connections'
                   and column_name  = 'business_id') then
    alter table public.meta_connections add column business_id text;
  end if;

  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public'
                   and table_name   = 'meta_connections'
                   and column_name  = 'meta_app_id') then
    alter table public.meta_connections add column meta_app_id text not null default '';
  end if;
end $$;

-- ── Indices ───────────────────────────────────────────────────────────────────
create index if not exists meta_connections_user_idx    on public.meta_connections (connected_by);
create index if not exists meta_connections_client_idx  on public.meta_connections (client_id);
create index if not exists meta_connections_status_idx  on public.meta_connections (status);
create index if not exists meta_connections_active_idx  on public.meta_connections (is_active);
create index if not exists meta_connections_page_idx    on public.meta_connections (page_id);
create index if not exists meta_connections_ig_idx      on public.meta_connections (instagram_business_account_id);

-- ── Trigger updated_at ────────────────────────────────────────────────────────
create or replace function public.handle_meta_connections_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists meta_connections_updated_at on public.meta_connections;
create trigger meta_connections_updated_at
  before update on public.meta_connections
  for each row execute procedure public.handle_meta_connections_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table public.meta_connections enable row level security;

-- DROP antes de CREATE (unica forma idempotente no PostgreSQL)
drop policy if exists "meta_connections_select_own"  on public.meta_connections;
drop policy if exists "meta_connections_insert_own"  on public.meta_connections;
drop policy if exists "meta_connections_update_own"  on public.meta_connections;
drop policy if exists "meta_connections_delete_own"  on public.meta_connections;

-- Selecao: proprio usuario OU admin (via tabela profiles)
create policy "meta_connections_select_own"
  on public.meta_connections for select
  using (
    connected_by = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Insercao: apenas o proprio usuario autenticado
create policy "meta_connections_insert_own"
  on public.meta_connections for insert
  with check (connected_by = auth.uid());

-- Atualizacao: apenas o proprio usuario
create policy "meta_connections_update_own"
  on public.meta_connections for update
  using (connected_by = auth.uid());

-- Remocao: apenas o proprio usuario (para desconectar)
create policy "meta_connections_delete_own"
  on public.meta_connections for delete
  using (connected_by = auth.uid());

-- ── Reload do schema ──────────────────────────────────────────────────────────
notify pgrst, 'reload schema';

-- ── Apos rodar este SQL ───────────────────────────────────────────────────────
-- 1. O callback /api/meta/callback ja salva na tabela (sem organization_id).
-- 2. A rota /api/meta/insights consulta por connected_by + status = 'active'.
-- 3. A rota /api/meta/status detecta a tabela e exibe sqlPending = false.
-- 4. A pagina /admin/conexoes mostra o status em tempo real.
