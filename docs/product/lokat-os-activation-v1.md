# LOKAT OS — Activation v1 (Company & Project)

**Sprint:** Recalibração Corrections 2026-08.2
**Status:** Contratos conceituais. Nenhuma UI, upload, áudio, LLM ou parser implementado.

## 1. Company Activation

**Objetivo:** entender e estruturar uma Company nova (ou recém-atribuída
a um usuário) o suficiente para ela começar a operar no LOKAT OS.

```
Welcome / Mini Tutorial
   ↓
Tell us about your business
   ↓
Context Intake
   ↓
Fact Extraction
   ↓
Unknowns
   ↓
User Confirmation
   ↓
Initial Diagnosis
   ↓
Direction / Priorities
   ↓
Suggested Initiative
   ↓
Suggested Connections
   ↓
Operational Entry Point
```

Nenhum passo é implementado nesta sprint — este é o contrato que a
implementação futura (fora de escopo) deve seguir.

## 2. Project Activation

**Objetivo:** estruturar uma iniciativa nova dentro de uma Company já
existente.

```
Select Company
   ↓
Describe Initiative
   ↓
Interpret Objective
   ↓
Initiative Classification
   ↓
Scope
   ↓
Deliverables
   ↓
Modules
   ↓
Connections
   ↓
Work Items
   ↓
Execution
```

## Company Activation vs. Project Activation — nunca misturar

| | Company Activation | Project Activation |
|---|---|---|
| Pergunta | Quem é esta empresa? Como ela funciona? O que sabemos? Quais prioridades existem? Quais conexões são relevantes? | O que vamos fazer? Por quê? Qual resultado? Qual escopo? Quais entregáveis? Quais módulos? Quais conexões? Quais responsáveis? Quais datas? Quais métricas? |
| Frequência | Uma vez por Company (raramente refeita por inteiro) | Uma vez por Project (repetida a cada nova iniciativa) |
| Produz | Company Context confirmado | Project estruturado + Work Items iniciais |

## 3. Context Intake

Fontes de entrada suportadas conceitualmente — o usuário pode combinar
mais de uma:

- **Text** — descrição livre digitada.
- **Audio** — não implementado (sem speech-to-text nesta sprint); contrato reserva o tipo para quando existir.
- **Document** — PDF/DOCX/TXT/Markdown. Nenhum parser implementado; informação derivada de documento nunca é `confirmed_fact` automaticamente — exige provenance e confirmação, igual às demais fontes.
- **External AI Import** — ver seção 4 abaixo.

Nenhuma dessas fontes é implementada nesta sprint (nenhum upload novo,
nenhum áudio, nenhum LLM).

## 4. External AI Import

**Contexto:** muitos usuários já elaboraram contexto de negócio numa IA
externa (ChatGPT, Claude, Gemini, outra) antes de chegar ao LOKAT OS.
Em vez de reconstruir esse trabalho do zero, ou de o LOKAT OS se
conectar diretamente a essas IAs (fora de escopo, cria dependência e
custo de billing/API), o fluxo é indireto:

```
User already has context in ChatGPT / Claude / Gemini / another AI
   ↓
LOKAT OS offers "Copy structured context prompt"
   ↓
User executes prompt externally
   ↓
User copies result
   ↓
Paste / Upload to LOKAT OS
   ↓
Context Intake
   ↓
Extracted information
   ↓
User Confirmation
   ↓
Confirmed Company Context
```

**Importante:** o LOKAT OS não precisa se conectar diretamente a nenhuma
IA externa nesta fase — o usuário é o intermediário, copiando e colando.

### Provenance obrigatória

Toda informação que chega por este caminho entra conceitualmente como:

```
source_type: external_ai_import
verified: false
```

**Nunca** vira `confirmed_fact` automaticamente. Só depois que o usuário
confirma explicitamente é que a informação pode alimentar o Company
Context — mesmo princípio já aplicado a Document Import (seção 3) e ao
modelo geral de Provenance (`docs/architecture/lokat-os-entity-centric-v1.md`).

### Copy Context Prompt — contrato

O prompt (texto final não definido nesta sprint) deve orientar a IA
externa a:
- usar somente informações disponíveis (nunca inventar);
- indicar incertezas explicitamente;
- separar fatos de interpretação;
- organizar o contexto de forma estruturada;
- nunca incluir secrets/credenciais.

Campos mínimos esperados no resultado: `overview`, `history`, `segment`,
`products/services`, `audience`, `positioning`, `goals`,
`problems/gaps`, `channels`, `social`, `team`, `tools`, `processes`,
`commercial`, `service`, `marketing`, `projects`, `campaigns`,
`metrics`, `important dates`, `decisions`, `unknowns`.

## 5. User Confirmation

Nenhuma informação extraída (de texto, documento, ou IA externa) alimenta
o Company/Project Context sem confirmação explícita do usuário — a
mesma regra de "sugerir ≠ executar" já formalizada em
`docs/product/lokat-os-ai-context-v1.md` se aplica aqui: Context Intake
é Level 0-1 (explica/sugere), nunca escreve sozinho.

## 6. Diagnosis e Priorities

Depois da confirmação, o Living Business Context (Confirmed Facts +
Derived Knowledge, ver `lokat-os-entity-centric-v1.md`) alimenta um
diagnóstico inicial e uma priorização — usando os mesmos sinais visíveis
já formalizados em `lokat-os-ai-context-v1.md` (deadlines, blockers,
dependencies, revenue impact, risk...), nunca uma prioridade "misteriosa".

**Framing de UX (Fase 28):** Problems/Gaps/Risks/Blockers/Unknowns
existem no MODELO DE RACIOCÍNIO, mas não precisam virar uma aba negativa
chamada "Problems" — a experiência pode apresentá-los como diagnosis,
opportunities, priorities, improvements, blockers, conforme fizer mais
sentido para quem está lendo.

## 7. Company vs. Project vs. Campaign

Três entidades com papéis diferentes — decisão arquitetural explícita:

- **Company** — entidade permanente (a empresa em si).
- **Project** — iniciativa estruturada cross-module com `objective`, `lifecycle`, `scope`, `deliverables`, `responsibilities`, `outcome`.
- **Campaign** — iniciativa especificamente de marketing/comunicação/aquisição/conversão/retenção, normalmente de escopo mais específico que um Project.

### Relação Project/Campaign (contrato conceitual, sem tabela)

```
Campaign.company_id: required
Campaign.project_id: optional
```

Logo, ambos os caminhos são válidos: `Company → Project → Campaign` (uma
campanha dentro de um projeto maior) e `Company → Campaign` (uma
campanha isolada, sem projeto guarda-chuva).

## 8. Initiative Classification

**Conceito**, não necessariamente entidade persistida — uma classificação
que orienta o que fazer com uma descrição livre de intenção.

Tipos possíveis: `project`, `campaign`, `operational_improvement`,
`content_action`, `commercial_action`, `internal_initiative`.

A Gota Neural (futura, fora de escopo) poderá interpretar a intenção do
usuário e recomendar o tipo — não implementado nesta sprint (nenhum
classifier).

### Exemplos (genéricos, nenhum cliente real)

| Descrição livre | Classificação |
|---|---|
| "Campanha de [data sazonal genérica]" | Campaign |
| "Lançar nova unidade" | Project |
| "Organizar atendimento por um canal de mensagens" | Operational Improvement |

## 9. Suggested Connections

Durante a Company Activation, o sistema pode sugerir conexões
relevantes ao contexto identificado — nunca uma lista fixa de vinte
integrações mostradas indiscriminadamente. Exemplos conceituais: Meta,
Instagram, WhatsApp, Google, Google Business, site, CRM, Connector,
Drive. A lista real depende do que o Context Intake identificou (ex.:
menção a WhatsApp no texto sugere aquela conexão especificamente).

### Estados de conexão durante a Activation

```
CONNECT_NOW
ADD_MANUALLY
SKIP_FOR_LATER
NOT_RELEVANT
```

**Regra:** pular uma conexão (`SKIP_FOR_LATER` ou `NOT_RELEVANT`) NUNCA
impede concluir a Company Activation — conexões são incrementais, não
um gate bloqueante.

### Connections — área permanente

Qualquer conexão pulada durante a Activation continua acessível depois,
numa área permanente de Connections/Integrations — a Activation não é a
única oportunidade de conectar ferramentas.

### WhatsApp — exemplo, não implementação

Citado aqui só como exemplo de como uma conexão futura pode funcionar:

```
Connect WhatsApp
   ↓
integration layer
   ↓
QR / OAuth / provider-specific flow
```

**Importante:** a Company Activation não conhece QR Code nem nenhum
mecanismo específico — ela apenas solicita "conectar esta capability",
e a camada de implementação (fora de escopo) decide o mecanismo real.
Nenhum QR, OAuth, ou fluxo de integração é implementado nesta sprint.

## 10. Execution Map

Depois de Context + Objective + Initiative Classification, o sistema
(LKT / futura Gota Neural) pode montar um mapa de qual trabalho vai para
qual módulo — nunca exigindo que o usuário escolha módulos manualmente
no início:

```
Context + Objective + Initiative
   ↓
LKT / future Gota Neural
   ↓
Required Domains
   ↓
Recommended Modules
   ↓
Execution Map
```

Exemplos conceituais de mapeamento: Campaign → Growth; Creative
Production → REC OS; Lead Reactivation → CRM; Dates → Calendar;
Operational Work → Meu Escritório. Cada módulo trabalha sobre o mesmo
Company/Project Context compartilhado — nunca pedindo de novo uma
informação que a Company já confirmou (ex.: público-alvo, segmento,
posicionamento, canais, regras de marca).

## 11. Experiências por tipo de conta

- **Agency/Professional adicionando uma Company:** passa pela Company Activation completa — precisa aprender aquela empresa do zero. Não implementado nesta sprint.
- **Direct Business:** pode já chegar com contexto adquirido durante signup/aquisição/onboarding anterior — nesse caso, não repete a Activation integral; pode existir um fluxo mais curto (`Confirm Initial Context → Operational Entry Point`). Um Project novo, mesmo assim, sempre usa Project Activation completa.
- **Super Admin:** nunca obrigado a seguir o onboarding visual normal — pode pular o tutorial, criar/inspecionar uma Company diretamente, inspecionar o estado de Activation de qualquer Company, e usar "Visualizar como" (já existente, Workspace Preview). Nenhuma alteração no comportamento atual do Super Admin nesta sprint.

## 12. Mini Tutorial (conceitual, sem UI)

Máximo recomendado: 3 passos.

1. Seu negócio vira contexto.
2. Os módulos trabalham sobre o mesmo contexto.
3. A Gota Neural ajuda a interpretar e preparar ações.

Experiências futuras podem variar por surface/persona (ver seção 11 —
Super Admin nunca é obrigado a consumi-lo).

## 13. Public MVP journey (referência)

A jornada completa do Public MVP está formalizada em
`docs/product/lokat-os-mvp-2026-08.md`:

```
Access → Create/Resolve Company → Company Activation → Initial Context
→ Diagnosis → Priorities → Initiative Classification
→ First Project or Campaign → First Work Item → Operational Entry Point
```

## Non-goals desta sprint

- Nenhuma UI de Activation implementada.
- Nenhum upload de documento, nenhum parser.
- Nenhuma gravação/transcrição de áudio.
- Nenhuma conexão com LLM/IA externa real.
- Nenhum OAuth, QR Code, ou fluxo de integração real.
- Nenhuma tabela, SQL, ou migration.
- Nenhuma alteração no onboarding runtime atual, no Super Admin, ou em qualquer surface existente.
