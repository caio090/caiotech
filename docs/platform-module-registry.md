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

## Nota — Sprint Recovery 2.1.3 (CRM adaptativo no registry)

O módulo `crm` existente em `platform-modules.ts` foi atualizado para
registrar núcleo universal, superfícies, capacidades, adaptação por
nicho, dependências, maturidade, bloqueios, prioridade e próxima etapa da
evolução adaptativa — sem declará-la implementada. O CRM real hoje
continua sendo só leads/funil/oportunidades (maturidade inalterada).

## Nota — Sprint REC OS 3.0.1 (nomenclatura Relatórios)

O rótulo visível "Relatórios" foi padronizado em toda a UI — 3 ocorrências
reais ainda diziam "Dados & Insights"/"Dados e Insights"
(`src/components/app-sidebar.tsx`, `src/app/admin/relatorios/page.tsx`,
`src/app/admin/relatorios/conteudo/page.tsx`), corrigidas nesta sprint.
"Resultados" do REC OS (desempenho de conteúdo/campanha) não foi
renomeado — é um conceito diferente.

## Nota — Sprint REC OS 3.0.1.1

Nenhuma mudança de nomenclatura adicional. Roadmap de Produção e Mapa do
Cliente (módulos REC OS já registrados na 3.0.1) avançaram de `planned`
para `qa_pending` — ver `src/config/project-status.ts` e
`docs/rec-os/known-gaps-closure-3.0.1.1.md`.

## Nota — Sprint Navegação e Experiência 3.0.1.2

"Ecossistema" deixa de ser um módulo operacional independente na
navegação principal -- passa a ser um alias/conceito técnico, subordinado
a Status ("Arquitetura da Plataforma"). "Meu Escritório" registrado como
subexperiência operacional por workspace. "CRM" permanece um módulo
canônico único (/admin/leads, com /admin/crm como alias) -- adaptação
completa por superfície continua fora do escopo (crm_workspace_context:
planned).
