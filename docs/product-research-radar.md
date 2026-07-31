# Radar de Produto — `src/lib/product-research/`

Registro diário de dores e oportunidades encontradas em conversas com empresários. Todas as fixtures desta sprint são genéricas e demonstrativas — nenhuma conversa real, nenhum cliente real.

## Tipos (`types.ts`)

`ProductResearchEntry`, `ProductPainPoint`, `ProductOpportunity`, `ProductValidationSignal`, `ProductExperiment`.

## Status do ciclo de vida

`captured → reviewing → validating → validated_problem → solution_hypothesis → planned → in_development → testing → released` (ou `rejected` / `archived` a qualquer momento).

## Analyzer (`analyzer.ts`)

`ProductResearchAnalyzer` é o contrato para uma futura IA capaz de agrupar dores, detectar repetição, rankear oportunidades, sugerir perguntas e resumir a semana. A implementação atual, `DETERMINISTIC_PRODUCT_RESEARCH_ANALYZER`, é `deterministic_stub`: agrupamento por correspondência literal de módulo/segmento, ranking por peso fixo de severidade — nunca geração de texto ou chamada a modelo. `UNAVAILABLE_PRODUCT_RESEARCH_ANALYZER` existe para módulos que preferem desligar a análise por completo.

## Visível ao Super Admin

A aba "Radar de Produto" em `/admin/ecossistema` lista as entradas e o resumo semanal determinístico.
