-- ============================================================
-- 36-client-context.sql
-- Base Operacional do Cliente (Client Context / OS por cliente)
--
-- ATENCAO: NAO executar automaticamente.
-- Rodar manualmente no Supabase SQL Editor.
--
-- Esta tabela e a "pasta inteligente" de cada cliente/empresa
-- dentro da LOKAT OS. Armazena o contexto estrategico que a IA
-- pode ler para personalizar diagnosticos, briefings e sugestoes.
--
-- Idempotente: usa IF NOT EXISTS e DROP POLICY IF EXISTS.
-- NAO usa CREATE POLICY IF NOT EXISTS (invalido no PostgreSQL).
-- NAO depende de public.organizations nem de org_id.
-- ============================================================

create table if not exists public.client_context (
  id                    uuid primary key default gen_random_uuid(),

  -- Vinculo obrigatorio com o cliente
  client_id             uuid not null references public.clients(id) on delete cascade,

  -- Campo reservado para organizacao gestora (sem FK por enquanto)
  -- PENDENCIA: adicionar references public.organizations(id) quando essa tabela existir
  organization_id       uuid null,

  -- Dados estrategicos da marca
  segmento              text,
  descricao             text,
  objetivo_principal    text,
  objetivos_secundarios text[],
  tom_de_voz            text[],
  publico_alvo          text,
  faixa_etaria          text,
  cidade                text,
  instagram_handle      text,
  site_url              text,

  -- Produtos e servicos (descricao livre para contexto de IA)
  produtos_servicos     text,

  -- Canais ativos
  canais_ativos         text[],

  -- Metricas atuais (atualizadas manualmente ou via API)
  seguidores_instagram  integer,
  seguidores_facebook   integer,
  taxa_engajamento      numeric(5,2),
  alcance_medio         integer,
  impressoes_medias     integer,

  -- Contexto para IA (texto livre, atualizado periodicamente)
  resumo_estrategico    text,
  problemas_atuais      text,
  ultima_campanha       text,
  proximos_passos       text,

  -- Status do contexto
  contexto_atualizado_em timestamptz,
  status                text not null default 'ativo'
    check (status in ('ativo', 'pausado', 'encerrado')),

  -- Timestamps
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  -- Um contexto por cliente (organization_id nao e usado como discriminador por enquanto)
  unique (client_id)
);

-- Indices
create index if not exists client_context_client_idx on public.client_context (client_id);
create index if not exists client_context_status_idx on public.client_context (status);

-- Trigger updated_at
create or replace function public.handle_client_context_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists client_context_updated_at on public.client_context;
create trigger client_context_updated_at
  before update on public.client_context
  for each row execute procedure public.handle_client_context_updated_at();

-- RLS
alter table public.client_context enable row level security;

drop policy if exists "client_context_select" on public.client_context;
drop policy if exists "client_context_insert" on public.client_context;
drop policy if exists "client_context_update" on public.client_context;

-- Selecao: admin ve tudo; agency e equipe ve todos os clientes deles
create policy "client_context_select"
  on public.client_context for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'agency', 'team')
    )
  );

-- Insercao: apenas admin e agency
create policy "client_context_insert"
  on public.client_context for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'agency')
    )
  );

-- Atualizacao: apenas admin e agency
create policy "client_context_update"
  on public.client_context for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'agency')
    )
  );

-- Reload do schema para o PostgREST reconhecer a tabela imediatamente
notify pgrst, 'reload schema';

-- Apos rodar este SQL:
-- 1. A rota /api/ai/diagnostico pode ser expandida para ler client_context.
-- 2. O campo resumo_estrategico e o "Context Pack" enviado ao LLM.
-- 3. organization_id pode receber FK no futuro quando public.organizations existir.
