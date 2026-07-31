# Manual Vivo — Sprint Meu Negócio 2.1.2

## Princípio: derivado, nunca uma cópia

O Manual do Negócio já existia (`671db53`, ampliado no hotfix 1.1.1) como
uma visualização computada ao vivo a partir do DNA, 4 Ps, SWOT e Metas —
nunca um segundo cadastro. Esta sprint preserva esse princípio e amplia as
fontes: `buildLivingManual()` (`src/lib/business-strategy/manual.ts`) lê
DNA, 8Ps, SWOT confirmada, concorrentes confirmados, metas e sazonalidade
confirmada — e não guarda nenhum estado próprio.

`src/app/admin/meu-negocio/_strategy/_strategy-manual.tsx` chama
`buildLivingManual()` a cada renderização — não existe `useState` nesse
componente (verificado por teste estrutural). Mudar qualquer campo do DNA,
8Ps ou SWOT confirmada atualiza o Manual imediatamente, sem uma ação
explícita de "salvar" ou "gerar".

## As 18 seções

Quem somos · O que vendemos · Para quem vendemos · Por que escolher a
empresa · Como a empresa ganha dinheiro · Como vende · Como entrega · Como
se comunica · Como se posiciona · 8Ps · SWOT · Concorrência · Metas ·
Sazonalidade · Indicadores · Riscos · Oportunidades · Informações
ausentes.

## Informação não confirmada nunca é apresentada como fato

Cada seção (`LivingManualSection`) tem uma flag `pending: boolean`. Uma
seção fica `pending` quando o campo de origem não está `confirmed`, ou
quando a coleção de origem só tem exemplos não confirmados (`isExample`).
A seção "SWOT" com apenas os 4 exemplos de segmento pré-carregados (nunca
confirmados) aparece marcada como pendente — o texto nunca é apresentado
como se fosse um fato do negócio.

A seção "Como se posiciona" usa o resumo derivado de posicionamento
(`buildPositioningSummary()`, ver Fase 10) quando os 4 componentes
necessários existem; caso contrário cai no campo de texto livre
`positioning` do DNA, e fica `pending` se nenhum dos dois existir.

## Sem geração de PDF, sem persistência duplicada

Nenhuma geração de PDF nesta sprint (igual ao hotfix 1.1.1 original). O
Manual não persiste em lugar nenhum — é recalculado a cada render a partir
do estado em memória do Centro de Comando.

## Testado

`business-strategy.test.ts`: o Manual tem pelo menos as seções centrais do
ticket; mudar um campo do DNA muda o Manual imediatamente (mesmo teste
chamando `buildLivingManual()` duas vezes com um DNA diferente); SWOT só
com exemplos não confirmados aparece pendente. `strategy-workspace.structural.test.ts`:
o painel do Manual não tem `useState` próprio.
