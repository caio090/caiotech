# Eventos Internos entre Módulos — `src/lib/domain-events/`

Registro em memória, determinístico. Sem fila ou broker real nesta sprint.

## Tipos de evento

`ProductOpportunityDetected | CommercialCampaignCreated | CommercialCampaignApproved | CommercialCampaignSentToRecOS | ContentBriefCreated | ContentScheduled | ContentPublished | CalendarEventCreated | ReportDataImported | FinancialDifferenceDetected | InventoryRiskDetected | ProductCostChanged | BusinessPainPointCaptured`

`DomainEventRegistry.publish()` rejeita (lança erro) qualquer tipo fora dessa lista — nunca aceita silenciosamente um evento desconhecido.

## Pontes (`bridges.ts`)

- **Produto → Campanha**: `ProductCampaignOpportunity` → `buildCampaignBriefFromOpportunity()` → `CommercialCampaignBrief`. Não cria campanha real, só a transformação de shape.
- **Campanha → REC OS**: `CommercialCampaignBrief` → `buildGuidedCreativeBrief()` → `GuidedCreativeBrief` (7 etapas fixas: o quê, por quê, para quem, o que produzir, requisitos, restrições, aprovação). Não redireciona para o início do fluxo real do REC OS.

## Fluxo canônico (`canonical-flow.ts`)

`CANONICAL_FLOW_STEPS` representa Produto → Oportunidade → Campanha → Brief REC OS → Conteúdo → Calendário → Publicação → Relatório → Resultado → Produto, cada etapa apontando para entidade, módulo, evento (quando existe), dados necessários e status (`modeled | partially_implemented | implemented`).

## Templates operacionais (`src/lib/operational-templates/`)

`OperationalTemplate` com núcleo universal (tarefa, responsável, prazo, status, evidência, custo, dependência, aprovação, resultado), adaptável por `nichePackId`. Nenhum painel operacional completo implementado nesta sprint.
