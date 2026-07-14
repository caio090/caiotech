# LOKAT OS — Tenancy Mapping

**Data:** 2026-07-13
**Status:** Mapeamento inicial

---

## Objetivo

Mapear os conceitos lógicos de multi-tenancy aos campos e tabelas já existentes no LOKAT OS, antes de criar qualquer estrutura nova.

---

## Mapeamento Atual

| Conceito lógico | Entidade atual | Tabela | Campo | Limitações | Decisão |
|---|---|---|---|---|---|
| Workspace | Instância da plataforma / conta da agência | `profiles` | `account_type = 'interno_lokat' \| 'agencia_parceira'` | Não há isolamento de workspace explícito ainda | Usar `owner_id` + `account_type` como proxy de workspace |
| Organization | Agência ou empresa operadora | `profiles` | `owner_id` (admin que criou o cliente) | Sem tabela `organizations` | Manter via `owner_id` por enquanto |
| Company / Tenant | Cliente ou empresa atendida | `clients` | `id` (UUID) | `client_id` | Já é o isolamento principal |
| User | Usuário autenticado | `profiles` | `id` | `profile_id` | Mapeamento direto |
| Role | Função do usuário | `profiles` | `role` | 14 roles definidas; capabilities expandem isso | Manter + adicionar capabilities |
| Plan | Plano de assinatura | `profiles` | `plan` (`comunidade \| start \| pro \| agencia`) | — | Manter via entitlements |
| Client context | Cliente selecionado no momento | `localStorage` | `active_client_key` | Client-side — não confiável para autorização | Usar apenas para UI; sempre validar server-side |

---

## Regra de Ouro

**Nunca confiar no `client_id` enviado pelo frontend sem validação server-side.**

Toda API que recebe `client_id` deve:
1. Obter o usuário autenticado via `supabase.auth.getUser()`.
2. Verificar na tabela `clients` que o registro existe e não está deletado.
3. Verificar que o usuário tem acesso a esse cliente (via `owner_id`, `client_user_access`, ou role `admin`/`super_admin`).

---

## Contexto de Workspace

O conceito de "workspace" no LOKAT OS é:

```
super_admin → acesso total
admin → acesso ao seu conjunto de clientes (owner_id = profile.id)
operacional → acesso via assigned_to em tasks ou client_user_access
cliente → acesso apenas ao próprio cliente (profiles.client_id)
```

Não há tabela `workspaces`. O isolamento é feito por `client_id` + RLS no Supabase.

---

## Tabelas Existentes Relevantes

| Tabela | Uso | Campo de isolamento |
|---|---|---|
| `profiles` | Usuários do sistema | `id`, `role`, `client_id` |
| `clients` | Clientes/empresas | `id`, `owner_id` |
| `client_user_access` | Acesso granular de usuários a clientes | `client_id`, `profile_id` |
| `client_invites` | Convites de clientes | `client_id`, `email` |
| `onboarding_profiles` | Dados de marca do cliente | `client_id` |
| `content_items` | Conteúdos | `client_id` |
| `operational_tasks` | Tarefas operacionais | `client_id`, `assigned_to` |
| `rec_projects` | Projetos audiovisuais | `client_id` |
| `approvals` | Aprovações | `client_id`, `content_id` |

---

## Mapeamento para Providers

Quando um provider externo (Chatwoot, Postiz, CE.SDK) precisar de contexto:

```typescript
interface ProviderContext {
  clientId: string;      // clients.id — validado server-side
  profileId: string;     // profiles.id — do usuário autenticado
  role: string;          // profiles.role — fonte autoritativa
  organizationId?: string; // futuro — owner_id do admin
}
```

**O provider jamais recebe:**
- client_id do corpo da requisição sem validação
- role do frontend
- external_id não validado

---

## Migração Futura

| Necessidade | Campo proposto | Tabela proposta | Status |
|---|---|---|---|
| Workspace explícito | `workspace_id` | `workspaces` | V3 — não urgente |
| Múltiplas agências por conta | `agency_id` | `agencies` | V3 |
| SSO por provider | `external_user_id` | `provider_user_links` | V2 (SQL 89) |
| Conexões de provider | — | `integration_connections` | V2 (SQL 86) |

---

## EXISTENTE
- Isolamento por `client_id` + RLS já funciona para V1.

## IMPLEMENTADO NESTA SPRINT
- Documentação do mapeamento atual.
- `ProviderContext` interface criada em `src/lib/providers/shared/types.ts`.

## PROPOSTO
- `integration_connections` (SQL 86) para registrar conexões com providers externos.
- `provider_user_links` (SQL 89) para SSO com serviços externos.

## BLOQUEADO
- Execução dos SQLs — aguardando aprovação do time.
