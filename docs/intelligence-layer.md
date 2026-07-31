# Camada de Inteligência — `src/lib/intelligence/`

Contratos para o Assistente LOKAT contextual. **Sem IA falsa**: nesta sprint `CURRENT_INTELLIGENCE_AVAILABILITY` (`src/lib/intelligence/availability.ts`) é sempre `"unavailable"` — nenhuma chamada a OpenAI, Gemini, ou import da branch experimental do Motor LOKAT AI.

## Regra central

Todo botão de ação de IA consulta `isIntelligenceAvailable()` antes de habilitar. Enquanto indisponível:

- mostra exemplos e ajuda contextual determinística (`src/components/intelligence/context-help-card.tsx`);
- mostra validação real (`missing-information-alert.tsx`, baseado em validação de dados existente, não inferência);
- mostra a mensagem honesta: *"O Assistente LOKAT ainda não está disponível neste ambiente."*
- nunca finge geração de conteúdo.

## Ações modeladas

`explain | help_fill | interpret | find_inconsistencies | suggest_next_step | generate_questions | summarize | compare | classify`

Cada módulo declara quais ações permite (`src/lib/intelligence/capabilities.ts`) — nenhum módulo mostra todos os botões.

## Componentes de ajuda contextual

`IntelligenceActionButton`, `ContextHelpCard`, `FieldExplanation`, `MissingInformationAlert`, `NextStepSuggestion` — todos em `src/components/intelligence/`.

## Radar de Produto e IA futura

`src/lib/product-research/analyzer.ts` define `ProductResearchAnalyzer` com implementação `deterministic_stub`: agrupamento e ranking por regras explícitas (contagem, correspondência literal), nunca geração de texto.

## Nota — Sprint Meu Negócio 2.1.2 (rota de IA do Assistente do Meu Negócio protegida)

`src/app/api/meu-negocio/ai/analyze/route.ts` (o "Pergunte à Lokat" real,
que chama OpenAI quando configurado) não tinha `withMutationProtection`
desde que foi criada — uma chamada externa com custo real por requisição
não estava bloqueada durante o Workspace Preview. Corrigido nesta sprint:
a rota agora usa o mesmo wrapper das demais rotas de IA
(`ai/briefing`, `ai/legenda`, etc.) e foi classificada como `protected` em
`scripts/check-workspace-mutation-coverage.ts` — ver
`docs/workspace-mutation-inventory.md`. Também nesta sprint: o contrato de
pesquisa automática de concorrentes (`CompetitorResearchProvider`, em
`src/lib/business-strategy/types.ts`) segue exatamente o mesmo padrão
"sem IA falsa" — `availability: "unavailable"` fixo, nenhuma chamada web
ou de IA.
