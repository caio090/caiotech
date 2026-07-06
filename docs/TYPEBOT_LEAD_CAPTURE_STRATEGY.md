# Estratégia de Captura de Leads — Typebot

*Criado: 2026-07-06. Status: V1 implementada (modal local). Typebot real: fase futura.*

---

## Objetivo

Capturar leads qualificados com contexto de intenção (objetivo, tipo de negócio, contato) sem depender de formulários estáticos.

---

## Arquitetura atual (V1 — modal local)

### Fluxo

```
Visitante → clica "Agendar demonstração"
  → LeadConversationModal abre (sem iframe, sem credenciais externas)
  → 5 perguntas sequenciais: nome, WhatsApp, tipo, objetivo, mensagem
  → POST /api/launch/waitlist (source="site_conversation")
  → Salvo em launch_waitlist
  → Confirmação no modal
```

### Arquivos

| Arquivo | Função |
|---|---|
| `src/components/lead-conversation-modal.tsx` | Modal de conversa (UI conversacional local) |
| `src/app/api/launch/waitlist/route.ts` | Endpoint de salvamento (já existia) |
| `src/app/api/leads/typebot/route.ts` | Endpoint dedicado para webhook Typebot (futuro) |

### Campos salvos

| Campo | Origem |
|---|---|
| `name` | pergunta 1 |
| `phone` | pergunta 2 |
| `account_type` | pergunta 3 (seleção) |
| `interest` | pergunta 4 (seleção) |
| `source` | `"site_conversation"` (fixo) |
| `status` | `"new"` (padrão) |

> **Email não é coletado no modal** — o lead entra na waitlist sem email e a equipe faz o follow-up pelo WhatsApp. Isso reduz fricção na primeira interação.

---

## Fase 2 — Integração Typebot real

### Quando implementar

- Quando houver volume suficiente para justificar qualificação automatizada (>50 leads/semana).
- Quando a equipe quiser A/B testar fluxos de perguntas sem deploy.

### Fluxo planejado

```
Typebot (externo) → resposta final → webhook → POST /api/leads/typebot
  → Valida campo email (obrigatório para webhook)
  → Salva em launch_waitlist (source="typebot")
  → Responde { ok: true, id }
```

### Endpoint

`POST /api/leads/typebot`

**Payload esperado (webhook do Typebot):**
```json
{
  "name": "Maria Silva",
  "email": "maria@empresa.com",
  "phone": "89994001234",
  "account_type": "Agência",
  "interest": "Gestão de clientes",
  "city": "Teresina"
}
```

**Resposta de sucesso:**
```json
{ "ok": true, "duplicate": false, "id": "uuid" }
```

**Resposta de duplicata:**
```json
{ "ok": true, "duplicate": true, "message": "Você já está na lista de espera." }
```

### SQL necessário

Não é necessário SQL adicional. O `launch_waitlist` já tem todos os campos necessários.

Se futuramente precisar guardar o payload raw do Typebot para debug:
```sql
-- SQL 76 (opcional — só criar se necessário)
ALTER TABLE public.launch_waitlist
  ADD COLUMN IF NOT EXISTS raw_payload jsonb NULL;
```

---

## Tabela de fonte de leads

| source | Origem | Modal |
|---|---|---|
| `"site"` | Formulário `/pre-acesso` | Não |
| `"site_conversation"` | Modal `LeadConversationModal` (landing) | Sim |
| `"typebot"` | Webhook real do Typebot (futuro) | Não |
| `"manual"` | Cadastro manual pelo admin | Não |

---

## Segurança

- O endpoint `/api/leads/typebot` requer `SUPABASE_SERVICE_ROLE_KEY` (server-side only).
- Não expõe chaves em chamadas do browser.
- Validação básica: `name` e `email` são obrigatórios para o webhook Typebot.
- `source="site_conversation"` não exige email (follow-up é por WhatsApp).

---

*Atualizar quando Typebot real for integrado.*
