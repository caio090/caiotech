-- ============================================================
-- 35-meta-connections.sql
-- Tabela de conexões Meta / Instagram Business para LOKAT OS
--
-- ATENÇÃO: NÃO executar automaticamente.
-- Rodar manualmente no Supabase SQL Editor quando pronto para
-- iniciar o fluxo completo de OAuth + salvar tokens.
--
-- Suporta três contextos de conexão:
--   a) Conta Meta da agência central LOKAT
--      → organization_id preenchido, client_id nulo
--   b) Conta Meta de agência cliente (multi-tenant)
--      → organization_id + client_id da agência-cliente
--   c) Conta Meta de cliente final / autônomo
--      → somente client_id (sem org intermediária)
-- ============================================================

create table if not exists public.meta_connections (
  id                              uuid primary key default gen_random_uuid(),

  -- Contexto de quem conectou
  organization_id                 uuid references public.organizations(id) on delete cascade,
  client_id                       uuid references public.clients(id) on delete set null,
  connected_by                    uuid references auth.users(id) on delete set null,

  -- Identificação do provider
  provider                        text not null default 'meta',

  -- Dados do App Meta (não armazenar o secret aqui — ele fica só nas env vars)
  meta_app_id                     text not null,

  -- Dados da conta Meta do usuário autorizado
  meta_user_id                    text,
  page_id                         text,
  instagram_business_account_id   text,

  -- Tokens (criptografar antes de salvar em produção — usar Vault ou pgcrypto)
  access_token                    text,
  refresh_token                   text,
  token_expires_at                timestamptz,

  -- Status da conexão
  -- Valores possíveis: pending | active | expired | revoked | error
  status                          text not null default 'pending'
    check (status in ('pending', 'active', 'expired', 'revoked', 'error')),

  -- Timestamps
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now()
);

-- Índices úteis para queries frequentes
create index if not exists meta_connections_org_idx      on public.meta_connections (organization_id);
create index if not exists meta_connections_client_idx   on public.meta_connections (client_id);
create index if not exists meta_connections_status_idx   on public.meta_connections (status);
create index if not exists meta_connections_page_idx     on public.meta_connections (page_id);
create index if not exists meta_connections_ig_idx       on public.meta_connections (instagram_business_account_id);

-- Trigger para atualizar updated_at automaticamente
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

-- RLS: habilitar Row Level Security
alter table public.meta_connections enable row level security;

-- Política: apenas admins e o próprio usuário que conectou podem ver/editar
-- TODO: ajustar políticas conforme roles definidos no projeto (admin, agency, client)
create policy "meta_connections_select_own"
  on public.meta_connections for select
  using (
    connected_by = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "meta_connections_insert_own"
  on public.meta_connections for insert
  with check (connected_by = auth.uid());

create policy "meta_connections_update_own"
  on public.meta_connections for update
  using (connected_by = auth.uid());

-- Comentário final:
-- Após rodar este SQL, atualizar src/app/api/meta/callback/route.ts
-- para trocar o OAuth code por access_token e salvar nesta tabela.
