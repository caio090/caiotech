# Registry de Módulos — `src/config/platform-modules.ts`

`PlatformModuleDefinition` descreve o que existe HOJE na branch `feat/lokat-core-platform-map-v1` — não uma aspiração. `maturity` é observado no código, nunca declarado "production" sem servir Production de fato.

## Categorias

`core | management | commercial | operations | communication | intelligence | integrations | platform`

## Maturidade

`production | qa_pending | preview | planned | blocked | experimental`

Não confundir com `readiness` de `src/config/project-status.ts` (dimensão de release/QA formal). Um módulo pode ter maturidade "preview" (arquitetura pronta, sem dado real) e ainda assim ter uma entrada `readiness: "qa_pending"` no project-status — são eixos diferentes.

## Módulos mapeados nesta sprint

| Módulo | Rota | Maturidade | Observação |
|---|---|---|---|
| Workspaces (núcleo) | `/admin/visualizar` | qa_pending | Base de autorização para todos os outros. |
| Super Admin | `/admin/super/*` | production | |
| Meu Negócio | `/admin/meu-negocio` | preview | 100% em memória (fixtures Motor LOKAT), sem Supabase. |
| REC OS | `/admin/contentos`, `/admin/rec-os` | production | Ver ambiguidade de nome abaixo. |
| REC (Audiovisual) | `/admin/recos` | qa_pending | Distinto de REC OS apesar do nome. |
| CRM (Leads e Clientes) | `/admin/leads`, `/admin/clientes` | production | |
| Financeiro | `/admin/financeiro` | experimental | Sem modelo de dado real conectado. |
| Calendário Global | `/admin/calendario` | qa_pending | `GlobalCalendarEvent` real, agregando 3 tabelas. |
| Relatórios | `/admin/relatorios` | qa_pending | Sem modelo único de dado ainda. |
| Fontes de Dados | `/admin/fontes-dados` | preview | |
| Conexões | `/admin/conexoes` | qa_pending | |
| WhatsApp | `/admin/whatsapp` | planned | Só roadmap/placeholder. |
| Equipe | `/admin/equipe` | production | |
| Operacional | `/admin/operacional` | preview | |
| Diagnósticos | `/admin/diagnosticos` | production | |
| Configurações | `/admin/configuracoes` | production | |
| Status | `/admin/status` | production | |

## Ambiguidade de nome documentada (não corrigida nesta sprint)

Três/quatro áreas distintas compartilham nomes parecidos:

1. **REC OS** (`/admin/contentos`) — produção de conteúdo, o nome público oficial.
2. **`/admin/recos`** (Audiovisual) — dashboard de projetos de vídeo, tabela `rec_projects`.
3. **`/admin/rec` + `/admin/rec/videos`** — "Lokat.rec", uma plataforma de vídeo separada.

Ver `docs/DECISIONS.md` e `docs/architecture/REC_OS_INFORMATION_ARCHITECTURE.md`. Nenhuma rota foi renomeada nesta sprint — apenas registrada com a distinção explícita no registry.

## Integridade do registry

`findMissingDependencies()` e `findDependencyCycles()` (ambos em `platform-modules.ts`) são a base dos testes de integridade (Fase 41, itens 1-8).

## Nota — Sprint Meu Negócio 2.1.2

A descrição do módulo `meu_negocio` foi atualizada para citar a nova área
"DNA & Estratégia" (entre Visão geral e Financeiro no Centro de Comando
real). Nenhum módulo de plataforma novo foi criado para isso — DNA e
estratégia são parte do módulo `meu_negocio` existente, não um módulo
"Motor LOKAT" concorrente (Motor LOKAT continua sendo um mecanismo/badge
interno, não uma entrada própria no registry).
