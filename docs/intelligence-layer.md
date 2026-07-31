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
