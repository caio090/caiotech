# Roadmap de Produção — Sprint REC OS 3.0.1

**Estado: `planned`.** Nenhuma tela nova implementada nesta sprint —
registrado como próxima etapa, priorizado abaixo dos fixes mobile P0
(que tinham evidência real de defeito em produção via prints do usuário).

## O que já existe hoje (reaproveitável)

`src/lib/rec-os-hub.ts` já calcula, sobre `content_items` reais:
`bucketContentStatus()` (agrupamento por status), contagens por cliente
(`buildClientAttentionRows`), motivo de atenção (`AttentionReason`).
Uma futura tela de Roadmap deve consumir essas mesmas funções — nunca
recalcular o agrupamento de status uma segunda vez.

## Contrato já registrado

`RecOsWorkflowDefinition`/`REC_OS_WORKFLOW_STAGES`
(`src/lib/rec-os-workflow/types.ts`) já modela as 4 macroetapas que as
colunas do Quadro devem espelhar (Radar/Criar/Produzir/Finalizar +
Agendar/Publicado como estados finais) — a implementação futura do Quadro
deve usar esse mesmo registry para as colunas, não uma lista redigitada.

## Visualizações planejadas

Quadro, Lista, Linha do tempo, Calendário — mesma fonte
(`bucketContentStatus` + `content_items` reais), mesmos IDs de conteúdo em
todas. Filtros planejados: cliente, mês, campanha, setor, responsável,
status — os dois primeiros (cliente, status) já têm equivalente parcial em
`rec-os-hub.ts`; mês/campanha/setor/responsável exigem colunas que
`content_items` não expõe hoje sem uma auditoria de schema adicional.

## Próximos passos

1. Confirmar quais campos de filtro (mês, campanha, setor, responsável)
   já existem na tabela real `content_items`/`operational_tasks` antes de
   desenhar a UI.
2. Implementar a visão Quadro primeiro (reaproveitando
   `bucketContentStatus`), validar com dado real, só depois desenhar
   Lista/Linha do tempo/Calendário sobre a mesma fonte.
