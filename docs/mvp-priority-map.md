# Prioridades do MVP — LOKAT OS

Nenhuma trilha abaixo foi implementada nesta sprint (LOKAT Core 2.1) — é fundação (registries, tipos, contratos, uma página demonstrativa). Implementação de trilha é trabalho de sprints futuras.

## Trilha 0 — Fundação
Workspaces, permissões, preview, segurança, arquivos, auditoria.

## Trilha 1 — Operação essencial
Assistente LOKAT, Calendário Global, REC OS operacional, WhatsApp, Relatórios.

## Trilha 2 — Gestão comercial
Produtos, Estoque, Precificação, Campanhas comerciais, Financeiro, Conciliação.

## Trilha 3 — Nichos
Alimentação, Materiais de construção, Agências, Construção civil.

## Trilha 4 — Ecossistema externo
Fiscal, Bancos, Gateways, PDVs, Cardápios, Contabilidade.

## Sequência posterior (fora desta sprint)

```
QA local → refinamento → integração controlada com Workspaces → merge na main → push main → Production → validação em www.lokat.com.br
```

## Nota — Sprint Recovery 2.1.3 (prioridade formal por área)

`src/config/project-status.ts` e `src/config/delivery-status.ts`
formalizaram as trilhas acima em prioridades por área
(`priority: "P0" | "P1" | "P2" | "P3"`), com prazo (`targetDate`), estado
de entrega derivado (`resolveDeliveryStatus()`) e estágios de validação
obrigatórios (`MODULE_VALIDATION_REQUIREMENTS`). Ver
`docs/roadmap/august-2026-mvp-recovery.md` para o plano de recuperação com
checkpoints de 01 a 07 de agosto de 2026. CRM adaptativo (Trilha 4 futura)
está documentado em `docs/crm/` — nenhuma implementação nova nesta sprint.

## Nota — Sprint REC OS 3.0.1

`mobile_app_shell`, `mobile_bottom_navigation` e `crm_mobile_experience`
entraram como P0 (defeitos reais confirmados por print do usuário, não
refinamento cosmético). `rec_os_canonical_creation_flow`,
`rec_os_briefing_concept_workspace`, `rec_os_finalization_workspace`,
`rec_os_roadmap`, `rec_os_editor_handoff`,
`editor_os_layer_scanner_integration`, `crm_mobile_filters`,
`business_diagnostic_gateway` e `visible_reports_naming` entraram como P1.
Ver `src/config/project-status.ts`.

## Nota — Sprint E2E CI 3.0.2.2

`e2e_ci_infrastructure`, `e2e_super_admin_identity`,
`authenticated_browser_qa`, `mobile_browser_qa` e
`workspace_preview_browser_qa` entraram como P1 (infraestrutura de QA
autenticado real, resolvendo o BLOCKER_LOCAL_AUTH_FIXTURE_UNAVAILABLE da
sprint anterior via uma conta E2E dedicada e GitHub Actions).
`official_remote_qa` (um ambiente remoto fixo distinto do CI efêmero)
permanece P2/planned. Ver `src/config/project-status.ts`.
