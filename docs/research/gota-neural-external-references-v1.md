# Gota Neural — Referências Externas v1

**Sprint:** Gota Neural Foundation V1
**Status:** Pesquisa conceitual. Nenhuma licença verificada diretamente nesta sprint via acesso ao repositório oficial de cada referência — todo item abaixo é `LICENSE_NOT_VERIFIED` até auditoria dedicada.

## Princípio

Referências externas (Nectar, OpenJarvis, GAIA, UTMify) só podem
contribuir com PADRÕES CONCEITUAIS (ideias de UX, orchestration
patterns, agent registry patterns, memory/context patterns) — nunca
código, nunca asset, nunca dependência npm. A arquitetura core continua
pertencendo integralmente ao LOKAT OS.

## Nectar

- **Role/reference:** `UX_REFERENCE_ONLY`.
- **Useful pattern:** conceito de "cérebro visual" para uma camada de IA central — usado apenas como inspiração de QUE TIPO de experiência a Gota Neural ocupa no produto, nunca como referência de implementação.
- **Code adopted?** Não.
- **Dependency adopted?** Não.
- **License verified?** `LICENSE_NOT_VERIFIED` — nenhum acesso ao repositório oficial nesta sprint; nenhuma afirmação de permissão comercial é feita.
- **Decision:** Nenhum asset visual, nenhuma animação, nenhum código copiado. A identidade visual futura da Gota Neural (gota da marca LOKAT com rede neural interna) é desenhada independentemente — ver `docs/architecture/gota-neural-foundation-v1.md`, seção Non-goals (nenhum asset final produzido nesta sprint).

## OpenJarvis

- **Role/reference:** `ARCHITECTURE_PATTERN_REFERENCE_ONLY`.
- **Useful pattern:** arquiteturas agentic com múltiplos agentes especializados e um orchestrator central — padrão conceitual já refletido em `AgentDefinition`/`NeuralOrchestrator` desta sprint, mas implementado de forma independente e determinística (sem LLM nesta fase).
- **Code adopted?** Não.
- **Dependency adopted?** Não.
- **License verified?** `LICENSE_NOT_VERIFIED`.
- **Decision:** Nenhuma dependência obrigatória de OpenJarvis. Nenhum código incorporado.

## GAIA

- **Role/reference:** `ARCHITECTURE_PATTERN_REFERENCE_ONLY`.
- **Useful pattern:** avaliação de agentes sobre tarefas multi-etapa com contexto — usado apenas como referência conceitual para o formato de `NeuralPlan`/`DomainIntent` (multi-domínio, capability-aware), não como implementação.
- **Code adopted?** Não.
- **Dependency adopted?** Não.
- **License verified?** `LICENSE_NOT_VERIFIED`.
- **Decision:** Nenhuma dependência obrigatória de GAIA. Nenhum código incorporado.

## UTMify (e provedores de atribuição equivalentes)

- **Role/reference:** `ATTRIBUTION/CONNECTION-HEALTH_REFERENCE_ONLY`.
- **Useful pattern:** modelo de saúde de conexão de atribuição (conectado/degradado/token expirado) — refletido conceitualmente em `ConnectionHealth` (`src/lib/neural-core/integrations.ts`), generalizado para qualquer provedor de atribuição, não específico da UTMify.
- **Code adopted?** Não.
- **Dependency adopted?** Não.
- **License verified?** `LICENSE_NOT_VERIFIED`.
- **Decision:** Listado no catálogo (`lokat-digital-integration-catalog-v1.md`) como um exemplo de provedor de atribuição possível, nunca como dependência. Nenhum SDK instalado, nenhuma API chamada.

## Regra permanente

Nenhuma sprint futura pode instalar código/dependência de nenhuma das
referências acima sem uma auditoria de licença dedicada que resolva
explicitamente o `LICENSE_NOT_VERIFIED` — este documento não concede
essa permissão, só registra a pesquisa conceitual já feita.
