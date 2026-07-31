# Análise de Concorrência — Sprint Meu Negócio 2.1.2

## O que realmente existia antes desta sprint

O DNA histórico (`671db53`) tinha **um único campo de texto livre**
chamado `competitors` — sem estrutura, sem tipo, sem matriz de comparação.
Não havia cadastro de concorrentes, não havia comparação por dimensão, e
não havia pesquisa automática em nenhuma versão anterior do produto. Esta
seção do ticket é honesta sobre isso: a análise de concorrência anterior
**não era completa** — era um campo de texto, e nada mais. O código
histórico não comprova nenhuma estrutura além disso.

O campo `competitors` (texto livre) continua existindo e preservado no
DNA restaurado (`STRATEGY_DNA_FIELD_ORDER`), sem alteração.

## O que esta sprint criou (inteiramente novo)

`src/lib/business-strategy/types.ts` + `competitors.ts`:

- `CompetitorProfile` — 27 campos (nome, tipo, segmento, localização, área
  de atendimento, site, redes, produtos, serviços, público,
  posicionamento, proposta de valor, faixa de preço, canais, forças,
  fraquezas, experiência do cliente, presença digital, modelo de venda,
  modelo de entrega, reputação, evidência, fonte, confiança, data da
  observação, status, notas, `isExample`).
- `CompetitorType`: `direct` (Direto), `indirect` (Indireto), `substitute`
  (Substituto), `benchmark` (Referência), `emerging` (Emergente).
- `CompetitorComparisonValue`: `unknown | weaker | similar | stronger |
  divergent` — **nunca uma nota de 0 a 10 inventada**. Ausência de
  informação vira `unknown`, nunca `weaker`.
- `findCompetitorGaps()` — regras determinísticas: concorrente mais forte
  em preço, em conveniência (entrega/facilidade de compra/atendimento/
  velocidade), lacuna de comunicação, benchmark operacional, oportunidade
  de posicionamento, risco de substituição, dado desatualizado, e
  informação insuficiente quando nenhum concorrente tem dado registrado
  numa dimensão.

## Confirmação exige evidência

A UI (`_strategy-competitors.tsx`) só habilita "Confirmar concorrente"
quando existem nome, uma evidência (link, observação, print) e a data da
observação — exatamente como a Fase 20 do ticket exige.

## Nunca um cliente real

`buildExampleCompetitorsForArchetype()` gera só 2 concorrentes
demonstrativos ("Concorrente Genérico A/B (exemplo)") para `food_service`,
sempre `isExample: true`. Nenhuma fixture, teste ou UI desta sprint
referencia Duh Lanches ou O Pedreirão como concorrente de ninguém.

## Pesquisa automática — contrato, não implementação

`CompetitorResearchProvider` (contrato genérico) tem
`availability: "unavailable"` fixo nesta sprint, com capacidades futuras
declaradas (`search_web`, `analyze_website`, `analyze_social`,
`analyze_reviews`, `compare_prices`, `track_changes`) mas nenhuma delas
chamada. O botão "Pesquisar concorrentes" existe na UI, desabilitado, com
o tooltip "A pesquisa automática ainda não está disponível neste
ambiente." — nunca escondido, nunca fingindo funcionar.

## Testado

`business-strategy.test.ts`: 2 concorrentes de exemplo, todos
`isExample=true`, nenhuma referência a cliente real; concorrente mais forte
em preço vira gap `concorrente_forte_em_preco`; dimensão sem nenhuma
informação vira `informacao_insuficiente`, nunca uma nota baixa; provider
de pesquisa permanece `unavailable`.
