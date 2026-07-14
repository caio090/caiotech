# Open Source Deployment Architecture

**Data:** 2026-07-13
**Status:** Proposta — nenhuma infra criada nesta sprint

---

## Princípio

O LOKAT OS (Next.js/Vercel) continua sendo o frontend principal e ponto de entrada. Os motores externos rodam em serviços separados, nunca dentro do deployment Vercel.

---

## Tabela de Serviços

| Serviço | Hospedagem | Processos | Banco | Redis | Fila | Storage | Backup | Logs | Custo estimado | Domínio sugerido | Risco |
|---|---|---|---|---|---|---|---|---|---|---|---|
| LOKAT OS | Vercel | Node.js (serverless) | Supabase (externo) | Não | Não | Supabase Storage | Vercel + Supabase | Vercel + Supabase | Já existente | lokat.com.br | Baixo |
| Chatwoot | VPS Linux (2–4 GB RAM) | Rails + Sidekiq | PostgreSQL (interno) | Sim (obrigatório) | Sidekiq | S3 / local | pg_dump | Self-managed | ~$20–40/mês | inbox.lokat.com.br | Médio |
| Postiz | VPS Linux (4–8 GB RAM) | NestJS + Temporal workers | PostgreSQL (interno) | Sim (obrigatório) | Temporal | S3 / local | pg_dump | Self-managed | ~$40–80/mês | scheduler.lokat.com.br | Médio |
| CE.SDK | Embedded (Next.js) | — | Supabase (externo) | Não | Não | Supabase Storage | — | Vercel | Licença img.ly | — (sem subdomínio) | Baixo (se licenciado) |

---

## Diagrama Conceitual

```
Usuário
  │
  └─► lokat.com.br (Vercel — LOKAT OS)
        │
        ├─► Supabase (banco + auth + storage)
        │
        ├─► inbox.lokat.com.br (Chatwoot — VPS)
        │     └─► API REST + webhooks ──► LOKAT OS
        │
        └─► scheduler.lokat.com.br (Postiz — VPS)
              └─► API @postiz/node SDK ──► LOKAT OS
```

---

## DNS e Subdomínios

Os subdomínios abaixo são **sugestões para análise futura**. Nada foi configurado.

- `inbox.lokat.com.br` → Chatwoot
- `scheduler.lokat.com.br` → Postiz
- `editor.lokat.com.br` → (se CE.SDK precisar de backend próprio no futuro)

**Não configurar DNS automaticamente.** Requer autorização e planejamento de infra.

O usuário final idealmente não precisa ver os subdomínios — o LOKAT OS faz as chamadas server-side.

---

## Integração LOKAT OS ↔ Chatwoot

```
LOKAT OS (Next.js API route)
  │  valida client_id + perfil do usuário
  └─► Chatwoot REST API (Authorization: Bearer <API_KEY>)
        │
        ├─► GET /api/v1/accounts/{id}/conversations
        ├─► POST /api/v1/accounts/{id}/conversations/{id}/messages
        └─► Webhooks → /api/webhooks/chatwoot (LOKAT OS recebe eventos)
```

**Configuração necessária (não implementada):**
- `CHATWOOT_BASE_URL` (env var)
- `CHATWOOT_API_KEY` (env var, server-side only)
- `CHATWOOT_WEBHOOK_SECRET` (env var)

---

## Integração LOKAT OS ↔ Postiz

```
LOKAT OS (Next.js API route)
  │  conteúdo aprovado + client_id validado
  └─► @postiz/node SDK
        │
        ├─► createPost({ channel, content, scheduledAt })
        ├─► getPostStatus(postId)
        └─► Webhooks → /api/webhooks/postiz (LOKAT OS recebe status)
```

**Configuração necessária (não implementada):**
- `POSTIZ_API_URL` (env var)
- `POSTIZ_API_KEY` (env var, server-side only)
- `POSTIZ_WEBHOOK_SECRET` (env var)

---

## Requisitos de VPS (estimativa)

### Chatwoot
- Ubuntu 22.04 LTS
- 2 vCPUs, 4 GB RAM mínimo
- 40 GB SSD
- Docker + Docker Compose

### Postiz
- Ubuntu 22.04 LTS
- 2 vCPUs, 4 GB RAM mínimo
- 40 GB SSD
- Docker + Docker Compose
- Temporal.io (incluído no docker-compose)

---

## Status Desta Sprint

- ❌ Nenhuma VPS provisionada
- ❌ Nenhum subdomínio configurado
- ❌ Nenhum serviço instalado
- ✅ Documentação de arquitetura criada
- ✅ Provider contracts TypeScript criados
- ✅ Feature flags implementadas (estado `not_configured`)
