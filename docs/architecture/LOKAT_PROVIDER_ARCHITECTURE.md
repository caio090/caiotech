# LOKAT Provider Architecture

**Data:** 2026-07-13
**Status:** Fundação implementada

---

## Princípio

O LOKAT OS adota um modelo de **providers** para desacoplar os motores externos (editores, CRM inbox, schedulers) da lógica do produto. Cada provider implementa uma interface comum e pode ser substituído sem alterar o código das páginas.

---

## Estrutura de Arquivos

```
src/lib/providers/
  shared/
    types.ts           — tipos compartilhados (status, capabilities, context, errors)
  design-editor/
    index.ts           — DesignEditorProvider interface + implementações
  customer-inbox/
    index.ts           — CustomerInboxProvider interface + implementações
  social-scheduler/
    index.ts           — SocialSchedulerProvider interface + implementações
  registry.ts          — registry central (getDesignEditorProvider, etc.)
src/lib/feature-flags.ts — sistema de feature flags
```

---

## Estados do Provider

```
not_configured  — provider não configurado; infra ou credenciais ausentes
configured      — credenciais presentes, aguardando teste
testing         — em avaliação técnica (super_admin only)
active          — homologado e disponível para uso
blocked         — licença ou infra bloqueando ativação
error           — falha de conectividade ou configuração
disabled        — desabilitado por feature flag ou decisão
```

---

## Feature Flags

Cada módulo tem uma flag correspondente:

| Flag | Default | Roles Permitidas |
|---|---|---|
| `editor_os` | `testing` | `super_admin` |
| `crm_inbox` | `disabled` | — |
| `social_scheduler` | `disabled` | — |
| `editor_templates` | `disabled` | — |
| `editor_brand_context` | `testing` | `super_admin` |
| `social_metrics` | `disabled` | — |

---

## Provider Registry

O registry resolve o provider correto com base em:
1. Feature flag ativa?
2. Role do usuário tem acesso?
3. Provider configurado para o ambiente?

```typescript
// Uso:
const provider = getDesignEditorProvider();
if (provider.status === "not_configured") {
  // mostrar estado vazio
}
```

---

## API de Status

`GET /api/admin/providers/status`
- Auth: `admin` ou `super_admin`
- Retorna status sanitizado de todos os providers
- **Nunca retorna:** tokens, secrets, connection strings

---

## Implementações Atuais

### DesignEditorProvider
- `disabled` — padrão, todas as capabilities `supported: false`
- `mock` — para testes de super_admin, capabilities básicas simuladas

### CustomerInboxProvider
- `chatwoot-disabled` — estado `not_configured`, Chatwoot não instalado

### SocialSchedulerProvider
- `postiz-disabled` — estado `not_configured`, Postiz não instalado

---

## Segurança

- `ProviderContext` é sempre montado server-side (profile do usuário autenticado)
- `client_id` é validado no banco antes de ser repassado ao provider
- Providers não recebem dados do frontend sem validação
- API de status retorna apenas campos públicos (sem secrets)
- Feature flags são verificadas server-side antes de renderizar módulos

---

## EXISTENTE
- `src/lib/billing/providers/` — pattern análogo para pagamentos (manual + asaas)
- `src/lib/digital-menu/providers/` — pattern para cardápio digital (OlaClick)

## IMPLEMENTADO NESTA SPRINT
- `src/lib/providers/` — nova árvore de providers para EditorOS, CRM Inbox, Scheduler
- `src/lib/feature-flags.ts` — sistema de feature flags
- `GET /api/admin/providers/status` — endpoint de status

## PROPOSTO
- CE.SDK provider (pós-licença)
- Chatwoot provider (pós-infraestrutura)
- Postiz provider (pós-infraestrutura)

## BLOQUEADO
- Todos os providers externos (licença/infra)
