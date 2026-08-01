# Mapa Mestre da Plataforma — LOKAT OS

Sprint LOKAT Core 2.1. Fundação técnica e visual: registries, tipos, contratos e uma página demonstrativa (`/admin/ecossistema`). Nenhuma integração externa real, nenhum dado real alterado.

## As três camadas

1. **Núcleo universal** — usuários, workspaces, permissões, arquivos, eventos, dados, notificações, auditoria, IA, calendário, relatórios. Hoje: `src/lib/workspaces/`, `src/config/workspace-capabilities.ts`.
2. **Módulos empresariais** — Meu Negócio, Financeiro, Produtos, Estoque, CRM, REC OS, Operacional, Fiscal, Relatórios. Registrados em `src/config/platform-modules.ts`.
3. **Pacotes de nicho** — alimentação, materiais de construção, agência e serviços, construção civil, empresa geral. `src/config/business-niche-packs.ts`.

## Fluxo canônico

```
Empresa → Dados → Interpretação → Oportunidades → Ações → Execução → Resultado → Aprendizado
```

Representado em código por `src/lib/domain-events/canonical-flow.ts` (`CANONICAL_FLOW_STEPS`):

```
Produto → Oportunidade → Campanha comercial → Brief REC OS → Conteúdo → Calendário → Publicação → Relatório → Resultado → Produto
```

## Onde encontrar cada peça

| Peça | Arquivo |
|---|---|
| Registry de módulos | `src/config/platform-modules.ts` |
| Página do ecossistema | `src/app/admin/ecossistema/` |
| Radar de Produto | `src/lib/product-research/` |
| Data Hub | `src/lib/data-hub/` |
| Perfil empresarial | `src/lib/business-profile/` |
| Pacotes de nicho | `src/config/business-niche-packs.ts` |
| Camada de inteligência | `src/lib/intelligence/` + `src/components/intelligence/` |
| Relatórios (Essencial/Analítica) | `src/lib/reports/view-modes.ts` |
| Conciliação financeira | `src/lib/financial-reconciliation/` |
| Calendário Global 2.0 | `src/lib/global-calendar-v2/` (evolui `src/lib/global-calendar.ts`, não duplica) |
| Eventos internos | `src/lib/domain-events/` |
| Templates operacionais | `src/lib/operational-templates/` |
| Mensageria (WhatsApp) | `src/lib/messaging/types.ts` |
| Fiscal | `src/lib/fiscal/types.ts` |

## O que esta sprint explicitamente não fez

Ver `docs/mvp-priority-map.md` para trilhas e `docs/platform-module-registry.md` para maturidade por módulo. Nenhuma integração externa (OlaClick, AiPede, Google Calendar, WhatsApp), nenhuma IA real, nenhum SQL, nenhuma migration, nenhum dado real alterado.

## Nota — Sprint Meu Negócio 2.1.2 (camada estratégica)

`src/lib/business-strategy/` restaura e amplia a camada estratégica de
Meu Negócio (DNA, 8Ps LOKAT, SWOT/FOFA, concorrência, posicionamento,
metas, sazonalidade, qualidade dos dados) dentro do Centro de Comando real
— ver `docs/meu-negocio/business-dna-restoration.md`,
`docs/meu-negocio/lokat-8ps-framework.md`,
`docs/meu-negocio/swot-fofa-model.md`,
`docs/meu-negocio/competitor-analysis-model.md` e
`docs/meu-negocio/living-business-manual.md`. Reaproveita `DataConfidence`
do Data Hub desta mesma sprint (Core 2.1) para a escala de confiança —
não é um segundo sistema de proveniência.

## Nota — Sprint Recovery 2.1.3 (padronização de QA, status e CRM adaptativo)

Três adições sem alterar a arquitetura de plataforma existente:

1. `src/config/local-qa.ts` + `scripts/qa-*.ts` — padrão único de QA local
   (porta 3100 oficial, 3200 Production local, 3000 nunca QA). Ver
   `docs/development/local-qa-standard.md`.
2. `src/config/delivery-status.ts` — camada de execução (prioridade,
   prazo, bloqueio de release, estágios de validação) sobre
   `project-status.ts`, sem alterar `readiness`/`V1_PROGRESS`/
   `V2_PROGRESS`. Ver `docs/roadmap/august-2026-mvp-recovery.md` e
   `docs/status/progress-recalibration-method.md`.
3. `src/lib/crm-adaptive/` — arquitetura futura do CRM adaptativo
   (núcleo universal, superfícies, nichos, follow-up, temperatura,
   dashboards, IA) como contratos puros, mesmo padrão de
   `src/lib/messaging/types.ts`/`src/lib/fiscal/types.ts` da Core 2.1.
   **Não implementado** — ver `docs/crm/`.
