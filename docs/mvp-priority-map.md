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
