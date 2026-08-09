# ADR-GOTA-NEURAL-001: LOKAT OS adota a Gota Neural como camada de orquestração inteligente contextual

**Data:** 2026-08-09
**Status:** Aceito (foundation contract-first — sem runtime de IA implementado)
**Sprint:** Gota Neural Foundation V1

## Context

O LOKAT OS já formalizou a arquitetura Entity-Centric (ADR-ENTITY-CENTRIC-001):
Workspace → Company → Project → Work Items → Domain Modules → Domain
Events. Essa cadeia precisa de uma camada que interprete o contexto
acumulado, selecione a ferramenta certa e prepare ações — sem virar um
chatbot solto nem depender de nenhum fornecedor externo específico
(OpenAI/Anthropic/Gemini) para EXISTIR como conceito.

A auditoria desta sprint confirmou que peças reais já existem para
construir essa camada sobre elas: `DomainEventRegistry` (evento em
memória, já implementado), `CANONICAL_FLOW_STEPS` (uma instância real do
loop de orquestração), `DataConfidence` (escala de confiança já
padronizada), `WorkspaceSurface`/`WorkspaceCapability` (contexto e
capability por surface), e `BusinessOfficeFeedItem` (padrão de projeção
provado). Nenhuma dessas peças, porém, tinha uma camada que as
conectasse de forma orientada a "entender o negócio e preparar uma
ação" — essa é a lacuna que a Gota Neural preenche.

## Decision

LOKAT OS adota a Gota Neural (nome de produto) / LOKAT NEURAL CORE
(nome arquitetural, `src/lib/neural-core/`) como camada de orquestração
inteligente contextual: ela lê o Canonical Business Context, conhece
capabilities e agentes especializados, e produz respostas estruturadas
e drafts de ação — nunca executa nada sozinha.

Esta primeira sprint entrega apenas a FOUNDATION: contratos TypeScript,
registries estáticos, um orchestrator determinístico (sem LLM), e
testes que provam as regras de segurança (Company obrigatória,
confirmação sempre exigida, nenhuma mutação direta importável). Nenhum
provider de IA real é conectado.

## Consequences

**Positivas:**
- Toda futura integração de LLM real (Phase 3 do roadmap) terá um contrato já definido para plugar em vez de desenhar do zero sob pressão.
- O Orchestrator determinístico já é útil por si só (roteamento por domínio, checagem de capability) mesmo antes de qualquer IA real existir.
- Reaproveita ativamente `DomainEventRegistry`/`CANONICAL_FLOW_STEPS`/`DataConfidence` — não duplica infraestrutura que já existia mas estava subutilizada/desconhecida.
- A separação Capability (tipo de capacidade) vs. Integration Definition vs. Connection vs. Connection Health evita a armadilha de tratar "conectado" como equivalente a "permitido".

**Negativas / custos:**
- Uma foundation contract-first não entrega valor de usuário visível sozinha — precisa das próximas fases (UI, LLM, Agent Runtime) para virar produto.
- Mantém, por enquanto, um catálogo de integrações (`INTEGRATION_CATALOG_FOUNDATION`) que é só documentação executável — risco de ficar desatualizado se novas integrações reais não atualizarem esse catálogo também.

## Alternatives considered

1. **Conectar um LLM real já nesta sprint (ex.: Anthropic/OpenAI) para "provar valor rápido".** Rejeitada — introduziria billing, secret novo, e dependência de provider antes de a fundação de contexto/segurança existir; o brief desta sprint proíbe isso explicitamente.
2. **Copiar a arquitetura do Nectar/OpenJarvis/GAIA diretamente.** Rejeitada — nenhuma licença foi verificada nesta sprint (ver `docs/research/gota-neural-external-references-v1.md`, `LICENSE_NOT_VERIFIED`), e a decisão registrada é absorver só padrões conceituais (orchestration patterns, agent registry patterns), nunca código.
3. **Fazer a Gota Neural depender de um Provider específico como parte do core.** Rejeitada explicitamente (Fase 32 do brief, "No Provider Lock-In") — o padrão Capability → Integration Definition → Adapter → Connection garante que nenhum provider vira requisito do core.

## V1.1 — Correções pós-auditoria CODEX WEB

Auditoria independente (CODEX WEB) sobre a V1 retornou
`APPROVED_WITH_CORRECTIONS` (0 P0, 4 P1, 3 P2). Nenhuma decisão
arquitetural deste ADR foi revertida — as correções são exclusivamente
de contrato, dentro do espírito já registrado aqui:

- `connected` deixou de ser gate universal de capability (`ConnectionRequirement` condicional) — reforça, não contradiz, "connected != permitted" (Consequences, item 4).
- `isAgentRuntimeAvailable()` corrigido para nunca retornar `true` nesta Foundation (era um falso positivo semântico) — reforça a decisão original de que nenhum runtime real existe ainda.
- `NeuralVisibilityPolicy` adicionada como dimensão nova, distinta de Permission — nenhuma mudança na decisão de Security abaixo, apenas uma lacuna preenchida.
- `ConnectorEvent`/`ConnectorMetric` completam o conjunto NIS (Manifest/Snapshot/Health já existiam) — mesma disciplina de "contract-only, sem endpoint" já adotada.
- `PlanningLevel`/`PlanningHorizon`/`ObjectiveReference` (planning.ts) são aditivos e opcionais — não alteram nenhum contrato existente de forma destrutiva.
- `ResponseBlock` corrigido para ser uma discriminated union real — mudança de shape (campos antes soltos agora vivem em `payload` tipado por tipo), mas API pública (`type`, `sourceRefs`, `status`, `actions`) preservada.

Ver `docs/architecture/gota-neural-foundation-v1.md`, seção "V1.1 —
Correções da auditoria independente CODEX WEB", para a tabela completa
gap → correção.

## Security

- Nenhum import de client de mutação (Supabase admin/service role, APIs de pagamento/mensageria) em `src/lib/neural-core/` — verificado por grep e por teste estrutural.
- Toda ação nasce `DRAFT` com `confirmationRequired: true`.
- Provenance obrigatória em toda informação derivada; `external_ai_import`/documento nascem `verified: false`.
- Nenhuma das quatro dimensões de segurança do NIS (Authorization/Client Visibility/Connector Access/AI Access) é tratada como equivalente a outra.

## Provider independence

Nenhum nome de provider (Meta, Google, WhatsApp, UTMify, OpenAI,
Anthropic, Gemini) aparece como dependência de import em
`src/lib/neural-core/` — apenas como STRING de catálogo
(`INTEGRATION_CATALOG_FOUNDATION`) ou como referência documental. Um
adapter real para qualquer um desses é trabalho de sprint futura,
plugado por trás do contrato `IntegrationDefinition`.

## Non-goals

Ver seção "Non-goals desta sprint" em
`docs/architecture/gota-neural-foundation-v1.md` — nenhuma UI, LLM,
agente executando, persistência, ou integração externa real nesta
sprint.

## Migration path

Nenhuma migration nesta sprint (nenhuma tabela criada). Quando a
implementação avançar: Company/Project/Campaign continuam sendo
projeções sobre entidades já existentes (nunca tabelas paralelas
inventadas só para a Gota Neural); Memory ganha persistência real só
quando uma sprint dedicada decidir o mecanismo (Supabase, cache, ou
outro) — este ADR não pré-decide isso.
