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
