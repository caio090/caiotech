# Social Scheduler Flow

**Data:** 2026-07-13
**Status:** Fundação documentada; provider não configurado

---

## Objetivo

Integrar o REC OS com um motor de agendamento e publicação (Postiz) para que conteúdos aprovados sejam publicados automaticamente nos canais sociais do cliente.

---

## Regra Fundamental

**Nenhum conteúdo pode ser publicado sem aprovação.**

Estados de conteúdo que permitem agendamento:
- `client_approved`
- `ready_to_schedule`

Estados que bloqueiam agendamento:
- `draft`, `internal_review`, `internal_approved`, `client_review`, `failed`

---

## Fluxo Completo

```
Rascunho (draft)
  │
  ▼
Revisão interna (internal_review)
  │  [time de produção revisa]
  ▼
Aprovado internamente (internal_approved)
  │
  ▼
Enviado ao cliente (client_review)
  │  [cliente aprova no portal]
  ▼
Aprovado pelo cliente (client_approved)
  │
  ▼
Pronto para agendar (ready_to_schedule)
  │
  ├─► Escolher canal
  ├─► Escolher data/hora
  └─► Confirmar agendamento
          │
          ▼
     Agendado (scheduled)
          │
          │  [job de publicação via Postiz]
          ▼
     Publicado (published) ──── ou ──── Falhou (failed)
          │                                │
          ▼                                ▼
     Métricas                         Retry ou
     (future)                         notificação
```

---

## Integração com Postiz

```
LOKAT OS                           Postiz (VPS separado)
    │                                    │
    │  conteúdo aprovado + arquivos      │
    ├─► @postiz/node SDK ──────────────►│
    │    createPost({ channel, content,  │
    │                scheduledAt, assets })
    │                                    │
    ◄── webhooks (post_published,        │
         post_failed, metrics_ready) ────┘
    │
  /api/webhooks/postiz
  (valida signature, atualiza scheduled_publications)
```

---

## Canais Suportados

| Canal | Status no LOKAT OS | Suportado pelo Postiz |
|---|---|---|
| Instagram Feed | disabled | ✅ |
| Instagram Story | disabled | ✅ |
| Instagram Reels | disabled | ✅ |
| Facebook Feed | disabled | ✅ |
| TikTok | disabled | ✅ |
| LinkedIn | disabled | ✅ |
| YouTube | disabled | ✅ |
| Pinterest | disabled | ✅ |
| X (Twitter) | disabled | ✅ |
| Threads | disabled | ✅ |

---

## Modelo de Dados Proposto

`scheduled_publications` (SQL 89):
```sql
scheduled_publications (
  id, client_id, content_id, campaign_id,
  provider, external_post_id,
  channel, scheduled_at, published_at,
  status, approved_by, approved_at,
  assets_snapshot, copy_snapshot,
  error_message, attempts, created_at
)
```

`publication_attempts`:
```sql
publication_attempts (
  id, publication_id, attempt_number,
  status, error, provider_response,
  attempted_at
)
```

---

## Página no REC OS

Rota: `/admin/contentos/agendamento`

Estado atual: `not_configured`

Exibe:
- "Conecte um provedor de publicação para programar conteúdos aprovados."
- Diagrama visual do fluxo
- Status dos canais configurados (todos `disabled`)
- Botão "Configurar" desabilitado (futuro)

---

## Estado Atual (Pós-Sprint V2.1)

- ✅ `SocialSchedulerProvider` interface definida
- ✅ `postiz-disabled` provider implementado
- ✅ Feature flag `social_scheduler` = disabled
- ✅ Página `/admin/contentos/agendamento` com estado não configurado
- ✅ Fluxo de aprovação documentado
- ❌ Postiz não instalado
- ❌ VPS não provisionada
- ❌ Canais não conectados
- ❌ OAuth de canais sociais não configurado
- ❌ SQL 89 não executado
