# SWOT / FOFA — Sprint Meu Negócio 2.1.2

## O que já existia (preservado sem alteração destrutiva)

`SwotItem` (`src/lib/motor-lokat/business-types.ts`) já estava em main
desde a release canônica 1.0, com categorias em português —
`"forca" | "fraqueza" | "oportunidade" | "ameaca"` — agrupadas visualmente
sob "Ambiente interno" (Forças/Fraquezas) e "Ambiente externo"
(Oportunidades/Ameaças), cada item com `source`, `evidence`, `impact`
(`alto`/`medio`/`baixo`), `priority` (`alta`/`media`/`baixa`), `confirmed`
e `isExample`. Esta sprint **não renomeou** esses valores para inglês —
`"forca"` continua `"forca"`, não virou `"strength"` — para não quebrar o
componente real (`_business-tab.tsx`) que já os usa.

## O que esta sprint adicionou (aditivo, opcional)

Campos novos e opcionais em `SwotItem`, que nenhum item existente precisa
preencher:

- `status?: "draft" | "reviewing" | "confirmed" | "outdated" | "archived"`
  — sobre o ciclo de vida do item; `confirmed` continua sendo a fonte da
  verdade sobre "isto é fato do negócio".
- `linkedModule?`, `linkedCompetitorId?`, `linkedGoalId?` — rastreiam de
  onde um item veio (ex.: uma observação de concorrente virou proposta de
  Ameaça).
- `createdAt?`, `updatedAt?`.

## Matriz e cruzamentos (novo nesta sprint)

`src/app/admin/meu-negocio/_strategy/_strategy-swot.tsx` renderiza a
matriz 2×2 por ambiente (reaproveitando o mesmo agrupamento visual já
existente) com filtro "só confirmados".

`src/lib/business-strategy/swot-crosswalk.ts` —
`buildSwotCrossSuggestions()` — cruzamentos determinísticos:

| Cruzamento | Quadrante |
|---|---|
| Força + Oportunidade | Potencializar |
| Força + Ameaça | Proteger |
| Fraqueza + Oportunidade | Melhorar para aproveitar |
| Fraqueza + Ameaça | Reduzir risco |

Só combina itens **confirmados e reais** (`confirmed === true`,
`isExample !== true`) — um exemplo de segmento não confirmado nunca entra
em um cruzamento, e nenhum cruzamento é aplicado automaticamente como
decisão; é sempre uma sugestão para revisão humana.

## Exemplos por segmento

`buildExampleSwotForArchetype()` (`src/lib/business-strategy/fixtures.ts`)
gera exemplos só para `food_service` (o único arquétipo com experiência
real hoje) — sempre `isExample: true`, `confirmed: false`, com o aviso "Este
é apenas um exemplo baseado no segmento. Confirme, edite ou remova antes de
usar na estratégia." Nenhum exemplo alimenta o Manual Vivo, uma
recomendação, uma campanha ou um relatório antes de ser confirmado.

## Testado

`business-strategy.test.ts`: 4 exemplos de SWOT para food_service (um por
categoria), todos `isExample=true`/`confirmed=false`; cruzamento
força+oportunidade gera "potencializar"; item não confirmado nunca entra
em um cruzamento. `strategy-workspace.structural.test.ts`: agrupamento
Ambiente interno/externo preservado.
