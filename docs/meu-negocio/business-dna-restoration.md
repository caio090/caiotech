# Restauração do DNA do Negócio — Sprint Meu Negócio 2.1.2

## O que aconteceu

A camada estratégica do Meu Negócio (DNA, 4 Ps, SWOT, Metas, Manual) foi
criada na Sprint Motor LOKAT 1.1 (branch histórica
`feat/product-engineering-preview-v1`, commits `671db53`
"feat(business): add company DNA and living business manual" e `d12dff5`
"feat(products): add product/service engineering, test lab and performance
matrix") e depois **de fato mergeada em main** via `595fe53
feat(meu-negocio): integrate Motor LOKAT and product engineering` e
`56ebd63 fix(meu-negocio): restore explicit SWOT environments`.

O que aconteceu depois não foi uma remoção — foi uma desconexão. Quando a
sprint vertical slice Restaurante (`feat/meu-negocio-stock-restaurant-v1`)
criou `_entry.tsx` como novo ponto de entrada de `/admin/meu-negocio`
(seleção de empresa → `RestaurantWorkspace`, o Centro de Comando real), o
arquivo antigo `_client-content.tsx` — que renderizava `BusinessTab`, ou
seja, toda a camada de DNA/4Ps/SWOT/Metas/Manual — parou de ser importado
por qualquer rota. O código não foi apagado, não sofreu bit rot, nem ficou
desatualizado: continuou compilando, com ESLint limpo, sem nenhuma
referência a Supabase. Só ficou órfão.

`src/config/project-status.ts` não foi atualizado quando isso aconteceu —
as entradas `business_dna`, `business_manual`, `business_four_ps`,
`business_swot` e `sales_goals` continuavam dizendo "Somente na branch
feat/product-engineering-preview-v1", o que já era falso desde o merge
`595fe53`. Esta sprint corrigiu essas cinco notas.

## O que esta sprint fez

1. **Não tocou** em `_client-content.tsx`, `_business-tab.tsx`,
   `_products-tab.tsx`, `_shared.tsx` nem em
   `src/lib/motor-lokat/business-types.ts` além de uma extensão aditiva
   (campos opcionais novos em `SwotItem`: `status`, `linkedModule`,
   `linkedCompetitorId`, `linkedGoalId`, `createdAt`, `updatedAt`). O demo
   antigo continua existindo, compilando e órfão — exatamente como o
   ticket pediu ("não recriar a tela antiga").
2. Criou um módulo novo, `src/lib/business-strategy/`, com os mesmos 19
   campos históricos do DNA (mesmas chaves, mesma ordem —
   `STRATEGY_DNA_FIELD_ORDER`), agora tipados contra os sistemas atuais:
   `segment: StrategyField<BusinessArchetypeId>` (de
   `business-archetypes/types.ts`) em vez do `BusinessSegment` antigo de
   `motor-lokat/types.ts` (delivery/varejo/clínica/serviços/agência/saas),
   que nunca incluiu `"food_service"` — o segmento real da única empresa
   de demonstração hoje no Centro de Comando.
3. `StrategyField<T>` reaproveita `DataConfidence` do Data Hub (Core 2.1)
   em vez de inventar uma segunda escala de confiança — os seis valores
   (`confirmed`/`calculated`/`estimated`/`incomplete`/`divergent`/`unknown`)
   batem exatamente com o que a Fase 1 do ticket pediu. A única peça nova
   é `StrategyDataSource` (origem, não confiança), porque `DataSourceType`
   do Data Hub descreve formato de arquivo (csv/xlsx/pdf/...), não
   categoria de proveniência estratégica.
4. Reconectou tudo dentro do Centro de Comando real
   (`_restaurant-workspace.tsx`), como uma nova área "DNA & Estratégia"
   entre "Visão geral" e "Financeiro" — não uma rota nova, não uma segunda
   tela de Meu Negócio.

## Os 19 campos restaurados

`companyName`, `businessModel`, `description`, `mainProducts`,
`problemSolved`, `desiresServed`, `valueProposition`, `differentiators`,
`audiences`, `priceRange`, `salesChannels`, `units`, `regionsServed`,
`seasonality`, `goals`, `restrictions`, `contactNetwork`, `competitors`,
`positioning` — mais `segment`, que não entra em `STRATEGY_DNA_FIELD_ORDER`
(igual ao histórico, onde `segment` tinha UI própria, fora da lista).

Para a empresa atualmente exibida no Centro de Comando: só `companyName` e
`segment` vêm preenchidos (origem `existing_profile`, confiança
`confirmed`, porque já existiam na fixture antes desta sprint). Todos os
outros 17 campos começam vazios, com `source: "missing"` e
`missingReason: "Não informado"` — nunca uma missão, visão, público ou
diferencial inventados.

## Testado

`src/lib/business-strategy/__tests__/business-strategy.test.ts` (54
asserções) confirma: as 19 chaves batem exatamente com o commit histórico
`671db53`; nome/segmento preservados; nenhum campo desconhecido preenchido;
nenhuma missão/visão fictícia. `src/app/admin/meu-negocio/_strategy/__tests__/strategy-workspace.structural.test.ts`
(71 asserções) confirma que nenhuma aba existente foi removida, que a nova
área fica na posição certa, e que o demo antigo continua intocado.
