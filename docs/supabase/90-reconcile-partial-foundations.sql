-- LOKAT OS - SQL 90
-- Reconciliacao proposta para foundations parcialmente aplicadas (SQL 82-89)
-- Data: 2026-07-15
--
-- ATENCAO:
-- 1. NAO EXECUTAR AUTOMATICAMENTE.
-- 2. Este arquivo e proposta tecnica idempotente para revisao.
-- 3. Antes de executar, rode a auditoria SELECT em AUDIT_SQL_82_89_2026-07-15.md.
-- 4. Nao usar este arquivo para "corrigir no escuro" um banco parcialmente migrado.
-- 5. Revisar especialmente SQL 87 e constraints NOT NULL + ON DELETE SET NULL.

begin;

-- ---------------------------------------------------------------------------
-- PRE-FLIGHT: leitura do catalogo antes de qualquer DDL
-- ---------------------------------------------------------------------------

select schemaname, tablename
from pg_tables
where schemaname = 'public'
  and tablename in (
    'operational_task_comments',
    'work_sessions',
    'integration_connections',
    'integration_webhook_events',
    'provider_user_links',
    'design_projects',
    'design_versions',
    'design_templates',
    'conversation_links',
    'scheduled_publications',
    'publication_attempts',
    'social_channel_links'
  )
order by tablename;

select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'operational_task_comments',
    'work_sessions',
    'design_projects',
    'design_versions',
    'scheduled_publications'
  )
order by table_name, ordinal_position;

select schemaname, tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'operational_task_comments',
    'work_sessions',
    'integration_connections',
    'integration_webhook_events',
    'provider_user_links',
    'design_projects',
    'design_versions',
    'design_templates',
    'conversation_links',
    'scheduled_publications',
    'publication_attempts',
    'social_channel_links'
  )
order by tablename, policyname;

-- ---------------------------------------------------------------------------
-- SQL 82/84 partial reconciliation
-- ---------------------------------------------------------------------------

alter table if exists public.operational_task_comments
  add column if not exists is_internal boolean not null default false;

alter table if exists public.operational_tasks
  add column if not exists assigned_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists estimated_hours numeric(8,2),
  add column if not exists actual_hours numeric(8,2),
  add column if not exists deadline timestamptz;

create table if not exists public.work_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  task_id uuid references public.operational_tasks(id) on delete set null,
  area text not null default 'operacional',
  source text not null default 'manual',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_min numeric generated always as (
    case
      when ended_at is null then null
      else greatest(0, extract(epoch from ended_at - started_at) / 60)
    end
  ) stored,
  notes text,
  created_at timestamptz not null default now()
);

alter table if exists public.work_sessions enable row level security;

create index if not exists ws_profile_idx on public.work_sessions(profile_id);
create index if not exists ws_task_idx on public.work_sessions(task_id);
create index if not exists ws_client_idx on public.work_sessions(client_id);

-- ---------------------------------------------------------------------------
-- SQL 87 constraint reconciliation proposal
-- ---------------------------------------------------------------------------
-- Escolha proposta: manter ON DELETE SET NULL e permitir autoria nula em historico.
-- Se o produto exigir autoria obrigatoria, substituir por ON DELETE RESTRICT
-- em migracao separada e revisada.

alter table if exists public.design_projects
  alter column created_by drop not null;

alter table if exists public.design_versions
  alter column created_by drop not null;

alter table if exists public.scheduled_publications
  alter column created_by drop not null;

create unique index if not exists design_versions_project_version_idx
  on public.design_versions(design_project_id, version);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if to_regclass('public.design_projects') is not null
     and not exists (
       select 1 from pg_trigger
       where tgname = 'design_projects_set_updated_at'
     ) then
    create trigger design_projects_set_updated_at
      before update on public.design_projects
      for each row execute function public.set_updated_at();
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Policy creation guard: nao destruir policies existentes
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.work_sessions') is not null
     and not exists (
       select 1 from pg_policies
       where schemaname = 'public'
         and tablename = 'work_sessions'
         and policyname = 'ws_own_read'
     ) then
    create policy ws_own_read on public.work_sessions
      for select
      using (profile_id = auth.uid());
  end if;
end $$;

do $$
begin
  if to_regclass('public.work_sessions') is not null
     and not exists (
       select 1 from pg_policies
       where schemaname = 'public'
         and tablename = 'work_sessions'
         and policyname = 'ws_own_write'
     ) then
    create policy ws_own_write on public.work_sessions
      for insert
      with check (profile_id = auth.uid());
  end if;
end $$;

do $$
begin
  if to_regclass('public.work_sessions') is not null
     and not exists (
       select 1 from pg_policies
       where schemaname = 'public'
         and tablename = 'work_sessions'
         and policyname = 'ws_own_update'
     ) then
    create policy ws_own_update on public.work_sessions
      for update
      using (profile_id = auth.uid())
      with check (profile_id = auth.uid());
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- POST-FLIGHT: validar catalogo depois da execucao manual
-- ---------------------------------------------------------------------------

select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'operational_task_comments',
    'work_sessions',
    'design_projects',
    'design_versions',
    'scheduled_publications'
  )
order by table_name, ordinal_position;

select schemaname, tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('work_sessions')
order by tablename, policyname;

rollback;

-- Este arquivo termina em ROLLBACK intencionalmente.
-- Para aplicar, um operador humano deve copiar blocos revisados em uma nova
-- migracao final sem rollback, apos validar o estado real do catalogo.
