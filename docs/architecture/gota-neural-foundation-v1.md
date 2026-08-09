# Gota Neural — Foundation v1

**Sprint:** Gota Neural Foundation V1 (+ V1.1 — Contract Corrections Before Integration)
**Nome de produto/UX:** Gota Neural
**Nome arquitetural interno:** LOKAT NEURAL CORE (`src/lib/neural-core/`)
**Status:** Contract-first. Nenhuma persistência, LLM, provider externo, ou mutação real implementada.

## V1.1 — Correções da auditoria independente CODEX WEB

A V1 foi auditada de forma independente (CODEX WEB) com resultado
`APPROVED_WITH_CORRECTIONS` (0 P0, 4 P1, 3 P2). Esta seção documenta
exatamente o que mudou; as seções abaixo já refletem o estado corrigido.

| # | Severidade | Gap auditado | Correção |
|---|---|---|---|
| 1 | P1 | `resolveCapabilityPrecedence()` exigia `connected: true` para TODA capability — capabilities internas (documents/CRM/operações internas) não deveriam depender de conexão externa. | `ConnectionRequirement` (`"required" \| "optional" \| "not_required"`) adicionado a `CapabilityState` (`capabilities.ts`). Conexão só é gate quando `required`; `optional` nunca bloqueia sozinho; `not_required` nunca é avaliado como blocker. |
| 2 | P1 | `isAgentRuntimeAvailable()` retornava `true` para `status === "available_contract"` — falso positivo semântico, pois nenhum Agent Runtime existe. | `isAgentContractAvailable()` (novo) responde "o contrato pode ser referenciado para planejamento?"; `isAgentRuntimeAvailable()` agora sempre retorna `false` nesta Foundation (`agents.ts`). `NeuralOrchestrator` passou a usar `isAgentContractAvailable()` para montar `responseBlockPlan`. |
| 3 | P1 | Nenhum contrato de visibilidade (interno/cliente/connector/comando futuro) existia — Visibility (onde um dado aparece) estava implicitamente confundida com Permission (quem pode agir). | `NeuralVisibilityPolicy` (novo arquivo `visibility.ts`): `internalOnly`/`client` (hidden/summary/visible)/`connectorReadable`/`futureCommandable`. Default seguro = mais restritivo (`internalOnly: true`). Aplicado como campo opcional em `ConfirmedFact`, `DerivedKnowledge`, `DocumentReference`, `IntegrationDataEntry`, `BaseResponseBlock`, `NeuralMemoryEntry`, `NeuralActionDraft`. |
| 4 | P1 | NIS/Connector tinha Manifest/Snapshot/Health mas nenhum contrato de Events/Metrics. | `ConnectorEvent` e `ConnectorMetric` adicionados a `lkt.ts`. `ConnectorEvent` formaliza a diferença para `DomainEvent` (canônico interno, já implementado) — nunca publica um `DomainEvent` automaticamente; nenhum Event Bus paralelo criado. |
| 5 | P2 | Nenhuma noção de `PlanningLevel`/`TimeHorizon` existia. | Novo arquivo `planning.ts`: `PlanningLevel` (strategic/tactical/operational), `PlanningHorizon` (short/medium/long/continuous, independente do level), `PlanningContext`, `ObjectiveReference` (cascata mínima, sem persistência). Campo opcional `planningContext`/`planningLevel` adicionado a `CompanyContext`, `ProjectContext`, `Campaign`, `InitiativeContext`, `ExecutionMapEntry`, `NeuralRequest`, `NeuralPlan`. |
| 6 | P2 | `ResponseBlock` era uma interface única com `type: union` — não uma discriminated union real (sem narrowing de payload). | `response-blocks.ts` reescrito: `BaseResponseBlock` + 16 interfaces especializadas (`MetricResponseBlock`, `ConnectionResponseBlock`, etc.) com `payload` tipado por categoria, unidas em `ResponseBlock = InsightResponseBlock \| ... \| WarningResponseBlock`. `switch (block.type)` agora faz narrowing real. |
| 7 | P2 | Testes tautológicos (`type === constante`, `array.length === N` sobre array definido no mesmo arquivo). | Suíte de testes reescrita (`neural-core.test.ts`, 31 casos / 72 asserções) cobrindo comportamento real: narrowing de `ResponseBlock`, cascata condicional de capability, contract-vs-runtime, visibility default, ConnectorEvent/Metric, planning level/horizon independentes, objective cascade, planning context passthrough. |

Nenhuma correção expandiu para UI, LLM, agent runtime, persistência,
banco, SQL, Supabase, API externa, integração real, ou runtime de
Company/Project/Campaign — permanece 100% contract-first.

## Purpose

A Gota Neural é a camada inteligente central do LOKAT OS — não um
chatbot isolado, não um clone de ChatGPT/Nectar/Jarvis, não um agente
autônomo sem contexto. Ela entende contexto (Company/Project/
Initiative), conhece capabilities e conexões, seleciona agentes
especializados, estrutura respostas, prepara ações (sempre como draft)
e nunca executa uma mutação sem confirmação explícita do usuário.

## Architecture

```
WORKSPACE → COMPANY → LIVING BUSINESS CONTEXT → PROJECT/INITIATIVE
→ WORK ITEMS + DOMAIN ENTITIES → DOMAIN MODULES → DOMAIN EVENTS
→ CANONICAL BUSINESS CONTEXT → GOTA NEURAL → NEURAL ORCHESTRATOR
→ SPECIALIST AGENTS → STRUCTURED RESPONSE BLOCKS → ACTION DRAFTS
→ USER CONFIRMATION → FUTURE EXECUTOR (não implementado)
```

## AI_EXISTING_INVENTORY (Fase 1)

Auditoria confirmou o que já existe antes de criar qualquer contrato
novo — nada abaixo foi duplicado:

| Já existe | Onde | O que é | Reaproveitado como |
|---|---|---|---|
| `src/lib/ai/` | `credits.ts`, `image-providers/*` | Créditos e providers de geração de IMAGEM (Gemini/OpenAI images) — feature diferente, não um assistente geral. | Não reaproveitado (domínio diferente). |
| `src/lib/ai-suggestions.ts` | `AISuggestion`, `getContentOSSuggestions` | Motor de sugestões REC OS, rule-based, "no real AI, no external APIs" — já o precedente de que a inteligência aqui é determinística. | Não reaproveitado diretamente (shape específico do REC OS), mas confirma o padrão de "sem IA real" já estabelecido. |
| `src/lib/domain-events/` | `types.ts`, `registry.ts`, `canonical-flow.ts`, `bridges.ts` | **Achado importante:** um registro de eventos EM MEMÓRIA já implementado (`DomainEventRegistry`, `subscribe`/`publish`/`history`), 13 tipos de evento reais (comercial/conteúdo/financeiro/estoque), e `CANONICAL_FLOW_STEPS` — um loop Produto→Oportunidade→Campanha→...→Resultado→Produto já codificado. Isso **corrige** uma afirmação da recalibração anterior ("nenhum barramento de eventos existe hoje") — existia, só não na forma genérica de Work Item/Project que a recalibração buscava. | `EventHistoryEntry` (context.ts) referencia `DomainEvent` diretamente; `lkt.ts` referencia `CANONICAL_FLOW_STEPS` como instância real do loop LKT. |
| `src/lib/domain-events/bridges.ts` | `ProductCampaignOpportunity`, `CommercialCampaignBrief` | Uma Campaign concreta já implementada (não é o Campaign genérico desta foundation, mas prova que o conceito já existe em produção). | Não reaproveitado 1:1 (shape específico), mas o `Campaign` genérico desta sprint é compatível em espírito. |
| `src/lib/data-hub/types.ts` | `DataConfidence` | Escala de confiança já usada por `business-strategy/*` e `domain-events/bridges.ts`. | `NeuralConfidence` (provenance.ts) é um alias direto — nenhuma escala nova. |
| `src/lib/workspaces/types.ts` | `WorkspaceSurface` | Já é o Workspace na prática (ver `lokat-os-entity-centric-v1.md`). | `CanonicalBusinessContext.surface` usa o tipo diretamente. |
| `src/config/workspace-capabilities.ts` | `WorkspaceCapability` | Capability gate por SURFACE (eixo diferente do `Capability` desta sprint, que é por TIPO de capacidade de negócio). | `CanonicalBusinessContext.capabilities` usa o tipo diretamente; `Capability` (capabilities.ts) é um terceiro eixo, não substitui. |
| `src/lib/business-office/types.ts` | `BusinessOfficeFeedItem` | Padrão de projeção já provado (normaliza `content_items`/`operational_tasks`/`approvals`). | Modelo de referência para `BusinessBriefingItem` (briefing.ts) — mesmo princípio de builder puro sobre dados já buscados. |
| `src/components/admin-search-sheet.tsx` + `app-sidebar.tsx` | `configs` | Único "catálogo de módulos" existente — acoplado à UI, não um registry de lib puro. | Não reaproveitado (acoplamento de UI); `ModuleReference` (lkt.ts) é só um tipo, sem duplicar navegação. |

Nenhuma duplicação de contrato foi criada — cada peça nova (Company/
Project/Campaign/Initiative context, Activation, Capability de negócio,
Integration/Connection, Agent Registry, Orchestrator, Response Blocks,
Action Draft, Confirmation, Memory, Briefing, LKT awareness) preenche uma
lacuna real confirmada pela auditoria, nunca reconstrói algo que já
existia.

## Context

`CanonicalBusinessContext` (Workspace + Company + user + surface +
capabilities + provenance) é o contrato raiz — toda operação neural
carrega isso. `CompanyContext`/`ProjectContext` são `PARTIAL_REUSE` de
`clients`/entidades já existentes, nunca tabelas novas. `Campaign` exige
`companyId`, `projectId` opcional (Company→Campaign e
Company→Project→Campaign ambos válidos). `LivingBusinessContext` separa
6 grupos (Confirmed Facts, Derived Knowledge, Conversation Context,
Event History, Document References, Integration Data) — nunca
misturados.

## Activation

`CompanyActivationState`/`ProjectActivationStep` seguem exatamente os
fluxos já formalizados em `docs/product/lokat-os-activation-v1.md`.
Toda saída de Project Activation é DRAFT — nada persistido.

## Initiatives

`InitiativeType` (project/campaign/operational_improvement/
content_action/commercial_action/internal_initiative) classifica uma
intenção antes do Orchestrator agir — nunca inferido de texto livre
nesta sprint, sempre fornecido já estruturado por quem chama.

## Agents

`AGENT_REGISTRY` — 11 definições, metadata apenas. `available_contract`
significa apenas "o contrato existe e pode ser referenciado pelo
Orchestrator para planejamento" (`isAgentContractAvailable()`) — NUNCA
"um LLM agent está executável". `isAgentRuntimeAvailable()` sempre
retorna `false` nesta Foundation, para nenhum status
(`planned`/`locked`/`experimental`/`unavailable`/`available_contract`):
nenhum Agent Runtime real existe ainda.

## Orchestration

`NeuralOrchestrator.plan()` é 100% determinístico: recebe um
`NeuralRequest` com `InitiativeContext.domainHints` já estruturados,
valida que existe `companyId`, resolve agentes candidatos por domínio,
verifica capabilities via `resolveCapabilityPrecedence()`, e devolve um
`NeuralPlan` — nunca chama LLM, nunca interpreta texto livre com regex
gigante (Fase 42), nunca executa mutação.

## Response Blocks

`ResponseBlock` é uma discriminated union REAL por `type` (16 tipos:
`InsightResponseBlock \| DiagnosisResponseBlock \| ... \| WarningResponseBlock`),
cada uma com `payload` tipado por categoria (ex.: `MetricResponseBlock.payload.metricKey/value`,
`ConnectionResponseBlock.payload.connectionId/integrationId/capability`).
`switch (block.type)` faz narrowing de payload em tempo de compilação —
não apenas uma interface única com um campo `type` solto. Todo block
compartilha `BaseResponseBlock` (`sourceRefs`/`status`/`actions`/
`visibility`) — nunca um JSON solto sem schema.

## Actions

`NeuralActionDraft` — `createDraftAction()` sempre produz
`confirmationRequired: true` e `safetyLevel: "DRAFT"`. Autonomia máxima
desta sprint: `LEVEL_2_PREPARE_DRAFT`.

## Confirmation

`ActionConfirmation` — contrato do pedido, sem executor.

## Memory

`NeuralMemoryEntry`/`BusinessMemory` distintos de `ConversationContext`
— `conversationTurnIsMemoryEntry()` sempre retorna `false`;
`promoteConversationToMemory()` exige uma promoção explícita do
chamador, nunca automática.

## Capabilities & Connections

Três eixos nunca confundidos: `WorkspaceCapability` (surface, já
existente), plan capabilities (`docs/product/lokat-os-capabilities-v1.md`,
conceitual), e `Capability` desta sprint (tipo de capacidade de
negócio: advertising/crm/messaging/etc.). Precedência (V1.1):
exists→entitled→enabled→**connection requirement (condicional)**→permitted→actionable.
`connected` deixou de ser um gate universal: `CapabilityState.connectionRequirement`
(`required`/`optional`/`not_required`) decide se a conexão é sequer
avaliada como blocker — capabilities internas (documents/CRM/operações
internas) podem ser `actionable` sem nenhuma conexão externa.
`IntegrationDefinition`/`Connection`/`ConnectionHealth` distintos —
catálogo em `INTEGRATION_CATALOG_FOUNDATION` é contract-only, nenhum SDK
instalado. Ver `docs/architecture/lokat-digital-integration-catalog-v1.md`.

## Visibility

`NeuralVisibilityPolicy` (`visibility.ts`) é uma dimensão TRANSVERSAL,
distinta de Permission (`CapabilityState.permitted`): Visibility responde
"onde este dado pode aparecer" (internal-only / client hidden-summary-visible
/ connector-readable / future-commandable-metadata); Permission responde
"quem pode executar ou acessar". Nunca fundidas. Default ausente sempre
resolve para o mais restritivo (`internalOnly: true`) — nunca
client-visible por padrão. `futureCommandable` é só classificação para
uma extensão futura; nunca autoriza um comando real nesta Foundation.

## LKT

Ver `docs/architecture/lkt-orchestration-framework-v1.md` para o
framework completo. `lkt.ts` reaproveita `CANONICAL_FLOW_STEPS`
(já implementado) em vez de duplicar um enum de estágios paralelo.

## NIS

`ConnectorManifest`/`ConnectorSnapshot`/`ConnectorSource`/
`ConnectorHealth`/`ConnectorEvent`/`ConnectorMetric` (V1.1 completa o
conjunto com Events/Metrics) — contratos compatíveis com
`docs/architecture/lokat-integration-standard-v1.md`, sem endpoint, sem
request HTTP. `ConnectorEvent` (evento vindo do connector boundary) é
formalmente distinto de `DomainEvent` (evento canônico interno, já
implementado em `src/lib/domain-events/`): o fluxo futuro
`ConnectorEvent -> validation/normalization -> DomainEvent` não é
implementado aqui — nenhum `DomainEvent` é publicado automaticamente a
partir de um `ConnectorEvent`, e nenhum Event Bus paralelo foi criado.

## Management Planning Layer

```
IDENTITY / BUSINESS CONTEXT
  ↓
STRATEGIC   (para onde a Company está indo?)
  ↓
TACTICAL    (como transformar direção em planos?)
  ↓
OPERATIONAL (o que está sendo executado agora?)
  ↓
MEASUREMENT (está funcionando?)
  ↓
LEARNING    (o que aprendemos?)
  ↓
UPDATED CONTEXT
```

`PlanningLevel` (`planning.ts`) é uma DIMENSÃO TRANSVERSAL, nunca um
módulo "Planning" novo, e nunca uma equivalência rígida com um tipo de
entidade (Company != strategic, Project != tactical, Work Item !=
operational são padrões frequentes, não regras). `PlanningHorizon`
(short/medium/long/continuous) é independente de `PlanningLevel` —
`strategic` não implica `long` automaticamente. `ObjectiveReference`
permite representar a cascata Strategic Objective → Tactical Initiative
→ Operational Work → Metrics/Results → Learning via `parentObjectiveId`,
sem tabela nova e sem persistência. `NeuralRequest`/`NeuralPlan` podem
carregar `planningContext` quando já fornecido estruturado pelo chamador
— o Orchestrator nunca o infere de texto livre. `BusinessBriefing`
(urgência operacional) permanece uma dimensão SEPARADA de `PlanningLevel`
(estratégia) — `SIGNAL_WEIGHT` não foi alterado.

**FUTURE EXTENSION (não implementado nesta sprint):** `BusinessNeed` e
`BusinessDomain` poderão futuramente se conectar a `PlanningContext`:

```
Business Context → Business Need → Business Domain → Objective
  → Planning Level → Initiative → Execution Map
```

Nenhuma taxonomia completa de BusinessNeed/BusinessDomain é criada aqui.

## Company Central (future extension)

Documentação de compatibilidade futura — nenhuma UI criada. Quando um
Company Central existir, ele poderá responder:

| Pergunta | Camada |
|---|---|
| Quem somos? | DNA / Identity |
| Para onde vamos? | Strategic |
| Como vamos chegar lá? | Tactical |
| O que está acontecendo agora? | Operational |
| Está funcionando? | Measurement |
| O que aprendemos? | Learning |

Os contratos desta Foundation (`PlanningContext`, `ObjectiveReference`,
`LivingBusinessContext`, `BusinessBriefing`) já permitem que essas
perguntas sejam respondidas futuramente sem refatoração destrutiva.

## Security

- Nenhum import de cliente de mutação (Supabase admin, service role, APIs de pagamento/mensagem) nem de SDK de IA/runtime real (OpenAI/Anthropic/Google Generative AI/WhatsApp/Stripe/Mercado Pago) em `src/lib/neural-core/` — confirmado por auditoria de código e por teste estrutural.
- Toda ação nasce como draft com confirmação obrigatória.
- Nenhuma informação de External AI Import ou Document Import vira fato confirmado sem confirmação explícita do usuário.
- Nenhuma dimensão de segurança (Authorization/Client Visibility/Connector Access/AI Access) confundida com outra — reaproveita o modelo já formalizado em `lokat-integration-standard-v1.md`. Visibility (V1.1) e Permission continuam dimensões distintas dentro dessa mesma disciplina.
- Nenhum agente do `AGENT_REGISTRY` tem `isAgentRuntimeAvailable() === true` — confirmado por teste estrutural sobre o registry inteiro.

## Non-goals desta sprint

Nenhuma UI, nenhum chat visual, nenhum microfone/speech-to-text, nenhuma
API de OpenAI/Anthropic/Gemini, nenhum runtime multi-agente, nenhuma
vector memory/embeddings, nenhum banco (Company/Project/Campaign/Work
Item table), nenhum connector real (Meta/Google Ads/WhatsApp/UTMify),
nenhum pixel/webhook runtime, nenhum checkout/payment, nenhuma
integração de Google Calendar/Drive, nenhum executor autônomo.

## Next phases (não iniciadas)

PHASE 2 (UI + Context Panel) → PHASE 3 (LLM Provider Abstraction) →
PHASE 4 (Agent Runtime) → PHASE 5 (Company Activation por texto/áudio) →
PHASE 6 (Business Briefing real) → PHASE 7 (Draft Actions + Confirmation
real) → PHASE 8 (Module Executors) → PHASE 9 (Connector integration).
