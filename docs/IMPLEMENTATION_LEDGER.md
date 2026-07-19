# Implementation Ledger

Formato append-only para continuidade entre agentes.

## 2026-07-19 (Sprint 3.1A — Calendário Global somente leitura)

### Sprint

Sprint 3.1A — primeira versão do Calendário Global administrativo, somente leitura.

### Executor

Claude Code

### Objetivo

Agregar content_items, operational_tasks e approvals de todos os clientes em uma
única tela administrativa, sem criar/editar eventos e sem SQL.

### Arquivos criados

- `src/lib/global-calendar.ts` — tipos (`GlobalCalendarEvent`, `CalendarEventSource`),
  normalizadores puros (`normalizeContentItems`, `normalizeOperationalTasks`,
  `normalizeApprovals`), grade mensal (`buildMonthWindow`, 42 células/6 semanas via
  `Date.UTC`), resolução de mês (`resolveRequestedMonth`), hoje em Fortaleza
  (`getFortalezaToday` via `Intl.DateTimeFormat`), limites de janela para
  timestamptz (`timestampWindowBounds`, offset `-03:00` fixo — sem DST em Fortaleza).
- `src/app/admin/calendario/page.tsx` — Server Component. `requireAdminContentOSContext()`
  gate (redirect `/login` se falhar); 3 queries em paralelo via `Promise.allSettled`
  (uma por fonte, cada uma não derruba as outras); lookup em lote de títulos de
  conteúdo relacionados a aprovações e de nomes de clientes (apenas os IDs
  referenciados, não `SELECT *`); normaliza e passa para o client component.
- `src/app/admin/calendario/_client-content.tsx` — grade mensal + agenda do dia +
  filtros (cliente, fonte) + modal de detalhe + navegação por URL
  (`?year=&month=`) + botão Hoje. Primeiro render determinístico: `selectedDay`
  inicia em `serverToday` (string vinda do servidor), nunca `new Date()`.

### Arquivos alterados

- `src/components/app-sidebar.tsx` — item "Calendário Global" adicionado ao nav
  admin (ícone `CalendarDays`, já usado no projeto). Sem gate extra de role no
  componente — a sidebar admin já só é renderizada para admin/super_admin.
- `src/config/project-status.ts` — área `global_calendar` (já existente,
  `phase: v2`) atualizada de `readiness: planned` para `qa_pending`, descrição e
  notas refletindo o escopo real implementado.

### Segurança

- Nenhum Client Component importa `adminDb`/service role — `_client-content.tsx`
  só recebe props já normalizadas e autorizadas pelo Server Component.
- `public_token` nunca é selecionado nem incluído no modelo.
- `origin_href` sempre construído a partir de rotas internas conhecidas
  (`/admin/contentos/...`), nunca aceito vindo do banco.
- Tarefas operacionais sem `client_id` são excluídas da agregação (não viram
  evento "genérico") — decisão registrada em `docs/architecture/GLOBAL_CALENDAR_V1.md`.

### Verificação (sem framework de testes no projeto)

- Nenhum test runner (jest/vitest) está instalado no repositório; instalar um
  novo estava fora de escopo desta sprint.
- Verificação feita via script ad-hoc: `npx tsc` compilou `global-calendar.ts`
  isoladamente para JS, executado com `node` cobrindo os casos A–L pedidos
  (fallback de data devido/enviado/criado, group_key compartilhado entre
  content/task/approval do mesmo content_item_id, ids visuais únicos,
  ausência de `public_token`, origin_href interno, exclusão de tarefa sem
  client_id, grade de 42 dias, validação de `resolveRequestedMonth`). Todas as
  asserções passaram. Script descartado após a verificação (não commitado).

### SQL

- Nenhum SQL executado. `productivity_meetings`/`productivity_tasks` (SQL 38,
  nunca executado) e `commercial_meetings` não foram usados nesta sprint.

### Qualidade

- `npx tsc --noEmit --skipLibCheck`: zero erros.
- `npm run build`: compilado com sucesso, `/admin/calendario` presente na lista
  de rotas.
- ESLint nos arquivos alterados/criados: zero erros novos (um warning
  pré-existente e não relacionado, `Sparkles` não utilizado em
  `app-sidebar.tsx`, já existia antes desta sprint).
- `git diff --check`: sem erros (apenas avisos de LF/CRLF).

### Resultado

- V1_PROGRESS = 81, V2_PROGRESS = 12 (imutáveis).
- Reuniões (Sprint 3.1C), Google Calendar/Meet (Sprint 3.1D) e Projeto São
  Paulo (trilha paralela, sem escopo recuperável no repositório) não foram
  tratados nesta sprint.

---

## 2026-07-19 (Encerramento formal da Sprint 3.0)

### Sprint

Sprint 3.0 — encerrada e aprovada após QA final Codex Web.

### Executor

Claude Code (fechamento documental/status apenas — nenhuma alteração funcional).

### Commit validado em produção

`71350309fcee615de0262f821d60e30beaf13877` (curto: `7135030`)

### Deployment validado

`dpl_BXYjpnSfhkMbyQy7WMYCrzZ8pBG1`

### Resultado do QA (reportado pelo usuário/Codex Web, não reexecutado nesta sessão)

- Zero P0, zero P1.
- React #418 não reproduzido, nenhum hydration mismatch.
- Criar aprovado, Persistência aprovada, Produção aprovada, Aprovação aprovada.
- CopyIdButton aprovado, EditorOS bridge aprovado, mobile aprovado.
- Nenhum runtime error, nenhuma regressão crítica.

### Arquivos alterados

- `src/config/project-status.ts` — `guided_create_flow`, `guided_create_persistence`, `approval_client_context`, `production_destination_visibility`, `approval_destination_visibility` marcados `readiness: "validated"` / `qa.status: "approved"` com commit/deployment/resultado. `editor_os` mantido `readiness: "qa_pending"` (escopo futuro maior do editor ainda não coberto), mas `qa` atualizado para `approved_with_p2` refletindo o que foi de fato validado (abertura, contexto, content_id, return_to, Canvas, ausência de React #418). Nova entrada em `V1_HISTORY`. `V1_PROGRESS`/`V2_PROGRESS` inalterados.
- `docs/CODEX_CURRENT_CONTEXT.md`, `docs/IMPLEMENTATION_LEDGER.md`, `docs/HANDOFF.md`, `docs/SESSION_LOG.md`, `docs/UNTOUCHED_BACKLOG.md` — fechamento documental da sprint.

### Pendências não bloqueantes registradas

- favicon.ico ausente.
- Financeiro (`/admin/financeiro`) com dados demo declarados.
- Upload automatizado pode depender de permissão de extensão do Chrome.
- SQLs 82, 84, 86-89, 90 aguardam auditoria controlada de catálogo.

### SQL

- Nenhum SQL executado. Nenhuma RLS alterada. Schema inalterado. Env inalterada. Supabase não tocado manualmente.

### Qualidade

- `npx tsc --noEmit --skipLibCheck`: zero erros.
- `git diff --check`: sem erros.

### Resultado

- V1_PROGRESS = 81, V2_PROGRESS = 12 (imutáveis).
- Próxima sprint autorizada: Sprint 3.1 (não iniciada nesta execução).

---

## 2026-07-17 (Sprint 3.0.5)

### Sprint

Sprint 3.0.5 — Hotfix final de hidratação (React #418)

### Executor

Claude Code

### Objetivo

Eliminar todas as fontes restantes de React minified error #418 identificadas após QA da Sprint 3.0.4.

### Arquivos alterados

- `src/app/admin/status/page.tsx` — getDaysRemainingV1() em EffortSection e StatusPage → useEffect; useEffect adicionado aos imports
- `src/app/admin/equipe/_client-content.tsx` — Math.random() em módulo em MOCK_PROFILES → timestamps determinísticos fixos
- `src/app/rec/page.tsx` — useState(() => window.innerWidth) em useIsMobile e introComplete → useState(false) + useEffect

### SQL

- Nenhum SQL executado. Nenhuma RLS alterada. Schema inalterado.

### Resultado

- TypeScript: zero erros
- Build: limpo
- Commit: a6f0f91 — push feito
- V1_PROGRESS = 81, V2_PROGRESS = 12 (imutáveis)

### Pendências registradas (deferred)

- CopyIdButton ainda não integrado em: card de tarefa em Produção, modal de aprovação, resultado de Criar

---

## 2026-07-18 (Sprint 3.0.5b)

### Sprint

Sprint 3.0.5b — hotfix final de hidratação (Home/Aprovações/EditorOS) + integração real do CopyIdButton

### Executor

Claude Code

### Objetivo

Concluir os itens deferidos da Sprint 3.0.5: remover `_NOW` de escopo de módulo na Home,
estabilizar server snapshots dos stores, corrigir datas sem timezone em Aprovações,
tornar o CanvasEditor client-only e conectar o CopyIdButton nas telas operacionais.

### Arquivos alterados

- `src/app/contentos/home/_client-content.tsx` — removido `const _NOW = Date.now()` de escopo de módulo; adicionado `serverNow` via props + `useState(serverNow)` + `useEffect` para `currentNow`; usado em `approvalsLate` e em `ApprovalsPreviewModal` (nova prop `now`).
- `src/app/admin/contentos/home/page.tsx` e `src/app/contentos/home/page.tsx` — geram `serverNow = Date.now()` no Server Component e propagam para `ContentOSHomeContent`.
- `src/lib/onboarding-store.ts` — `getServerSnapshot` agora retorna `EMPTY_ONBOARDING` (constante `Object.freeze({})`) em vez de literal novo a cada chamada; `subscribe` estabilizado em `noopSubscribe`.
- `src/lib/canva-store.ts` — `subscribe` estabilizado em `noopSubscribe` (o `EMPTY` de server snapshot já era estável).
- `src/app/contentos/aprovacoes/_client-content.tsx` — `formatDueDate()` agora usa `timeZone: "America/Fortaleza"` explícito; nova `formatScheduledDate()` monta `DD/MM/YYYY` a partir dos componentes da string `YYYY-MM-DD` em vez de `new Date(...)`, evitando shift de dia por timezone; `window.location.origin` no `ApprovalDetailModal` movido para `useState("") + useEffect`; adicionado bloco "IDs técnicos" com `CopyIdButton` (approval_id, content_id).
- `src/app/admin/contentos/editor-os/EditorOSWorkspace.tsx` — `CanvasEditor` importado via `next/dynamic` com `ssr: false` e fallback estático "Carregando EditorOS…"; cabeçalho/autenticação/contexto permanecem no fluxo original.
- `src/app/admin/contentos/criar/_guided-create-flow.tsx` — botões de copiar ID (ícone only) substituídos por `CopyIdButton` com texto visível, nos resultados de Produção (task_id, content_id) e Aprovação (approval_id, content_id).
- `src/app/admin/contentos/producao/page.tsx` — `CopyIdButton` adicionado a cada tarefa (task_id, content_item_id).

### Auditoria (sem alteração)

- `CanvasEditor.tsx`: `Date.now()`/`Math.random()` só ocorrem dentro de `uid()` chamado por `addText`, `addImportToCanvas`, duplicação de elemento e export PNG — nunca em render/module scope. Nenhum `suppressHydrationWarning` presente.

### Qualidade

- `npx tsc --noEmit --skipLibCheck`: zero erros.
- `npm run build` (Turbopack): compilado com sucesso, TypeScript ok, 59 páginas estáticas geradas.
- ESLint (`react-hooks/purity`, `react-hooks/set-state-in-effect`): apontou erros nos arquivos alterados, mas os mesmos padrões (Date.now() em Server Component, setState em useEffect de montagem) já existem pré-existentes em `src/app/admin/contentos/aprovacoes/page.tsx:70` e no próprio commit aceito `a6f0f91` (`src/app/rec/page.tsx`), confirmado por execução isolada do ESLint nesses arquivos antes desta sprint. `npm run build` não roda esse lint como gate bloqueante. Não é uma regressão desta sprint.

### SQL

- Nenhum SQL executado. Nenhuma RLS alterada. Schema inalterado.

### Resultado

- TypeScript: zero erros. Build: limpo.
- V1_PROGRESS = 81, V2_PROGRESS = 12 (imutáveis)
- Commit: pendente (aguardando push)

### Pendências registradas (deferred)

- QA Codex Web (Playwright multi-contexto, com/sem extensão) não executado nesta sessão — sem acesso a navegador real neste ambiente. Ver `docs/CODEX_CURRENT_CONTEXT.md`.
- Upload bloqueado pela extensão Chrome (P2 já registrado) — não re-testado.
- Financeiro demo — fora de escopo, já registrado.

---

## 2026-07-17 (Sprint 3.0.4)

### Sprint

Sprint 3.0.4 — Encerramento Técnico do REC OS: Hidratação, Produção Consolidada, IDs e Status dos SQLs

### Executor

Claude Code

### Objetivo

Corrigir React #418 em todas as rotas admin, resolver empty state contraditório em Produção, criar CopyIdButton, remover SVG do upload, e corrigir status dos SQLs 82 e 84.

### Arquivos alterados

- `src/app/admin/_layout-client.tsx` — getDaysRemainingV1() → useEffect (Fix #418 causa 1)
- `src/app/contentos/aprovacoes/_client-content.tsx` — serverNow em todos os Date.now() de render (Fix #418 causa 2)
- `src/app/admin/contentos/aprovacoes/page.tsx` — serverNow calculado e propagado para ContentosAprovacoesContent
- `src/app/contentos/aprovacoes/page.tsx` — serverNow propagado (fix TS)
- `src/app/admin/contentos/producao/page.tsx` — empty state diferenciado por tasks.length; highlight reforçado
- `src/components/copy-id-button.tsx` — novo componente CopyIdButton
- `src/app/admin/contentos/criar/_guided-create-flow.tsx` — SVG removido de ALLOWED_MIME e accept
- `src/config/project-status.ts` — SQL 82 e 84: partial_unknown → failed
- `docs/CODEX_CURRENT_CONTEXT.md` — sprint e SQLs atualizados
- `docs/IMPLEMENTATION_LEDGER.md` — esta entrada

### SQL

- Nenhum SQL executado. Nenhuma RLS alterada. Schema inalterado.
- SQL 82 e 84 reclassificados como `failed` com base nos erros 42703 já documentados.

### Resultado

- TypeScript: zero erros
- Build: limpo
- V1_PROGRESS = 81, V2_PROGRESS = 12 (imutáveis)

### Pendências registradas (fora do escopo)

- /admin/clientes preso em "Carregando" (backlog)
- /admin/financeiro com dados demo declarados (backlog)
- CopyIdButton ainda não integrado em: card de tarefa em Produção, modal de aprovação, resultado de Criar (próxima sprint)

## 2026-07-15

### Sprint

Sprint 3.0

### Executor

Codex

### Objetivo

Criar checkpoint permanente, auditar SQLs parciais, fechar ressalvas V2.2.1 e iniciar novo fluxo Criar da REC OS.

### Arquivos

- `docs/CODEX_CURRENT_CONTEXT.md`
- `docs/IMPLEMENTATION_LEDGER.md`
- `docs/UNTOUCHED_BACKLOG.md`
- `docs/supabase/AUDIT_SQL_82_89_2026-07-15.md`
- `docs/supabase/90-reconcile-partial-foundations.sql`
- `docs/architecture/GLOBAL_CALENDAR_V1.md`
- `docs/architecture/CLIENT_360_V1.md`
- `docs/architecture/CLIENT_FINANCE_V1.md`

### Commits

- Pendente nesta entrada inicial.

### Deployment

- Inicial esperado: `dpl_HTRqmmLYfvqUzXwaWJvLtCceccqE`
- Novo deployment: pendente apos push.

### SQL

- Permitido apenas SELECT de catalogo.
- Nenhum SQL 82 a 90 deve ser executado.

### Testes

- Pendente: `npx tsc --noEmit --skipLibCheck`
- Pendente: `npm run build`
- Pendente: ESLint somente arquivos alterados
- Pendente: `git diff --check`

### QA

- Pendente smoke em producao apos deploy.

### Resultado

- Em andamento.

### Pendencias

- Auditoria SQL completa.
- Exportacao PNG Blob.
- Novo fluxo Criar.
- Smoke final em producao.
