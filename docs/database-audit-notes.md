# Database Audit Notes — LOKAT OS

> Levantamento dos SQLs 01–41. Nenhuma tabela foi removida ou alterada neste doc.
> Apenas mapeamento para referência e prevenção de duplicidade.

---

## SQLs aplicados (01–41)

| # | Arquivo | Tabelas principais |
|---|---|---|
| 01 | profiles | `profiles` |
| 02 | clients | `clients` |
| 03 | client_access | `client_access` |
| 04 | onboarding_profiles | `onboarding_profiles` |
| 05 | content_items | `content_items` |
| 06 | content_approvals | `content_approvals` |
| 07–10 | (variado) | calendário, briefings, campanhas, tarefas |
| 11–20 | (variado) | relatórios, integrações, notificações, audit |
| 21–30 | (variado) | RecOS, academy, financeiro, leads |
| 31–38 | (variado) | tráfego, comercial, olaclick base |
| 39 | olaclick-connections | `olaclick_connections` |
| 40 | png-vidigal-assets-and-ai-credits | `client_visual_assets`, `client_visual_profiles`, `ai_credit_wallet`, `ai_credit_ledger`, `ai_generation_jobs` |
| 41 | platform-account-types-and-cleanup | colunas adicionadas a `clients`: `account_type`, `platform_status`, `deleted_at`, `archived_at`, `parent_agency_id` |

---

## Tabelas críticas

### `clients`
- Tabela central. Todo dado usa `client_id` como FK.
- Soft delete: `status = 'archived'` + `archived_at` (SQL 41)
- Tipo de conta: `account_type` (SQL 41)
- **Risco**: remoção física cascateia para todas as FKs com `ON DELETE CASCADE`

### `profiles`
- Vinculada a `auth.users` via `id`
- Campo `role` é string simples (não enum): admin, super_admin, cliente, operacional, etc.
- `super_admin` deve ser setado manualmente no Supabase para o dono da plataforma

### `v_real_clients` (view)
- Filtra clientes de teste e arquivados
- Usada por `getAdminContentOSClients()` e `validateContentOSClient()`
- Atualizar para incluir `deleted_at IS NULL` após SQL 41

### `content_items`
- FK para `clients(id)` — itens de cliente removido podem ficar órfãos se não cascatear
- ContentOS usa `v_real_clients` para filtrar — clientes arquivados não aparecem

### `olaclick_connections` (SQL 39)
- `connection_type`: api_key | oauth | webhook
- `status`: active | inactive | error | pending
- **Ainda não rodado no Supabase**

### `ai_credit_wallet` (SQL 40)
- `remaining_credits` é GENERATED ALWAYS — não inserir diretamente
- **Ainda não rodado no Supabase**

---

## Suspeitos de duplicidade

- `content_approvals` e fluxo de aprovações — verificar se há tabela legacy de aprovações antiga
- `notifications` — pode haver duplicidade com sistema de alertas de tarefas
- Campos de "status" espalhados: `clients.status`, `clients.platform_status` (SQL 41), `olaclick_connections.status` — todos distintos, não confundir

---

## Riscos de orphan data

| Situação | Impacto |
|---|---|
| Cliente hard-deleted sem cascade | Conteúdos, briefings, tarefas ficam órfãos |
| SQL 39/40 não rodados | Páginas que consultam essas tabelas retornam erro ou vazio silencioso |
| `v_real_clients` sem filtro `deleted_at` | Clientes soft-deleted voltam a aparecer no ContentOS |

---

## Pendências de execução manual

- [ ] SQL 39 — `olaclick_connections` — rodar no Supabase SQL Editor
- [ ] SQL 40 — PNG Vidigal tables — rodar no Supabase SQL Editor
- [ ] SQL 41 — account types & cleanup — rodar no Supabase SQL Editor
- [ ] Após SQL 41: atualizar `v_real_clients` para filtrar `deleted_at IS NULL`
- [ ] Setar `role = 'super_admin'` manualmente no perfil do dono da plataforma

---

## Regras imutáveis

- Nunca rodar `DELETE`, `DROP` ou `TRUNCATE` em dados reais
- Nunca alterar `auth.users` diretamente — usar Supabase Auth API
- Toda SQL nova deve ser versionada em `docs/supabase/NN-nome.sql`
- Sempre testar idempotência: `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`
