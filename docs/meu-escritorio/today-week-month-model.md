# Modelo Hoje/Semana/Mês — Sprint Navegação e Experiência 3.0.1.2

## Uma fonte, três visões

`getBusinessOfficeFeed()` (`src/lib/business-office/data.ts`) busca uma
única janela ampla (-7 dias a +40 dias a partir de hoje), reaproveitando
**exatamente** as mesmas 3 queries e os mesmos normalizadores do Calendário
Global (`src/lib/global-calendar.ts` — `normalizeContentItems`/
`normalizeOperationalTasks`/`normalizeApprovals`). Nenhuma fonte de
verdade nova, nenhuma tabela nova.

`classifyBusinessOfficeItems()` (`src/lib/business-office/types.ts`)
classifica esse ÚNICO array em Hoje/Semana/Mês — nenhum dos três é uma
busca separada.

## BusinessOfficeFeedItem

Campos: `id, workspaceId, sourceModule, sourceEntityId, type, title,
description, startsAt, dueAt, completedAt, status, priority, responsible,
href, period, isDemo, dataAvailability` — exatamente o contrato pedido
pelo brief (Fase 17).

## Módulos sem fonte real ainda

Reuniões, financeiro, campanhas (como entidade própria), decisões, metas,
documentos — `BUSINESS_OFFICE_NOT_INTEGRATED_MODULES`, exibidos com o
texto "Este módulo ainda não fornece dados para Meu Escritório." — nunca
como zero fabricado.

## Fechamento do mês vs. Planejamento do próximo mês

`splitMonthClosureAndPlanning()`: fechamento = itens do mês corrente com
`completedAt` preenchido; planejamento = itens do balde do mês seguinte
(`itemsForMonthPrefix` + `nextMonthKey`), do MESMO array já buscado (a
janela de +40 dias garante cobertura do mês seguinte).
