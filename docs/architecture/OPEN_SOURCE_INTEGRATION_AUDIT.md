# Open Source Integration Audit

**Data:** 2026-07-13
**Status:** Auditoria inicial concluída
**Responsável:** Sprint V2.1

---

## Objetivo

Avaliar quatro repositórios open source como candidatos a motores para EditorOS, CRM Inbox e Social Scheduler dentro do LOKAT OS. Nenhum código foi incorporado antes desta auditoria.

---

## Repositórios Avaliados

### 1. LidoJS — `lidojs/canva-clone`

| Campo | Valor |
|---|---|
| URL | https://github.com/lidojs/canva-clone |
| Licença | **NULL — sem licença definida** |
| Tipo | Editor visual tipo Canva |
| Frontend | React |
| Backend | Nenhum (client-side) |
| Banco | Nenhum (local state) |
| Redis | Não |
| Docker | Não necessário |
| Workers | Não |
| API | Não (lib incorporável) |
| SDK | Não oficial |
| Webhooks | Não |
| Multi-tenancy | Não nativo |
| White label | Possível se licença permitir |
| Incorporável | Tecnicamente sim, legalmente bloqueado |

**Decisão: `architecture_reference`**

Não incorporar nenhum código. Repositório pode ser usado apenas como referência arquitetural. A ausência de licença no GitHub significa que todos os direitos são reservados por padrão (copyright implícito). Qualquer uso comercial requer contato com o autor e acordo explícito.

**Bloqueador:** Licença ausente. Requer validação jurídica antes de qualquer incorporação.

---

### 2. CE.SDK — `imgly/canva-clone-react-cesdk`

| Campo | Valor |
|---|---|
| URL | https://github.com/imgly/canva-clone-react-cesdk |
| Licença repo (exemplo) | AGPL-3.0 |
| Licença CE.SDK | **Comercial — proprietária img.ly** |
| Tipo | SDK de editor visual profissional |
| Frontend | React + `@cesdk/cesdk-js` |
| Backend | Nenhum (SDK client-side) |
| Banco | Nenhum (storage externo configurável) |
| Redis | Não |
| Docker | Não necessário |
| Trial | Disponível gratuitamente via img.ly |
| SDK npm | `@cesdk/cesdk-js` |
| API | Sim (SDK API) |
| Webhooks | Não nativos |
| Multi-tenancy | Via configuração |
| White label | Sim (com licença) |
| Incorporável | Sim, via SDK após licença |

**Decisão: `commercial_sdk_candidate`**

O SDK em si é proprietário e requer contrato comercial com img.ly. O repositório de exemplo usa AGPL-3.0 mas isso não inclui o SDK. Trial gratuito disponível para avaliação técnica. Não ativar em produção sem licença assinada.

**Bloqueador:** Licença comercial obrigatória.

---

### 3. Chatwoot — `chatwoot/chatwoot`

| Campo | Valor |
|---|---|
| URL | https://github.com/chatwoot/chatwoot |
| Licença | **MIT** (core) + Enterprise (features avançados) |
| Tipo | Plataforma de atendimento ao cliente |
| Frontend | Vue.js |
| Backend | Ruby on Rails |
| Banco | PostgreSQL |
| Redis | Obrigatório |
| Docker | Recomendado |
| Workers | Sidekiq (background jobs) |
| API | REST API completa |
| SDK | Unofficial |
| Webhooks | Sim (native) |
| SSO | Sim (SAML, OAuth) |
| Multi-tenancy | Sim (contas e equipes) |
| White label | Com Enterprise |
| Self-hosted | Sim |
| SaaS gerenciado | Sim (chatwoot.com) |
| Canais | WhatsApp, Instagram, Facebook, Email, Webchat, Telegram, Twitter |

**Decisão: `external_service`**

Licença MIT no core. Pode ser usado comercialmente como serviço self-hosted separado. O LOKAT OS integra via API REST + webhooks + mapeamento de usuários. Não instalar Ruby/Rails no deploy Vercel.

**Bloqueador:** Nenhum de licença. Infraestrutura VPS/Docker necessária.

---

### 4. Postiz — `gitroomhq/postiz-app`

| Campo | Valor |
|---|---|
| URL | https://github.com/gitroomhq/postiz-app |
| Licença | **AGPL-3.0** |
| Tipo | Agendador e publicador de conteúdo social |
| Frontend | Next.js |
| Backend | NestJS |
| Banco | PostgreSQL (via Prisma) |
| Redis | Obrigatório |
| Temporal | Sim (job scheduling) |
| Docker | Suporte completo |
| Workers | Temporal workers |
| API | REST pública |
| SDK | `@postiz/node` (npm) |
| Webhooks | Sim |
| SSO | OAuth por canal social |
| Multi-tenancy | Sim |
| Canais | Instagram, YouTube, LinkedIn, TikTok, Facebook, Pinterest, Threads, X, Slack, Discord, Mastodon, Bluesky, Reddit, Dribbble |
| Make.com | Sim |
| n8n | Sim |
| Zapier | Compatível |

**Decisão: `external_service_candidate`**

AGPL-3.0 impede incorporação de código no LOKAT OS (qualquer modificação exigiria publicação do código-fonte). Porém, como serviço self-hosted externo que o LOKAT OS acessa via API e SDK `@postiz/node`, o AGPL não se aplica ao código do LOKAT OS. Integrar apenas por API/SDK — nunca por cópia de código.

**Bloqueador:** Nenhum de licença para uso como serviço externo. Infraestrutura VPS/Docker necessária.

---

## Matriz de Decisão Final

| Motor | Função | Licença | Decisão | Incorporar código? | Requer infraestrutura separada? |
|---|---|---|---|---|---|
| LidoJS | Editor visual | NULL | `architecture_reference` | ❌ Proibido | N/A |
| CE.SDK | Editor visual | Comercial | `commercial_sdk_candidate` | ✅ Com licença | ❌ Não (SDK client-side) |
| Chatwoot | CRM Inbox | MIT | `external_service` | ❌ Não necessário | ✅ VPS/Docker |
| Postiz | Social Scheduler | AGPL-3.0 | `external_service_candidate` | ❌ Proibido | ✅ VPS/Docker |

---

## EXISTENTE
- Nenhuma integração com esses motores.

## IMPLEMENTADO NESTA SPRINT
- Auditoria de licença completa.
- Documentação de decisão para cada motor.
- Provider contracts TypeScript para todos os três módulos.
- Estado inicial: `not_configured` / `blocked` para todos.

## PROPOSTO
- CE.SDK: avaliar trial, negociar licença, integrar EditorOS.
- Chatwoot: provisionar VPS, conectar API, mapear usuários.
- Postiz: provisionar VPS, integrar via `@postiz/node` SDK.

## BLOQUEADO
- LidoJS: bloqueado até validação jurídica de licença.
- CE.SDK: bloqueado sem licença comercial ou trial autorizado.
- Chatwoot: bloqueado sem infraestrutura.
- Postiz: bloqueado sem infraestrutura.
