# Roadmap de Produção — Sprint REC OS 3.0.1 → 3.0.1.1

**Estado: `qa_pending`.** A Sprint REC OS 3.0.1 registrou o contrato e
adiou a tela; a Sprint REC OS 3.0.1.1 implementou a experiência navegável
real em `/admin/contentos/roadmap`.

## Fonte única

`RecOsRoadmapItem` (`src/lib/rec-os-roadmap.ts`) — lida a partir de
`content_items` (título, tipo, canal, status, scheduled_date,
responsible_id) com left-join em `operational_tasks` (responsável/prazo
operacional) e `approvals` (estado de aprovação mais recente), via
`getRoadmapItems()` (`src/lib/rec-os-roadmap-data.ts`, único ponto que
importa Supabase — o restante do módulo é puro e testável sem banco).

Campos que **não** existem como coluna real hoje (nunca inventados):
`campaignId` e `priority` ficam sempre `null`. Não há entidade de
campanha nem coluna de prioridade em `content_items`/`operational_tasks`.

## Quatro visualizações, uma fonte

`_roadmap-client.tsx` mantém um único `useState<RoadmapFilters>` e um
único array `filtered` (via `filterRoadmapItems()`); Quadro, Lista, Linha
do tempo e Calendário recebem exatamente esse array — nenhuma fixture
própria, filtros preservados ao trocar de visão.

- **Quadro** (`groupRoadmapItemsByKanbanColumn`): 8 colunas
  (Radar/Criar/Produzir/Revisar/Aprovar/Visual Final/Agendar/Publicado) —
  **agrupamentos visuais** sobre os status canônicos existentes, nunca um
  status novo. Cards não são arrastáveis (sem mutação segura definida
  nesta sprint) — mudança de etapa continua pelas ações reais já
  existentes em Produção/Aprovações/Destino.
- **Lista**: busca por título/cliente, tabela no desktop
  (`hidden md:block`), cards no mobile (`md:hidden`) — nunca força tabela
  horizontal.
- **Linha do tempo** (`bucketRoadmapItemsForTimeline`): dia/semana/mês,
  bucket explícito "Sem data definida" para itens sem prazo.
- **Calendário** (`roadmapItemsForMonth`): grade do mês selecionado +
  "Abrir no Calendário Global" via `buildCalendarNavigationUrl()` real.

## Filtros

Status, formato, canal, responsável, estado de aprovação, mês e "somente
atrasados" — todos com dado real. Campanha/setor/prioridade aparecem na
sheet de filtros como "ainda não disponível", explicitamente, em vez de
um filtro que nunca teria efeito.

## Limitação honesta

Nenhuma mutação (o Roadmap é 100% leitura). Drag-and-drop entre colunas
do Quadro foi deliberadamente não implementado — exigiria uma rota de
mutação de status nova, fora do escopo desta sprint de fechamento.
