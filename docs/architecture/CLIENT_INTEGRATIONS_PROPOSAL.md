# Proposta: Tabela `client_integrations`

> **AVISO: PROPOSTA NÃO APLICADA. NÃO EXECUTAR SEM AUTORIZAÇÃO EXPLÍCITA.**
>
> Este documento contém uma proposta de schema para sprint futura.
> Nenhuma SQL aqui deve ser executada sem revisão e aprovação prévia.
> A tabela `client_integrations` **não existe** no banco de dados atual.

---

## Objetivo

Substituir os campos booleanos `has_meta` / `has_instagram` na tabela `clients`
por um modelo genérico de integrações por cliente, com suporte a histórico,
status granular e múltiplos tipos de conexão.

---

## Problema atual

| Limitação | Impacto |
|---|---|
| `has_meta` e `has_instagram` são booleanos simples em `clients` | Sem histórico de quando foi conectado, sem sync timestamp |
| Sem tabela `client_integrations` | Impossível ter estado separado por integração por cliente |
| API não retorna `useAssets` flag | UI não consegue distinguir "não conectado" de "não configurado" |
| `has_meta` via `client_meta_assets` depende do SQL 37 estar rodado | Se SQL 37 não foi executado, todos os clientes aparecem como não conectados |
| WhatsApp, Google Drive, Cardápio Digital não têm estado por cliente | Placeholder visual apenas |

---

## Modelo proposto

### Tabela: `client_integrations`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `uuid` | PK, gerado automaticamente |
| `client_id` | `uuid` | FK → `clients.id` (on delete cascade) |
| `integration_type` | `text` | Tipo: meta, instagram, whatsapp, google_drive, digital_menu, delivery, crm |
| `status` | `text` | Estado: connected, pending, not_connected, error, planned |
| `external_id` | `text` | ID externo: page_id, instagram_id, etc. |
| `metadata` | `jsonb` | Dados específicos da integração (page_name, username, token_last_four...) |
| `connected_at` | `timestamptz` | Quando foi conectado pela última vez |
| `last_sync` | `timestamptz` | Última sincronização de dados |
| `created_at` | `timestamptz` | Criação do registro |
| `updated_at` | `timestamptz` | Última atualização |

### Constraint: unicidade por cliente + tipo

```
unique (client_id, integration_type)
```

---

## Tipos de integração

| Chave | Label | Situação atual |
|---|---|---|
| `meta` | Meta / Facebook | Parcial — via `client_meta_assets` (SQL 37) |
| `instagram` | Instagram | Parcial — via `client_meta_assets` (SQL 37) |
| `whatsapp` | WhatsApp | Planejado |
| `google_drive` | Google Drive | Planejado |
| `digital_menu` | Cardápio Digital | Parcial — via `olaclick_connections` por client_id |
| `delivery` | PDV / Delivery | Planejado |
| `crm` | CRM externo | Planejado |

---

## Estados de uma integração

| Status | Significado |
|---|---|
| `connected` | Conectado e funcional |
| `pending` | Processo de conexão iniciado, aguardando confirmação |
| `not_connected` | Confirmado que não está conectado |
| `error` | Conectado anteriormente, erro atual |
| `planned` | Previsto para este perfil de conta, ainda não configurado |
| `needs_setup` | Requer configuração adicional |

---

## Riscos

| Risco | Mitigação |
|---|---|
| Migration quebra `has_meta`/`has_instagram` em `/api/admin/clients` | Manter campos antigos como computed/view enquanto migra |
| RLS por client_id exige organização multi-tenant | Implementar após `organization_id` estar ativo |
| `client_meta_assets` já faz parte da função parcial do Meta | Migrar dados existentes de `client_meta_assets` para `client_integrations` |
| Sem rollback fácil se schema estiver errado | Sempre rodar em staging primeiro |

---

## Migration futura (rascunho — NÃO EXECUTAR)

```sql
-- RASCUNHO - NÃO EXECUTAR SEM AUTORIZAÇÃO
-- Revisar com o time antes de rodar em qualquer ambiente

create table if not exists public.client_integrations (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references public.clients(id) on delete cascade,
  integration_type text not null,
  status           text not null default 'not_connected',
  external_id      text,
  metadata         jsonb default '{}',
  connected_at     timestamptz,
  last_sync        timestamptz,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique (client_id, integration_type)
);

alter table public.client_integrations enable row level security;

-- RLS: usuários veem apenas integrações dos clientes aos quais têm acesso
-- (política específica a definir com o modelo de organization_id)
```

---

## Rastreabilidade de schema

- Tabela proposta depende de: `clients.id` existir e estar estável
- Relacionada a: SQL 37 (`client_meta_assets`), `olaclick_connections`
- Bloqueia: dashboard de integrações por cliente, relatórios por fonte de dados
- Habilitada por: autorização de schema + sprint dedicada de migrations

---

*Proposta criada em: 2026-07-10. Autor: sprint de arquitetura Sprint 5.*
*Última revisão: 2026-07-10.*
