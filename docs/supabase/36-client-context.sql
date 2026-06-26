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
-- Diferente de um simples cadastro de cliente, o client_context
-- contem dados que evoluem ao longo do tempo:
--   - objetivos e posicionamento
--   - tom de voz e publico
--   - produtos e servicos
--   - metricas atuais
--   - contexto para IA
--
-- Idempotente: usa IF NOT EXISTS e DROP POLICY IF EXISTS.
-- ============================================================

create table if not exists public.client_context (
  id                    uuid primary key default gen_random_uuid(),

  -- Vinculo obrigatorio com o cliente
  client_id             uuid not null references public.clients(id) on delete cascade,

  -- Vinculo opcional com a organizacao gestora
  organization_id       uuid references public.organizations(id) on delete cascade,

  -- Dados estrategicos da marca
  segmento              text,
  descricao             text,                    -- "o que a empresa faz" em uma frase
  objetivo_principal    text,                    -- vender | leads | autoridade | engajamento
  objetivos_secundarios text[],                  -- array de objetivos adicionais
  tom_de_voz            text[],                  -- profissional | acolhedor | educativo etc
  publico_alvo          text,                    -- descricao livre do publico
  faixa_etaria          text,
  cidade                text,
  instagram_handle      text,
  site_url              text,

  -- Produtos e servicos (descricao livre para contexto de IA)
  produtos_servicos     text,

  -- Canais ativos
  canais_ativos         text[],                  -- instagram | facebook | tiktok | youtube etc

  -- Metricas atuais (atualizadas manualmente ou via API)
  seguidores_instagram  integer,
  seguidores_facebook   integer,
  taxa_engajamento      numeric(5,2),            -- percentual
  alcance_medio         integer,
  impressoes_medias     integer,

  -- Contexto para IA (texto livre, atualizado periodicamente)
  resumo_estrategico    text,                    -- contexto condensado para enviar ao LLM
  problemas_atuais      text,                    -- gargalos e desafios identificados
  ultima_campanha       text,                    -- descricao da ultima campanha executada
  proximos_passos       text,                    -- sugestoes e acoes planejadas

  -- Status do contexto
  contexto_atualizado_em timestamptz,            -- quando o resumo_estrategico foi gerado
  status                text not null default 'ativo'
    check (status in ('ativo', 'pausado', 'encerrado')),

  -- Timestamps
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  -- Unicidade: um contexto por cliente por organizacao
  unique (client_id, organization_id)
);

-- Indices
create index if not exists client_context_client_idx on public.client_context (client_id);
create index if not exists client_context_org_idx    on public.client_context (organization_id);
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

-- Selecao: admin ve tudo, agency ve os proprios, client ve o proprio
create policy "client_context_select"
  on public.client_context for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (
          p.role = 'admin'
          or (p.role = 'agency' and organization_id = (
            select org_id from public.profiles where id = auth.uid() limit 1
          ))
        )
    )
  );

create policy "client_context_insert"
  on public.client_context for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'agency')
    )
  );

create policy "client_context_update"
  on public.client_context for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'agency')
    )
  );

-- Comentario:
-- Apos criar esta tabela, a rota /api/ai/diagnostico pode ser expandida
-- para ler client_context e gerar diagnosticos personalizados por cliente.
-- O campo resumo_estrategico e o "Context Pack" que pode ser passado ao LLM.
