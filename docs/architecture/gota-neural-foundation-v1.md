# Gota Neural — Foundation v1

**Sprint:** Gota Neural Foundation V1
**Nome de produto/UX:** Gota Neural
**Nome arquitetural interno:** LOKAT NEURAL CORE (`src/lib/neural-core/`)
**Status:** Contract-first. Nenhuma persistência, LLM, provider externo, ou mutação real implementada.

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

`AGENT_REGISTRY` — 11 definições, metadata apenas. Status
`available_contract` != agente rodando IA real; `planned`/`locked`/
`experimental`/`unavailable` nunca se apresentam como disponíveis
(`isAgentRuntimeAvailable()`).

## Orchestration

`NeuralOrchestrator.plan()` é 100% determinístico: recebe um
`NeuralRequest` com `InitiativeContext.domainHints` já estruturados,
valida que existe `companyId`, resolve agentes candidatos por domínio,
verifica capabilities via `resolveCapabilityPrecedence()`, e devolve um
`NeuralPlan` — nunca chama LLM, nunca interpreta texto livre com regex
gigante (Fase 42), nunca executa mutação.

## Response Blocks

`ResponseBlock` é uma union discriminada por `type` (16 tipos), sempre
com `sourceRefs`/`status`/`actions` — nunca um JSON solto sem schema.

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
negócio: advertising/crm/messaging/etc., com precedência
exists→entitled→enabled→connected→permitted→actionable).
`IntegrationDefinition`/`Connection`/`ConnectionHealth` distintos —
catálogo em `INTEGRATION_CATALOG_FOUNDATION` é contract-only, nenhum SDK
instalado. Ver `docs/architecture/lokat-digital-integration-catalog-v1.md`.

## LKT

Ver `docs/architecture/lkt-orchestration-framework-v1.md` para o
framework completo. `lkt.ts` reaproveita `CANONICAL_FLOW_STEPS`
(já implementado) em vez de duplicar um enum de estágios paralelo.

## NIS

`ConnectorManifest`/`ConnectorSnapshot`/`ConnectorSource`/
`ConnectorHealth` — contratos compatíveis com
`docs/architecture/lokat-integration-standard-v1.md`, sem endpoint, sem
request HTTP.

## Security

- Nenhum import de cliente de mutação (Supabase admin, service role, APIs de pagamento/mensagem) em `src/lib/neural-core/` — confirmado por auditoria de código e por teste estrutural (caso 17).
- Toda ação nasce como draft com confirmação obrigatória.
- Nenhuma informação de External AI Import ou Document Import vira fato confirmado sem confirmação explícita do usuário.
- Nenhuma dimensão de segurança (Authorization/Client Visibility/Connector Access/AI Access) confundida com outra — reaproveita o modelo já formalizado em `lokat-integration-standard-v1.md`.

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
