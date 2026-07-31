# Calendário Global 2.0 — `src/lib/global-calendar-v2/`

Esta camada **evolui** `src/lib/global-calendar.ts` — não o substitui. `GlobalCalendarEvent` (content_item/operational_task/approval) continua sendo o único tipo de evento real; `global-calendar-v2` adiciona classificação e contratos de provider por cima dele.

## Categorias universais

`operations | content | meetings | commercial | finance | fiscal | projects | team | inventory | campaigns | seasonal | holidays | deadlines | reminders`

## Providers (`providers.ts`)

| Provider | Estado | Motivo |
|---|---|---|
| Interno (LOKAT) | `available` | Já agrega os 3 tipos reais. |
| Manual | `available` | Criação manual de evento. |
| Google (iCal/URL) | `planned` | Mapeado, nenhuma leitura real. |
| Google (OAuth) | `blocked` | **Status congelado** — requer autorização formal antes de qualquer integração segura. Não alterado nesta sprint. |
| Feriados | `planned` | Contrato definido, sem fonte real. |
| Datas sazonais | `planned` | Contrato definido, sem fonte real. |

## Localização (`location.ts`)

Prioridade fixa: endereço cadastrado → cidade manual → geolocalização do navegador (com consentimento) → nenhuma. **Nunca solicita geolocalização automaticamente.**

## Feriados e datas sazonais (`holidays.ts`)

Cada data guarda fonte, região, segmento, relevância e confiança — nenhuma data é tratada como "verdade universal" sem esse contexto. Nenhuma pesquisa ou importação real de datas nesta sprint.
