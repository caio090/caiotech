# Mapa do Cliente — Sprint REC OS 3.0.1

**Estado: `planned`.** Nenhuma tela nova implementada nesta sprint — mesma
priorização de `production-roadmap.md` (fixes mobile P0 primeiro, por
terem evidência real de defeito).

## Isolamento já garantido pela arquitetura existente

Quando implementado, o Mapa do Cliente deve reaproveitar exatamente o
isolamento já existente e testado em `docs/workspace-visibility-matrix.md`:
Agência alterna só entre seus próprios clientes; Cliente da Agência vê só
o próprio workspace; Empresa Direta vê só o próprio negócio; Super Admin
só via preview somente leitura (`resolveWorkspacePreview`). Nenhuma
autorização nova precisa ser criada — a página é uma nova SUPERFÍCIE de
apresentação sobre dados já isolados corretamente.

## Dados a agregar (fontes reais já existentes)

Campanhas e conteúdos (`content_items`), aprovações (`approvals`),
calendário (`GlobalCalendarEvent`, `src/lib/global-calendar.ts`),
responsáveis e bloqueios (`operational_tasks`). Nenhuma tabela nova.

## Próximos passos

Implementar como uma visão de leitura agregada por `client_id`, sempre
atrás do mesmo filtro de workspace já usado em
`src/app/api/admin/workspaces/route.ts` — nunca uma consulta direta sem
esse filtro.
