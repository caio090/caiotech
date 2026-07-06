# Estratégia de Captura de Leads — Typebot

*Criado: 2026-07-06. Atualizado: 2026-07-06.*

---

## Decisão

O Typebot é um **canal externo de captação**, não um CRM. Ele coleta dados e os envia via webhook. A Lokat OS interpreta, normaliza, salva, classifica e prepara o lead para o time comercial / diagnóstico / CRM.

---

## Endpoint de produção

**URL atual (temporária):**

```
https://www.lokat.com.br/api/leads/typebot
```

> **Por que temporária?**
> O domínio `app.lokat.io` ainda não está vinculado ao projeto Vercel nem possui certificado SSL válido.
> Usar `www.lokat.com.br` enquanto isso não estiver resolvido.

**URL futura (quando `app.lokat.io` estiver vinculado na Vercel com certificado):**

```
https://app.lokat.io/api/leads/typebot
```

Não usar `app.lokat.io` até confirmar que: (1) o domínio está adicionado no painel da Vercel, (2) o certificado HTTPS está ativo e sem erro de SSL.

---

## Fluxo

```
Anúncio / Site
  → Typebot (conversa guiada)
  → HTTP Request (webhook)
  → POST https://www.lokat.com.br/api/leads/typebot
  → normalizeLeadPayload() + computeLeadScore()
  → launch_waitlist
  → Time comercial / diagnóstico / CRM
```

---

## Arquivos do sistema

| Arquivo | Responsabilidade |
|---|---|
| `src/app/api/leads/typebot/route.ts` | Endpoint webhook (POST) — server-side only |
| `src/lib/leads/normalize-lead-payload.ts` | Normalização e lead score (reutilizável) |
| `src/components/lead-conversation-modal.tsx` | Modal local (usa normalizeAccountType) |
| `docs/supabase/76-typebot-lead-columns.sql` | Migration para colunas extras |

---

## Campos aceitos pelo endpoint

### Formato flat (recomendado)

```json
{
  "name": "...",
  "email": "...",
  "phone": "...",
  "whatsapp": "...",
  "business_name": "...",
  "business_type": "...",
  "main_problem": "...",
  "interest": "...",
  "utm_source": "...",
  "utm_medium": "...",
  "utm_campaign": "...",
  "utm_content": "...",
  "utm_term": "...",
  "referrer": "...",
  "landing_path": "...",
  "typebot_session_id": "...",
  "typebot_result_id": "..."
}
```

### Formato com variáveis do Typebot

```json
{
  "variables": {
    "Nome": "...",
    "Email": "...",
    "WhatsApp": "...",
    "Tipo de negócio": "...",
    "Maior gargalo": "...",
    "Interesse": "..."
  }
}
```

O helper `normalizeLeadPayload()` aceita ambos os formatos e aliases de campo.

---

## Validação mínima

Pelo menos um contato é obrigatório: `email` **ou** `whatsapp` **ou** `phone`.

Nome é opcional — salvo se vier.

---

## Lead score automático

| Critério | Pontos |
|---|---|
| Tem email | +20 |
| Tem whatsapp ou phone | +20 |
| Tem business_type | +15 |
| Tem main_problem | +15 |
| interest inclui "diagnóstico", "demonstração", "falar com"... | +10 |
| Tem utm_campaign | +10 |
| account_type = "agency" ou "business" | +10 |
| **Máximo possível** | **100** |

Salvo em `lead_score` (inteiro). Se a coluna não existir (SQL 76 pendente), salvo em `metadata`.

---

## Segurança do webhook

### Variável de ambiente (Vercel — server-side only)

```
LOKAT_TYPEBOT_WEBHOOK_SECRET=<string-secreta-gerada-por-você>
```

Configure em: **Vercel → projeto → Settings → Environment Variables**.

> **Importante:** essa variável fica apenas na Vercel/servidor. Nunca expor no frontend,
> nunca commitar em `.env` rastreado pelo git, nunca exibir em logs públicos.
> O mesmo vale para `SUPABASE_SERVICE_ROLE_KEY` — ambas são server-side only.

### Header obrigatório no Typebot (quando a variável existir)

```
x-lokat-webhook-secret: <cole aqui o valor real criado na Vercel>
```

No bloco HTTP Request do Typebot, o valor desse header deve ser o **segredo real** — não uma variável de template. Opções:

- **Opção A (simples):** cole o valor diretamente no campo do header dentro do Typebot.
- **Opção B (segura):** crie uma variável de ambiente/secreta dentro do próprio Typebot (se a sua versão suportar), e referencie ela no header.

> Não use `{{LOKAT_TYPEBOT_WEBHOOK_SECRET}}` esperando que o Typebot resolva automaticamente — essa é uma variável da Vercel, não do Typebot. Copie o valor gerado e cole diretamente.

Sem a variável de ambiente na Vercel, a rota aceita requests sem header (útil para dev/staging).

---

## Deduplicação

1. Por `typebot_result_id` (unique index parcial) — evita reenvio da mesma sessão.
2. Por `email` — evita cadastro duplicado do mesmo contato.
3. Em caso de duplicata: retorna `{ ok: true, duplicate: true, lead_id: "..." }`.

---

## Fallback para SQL 76 pendente

Se o SQL 76 ainda não foi rodado, os campos estendidos (whatsapp, business_type, raw_payload etc.) não existem na tabela. O endpoint detecta o erro `42703` e faz um segundo INSERT somente com os campos base. A resposta inclui `_note: "SQL 76 pendente"`.

---

## Como configurar o HTTP Request no Typebot

### 1. Criar bloco "HTTP Request"

No final do fluxo do seu Typebot, adicione um bloco **HTTP Request**.

### 2. Configurar a requisição

| Campo | Valor |
|---|---|
| Method | `POST` |
| URL | `https://www.lokat.com.br/api/leads/typebot` |
| Content-Type | `application/json` |
| x-lokat-webhook-secret | valor real do secret criado na Vercel (ver seção Segurança) |

> **Atenção ao domínio:** use `www.lokat.com.br` até que `app.lokat.io` esteja vinculado
> na Vercel com certificado SSL válido confirmado.

### 3. Body sugerido

```json
{
  "name": "{{Nome}}",
  "email": "{{Email}}",
  "whatsapp": "{{WhatsApp}}",
  "business_name": "{{Nome da empresa}}",
  "business_type": "{{Tipo de negócio}}",
  "main_problem": "{{Maior gargalo}}",
  "interest": "{{Interesse}}",
  "utm_source": "{{utm_source}}",
  "utm_medium": "{{utm_medium}}",
  "utm_campaign": "{{utm_campaign}}",
  "utm_content": "{{utm_content}}",
  "utm_term": "{{utm_term}}",
  "referrer": "{{Referrer}}",
  "landing_path": "{{Landing path}}",
  "typebot_session_id": "{{Session ID}}",
  "typebot_result_id": "{{Result ID}}"
}
```

As variáveis `{{...}}` são resolvidas pelo Typebot com os valores coletados no fluxo.

### 4. Variáveis ocultas recomendadas no Typebot

Adicione no início do fluxo como variáveis inicializadas via URL ou Script:

| Variável | Como capturar |
|---|---|
| `utm_source` | Parâmetro UTM da URL de entrada |
| `utm_medium` | Parâmetro UTM da URL de entrada |
| `utm_campaign` | Parâmetro UTM da URL de entrada |
| `utm_content` | Parâmetro UTM da URL de entrada |
| `utm_term` | Parâmetro UTM da URL de entrada |
| `Referrer` | `document.referrer` via bloco Script |
| `Landing path` | `window.location.pathname` via bloco Script |
| `Session ID` | `typebotId` do contexto interno |
| `Result ID` | ID único gerado automaticamente pelo Typebot |

---

## Como testar

### Teste local com curl

```bash
curl -X POST http://localhost:3000/api/leads/typebot \
  -H "Content-Type: application/json" \
  -H "x-lokat-webhook-secret: SEU_SECRET_AQUI" \
  -d '{
    "name": "Teste Lead",
    "email": "teste@exemplo.com",
    "whatsapp": "89991234567",
    "business_type": "Restaurante",
    "main_problem": "Não consigo organizar conteúdo",
    "interest": "Diagnóstico gratuito",
    "utm_source": "instagram",
    "utm_campaign": "jul2026",
    "typebot_session_id": "sess_abc123",
    "typebot_result_id": "res_xyz789"
  }'
```

### Teste em produção com curl

```bash
curl -X POST https://www.lokat.com.br/api/leads/typebot \
  -H "Content-Type: application/json" \
  -H "x-lokat-webhook-secret: SEU_SECRET_AQUI" \
  -d '{
    "name": "Teste Produção",
    "email": "teste@exemplo.com",
    "whatsapp": "89991234567",
    "business_type": "Agência"
  }'
```

### Resposta esperada (sucesso)

```json
{
  "ok": true,
  "lead_id": "uuid-aqui",
  "source": "typebot",
  "status": "new",
  "duplicate": false
}
```

### Resposta esperada (duplicata)

```json
{
  "ok": true,
  "lead_id": "uuid-existente",
  "source": "typebot",
  "status": "new",
  "duplicate": true,
  "message": "Você já está na lista de espera."
}
```

### Teste sem email (apenas whatsapp)

```bash
curl -X POST https://www.lokat.com.br/api/leads/typebot \
  -H "Content-Type: application/json" \
  -d '{ "whatsapp": "89991234567", "business_type": "Loja" }'
```

---

## Checklist de pendências manuais

- [ ] Rodar SQL 76 no Supabase SQL Editor
- [ ] Gerar valor para `LOKAT_TYPEBOT_WEBHOOK_SECRET` (ex: `openssl rand -hex 32`) e salvar na Vercel
- [ ] Criar projeto Typebot e configurar HTTP Request com URL `https://www.lokat.com.br/api/leads/typebot`
- [ ] Colar o valor do secret diretamente no campo do header no Typebot
- [ ] Configurar variáveis ocultas de UTM no Typebot
- [ ] Testar POST real do Typebot
- [ ] Confirmar lead salvo em `/admin/super/waitlist`
- [ ] Quando `app.lokat.io` estiver na Vercel com SSL: trocar URL no Typebot e atualizar este doc

---

## Segurança — resumo das variáveis server-side

| Variável | Onde fica | Exposta ao browser? |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel (server-side) | Nunca |
| `LOKAT_TYPEBOT_WEBHOOK_SECRET` | Vercel (server-side) | Nunca |
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + cliente | Sim (é pública por design) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel + cliente | Sim (é pública por design) |

---

*Atualizar quando integração real for testada em produção ou quando `app.lokat.io` for vinculado.*
