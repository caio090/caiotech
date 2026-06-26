-- ============================================================
-- 37-client-meta-assets.sql
-- Ativos Meta vinculados a clientes
--
-- ATENCAO: NAO executar automaticamente.
-- Rodar manualmente no Supabase SQL Editor.
--
-- Armazena Páginas Facebook, Instagram Business e Ad Accounts
-- que foram vinculados manualmente a clientes da agência.
-- A vinculação acontece via painel /admin/clientes ou futuramente
-- via fluxo automático pós-OAuth.
--
-- Idempotente: usa IF NOT EXISTS e DROP POLICY IF EXISTS.
-- NAO depende de public.organizations.
-- ============================================================

create table if not exists public.client_meta_assets (
  id                uuid primary key default gen_random_uuid(),

  -- Cliente ao qual este ativo pertence
  client_id         uuid not null references public.clients(id) on delete cascade,

  -- Conexão Meta que originou o ativo (pode ser null se vinculado manualmente)
  meta_connection_id uuid null references public.meta_connections(id) on delete set null,

  -- Tipo do ativo: facebook_page | instagram_business | ad_account | business_manager
  asset_type        text not null check (asset_type in (
    'facebook_page', 'instagram_business', 'ad_account', 'business_manager'
  )),

  -- ID do ativo na Meta (page_id, ig_user_id, act_XXXXXXXX, bm_id)
  asset_id          text not null,
  asset_name        text,
  username          text,
  picture_url       text,

  -- Se é o ativo principal do cliente para este tipo
  is_primary        boolean not null default false,

  -- Quem vinculou e quando
  connected_by      uuid null references auth.users(id) on delete set null,
  connected_at      timestamptz not null default now(),

  -- Timestamps
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- Um mesmo asset_id não pode ser vinculado duas vezes ao mesmo cliente
  unique (client_id, asset_type, asset_id)
);

-- Índices
create index if not exists client_meta_assets_client_idx     on public.client_meta_assets (client_id);
create index if not exists client_meta_assets_type_idx       on public.client_meta_assets (asset_type);
create index if not exists client_meta_assets_connection_idx on public.client_meta_assets (meta_connection_id);

-- Trigger updated_at
create or replace function public.handle_client_meta_assets_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists client_meta_assets_updated_at on public.client_meta_assets;
create trigger client_meta_assets_updated_at
  before update on public.client_meta_assets
  for each row execute procedure public.handle_client_meta_assets_updated_at();

-- RLS
alter table public.client_meta_assets enable row level security;

drop policy if exists "client_meta_assets_select" on public.client_meta_assets;
drop policy if exists "client_meta_assets_insert" on public.client_meta_assets;
drop policy if exists "client_meta_assets_update" on public.client_meta_assets;
drop policy if exists "client_meta_assets_delete" on public.client_meta_assets;

-- Seleção: admin e agency veem todos; team vê somente os seus clientes
create policy "client_meta_assets_select"
  on public.client_meta_assets for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'agency', 'team')
    )
  );

-- Inserção e atualização: admin e agency
create policy "client_meta_assets_insert"
  on public.client_meta_assets for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'agency')
    )
  );

create policy "client_meta_assets_update"
  on public.client_meta_assets for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'agency')
    )
  );

-- Deleção: apenas admin
create policy "client_meta_assets_delete"
  on public.client_meta_assets for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

notify pgrst, 'reload schema';

-- Após rodar este SQL:
-- 1. Use a rota /api/meta/accounts para buscar ativos da Meta e vinculá-los.
-- 2. Ao vincular um ativo a um cliente, insira aqui com connected_by = auth.uid().
-- 3. O campo is_primary controla qual conta Instagram/Página é a principal de cada cliente.
