# Modelo de Follow-up do CRM — Sprint Recovery 2.1.3

`src/lib/crm-adaptive/types.ts`: `CrmFollowUpDefinition`,
`CrmFollowUpSchedule`, `CrmFollowUpExecution`, `CrmFollowUpOutcome`,
`CrmFollowUpRule`. **Nenhuma mensagem é enviada nesta sprint** — só o
modelo de dados e os estados foram registrados.

## Tipos de follow-up

`manual | automatic | suggested | recurring | event_triggered`

## Estados de execução

`pending | due_today | overdue | completed | cancelled | rescheduled | waiting_response`

## Campos por execução

`leadId`, `ownerId`, `dueAt`, `channel`, `objective`, `messageContext`,
`status`, `outcome`, `nextAction`, `createdBy`, `source`, `confidence`
(reaproveitando a escala `DataConfidence` do Data Hub — `confirmed |
calculated | estimated | incomplete | divergent | unknown` — em vez de
inventar uma nova).

## Relação com o motor de temperatura

Um follow-up `overdue` ou repetidamente `waiting_response` é um dos
fatores futuros que alimentariam a temperatura do lead (ver
`crm-lead-temperature-model.md`) — essa conexão ainda não existe em
código, é só uma relação conceitual registrada aqui.

## Próximos passos

Implementar primeiro o tipo `manual` (o mais simples, sem regra
automática), medir uso real antes de implementar `automatic`/`suggested`
— que dependem do motor de temperatura e da IA contextual (`crm-dashboard-model.md`,
`adaptive-crm-architecture.md`), ambos ainda não implementados.
