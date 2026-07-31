# 8Ps LOKAT — Sprint Meu Negócio 2.1.2

## O que é

**8Ps LOKAT** é uma metodologia própria do produto LokatOS, não um
framework de mercado. É construída a partir do modelo histórico da
plataforma (os 4 Ps tradicionais de Marketing — Produto, Preço, Praça,
Promoção — já restaurados de `feat/product-engineering-preview-v1`) mais
quatro dimensões novas: Público, Posicionamento, Processo e Performance.

> "Os 8Ps LOKAT organizam como a empresa cria valor, cobra, vende,
> comunica, atende, se posiciona, executa e mede resultado."

Este NÃO é o mesmo conceito que "8Ps do marketing digital" nem os "7Ps
tradicionais de serviços" (que normalmente incluem Pessoas/People,
Evidência física/Physical evidence e Processo) — os 8Ps LOKAT são uma
combinação específica desta plataforma, e nenhuma documentação desta
sprint afirma que é o único framework de 8Ps existente no mercado.

## Os 8 Ps

| # | P | Pergunta central | Histórico |
|---|---|---|---|
| 1 | Produto | O que a empresa vende? | 4 Ps (`feat/product-engineering-preview-v1`) |
| 2 | Preço | Como a empresa cobra? | 4 Ps |
| 3 | Praça | Onde e como a empresa vende? | 4 Ps |
| 4 | Promoção | Como a empresa se comunica? | 4 Ps |
| 5 | Público | Para quem a empresa vende? | Novo nesta sprint |
| 6 | Posicionamento | Como a empresa quer ser percebida? | Novo nesta sprint |
| 7 | Processo | Como a empresa executa? | Novo nesta sprint |
| 8 | Performance | Como a empresa mede resultado? | Novo nesta sprint |

`src/lib/business-strategy/types.ts` — `EightPKey`, `EightPSection`,
`EightPs`, `EIGHT_P_ORDER` (a ordem canônica acima), `EIGHT_PS_DESCRIPTION`
(o texto exato citado). `src/lib/business-strategy/fixtures.ts` —
`buildEmptyEightPs()`.

## Cada P nunca duplica um módulo real

- **Produto** resume o portfólio de Produtos e Fichas — não recadastra
  produtos.
- **Preço** referencia o motor de precificação — não recalcula margem.
- **Processo** resume a operação — não duplica o painel Operacional.
- **Performance** é uma ponte para Relatórios, Financeiro e Produtos — não
  reimplementa nenhuma métrica.

Cada seção (`EightPSection`) tem `text`, `evidence`, `notes`, `source` e
`confidence` — um resumo curto com origem e confiança, não um formulário
de 15 campos por P. A UI (`_strategy-eight-ps.tsx`) mostra 8 cards de
resumo que abrem um painel de detalhe — nunca os 8 Ps de uma vez na
mesma tela.

## Testado

`business-strategy.test.ts`: exatamente 8 Ps, IDs únicos, nenhum nono P,
texto explicativo bate exatamente com o texto obrigatório do ticket, o P
de Produto não duplica dado de Produtos e Fichas.
