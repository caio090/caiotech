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

## Nota — Sprint REC OS 3.0.1 (calendário contextual)

`CalendarNavigationContext`/`buildCalendarNavigationUrl()`
(`src/lib/rec-os-workflow/types.ts`) preservam workspace/cliente/campanha/
conteúdo/mês/filtros/rota-de-retorno ao navegar do REC OS para o
Calendário — nunca abre um calendário genérico sem contexto. Google OAuth
continua `blocked`, Google iCal continua `planned` — testado
explicitamente que nenhuma referência a `google` aparece na URL
construída por essa função.

## Nota — Sprint REC OS 3.0.1.1 (conexão real)

O contrato acima foi conectado de verdade nesta sprint: o subnav do REC
OS, o Roadmap de Produção e o Mapa do Cliente agora usam
`buildCalendarNavigationUrl()` para o link de "Calendário" (em vez de só
`?client=`). `/admin/calendario/page.tsx` passou a: (1) aceitar `month`
combinado no formato `YYYY-MM` (traduzido internamente para o par
`year`/`month` que `resolveRequestedMonth()` já esperava — nenhuma
mudança no contrato dessa função), e (2) ler `return_to` (sanitizado
contra qualquer coisa fora de `/admin/`) para mostrar um banner "Aberto a
partir do REC OS" com um link real de voltar
(`_client-content.tsx`, `data-testid="calendar-context-banner"`).
Nenhuma chamada ao Google em nenhum ponto desta conexão.

## Nota — Sprint Navegação e Experiência 3.0.1.2

Corrigido o defeito real que enviava admin autenticado para /login ao
abrir o Calendário Global sempre que requireAdminContentOSContext()
falhava por config/permissão (503/403), não por sessão. Ver
docs/navigation/authenticated-internal-navigation.md. Meu Escritório
(nova sprint) reaproveita os mesmos normalizadores deste módulo -- nenhum
segundo cálculo de eventos.
