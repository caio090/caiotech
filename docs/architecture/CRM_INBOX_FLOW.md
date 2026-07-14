# CRM Inbox Flow

**Data:** 2026-07-13
**Status:** Fundação documentada; provider não configurado

---

## Objetivo

Integrar o CRM OS (pipeline de leads) com um motor de atendimento (Chatwoot) para centralizar conversas, mensagens e histórico de cliente em um único workspace.

---

## Fluxo Conceitual

```
Lead capturado (Typebot / landing / diagnóstico)
  │
  ▼
CRM OS — Pipeline
  │
  ├─► Qualificação
  ├─► Negociação
  ├─► Proposta
  └─► Venda
        │
        ▼
    Pós-venda
    CRM Inbox ←───── Chatwoot (motor de atendimento)
        │
        ├─► Conversas (WhatsApp, Instagram, Email, Webchat)
        ├─► Atribuição para responsável
        ├─► Tags e categorização
        ├─► Histórico completo
        └─► Métricas de atendimento
```

---

## Relacionamento de Dados

Toda conversa pode ser vinculada a:

| Campo | Tabela Existente | Campo |
|---|---|---|
| Lead | `launch_waitlist` | `id` |
| Cliente | `clients` | `id` |
| Oportunidade | (futura) | — |
| Tarefa | `operational_tasks` | `id` |
| Campanha | `content_items` | `id` (proxy) |
| Responsável | `profiles` | `id` |

Tabela proposta `conversation_links` (SQL 88):
```sql
conversation_links (
  id, provider, external_conversation_id,
  client_id, lead_id, opportunity_id,
  task_id, campaign_id, assigned_profile_id,
  status, last_message_at, created_at
)
```

---

## Integração com Chatwoot

```
LOKAT OS                              Chatwoot (VPS separado)
    │                                       │
    ├─► GET /api/v1/accounts/{id}/conversations ──►
    ├─► POST /api/v1/.../messages ──────────►
    │                                       │
    ◄── webhooks (new_message, status_changed) ──
    │                                       │
  /api/webhooks/chatwoot                    │
  (valida signature, atualiza conversation_links)
```

---

## Mapeamento de Usuários

| LOKAT OS | Chatwoot |
|---|---|
| `profiles.id` | `agent.id` |
| `profiles.email` | `agent.email` |
| `profiles.role` | Chatwoot team/role |
| `clients.company_name` | Contact label |
| SSO | SAML / OAuth (Enterprise) |

Tabela proposta `provider_user_links` (SQL 86):
```sql
provider_user_links (
  profile_id, provider, external_user_id,
  external_workspace_id, status, created_at
)
```

---

## Canais Suportados pelo Chatwoot

| Canal | Status no LOKAT OS |
|---|---|
| WhatsApp | disabled (aguarda infra) |
| Instagram DM | disabled |
| Facebook Messenger | disabled |
| E-mail | disabled |
| Webchat | disabled |
| Telegram | disabled |

---

## Estado Atual (Pós-Sprint V2.1)

- ✅ `CustomerInboxProvider` interface definida
- ✅ `chatwoot-disabled` provider implementado
- ✅ Feature flag `crm_inbox` = disabled
- ✅ Estado vazio na UI: "Conecte um provedor de atendimento"
- ❌ Chatwoot não instalado
- ❌ VPS não provisionada
- ❌ API key não configurada
- ❌ Webhooks não configurados
- ❌ SQL 88 não executado
