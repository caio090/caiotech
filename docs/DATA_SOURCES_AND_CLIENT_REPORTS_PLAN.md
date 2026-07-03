# Plano: Fontes de Dados, Relatórios do Cliente e WhatsApp

> Documento vivo — atualizar conforme implementação avançar.
> Criado na sessão de 2026-07-03.

---

## 1. Visões: Admin vs. Cliente

### O que o Admin vê
- Status técnico da integração (provider, endpoint, HTTP status)
- Fonte dos dados (OlaClick, Meta, manual, etc.)
- Diagnóstico detalhado (debugShape, paginação, erros de API)
- Integração e configuração de conexões
- Erros de API com mensagem do provider
- Visão completa de operação, oportunidades e clientes

### O que o Cliente vê
- Painel limpo, sem jargão técnico
- Resultados do período: faturamento, pedidos, ticket médio
- Gráficos simples e números principais
- Recomendações simples baseadas nos dados
- Aprovações pendentes de materiais
- Materiais enviados (imagens, vídeos, copies)

### O que o Cliente NUNCA vê
- Token / API Key
- Erros técnicos de integração
- Stack trace, debug ou schema de resposta
- Nome de provider ou endpoint
- Dados de outros clientes

---

## 2. Fontes de Dados Previstas

| Fonte           | Status       | Provider/Adapter     | Dados disponíveis                               |
|-----------------|--------------|----------------------|-------------------------------------------------|
| Cardápio Digital| Funcionando  | OlaClick (adapter)   | Pedidos, faturamento, ticket médio, status      |
| Meta Ads        | Vinculado    | Meta Graph API       | Alcance, impressões, engajamento (futura leitura)|
| WhatsApp        | Planejado    | Evolution API / Cloud| Mensagens, atendimentos, conversões             |
| Manual (upload) | Parcial      | CSV/PDF upload       | Relatórios externos já existem no sistema       |

---

## 3. Relatórios Futuros do Cliente

Todos os relatórios do cliente devem:
- Não exigir login (ou usar sessão leve por link seguro)
- Ser mobile-first
- Omitir completamente dados técnicos
- Mostrar apenas o resultado, não o processo

### Módulos planejados
- **Faturamento / Vendas** — período, gráfico de linha, ticket médio
- **Pedidos / Serviços** — por status, recentes, top produtos
- **Leads** — vindos de formulários, Meta, WhatsApp
- **Campanhas** — alcance, impressões, cliques (Meta)
- **Aprovações pendentes** — lista de materiais aguardando feedback
- **Materiais aprovados / histórico** — arquivos entregues

---

## 4. WhatsApp na Lokat OS

WhatsApp não é só chat. Ele é:

1. **Canal de conversa** com o cliente
2. **Canal de envio de aprovação** — link seguro enviado pelo sistema
3. **Canal de follow-up comercial** — automação de funil
4. **Fonte de dados de atendimento** — volume, tempo de resposta
5. **Canal de alertas** — aviso ao operacional quando cliente aprova/reprova
6. **Canal para mandar link seguro** — /aprovar/[token]

### V1 — Piloto / Baixo Custo (Evolution API)

**Tecnologia:** Evolution API (self-hosted ou managed)

**Como funciona:**
1. Admin abre painel `/admin/whatsapp`
2. Sistema cria instância via Evolution API
3. Painel exibe QR Code temporário (expires_at no banco)
4. Cliente ou número da agência escaneia o QR
5. Instância fica conectada
6. Sistema pode enviar mensagens via webhook/API interna
7. Sistema pode receber eventos via webhook do Evolution

**Casos de uso V1:**
- Enviar link de aprovação para cliente por WhatsApp
- Receber confirmação do cliente
- Follow-up automático de lead em pipeline comercial

**Status da instância (a exibir no painel):**
- `pending_qr` — aguardando escaneamento
- `connected` — ativo e funcionando
- `disconnected` — desconectado (celular sem internet, etc.)
- `error` — falha na instância

**Ideal para:** 1–10 clientes ativos, teste de conceito, baixo custo.

### V2 — Oficial / SaaS (WhatsApp Cloud API)

**Tecnologia:** Meta WhatsApp Business Platform (Cloud API)

**Como funciona:**
1. Onboarding via Meta Business Manager
2. Número de telefone verificado e aprovado pela Meta
3. Templates de mensagem aprovados pela Meta
4. API REST da Meta para envio e recebimento

**Diferenças principais:**
| Aspecto          | Evolution API (V1)          | WhatsApp Cloud API (V2)      |
|------------------|-----------------------------|-------------------------------|
| Custo            | Infra própria / barato       | Por mensagem (Meta pricing)  |
| Configuração     | QR Code simples              | Onboarding Meta completo     |
| Escala           | Limitado (1 número/instância)| Multi-número, SaaS            |
| Templates        | Livre (não oficial)          | Aprovados pela Meta           |
| Risco            | Pode ser banido pela Meta    | Oficial, sem risco de ban     |
| Ideal para       | Piloto, teste, interno       | Clientes pagantes, escala     |

---

## 5. Tabelas Planejadas (sem SQL nesta sessão)

### `client_whatsapp_connections`
```
id                uuid PK
client_id         uuid FK → clients
provider_slug     text  -- "evolution" | "whatsapp_cloud"
instance_name     text
status            text  -- pending_qr | connected | disconnected | error
phone_number      text
qr_code_expires_at timestamptz
last_connected_at  timestamptz
last_message_at    timestamptz
metadata           jsonb
created_at         timestamptz
updated_at         timestamptz
```

### `client_whatsapp_messages`
```
id                  uuid PK
client_id           uuid FK → clients
connection_id       uuid FK → client_whatsapp_connections
direction           text  -- inbound | outbound
from_number         text
to_number           text
message_type        text  -- text | image | video | document | template
body                text
media_url           text
status              text  -- sent | delivered | read | failed
external_message_id text
created_at          timestamptz
```

---

## 6. Fluxo de Aprovação por Link

### Objetivo
Quando uma arte/vídeo/conteúdo estiver pronto, o operacional gera um link público e seguro. Esse link pode ser enviado por WhatsApp. O cliente não precisa de login.

### Fluxo completo

```
1. Operacional finaliza peça no sistema
2. Clica em "Gerar link de aprovação"
3. Sistema cria token_hash único em content_approval_links
4. Sistema retorna: https://lokat.com.br/aprovar/[token]
5. Operacional copia o link e envia por WhatsApp (manualmente ou automaticamente)
6. Cliente abre o link no celular
7. Página /aprovar/[token] carrega:
   - Nome do cliente
   - Título da peça / demanda
   - Preview (imagem / vídeo / texto)
   - Botões: Aprovar | Reprovar | Solicitar alteração
8. Se "Solicitar alteração": abre campo de comentário obrigatório
9. Ao confirmar:
   - Grava evento em content_approval_events
   - Atualiza status em content_approval_links
   - Atualiza status da demanda no sistema
   - Notifica operacional (in-app ou WhatsApp se conectado)
   - Envia confirmação ao cliente se WhatsApp conectado
```

### Requisitos da página pública `/aprovar/[token]`
- Não exige login
- Token único por aprovação (UUID v4 + hash)
- Expiração opcional (campo expires_at)
- Não lista outros conteúdos
- Não expõe dados internos
- Mobile-first
- Sem token/API em nenhum campo visível

### Tabelas planejadas

#### `content_approval_links`
```
id           uuid PK
client_id    uuid FK → clients
content_id   uuid FK → (demanda/peça)
token_hash   text UNIQUE  -- hash do token público, nunca o token bruto
status       text  -- pending | approved | rejected | changes_requested | expired
expires_at   timestamptz  -- null = sem expiração
created_by   uuid FK → users
created_at   timestamptz
updated_at   timestamptz
```

#### `content_approval_events`
```
id               uuid PK
approval_link_id uuid FK → content_approval_links
action           text  -- opened | approved | rejected | changes_requested
comment          text  -- preenchido quando changes_requested
ip_hash          text  -- hash do IP, não o IP bruto
user_agent       text
created_at       timestamptz
```

---

## 7. Roadmap de Implementação Sugerido

### Fase 1 (já feito)
- [x] Integração OlaClick com paginação e métricas reais
- [x] Período personalizado no faturamento admin
- [x] UI admin de faturamento com todos os blocos

### Fase 2 (próximas sessões)
- [ ] Página `/aprovar/[token]` — visual público
- [ ] Geração de link de aprovação no sistema
- [ ] Registro de eventos de aprovação
- [ ] Página admin `/admin/whatsapp` com status e QR (placeholder)

### Fase 3
- [ ] Integração Evolution API — envio de mensagem
- [ ] Envio automático de link de aprovação por WhatsApp
- [ ] Notificação ao operacional quando cliente responde

### Fase 4
- [ ] Relatório do cliente (painel limpo sem login)
- [ ] Migração para WhatsApp Cloud API se necessário
- [ ] Insights Meta integrados ao painel
