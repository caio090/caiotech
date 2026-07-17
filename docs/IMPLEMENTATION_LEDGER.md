# Implementation Ledger

Formato append-only para continuidade entre agentes.

## 2026-07-17

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
