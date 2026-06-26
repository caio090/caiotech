-- ============================================================
-- 38-produtividade.sql
-- Camada transversal de produtividade da LOKAT OS
--
-- ATENCAO: NAO executar automaticamente.
-- Rodar manualmente no Supabase SQL Editor.
--
-- Armazena tarefas, reuniões, lembretes e checklists
-- visíveis no bloco "Meu Dia" do dashboard ADM.
-- Idempotente: usa IF NOT EXISTS e DROP POLICY IF EXISTS.
-- ============================================================

-- ── Tarefas ──────────────────────────────────────────────────
create table if not exists public.productivity_tasks (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  status        text not null default 'todo'
    check (status in ('todo', 'in_progress', 'done', 'cancelled')),
  priority      text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  due_date      date,
  due_time      time,
  -- Vínculo com cliente (opcional)
  client_id     uuid null references public.clients(id) on delete set null,
  -- Quem criou e quem é responsável
  created_by    uuid not null references auth.users(id) on delete cascade,
  assigned_to   uuid null references auth.users(id) on delete set null,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists productivity_tasks_owner_idx  on public.productivity_tasks (created_by);
create index if not exists productivity_tasks_assign_idx on public.productivity_tasks (assigned_to);
create index if not exists productivity_tasks_due_idx    on public.productivity_tasks (due_date);
create index if not exists productivity_tasks_status_idx on public.productivity_tasks (status);

-- ── Reuniões ─────────────────────────────────────────────────
create table if not exists public.productivity_meetings (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  scheduled_at  timestamptz not null,
  duration_min  integer default 60,
  location      text,
  meet_url      text,
  client_id     uuid null references public.clients(id) on delete set null,
  created_by    uuid not null references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists productivity_meetings_owner_idx on public.productivity_meetings (created_by);
create index if not exists productivity_meetings_date_idx  on public.productivity_meetings (scheduled_at);

-- ── Triggers updated_at ───────────────────────────────────────
create or replace function public.handle_productivity_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists productivity_tasks_updated_at on public.productivity_tasks;
create trigger productivity_tasks_updated_at
  before update on public.productivity_tasks
  for each row execute procedure public.handle_productivity_updated_at();

drop trigger if exists productivity_meetings_updated_at on public.productivity_meetings;
create trigger productivity_meetings_updated_at
  before update on public.productivity_meetings
  for each row execute procedure public.handle_productivity_updated_at();

-- ── RLS — Tarefas ────────────────────────────────────────────
alter table public.productivity_tasks enable row level security;

drop policy if exists "productivity_tasks_select" on public.productivity_tasks;
drop policy if exists "productivity_tasks_insert" on public.productivity_tasks;
drop policy if exists "productivity_tasks_update" on public.productivity_tasks;
drop policy if exists "productivity_tasks_delete" on public.productivity_tasks;

create policy "productivity_tasks_select"
  on public.productivity_tasks for select
  using (
    auth.uid() = created_by
    or auth.uid() = assigned_to
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "productivity_tasks_insert"
  on public.productivity_tasks for insert
  with check (auth.uid() = created_by);

create policy "productivity_tasks_update"
  on public.productivity_tasks for update
  using (auth.uid() = created_by or auth.uid() = assigned_to);

create policy "productivity_tasks_delete"
  on public.productivity_tasks for delete
  using (auth.uid() = created_by);

-- ── RLS — Reuniões ───────────────────────────────────────────
alter table public.productivity_meetings enable row level security;

drop policy if exists "productivity_meetings_select" on public.productivity_meetings;
drop policy if exists "productivity_meetings_insert" on public.productivity_meetings;
drop policy if exists "productivity_meetings_update" on public.productivity_meetings;
drop policy if exists "productivity_meetings_delete" on public.productivity_meetings;

create policy "productivity_meetings_select"
  on public.productivity_meetings for select
  using (
    auth.uid() = created_by
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "productivity_meetings_insert"
  on public.productivity_meetings for insert
  with check (auth.uid() = created_by);

create policy "productivity_meetings_update"
  on public.productivity_meetings for update
  using (auth.uid() = created_by);

create policy "productivity_meetings_delete"
  on public.productivity_meetings for delete
  using (auth.uid() = created_by);

notify pgrst, 'reload schema';

-- Após rodar este SQL:
-- 1. O bloco "Meu Dia" no dashboard pode ser expandido para ler
--    productivity_tasks WHERE created_by = auth.uid() AND due_date = today.
-- 2. Criar rota /api/admin/productivity/tasks para CRUD via front-end.
-- 3. Integrar com Google Calendar via webhooks futuramente.
