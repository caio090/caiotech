# Sprint QA Fix 3.0.2.5 — achados do primeiro QA autenticado completo

## Contexto

Run `31328853644` (job `93283675903`) foi a primeira execução do
workflow "LOKAT OS Local E2E QA" a completar `auth-setup` com sucesso
(Chrome, login, Super Admin, `storageState` — ver
`docs/qa/incidents/ci-e2e-auth-selector-001.md`). 190 testes descobertos,
166 executados, 121 passed, 45 failed, 24 skipped. 0 P0. Esta sprint
corrige exclusivamente os P1/P2 comprovados, auditando e reproduzindo
cada um antes de editar (Fase 2 do brief), sem acesso ao trace/log bruto
da run (sem `gh` CLI neste ambiente) — a reprodução foi feita por
auditoria de código, execução local dos testes puros/estruturais
afetados, e por leitura cuidadosa do DOM real de cada tela envolvida.

## Classificação e correções

### PRODUCT_FIX confirmado

**Roadmap: divergência de contagem entre Quadro/Lista/Linha do
tempo/Calendário (P2).**

Causa raiz: `kanbanColumnForStatus()` (`src/lib/rec-os-roadmap.ts`)
procurava o status diretamente em `KANBAN_COLUMNS[].statuses`, sem
resolver aliases legados antes — ao contrário de `resolveMacroStage()`
(`src/lib/rec-os-workflow/types.ts`), que já resolve
`REC_OS_STATUS_ALIASES` (`ajuste` → `alteracao_solicitada`) desde a
Sprint REC OS 3.0.1.1. `ajuste` é um status real e ativo (usado em
`src/app/admin/contentos/producao/page.tsx`, `src/lib/rec-os-hub.ts`,
`src/lib/operational-tasks.ts`, entre outros). Todo item com esse status
era silenciosamente omitido do Quadro (`groupRoadmapItemsByKanbanColumn`
só empurra o item para uma coluna `if (col)`), enquanto Lista, Linha do
tempo e Calendário continuavam contando normalmente — daí a contagem
divergente relatada.

Correção: `kanbanColumnForStatus()` agora resolve
`REC_OS_STATUS_ALIASES[status] ?? status` antes de procurar a coluna,
igual a `resolveMacroStage()`. Item com `status: "ajuste"` cai na coluna
Aprovar, junto de `alteracao_solicitada`/`reprovado` — mesma macroetapa,
nunca um status novo inventado. Coberto por 3 novos casos em
`src/lib/__tests__/rec-os-roadmap.test.ts` (28/28 passou).

### HARNESS_EXPECTATION_UPDATE confirmados

**REC OS overflow estrutural (criar/produção/roadmap/mapa-cliente, P1) e
overflow em Status/Arquitetura (P2).**

Causa raiz: `tests/e2e/helpers/overflow.ts` já documentava a intenção de
ignorar "containers com overflow-x próprio (carrossel/roadmap
kanban/etc.)", mas a isenção só pulava o PRÓPRIO elemento com
`overflow-x:auto/scroll` — nunca seus descendentes. Todo scroller
intencional do produto (`roadmap-kanban` em
`_roadmap-client.tsx`, o subnav do REC OS em `_contentos-subnav.tsx`
— usado em criar/produção/roadmap/mapa-cliente e também em
aprovacoes/radar/resultados/home/hub —, os filtros em pílula de
`_status-client.tsx` e a barra de abas de `_ecosystem-client.tsx`) tem
filhos cuja bounding box escapa da viewport por design — é para isso que
o scroll horizontal existe — mas cada filho era relatado individualmente
como falso positivo.

Correção: `findOverflow()` agora também ignora qualquer elemento que
tenha um ANCESTRAL com `overflow-x:auto/scroll`, não só o container em
si. Nenhum código de produto foi alterado — os scrollers já eram a
implementação correta e intencional.

**Workspace Preview: banner/somente-leitura não confirmado para
Agência/Empresa direta (P1).**

Causa raiz: `enterPreview()` (`tests/e2e/workspace-preview.spec.ts`)
verificava a presença do botão "Blueprint" com `.count()` logo após
clicar na superfície, sem esperar a resposta assíncrona de
`/api/admin/workspaces?source=blueprint`. Confirmado por auditoria de
`src/app/api/admin/workspaces/route.ts`: o modo `source=blueprint` nunca
depende de service role key e nunca consulta o Supabase (retorna
fixtures estáticas) — ou seja, não é uma limitação de ambiente/CI, é
puramente uma corrida entre o `fetch()` do componente e o `.count()`
do teste, que não espera. Em qualquer CI com latência de rede real (por
menor que seja), a checagem podia rodar antes do estado assíncrono
atualizar, saindo do loop prematuramente.

Correção: `enterPreview()` agora usa
`blueprintOption.waitFor({ state: "visible", timeout: 8000 })` antes de
decidir se há mais uma etapa na cadeia, em vez de `.count()` imediato.

**CRM mobile: tabela desktop/cards (P1).**

Causa raiz: `<CrmMobileLeadList>` (`src/app/admin/leads/page.tsx`) só
renderiza quando `filtered.length > 0` — por design, correto: sem leads
não há cards para desenhar. A conta E2E isolada não tem lead real
(confirmado desde a Sprint E2E CI 3.0.2.2: "sem cliente, sem agência,
sem billing, sem dado comercial real"), então cai no estado vazio (`"Nenhum
lead para este filtro."`). O teste
(`tests/e2e/crm-mobile.spec.ts`) já tinha um comentário de cabeçalho
prevendo exatamente esse caso ("a conta E2E pode não ter nenhum lead
real"), mas o corpo do teste exigia incondicionalmente
`crm-mobile-lead-list` visível, sem alternativa para o estado vazio.

Correção: adicionado `data-testid="crm-leads-empty-state"` ao bloco de
estado vazio existente (aditivo, nenhuma mudança visual/comportamental).
O teste agora aceita `crm-mobile-lead-list` OU `crm-leads-empty-state`
OU `crm-unavailable-banner` (o banner de indisponibilidade já existente)
— nunca a tabela desktop, que continua corretamente oculta via `hidden
md:block`.

### Não confirmados por auditoria estática — próxima ação necessária

**Meu Escritório não renderiza os elementos esperados (P1).**

Auditoria completa de `src/app/admin/escritorio/page.tsx`,
`_escritorio-client.tsx`, `src/lib/business-office/data.ts` e
`types.ts` não encontrou nenhum defeito: todos os `data-testid`/textos
exigidos por `tests/e2e/business-office.spec.ts` existem exatamente como
escrito no componente, a busca de dados usa `Promise.allSettled` (nunca
propaga exceção de uma fonte para travar as outras) e todo `href` de
`office-feed-item` é construído internamente, sempre começando com
`/admin/`. Diferente da conta E2E, o Super Admin sem `?client=` na URL
agrega dados de TODOS os clientes reais da plataforma (não há filtro por
padrão) — isso não quebrou nada no código auditado, mas significa que a
consulta real no CI processa dados de produção genuínos, não só os da
conta isolada. Sem o trace/screenshot da run (sem `gh` CLI neste
ambiente) não foi possível confirmar qual asserção específica falhou.
Nenhuma alteração foi feita neste módulo nesta sprint — recomenda-se
obter o resultado detalhado desta run (Codex Web ou outra ferramenta com
acesso ao GitHub) antes de qualquer correção especulativa.

**Pipeline comercial não confirmado dentro do CRM canônico (P2).**

Auditoria de `src/app/admin/leads/page.tsx` confirma que o texto exato
"Pipeline comercial" (linha ~645) está sempre presente no JSX, fora de
qualquer condicional de carregamento/erro/estado de dados —
`tests/e2e/crm-canonical.spec.ts` deveria encontrá-lo em qualquer estado
da página. Nenhum defeito foi encontrado. Mesma limitação do item
anterior: sem o trace da run, não é possível confirmar a causa exata.
Nenhuma alteração foi feita.

## Validação local

`npx tsc --noEmit --skipLibCheck` (limpo, repetido a cada edição),
`npm run check:workspace-mutations` (42 rotas, 0 falhas), ESLint (0
erros/avisos nos arquivos alterados), `node .tmp/run-ts-test.cjs
src/lib/__tests__/rec-os-roadmap.test.ts` (28/28, incluindo os 3 novos
casos do fix de alias) e `node .tmp/run-ts-test.cjs
src/app/admin/leads/__tests__/crm-canonical.structural.test.ts` (19/19,
sem regressão do novo `data-testid`) — todos passaram limpos.

`npm run qa:doctor`/`qa:smoke` **não puderam ser confirmados nesta
sprint**: o servidor local de QA (`npm run dev:qa`) sofreu o mesmo
crash de memória já registrado nas hotfixes anteriores
(`Assertion failed`/access violation, `exit=3221226505`) em 3 tentativas
consecutivas, sempre durante a primeira compilação de `/` — memória
virtual livre chegou a cair para ~670MB durante a sessão. Isso é uma
condição do ambiente local (não causada por nenhuma mudança desta
sprint — nenhum arquivo de configuração de build/dev foi tocado) e não
foi tratada como defeito de produto, seguindo a mesma orientação já
registrada nas hotfixes E2E CI 3.0.2.3/3.0.2.4.

## O que NÃO foi feito nesta sprint

- Nenhuma feature nova.
- Nenhuma alteração em `main`, nenhum PR, nenhum merge, nenhuma Production.
- Nenhuma correção especulativa sem evidência de código para Meu
  Escritório ou Pipeline comercial — preferiu-se documentar a limitação
  a arriscar uma mudança de produto não verificável.
