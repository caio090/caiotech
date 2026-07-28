# Session Log

Registro cronologico das sessoes de trabalho no Lokat OS.

## 2026-06-29

- Verificado que `package.json` e `package-lock.json` nao tinham diff antes da nova alteracao.
- Corrigido `POST /api/admin/clients` para priorizar a RPC `admin_create_client`, detectar RPC ausente/assinatura divergente e retornar diagnostico seguro com `step`, role, service role e erro Supabase sem vazar secrets.
- Mantido o fallback por service role apenas server-side; a tela `/admin/clientes` continua chamando somente `POST /api/admin/clients`.
- Ajustado `DELETE /api/admin/clients/[id]` para arquivar por padrao e permitir hard delete via `?mode=hard` somente para `super_admin`.
- Criadas rotas `POST /api/admin/clients/bulk-delete` e `GET /api/admin/clients/cleanup`.
- Criado `docs/supabase/53-client-admin-cleanup-tools.sql` com RPCs de listagem de candidatos, arquivamento em massa e hard delete controlado.
- Atualizada a tela `/admin/clientes` com segmentos revisados, modo "Selecionar clientes", acoes em massa, botoes textuais nos cards e painel "Limpeza".
- O painel de limpeza nao pre-seleciona nenhum cliente; Duh Lanches deve ser preservado e revisado manualmente.
- Pastas locais de midia (`docs/imagens-hero/`, `docs/videosweb-lokat-os/`, `imagens-hero/`, `rec-videos/`) permanecem nao rastreadas e fora do commit.
- Validado `npx tsc --noEmit`.
- Validado `$env:TURBOPACK='0'; npm run build`.
- Validado `git diff --check`.

- Corrigida a regra de exclusao/listagem de clientes: visiveis apenas `active` e `onboarding`; soft-deleted (`deleted_at`/`archived_at`) ficam invisiveis.
- Criado helper central `src/lib/client-visibility.ts`.
- Ajustadas listagens e seletores de clientes em admin, ContentOS, OlaClick, Kanban, Diagnosticos, Plataforma, RecOS criar e portal cliente.
- Ajustado delete para tentar RPC `admin_delete_client` e manter fallbacks server-side de soft delete.
- Criado `docs/supabase/52-client-delete-and-cleanup.sql` com RPC, indices, view filtrada e limpeza manual comentada.
- Atualizado SQL 51 para nao criar cliente com status `inactive`.
- Validado `npx tsc --noEmit`.
- Validado `$env:TURBOPACK='0'; npm run build`.

- Confirmado contexto de producao: service role ja configurada e rota de debug/admin test ja validou leitura de `clients` via service role.
- Foco restante: HTTP 500 no `POST /api/admin/clients` ao criar cliente real em `/admin/clientes`.
- Ajustado `POST /api/admin/clients` para retornar diagnostico seguro do erro Supabase (`message`, `code`, `details`, `hint`) com `code: "CLIENT_INSERT_FAILED"`, sem expor secrets.
- Ajustado log server-side do `POST` para incluir somente role, `account_type`, `serviceRoleConfigured` e payload sanitizado.
- Ajustada tela `/admin/clientes` para remover mensagem falsa/generica sobre service role quando a env esta OK e mostrar detalhe tecnico retornado pela API.
- Validado `npx tsc --noEmit`.
- Validado `$env:TURBOPACK='0'; npm run build`.
- Diretórios locais de midia (`docs/imagens-hero/`, `docs/videosweb-lokat-os/`, `imagens-hero/`, `rec-videos/`) permanecem preservados e fora do commit.
- Usuario testou em producao e a tela retornou o erro real: `new row violates row-level security policy for table "clients"`.
- Ajustado `POST /api/admin/clients` para fazer fallback server-side autenticado quando o insert via admin client retornar RLS, mantendo a escrita fora do browser e permitindo que `auth.uid()` alimente `public.current_user_role()`.
- Validado novamente `npx tsc --noEmit`.

- Criada rota temporaria segura `GET /api/debug/env-check` para diagnosticar variaveis Supabase no runtime de producao sem expor secrets.
- Liberada `/api/debug/env-check` no proxy para permitir diagnostico sem sessao autenticada.
- Registrada regra operacional: producao oficial e o projeto Vercel `caiotech` conectado ao dominio `www.lokat.com.br`; deploy somente via GitHub `main`.
- Nenhuma tela, layout, `/rec` ou ContentOS foi alterado nesta rodada.

- Continuidade do ajuste de criacao real de clientes no admin.
- Usuario confirmou no Supabase que `lokat.rec@hotmail.com` tem `role = 'super_admin'`, entao o erro nao era role do profile.
- Confirmado que `public.current_user_role()` depende de `auth.uid()` e pode retornar `NULL` no SQL Editor fora da sessao real do app.
- Criado `docs/supabase/50-debug-current-user-and-client-create.sql` para diagnosticar profile, policies, RLS e funcao `current_user_role()`.
- Ajustado `createSupabaseAdminClient()` para exigir `SUPABASE_SERVICE_ROLE_KEY` e falhar com mensagem clara quando a env faltar.
- Ajustado `POST /api/admin/clients` para criar cliente somente via service role depois de validar usuario/profile e role `super_admin`/`admin`.
- Removido fallback que podia tentar insert via sessao/anon e cair em RLS.

- Lidos `AGENTS.md`, `docs/HANDOFF.md`, `docs/AI_CONTEXT.md`, `docs/SESSION_LOG.md`, `docs/DECISIONS.md` e `docs/ROADMAP.md`.
- Confirmado projeto em `C:\Users\Trabalho\Desktop\COde\lokat-os`, branch `main`.
- Auditado erro de RLS em `/admin/clientes`: SQL 48 antigo nao contemplava `super_admin` e producao podia depender de `SUPABASE_SERVICE_ROLE_KEY`.
- Corrigida API de clientes para escrita server-side com service role quando disponivel, fallback seguro com RLS e mensagens claras quando service role/RLS falhar.
- Atualizado SQL 48 com policies idempotentes para `super_admin`, `admin` e equipe operacional.
- Corrigida geracao de convite para exigir SQL 42 real, sem link de fallback invalido.
- Ajustadas permissoes de `super_admin` em SQL 39 (OlaClick) e SQL 49 (Diagnostico Marketing Local).
- Ajustada listagem do admin/ContentOS para respeitar soft delete quando `deleted_at`/`archived_at` existirem.
- Validado `npx tsc --noEmit`.
- Validado `$env:TURBOPACK=0; npm run build`.
- Diretórios locais de midia (`docs/imagens-hero/`, `docs/videosweb-lokat-os/`, `imagens-hero/`, `rec-videos/`) foram preservados e nao alterados.

## 2026-06-28

- Criada memoria oficial inicial para sincronizar Codex e Claude Code.
- Arquivos de memoria adicionados em `docs/`.
- Nenhum codigo de sistema alterado.
- Nenhum servidor iniciado.
- Nenhum navegador aberto.
- Nenhum commit ou push executado.

### Contexto importado da ultima sessao no Claude Code

- Foi criado o Diagnostico de Marketing Local, pronto para teste em `/diagnostico-marketing`.
- Arquivos criados:
  - `src/app/diagnostico-marketing/page.tsx`
  - `src/lib/marketing-diagnostic.ts`
  - `src/app/api/marketing-diagnostics/route.ts`
  - `docs/supabase/49-marketing-diagnostics.sql`
- Arquivo alterado:
  - `src/app/admin/diagnosticos/page.tsx`
- O funil de diagnostico de marketing local tem 4 etapas.
- Foram criadas as funcoes `calculateMarketingDiagnosticScore`, `getMarketingDiagnosticSuggestion`, `normalizeWhatsapp` e `buildWhatsappUrl`.
- Foi criada API server-side para salvar diagnostico usando service role.
- Foi criada notificacao/lead do diagnostico.
- Foi adicionada a aba "Marketing Local" no admin de diagnosticos.
- Clicar em uma linha deve abrir modal com detalhes e botao de WhatsApp.

### Acoes manuais obrigatorias antes dos testes

- Rodar no Supabase SQL Editor `docs/supabase/49-marketing-diagnostics.sql` antes de testar envio real.
- Para resolver erro de cadastro de cliente no admin, rodar tambem `docs/supabase/48-admin-insert-client.sql`.

### Teste esperado

1. Acessar `/diagnostico-marketing`.
2. Preencher o funil.
3. Enviar o diagnostico.
4. Confirmar que o envio vai para `/api/marketing-diagnostics`.
5. Confirmar que o registro aparece em `/admin/diagnosticos` na aba Marketing Local.
6. Clicar em uma linha e validar modal com detalhes e botao WhatsApp.

### Atualizacao desta sessao

- Lidos `AGENTS.md`, `docs/AI_CONTEXT.md`, `docs/HANDOFF.md`, `docs/SESSION_LOG.md`, `docs/ROADMAP.md` e `docs/DECISIONS.md`.
- Atualizados somente `docs/HANDOFF.md` e `docs/SESSION_LOG.md` com o contexto real da ultima sessao no Claude Code.
- Nenhum codigo, imagem ou video foi alterado.
- Nenhum servidor foi iniciado.
- Nenhum navegador foi aberto.
- Nenhum commit ou push foi executado.

## 2026-07-16 - Sprint 3.0.3 — Visibilidade dos Destinos, Contexto Completo e Correção do Status dos SQLs (Claude Code)

- Executor: Claude Code (claude-sonnet-4-6).
- Sprint 3.0.2 aprovada com P1 e P2 identificados em re-QA.

### P1 corrigidos

- producao/page.tsx: substituído createServerSupabaseClient por requireAdminContentOSContext + adminDb. Filtro de status expandido para incluir "producao" (canonical), "em_producao" (legado), "alteracao_solicitada". STATUS_LABEL e STATUS_COLOR atualizados. Adicionada seção de operational_tasks por client_id. Página aceita searchParams content_id e task para highlight.
- aprovacoes/page.tsx: substituído createServerSupabaseClient por requireAdminContentOSContext + adminDb para query de approvals. Fallback sem join relacional se query falhar. Aceita content_id como searchParam.

### P2 corrigidos

- _guided-create-flow.tsx: DestinationResult type atualizado (contentId, existed; token removido). handleDestProducao e handleDestAprovacao preservam contentId e existed. Links de destino incluem content_id + task/approval. Microcopy diferencia existed=true vs false. IDs completos exibidos com botões Copy.
- _client-content.tsx: removido const _NOW = Date.now() em escopo de módulo (causa de React #418 quando servidor cached módulo por horas). hoursAgo agora usa Date.now() inline.

### Documentação

- SQL 90: status corrigido para failed em CODEX_CURRENT_CONTEXT.md, HANDOFF.md, AUDIT_SQL_82_89_2026-07-15.md.
- project-status.ts: adicionadas áreas production_destination_visibility e approval_destination_visibility.

### Qualidade

- npx tsc --noEmit --skipLibCheck: zero erros.
- npm run build: limpo.
- Nenhum SQL executado. Nenhum schema alterado. Nenhuma RLS alterada.
- V1_PROGRESS = 81 (imutável). V2_PROGRESS = 12 (imutável).

## 2026-07-16 - Sprint 3.0.2 — Hotfix RLS do Fluxo Criar (Claude Code)

- Executor: Claude Code (claude-sonnet-4-6).
- Sprint 3.0.1 reprovada por RLS: POST /api/admin/contentos/drafts retornava "new row violates row-level security policy for table content_items".
- Causa: todas as 5 rotas API usavam createServerSupabaseClient() (anon + session) para operações de banco, sujeitas à RLS.
- Correção: separação explícita authClient (auth + role) / adminDb (service role para DB).

### Helper criado: src/lib/admin-contentos-api.ts
- requireAdminContentOSContext(): auth com authClient, role admin/super_admin, então adminDb.
- validateAdminClient(): verifica existência e deleted_at/archived_at com fallback de compatibilidade.

### APIs corrigidas (authClient + adminDb)
- POST /drafts: adminDb.from("content_items").insert(...).
- GET e PATCH /drafts/[id]: adminDb para select e update; client_id obrigatório no GET.
- POST /actions/send-to-production: adminDb para operational_tasks e content_items.
- POST /actions/send-to-approval: adminDb para approvals e content_items; public_token removido da resposta admin.

### criar/page.tsx
- authClient para auth + role + clients; adminDb para content_items (somente se service role disponível).
- catch vazio substituído por log estruturado.

### Frontend (_guided-create-flow.tsx)
- persistDraft mapeia status HTTP para mensagens: 401 → sessão; 403 → permissão; 404 → não encontrado; 503 → indisponível; 500 → dados preservados.
- doSave propaga mensagem do erro em vez de string fixa.

### SubNav (_contentos-subnav-server.tsx)
- Adicionado Suspense com fallback animado para isolar useSearchParams e evitar React #418.

### Qualidade
- npx tsc --noEmit --skipLibCheck: zero erros.
- npm run build: limpo.
- git diff --check: apenas avisos CRLF.
- Nenhum SQL executado. Nenhum schema alterado. Nenhuma RLS alterada.
- V1_PROGRESS = 81 (imutável). V2_PROGRESS = 12 (imutável).

### React #418 — análise
- Causa determinística mais provável: useSearchParams() em ContentosSubNav sem Suspense boundary.
- Corrigido com Suspense em ContentosSubNavServer.
- Flash "Nenhum cliente selecionado": vem de activeClientName = null inicial em _layout-client.tsx; resolvido assincronamente via localStorage/fetch. Comportamento esperado; fix mais profundo requer passar nome via cookie ou header.

## 2026-07-16 - Sprint 3.0.1 — Operacionalização do Fluxo Criar (Claude Code)

- Executor: Claude Code (claude-sonnet-4-6).
- Retomada após sessão Codex que não chegou a alterar os arquivos principais.
- Verificado working tree: 9 arquivos M, APIs já em ??.

### APIs criadas (src/app/api/admin/contentos/)
- POST /drafts — cria content_item com status ideia e metadata.guided_create.
- GET /drafts/[id] e PATCH /drafts/[id] — preserva metadata fora de guided_create.
- POST /actions/send-to-production — idempotente em operational_tasks.
- POST /actions/send-to-approval — idempotente em approvals (gera public_token via DB).

### GuidedCreateFlow (_guided-create-flow.tsx) — reescrito
- Exporta GuidedCreateDraft, aceita initialDraft e initialContentId.
- Inicializa estado a partir do rascunho carregado server-side.
- saveDraft(): POST na primeira vez, PATCH nas seguintes.
- URL atualizada com ?content_id após primeiro save.
- Autosave debounced 1400 ms (só após contentId existir, só quando isDirty).
- saveState: idle | saving | saved | error — mensagens honestas.
- openEditorOS(): salva primeiro, só então navega com return_to.
- handleVisualFile(): MIME validation (PNG/JPG/WEBP), max 5 MB, sessionStorage com payload JSON.
- Destinos reais: Calendário (URL), Produção (API), Aprovação (API).

### EditorOS
- page.tsx: aceita return_to, sanitiza server-side (só /admin/contentos/).
- EditorOSWorkspace: passa contentId ao CanvasEditor, botão "Voltar ao conteúdo".
- CanvasEditor: detecta rec_os_visual_import_v1_{clientId}_{contentId}, banner Adicionar/Descartar.

### Aprovações
- aprovacoes/page.tsx: busca company_name, passa activeClientId/activeClientName.
- _client-content.tsx: isDemo suprimido quando activeClientId presente, header com nome do cliente.

### SubNav
- ContentosSubNavServer com initialClientId em: home, campanhas, criar, calendário, resultados, produção, aprovações.

### Qualidade
- npx tsc --noEmit --skipLibCheck: zero erros.
- npm run build: build limpo, zero erros, zero warnings.
- Nenhum SQL executado.
- Nenhum schema alterado.
- Nenhum dado Supabase alterado.
- V1_PROGRESS = 81 (imutável).
- V2_PROGRESS = 12 (imutável).

## 2026-07-15 - Sprint 3.0 checkpoint permanente

- Projeto confirmado em `C:\Users\Trabalho\Desktop\COde\lokat-os`, branch `main`, sincronizado com `origin/main` no inicio.
- Criados `docs/CODEX_CURRENT_CONTEXT.md`, `docs/IMPLEMENTATION_LEDGER.md` e `docs/UNTOUCHED_BACKLOG.md`.
- Atualizado `docs/DECISIONS.md` com regra de nao executar SQLs parciais sem auditoria live.
- Criado `docs/supabase/AUDIT_SQL_82_89_2026-07-15.md`.
- Criado `docs/supabase/90-reconcile-partial-foundations.sql` como proposta com `rollback` final.
- Corrigido export PNG em `CanvasEditor.tsx` com Blob, `URL.createObjectURL`, estado de exportacao e `data-testid`.
- Criado fluxo unico `/admin/contentos/criar` com etapas Brief, Conteudo, Visual Final, Revisao e Destino.
- Corrigidos links visiveis antigos para preservar `client` e apontar para rotas admin quando aplicavel.
- Atualizado `project-status.ts` para REC OS, estados planejados e SQLs parciais.
- Criados documentos `GLOBAL_CALENDAR_V1.md`, `CLIENT_360_V1.md` e `CLIENT_FINANCE_V1.md`.
- Validado `npx tsc --noEmit`.
- Validado `$env:TURBOPACK='0'; npm run build`.
- Nenhum SQL foi executado.
- Nenhum dado Supabase foi alterado.
- Nenhum asset local foi apagado, movido ou commitado.

## 2026-07-18 - Sprint 3.0.5b - conclusao do hotfix de hidratacao + CopyIdButton real

- Auditoria git inicial: branch `main`, HEAD `77efe13`, sincronizado com `origin/main`, nenhum arquivo rastreado inesperado.
- Confirmado que o commit `a6f0f91` (Sprint 3.0.5) ja havia corrigido React #418 em admin/status, admin/equipe e rec/page, mas NAO em Home/Aprovacoes/EditorOS/CopyIdButton, que permaneciam pendentes.
- `src/app/contentos/home/_client-content.tsx`: removido `const _NOW = Date.now()` de escopo de modulo; `serverNow` passado via props desde `page.tsx` (admin e nao-admin); `currentNow` via `useState(serverNow)` + `useEffect`.
- `src/lib/onboarding-store.ts` e `src/lib/canva-store.ts`: `getServerSnapshot`/`subscribe` estabilizados com referencias constantes fora do hook.
- `src/app/contentos/aprovacoes/_client-content.tsx`: `formatDueDate()` com `timeZone: "America/Fortaleza"`; nova `formatScheduledDate()` monta DD/MM/YYYY sem `new Date()` para strings YYYY-MM-DD; `window.location.origin` no modal movido para `useState + useEffect`; bloco de IDs tecnicos (approval_id, content_id) com CopyIdButton.
- `src/app/admin/contentos/editor-os/EditorOSWorkspace.tsx`: `CanvasEditor` importado via `next/dynamic({ ssr: false })` com fallback estatico.
- CopyIdButton conectado em `_guided-create-flow.tsx` (task/content/approval), `producao/page.tsx` (task_id/content_item_id) e no modal de Aprovacoes.
- Auditoria do `CanvasEditor.tsx`: `Date.now()`/`Math.random()` confirmados apenas em `uid()` chamado por acoes do usuario (criar elemento, duplicar, exportar) — nunca em render ou escopo de modulo.
- Validado `npx tsc --noEmit --skipLibCheck`: zero erros.
- Validado `npm run build` (Turbopack): compilado com sucesso, 59 paginas.
- ESLint nos arquivos alterados aponta `react-hooks/purity` (Date.now em Server Component) e `react-hooks/set-state-in-effect` (setState em useEffect de montagem) — confirmado que sao padroes pre-existentes no projeto (mesmo erro isolado em `aprovacoes/page.tsx:70` e no commit ja aceito `a6f0f91`), nao regressao desta sessao.
- Nenhum SQL executado. Nenhuma RLS alterada. Nenhum schema alterado. Nenhuma env alterada.
- V1_PROGRESS = 81 (imutavel). V2_PROGRESS = 12 (imutavel).
- QA Codex Web (Playwright, navegador real com/sem extensao) NAO executado nesta sessao — sem navegador disponivel neste ambiente; fica pendente para proxima validacao.
- Push para `main` confirmado pelo usuario e executado: commit `7135030` publicado em `origin/main`. Smoke test via curl nas rotas publicas/protegidas sem 404/500.

## 2026-07-19 - Encerramento formal da Sprint 3.0

- QA final Codex Web reportado como APROVADO pelo usuario: zero P0, zero P1, React #418 nao reproduzido, nenhum hydration mismatch, Criar/Persistencia/Producao/Aprovacao/CopyIdButton/EditorOS bridge aprovados, mobile aprovado, nenhum runtime error. Resultado reportado externamente, nao reexecutado nesta sessao (que foi de fechamento documental/status apenas).
- `src/config/project-status.ts`: `guided_create_flow`, `guided_create_persistence`, `approval_client_context`, `production_destination_visibility`, `approval_destination_visibility` marcados `validated` com commit `7135030` / deployment `dpl_BXYjpnSfhkMbyQy7WMYCrzZ8pBG1` e resultado do QA. `editor_os` mantido `qa_pending` (escopo futuro maior do editor ainda nao coberto), com `qa.status: approved_with_p2` documentando o que foi de fato validado (abertura, contexto, content_id, return_to, Canvas, ausencia de React #418). Nova entrada em `V1_HISTORY`. Nenhum flag ficticio criado.
- Documentos atualizados: `CODEX_CURRENT_CONTEXT.md`, `IMPLEMENTATION_LEDGER.md`, `HANDOFF.md`, `SESSION_LOG.md`, `UNTOUCHED_BACKLOG.md`.
- Pendencias nao bloqueantes registradas: favicon.ico ausente, Financeiro com dados demo, upload dependente de extensao do Chrome, SQLs 82/84/86-89/90 aguardando auditoria de catalogo.
- Validado `npx tsc --noEmit --skipLibCheck`: zero erros.
- Validado `git diff --check`: sem erros.
- Nenhum SQL executado. Nenhuma RLS alterada. Nenhum schema alterado. Nenhuma env alterada. Supabase nao tocado manualmente. Nenhum conteudo publicado. Nenhum cliente alterado.
- V1_PROGRESS = 81 (imutavel). V2_PROGRESS = 12 (imutavel).
- Proxima sprint autorizada: Sprint 3.1 (nao iniciada nesta execucao).

## 2026-07-19 - Sprint 3.1 Fase 0 - auditoria e arquitetura do Calendario Global e Reunioes

- Auditoria somente leitura, sem codigo alterado. Mapeadas 5 rotas de calendario
  (admin/contentos/calendario, contentos/calendario, operacional/calendario,
  client/calendario, agendamento como redirect) e 1 rota de reunioes
  (operacional/comercial/reunioes, tabela commercial_meetings).
  Achado nao reportado antes: `const _TODAY = new Date()` em escopo de modulo
  em contentos/calendario/_client-content.tsx e `new Date()` durante render em
  ContentosCalendarioContent/CalendarMock - mesma classe de bug ja corrigida na
  Home (Sprint 3.0.5b), nao corrigida aqui (fora de escopo da Fase 0).
  Tabelas confirmadas em uso: content_items, operational_tasks, approvals,
  commercial_meetings. Tabelas so em migration, zero uso em codigo:
  productivity_tasks/productivity_meetings (SQL 38, nunca executado),
  content_campaigns. calendar_events/appointments nao existem.
  Proposto modelo GlobalCalendarEvent (TypeScript, nao implementado) e plano
  faseado 3.1A (somente leitura) / 3.1B (filtros) / 3.1C (reunioes) / 3.1D
  (Google Calendar/Meet).

## 2026-07-19 - Sprint 3.1A - Calendario Global somente leitura

- Pesquisa por "Projeto Sao Paulo" no repositorio e docs: nenhuma referencia
  real encontrada (so "Sao Paulo" como exemplo de cidade em formularios).
  Registrado como trilha paralela ativa, escopo aguardando recuperacao do
  briefing original - nao inventado, nao implementado.
- Criado `src/lib/global-calendar.ts`: tipos GlobalCalendarEvent/CalendarEventSource,
  normalizadores puros para content_items/operational_tasks/approvals, grade
  mensal de 42 dias via Date.UTC (nunca depende do timezone local do servidor),
  resolucao de mes via searchParams com fallback para hoje em America/Fortaleza
  (Intl.DateTimeFormat), limites de janela timestamptz com offset -03:00 fixo.
- Criado `src/app/admin/calendario/page.tsx`: Server Component,
  requireAdminContentOSContext() + adminDb, 3 queries em paralelo via
  Promise.allSettled (uma fonte falhar nao derruba as outras), lookup em lote
  de nomes de clientes e titulos de conteudo relacionados a aprovacoes.
- Criado `src/app/admin/calendario/_client-content.tsx`: grade mensal, agenda
  do dia, filtro por cliente/fonte, modal de detalhe, navegacao por URL
  (?year=&month=), botao Hoje. selectedDay inicia em serverToday (string do
  servidor), nunca new Date() no primeiro render.
- Item "Calendario Global" adicionado a sidebar admin (CalendarDays, icone ja
  usado no projeto). Sem biblioteca nova instalada.
- `src/config/project-status.ts`: area global_calendar (ja existia, v2) de
  `planned` para `qa_pending`.
- Sem framework de teste no projeto (nenhum jest/vitest, nenhum arquivo
  .test.ts fora de node_modules) - instalar um estava fora de escopo. Verificado
  via script ad-hoc: `npx tsc` compilou global-calendar.ts isoladamente, `node`
  executou asserções cobrindo os casos A-L da Fase 21 do prompt (fallback de
  data devido/enviado/criado, group_key compartilhado entre content/task/approval
  do mesmo content_item_id, ids visuais unicos, ausencia de public_token,
  origin_href interno, exclusao de tarefa sem client_id, grade de 42 dias,
  validacao de resolveRequestedMonth). Todas as asserções passaram. Script
  descartado, nao commitado.
- Validado `npx tsc --noEmit --skipLibCheck`: zero erros.
- Validado `npm run build`: compilado com sucesso, /admin/calendario presente
  na lista de rotas.
- ESLint nos arquivos alterados/criados: zero erros novos (um warning
  pre-existente e nao relacionado - Sparkles nao utilizado em app-sidebar.tsx -
  ja existia antes desta sessao).
- Nenhum SQL executado. Nenhuma RLS alterada. Nenhum schema alterado.
- V1_PROGRESS = 81 (imutavel). V2_PROGRESS = 12 (imutavel).
- Reunioes (3.1C) e Google Calendar/Meet (3.1D) nao tratados nesta sessao.

## 2026-07-19 - Sprint 3.1A.1 - hotfix do Calendario Global apos QA de producao

- QA Codex Web (reportado pelo usuario) aprovou a base da 3.1A e reportou 4 P1 +
  1 P2: (1) botao Hoje/navegacao mensal deixavam selectedDay preso no mes
  anterior; (2) parametro client na URL nao era reconhecido; (3) O Pedreirao
  sumia do seletor quando sem evento no mes; (4) Conteudos e Producao nao
  puderam ser validados; P2: responsavel/descricao ausentes no detalhe.
- Causa raiz do item 1: useState(serverToday)/useState("all") em
  GlobalCalendarContent so aplicam o valor inicial na montagem; ao navegar
  entre meses (mesma instancia, so props novas), o estado nao se realinhava
  com a nova URL - bug classico de estado desatualizado, nao hidratacao.
- Causa raiz do item 4: content_items so era consultado por scheduled_date;
  ScheduleModal da Home grava a data real de publicacao em scheduled_at
  (timestamptz, coluna real confirmada em
  docs/supabase/14-contentos-approval-production-flow.sql) sem tocar em
  scheduled_date - conteudo agendado por la nunca aparecia.
- Corrigido em `src/lib/global-calendar.ts`: ContentItemRow ganhou
  scheduled_at/caption; normalizeContentItems prefere scheduled_at (all_day
  false) sobre scheduled_date (all_day true) sem duplicar evento; caption vira
  description; novo ResponsibleNameLookup (profiles.name, fallback para
  assigned_role em tarefas); novas resolveInitialSelectedDay()/
  resolveRequestedSource().
- Corrigido em `src/app/admin/calendario/page.tsx`: searchParams aceita
  client/source; nova query completa de clients (CLIENT_VISIBLE_STATUSES,
  mesma logica de src/lib/client-visibility.ts), independente de eventos;
  client param validado contra essa lista (invalido cai em "all", nunca 500);
  content_items consultado por scheduled_date OU scheduled_at; lookup em lote
  de profiles.name; componente filho recebe key={year-month-client-source}
  para remontar de forma limpa a cada mudanca de URL.
- Corrigido em `_client-content.tsx`: estado inicial 100% derivado de props
  (seguro por causa do key acima); navegacao e filtros preservam os demais
  parametros na URL; badges de contagem por fonte; estados vazios contextuais
  distintos de fonte com erro.
- Verificado via script ad-hoc (sem framework de teste instalado): scheduled_at
  vence scheduled_date sem duplicar, responsible_name cai para assigned_role/
  null corretamente, resolveInitialSelectedDay/resolveRequestedSource cobrem os
  casos do prompt. Suite da 3.1A original re-executada sem regressoes.
- Nao foi possivel confirmar contagens reais em producao (sem ferramenta de
  query neste ambiente) - correcao do scheduled_at validada por auditoria de
  schema/codigo, nao por contagem ao vivo.
- Validado `npx tsc --noEmit --skipLibCheck`: zero erros.
- Validado `npm run build`: compilado com sucesso.
- ESLint nos arquivos alterados: zero erros/warnings novos.
- global_calendar mantido qa_pending - nao marcado validated antes de novo QA.
- V1_PROGRESS = 81 (imutavel). V2_PROGRESS = 12 (imutavel).
- Restauracao UX do REC OS nao foi iniciada nesta sessao - continua proxima tarefa.
- Projeto Sao Paulo continua registrado como trilha paralela sem escopo recuperado.

## 2026-07-19 - Sprint 3.1A.2 - hotfix final de navegacao e estado do Calendario Global

- Segundo QA Codex Web aprovou quase tudo da 3.1A.1 e reportou 4 P1 de
  navegacao: (1) botao Hoje permanecia no mes exibido em vez de ir para o mes
  real; (2) selects de cliente/fonte nao atualizavam a URL; (3) com
  cliente+fonte selecionados, anterior/proximo paravam de navegar
  corretamente; (4) cabecalho/URL/filtros/agenda sem uma unica fonte de
  verdade. Conteudos/Producao com contagem zero legitima - nao tratado como P1.
- Causa raiz confirmada por auditoria de codigo: GlobalCalendarContent mantinha
  filterClient/filterSource em useState proprio, alem de ja vir da URL via
  props (initialFilterClient/initialFilterSource) - dois estados concorrentes
  para o mesmo dado. Anterior/proximo/Hoje eram onClick handlers chamando uma
  buildUrl local que lia esse estado (closures), nao a URL/props atuais.
- Corrigido em `src/lib/global-calendar.ts`: novas funcoes puras
  shiftMonth(year, month, delta) (aritmetica de mes/ano sem Date) e
  buildGlobalCalendarHref({year, month, client, source}) (builder canonico de
  URL, sempre URLSearchParams novo, nunca inclui client/source quando "all").
- Corrigido em `_client-content.tsx`: useState de filterClient/filterSource
  removido - agora lidos direto das props. Anterior/Proximo/Hoje viraram
  <Link href=...> com hrefs pre-computados via buildGlobalCalendarHref +
  shiftMonth (deterministicos, nunca dependem de estado). Selects de
  cliente/fonte mantem onChange mas constroem o href a partir das props
  atuais, nunca de estado local. useTransition adicionado para desabilitar a
  toolbar durante navegacao. aria-current no botao Hoje quando ja no mes atual.
- Verificado via script ad-hoc: as 16 combinacoes da Fase 13 do prompt
  (viradas de mes/ano em ambas direcoes, preservacao de client/source isolados
  e combinados, "Todos"/"Todas" removendo parametro, source invalido em "all",
  sem URL duplicada nem undefined) - todas passaram. Suites da 3.1A e 3.1A.1
  re-executadas sem regressao.
- Nao foi possivel reproduzir o bug relatado ao vivo em navegador (sem
  navegador disponivel neste ambiente) - correcao segue a arquitetura
  prescrita (URL como fonte unica de verdade), verificada por logica pura +
  regressao, nao por observacao visual direta do bug original.
- Validado `npx tsc --noEmit --skipLibCheck`: zero erros.
- Validado `npm run build`: compilado com sucesso.
- ESLint nos arquivos alterados: zero erros/warnings novos.
- global_calendar mantido qa_pending - nao marcado validated.
- V1_PROGRESS = 81 (imutavel). V2_PROGRESS = 12 (imutavel).
- Google Calendar OAuth continua bloqueado ate aprovacao do QA desta sprint.
- Restauracao UX do REC OS nao foi iniciada - continua na fila.
- Projeto Sao Paulo continua registrado, sem escopo recuperado.

## 2026-07-19 - Sprint 3.1A.3 - hotfix definitivo: navegacao nativa (sem SPA client-side)

- QA da 3.1A.2 reprovado: mesmo com useState duplicado removido (fix
  anterior), a navegacao client-side via next/link/router.push continuou
  instavel em navegador real - mes anterior nao voltava, Hoje foi para
  Setembro em vez de Julho, selecao de cliente/fonte aplicou com atraso ou
  invertida. Causa provavel: Client Router Cache do Next.js App Router
  reaproveitando payload RSC antigo em vez de buscar o servidor de novo para a
  nova combinacao de searchParams.
- Auditoria de DOM/controles (Fase 1): nenhuma sobreposicao, z-index ou hitbox
  incorreto encontrado - layout ja era flex simples com gap visivel. A causa
  nao era estrutural/visual.
- Decisao tecnica: Anterior/Proximo/Hoje viraram <a href> HTML nativo (nao
  next/link) - navegacao de documento completo, fora do Client Router Cache.
  Selects de cliente/fonte continuam com onChange mas chamam
  window.location.assign(href) dentro do handler, nunca router.push.
- useRouter, router.push, useTransition, startTransition removidos por
  completo de `_client-content.tsx` (confirmado por busca no arquivo - so
  resta mencao em comentario).
- Novo isNavigating (estado puramente operacional, nunca guarda
  year/month/client/source) desabilita os selects e aplica aria-busy apos a
  escolha; guard evita nova navegacao se href ja e o atual ou navegacao ja em
  curso.
- data-testid (calendar-previous-month, calendar-next-month, calendar-today,
  calendar-client-filter, calendar-source-filter) e aria-label adicionados aos
  5 controles criticos.
- todayHref/previousMonthHref/nextMonthHref continuam vindo de
  buildGlobalCalendarHref/shiftMonth (src/lib/global-calendar.ts, inalterado
  nesta sprint) - todayHref deriva exclusivamente de serverToday.
- Verificado: busca por router.push/router.replace/router.refresh/
  useTransition/startTransition/setFilterClient/setFilterSource no arquivo -
  zero ocorrencias reais. Suites ad-hoc das sprints 3.1A/3.1A.1/3.1A.2
  re-executadas sem regressao (logica pura nao mudou).
- Nao ha navegador disponivel neste ambiente para reproduzir o bug original
  nem rodar o roteiro de interacao da Fase 13 do prompt - correcao validada
  por auditoria de codigo + logica pura, nao por observacao visual.
- Validado `npx tsc --noEmit --skipLibCheck`: zero erros.
- Validado `npm run build`: compilado com sucesso.
- ESLint nos arquivos alterados: zero erros/warnings novos.
- global_calendar mantido qa_pending - nao marcado validated.
- V1_PROGRESS = 81 (imutavel). V2_PROGRESS = 12 (imutavel).
- Google Calendar OAuth continua bloqueado. Proxima tarefa apos aprovacao:
  recuperacao do nucleo V1 do REC OS - nao Google Calendar.
- Radar, PNG Vidigal, EditorOS nao foram alterados. Projeto Sao Paulo continua
  registrado, sem escopo recuperado.

## 2026-07-20 - Sprint Motor LOKAT 1.0 - preview "Meu Negocio" (branch feat/motor-lokat-preview-v1, NAO mergeada)

- Auditoria inicial: branch atual era fix/rec-os-global-navigation, working
  tree limpo (5 commits ja commitados e enviados ao proprio remoto da
  branch, nenhum trabalho nao commitado) - condicao de parada do prompt nao
  se aplicava. Trocado para main, pull --ff-only confirmou HEAD = 075b023
  (commit oficial esperado da Central Global do REC OS). Criada
  feat/motor-lokat-preview-v1 a partir dai.
- Auditoria de reuso: sem biblioteca de graficos instalada (recharts/chart.js/
  etc ausentes), sem zod, sem componentes ui/*.tsx (design system e
  hand-rolled com Tailwind). Reaproveitado formatCurrency/cn de
  src/lib/utils.ts como base conceitual; graficos feitos em barras CSS
  simples (Fase 28), sem instalar nada.
- Criado `src/lib/motor-lokat/`: types.ts, money.ts (centavos inteiros,
  nunca float), financial-engine.ts (buildFinancialSnapshot - faturamento,
  receita liquida, custo direto, margem de contribuicao, resultado
  operacional, ponto de equilibrio, capital de giro, cada metrica com
  formula/origem/confianca/status vs meta configuravel), pricing-engine.ts
  (Preco = Custo / [1-(fixas%+variaveis%+margem%)]), cash-flow-engine.ts,
  campaign-engine.ts (desconto financiado pela empresa, CAC, LTV
  receita/contribuicao, LTV/CAC, payback, status com tratamento especial
  para objetivo fortalecer_marca), segment-presets.ts (6 segmentos),
  glossary.ts (26 termos), insight-rules.ts (interpretador deterministico,
  nenhuma LLM conectada).
- Criado `src/app/admin/meu-negocio/`: rota nova, modo demonstracao sempre
  visivel (banner permanente, nada persistido, sem localStorage/
  sessionStorage), 6 abas (Visao Geral, Precificacao, Campanhas, Fluxo de
  Caixa, Fontes, Glossario), cards clicaveis com modal de detalhe, simulador
  de campanha completo, ponte de contexto para o REC OS (auditada a rota
  real /admin/contentos/criar?step=brief antes de linkar - contexto so
  exibido, nao enviado), previa de payload LLM (nunca enviado a lugar
  nenhum).
- Item "Meu Negocio" adicionado a sidebar admin (Sparkles, ja importado) -
  so nesta branch.
- Verificado via script ad-hoc (sem framework de teste instalado): os 7
  cenarios do prompt (custo 40%/margem 60%; preco minimo R$150; campanha
  saudavel; campanha em prejuizo; CAC > LTV disparando insight; dados
  insuficientes com CAC/LTV null, nunca NaN; capital de giro 2 meses de
  cobertura numa meta de 3 = risco atencao) mais divisao por zero/dados
  ausentes - zero NaN/Infinity em qualquer cenario.
- Busca por Math.random/Date.now/new Date(/localStorage/sessionStorage/
  window./public_token/service_role/Supabase/fetch(/axios nos arquivos
  alterados: zero ocorrencias reais (so mencoes em comentarios).
- `src/config/project-status.ts`: 8 areas novas (business_os_preview,
  financial_intelligence_engine, campaign_profitability_simulator,
  financial_glossary, financial_data_quality em qa_pending;
  campaign_rec_os_bridge, aipede_csv_import, inventory_and_losses em
  planned), todas anotadas como existentes so na branch de preview.
  global_calendar nao foi tocado.
- Build do Turbopack falhou duas vezes com erro de alocacao de memoria
  ("memory allocation of 1048576 bytes failed") - resolvido limpando o
  cache `.next` antigo; nao era um problema de codigo (tsc ja passava limpo
  antes da falha de build).
- Validado `npx tsc --noEmit --skipLibCheck`: zero erros.
- Validado `npm run build`: compilado com sucesso, /admin/meu-negocio
  presente na lista de rotas.
- ESLint nos arquivos alterados/criados: zero erros/warnings.
- Nenhum SQL executado. Nenhuma migration criada. Nenhuma env real alterada.
  Nenhuma biblioteca instalada.
- V1_PROGRESS = 81 (imutavel). V2_PROGRESS = 12 (imutavel).
- Commits e push feitos somente na branch feat/motor-lokat-preview-v1 -
  main nunca tocado, nenhum deployment de producao criado.

## 2026-07-20 - Sprint Motor LOKAT 1.1 - DNA do Negocio e Engenharia de Produtos (branch feat/product-engineering-preview-v1, NAO mergeada)

- Auditoria inicial: feat/motor-lokat-preview-v1 estava limpa e sincronizada
  com o proprio remoto (HEAD = 2540886, igual ao esperado). Criada
  feat/product-engineering-preview-v1 a partir de
  origin/feat/motor-lokat-preview-v1 (nao de main, pois este modulo depende
  do Motor LOKAT 1.0, que tambem nao esta em main).
- Auditoria de reuso (Fase 1): revisado src/app/admin/meu-negocio/,
  src/lib/motor-lokat/ e project-status.ts da Sprint 1.0 antes de escrever
  qualquer coisa nova. Reaproveitado sem duplicar: combineConfidence,
  classifyCostVsGoal/classifyMarginVsGoal (exportados de financial-engine.ts
  para isso), safeDivide/formatCents/formatPercent, calculateCampaignProjection,
  SEGMENT_PRESETS, e todos os componentes de _shared.tsx.
- Criado `src/lib/motor-lokat/business-types.ts` (tipos de DNA/4Ps/SWOT/Metas/
  Produtos/Laboratorio/Matriz, arquivo separado para nao tocar no codigo ja
  existente), `product-cost-engine.ts` (custo/margem por unidade reaproveitando
  os classificadores do motor financeiro), `product-operations-engine.ts`
  (capacidade/utilizacao/gargalo, nunca inventa demanda), `performance-matrix.ts`
  (4 quadrantes venda x margem contra meta ou mediana da categoria, sempre
  expondo o criterio usado, com recomendacoes deterministicas),
  `lab-decision-rules.ts` (sugestao de decisao pos-teste, nunca automatica),
  `product-presets.ts` (campos extras por segmento), `ai-pede-contract.ts`
  (contrato conceitual, zero integracao real).
- Criado `_business-tab.tsx` (aba Empresa: DNA do Negocio com 19 campos +
  origem propria de 5 valores incluindo "diagnostico", 4 Ps, SWOT com exemplos
  por segmento claramente marcados, Metas de Vendas, Manual do Negocio
  derivado ao vivo - nao e copia separada) e `_products-tab.tsx` (aba Produtos
  e Servicos: Portfolio com campos por segmento, Laboratorio reaproveitando
  calculateCampaignProjection - nenhum segundo simulador -, Matriz de
  Desempenho, pontes "Testar em campanha" e "Criar campanha no REC OS" para
  /admin/contentos/criar?step=brief, rota real auditada antes de usar).
- Integrado no shell (_client-content.tsx): duas abas novas na ordem pedida
  (Visao Geral, Empresa, Produtos e Servicos, Precificacao, Campanhas, Fluxo
  de Caixa, Fontes, Glossario); estado de DNA/4Ps/SWOT/Metas/Produtos/
  Laboratorio levantado para o shell, nunca resetado por troca de segmento;
  CampaignTab ganhou seedInput opcional com remount via key para a ponte de
  campanha (mesmo padrao determinístico das sprints do Calendario Global).
- Achado de lint corrigido: geracao de IDs (Date.now()/Math.random()) dentro
  dos handlers de "adicionar item" (SWOT, produto, componente de custo, teste
  de laboratorio, meta) disparava react-hooks/purity por estar textualmente
  dentro do corpo do componente. Corrigido extraindo generateId() para escopo
  de modulo em _shared.tsx (mesmo padrao do uid() ja usado em CanvasEditor.tsx).
- Verificado via script ad-hoc: os 10 cenarios do prompt (4 quadrantes da
  matriz, servico sem estoque, produto em teste, produto sazonal, capacidade
  insuficiente, dados ausentes, margem negativa) - todos passaram, zero
  NaN/Infinity. Suite da Sprint 1.0 (7 cenarios) re-executada sem regressao
  apos exportar os classificadores do motor financeiro.
- Busca por Math.random/Date.now/new Date(/localStorage/sessionStorage/
  Supabase/fetch(/axios/public_token/service_role nos arquivos alterados:
  zero ocorrencias fora do generateId() ja descrito (so roda em handlers de
  clique).
- `src/config/project-status.ts`: 13 areas novas (11 qa_pending, 1 planned -
  product_rec_os_bridge, 1 blocked - aipede_product_connector, motivo:
  documentacao/autorizacao oficial da API pendentes), todas anotadas como
  existentes so nesta branch. global_calendar/V1/V2 nao foram tocados.
- Validado `npx tsc --noEmit --skipLibCheck`: zero erros.
- Validado `npm run build`: compilado com sucesso.
- ESLint nos arquivos alterados/criados: zero erros/warnings apos o fix do
  generateId.
- Nenhum SQL executado. Nenhuma migration criada. Nenhuma env real alterada.
  Nenhuma biblioteca instalada. Nenhuma chamada de API externa. Nenhum dado
  real do AiPede.
- V1_PROGRESS = 81 (imutavel). V2_PROGRESS = 12 (imutavel).
- Commits e push feitos somente na branch feat/product-engineering-preview-v1 -
  main nunca tocado, nenhum deployment de producao criado.

## 2026-07-22 - Sprint Motor LOKAT 1.1.1 - Hotfix de cadastro, edicao e acessibilidade de Produtos e Servicos (branch fix/product-engineering-usability-v1, NAO mergeada)

- Origem: QA do deployment dpl_EJZuk8trNubpxhi3fqHJs7N4SMJX (P0=0, P1=1,
  P2=2, P3=1). Auditoria inicial confirmou feat/product-engineering-preview-v1
  limpa no commit esperado (2637cd4); branch de hotfix criada a partir de
  origin/feat/product-engineering-preview-v1.
- P1 confirmado pelo QA: apos criar um produto/servico no Portfolio, a edicao
  detalhada de composicao/custos/operacao/posicionamento/campos por segmento
  nao ficava evidente nem acessivel - tudo ficava dentro de um unico
  acordeao plano por card, sem nenhum botao de edicao explicito.
- Corrigido: `_products-tab.tsx` reescrito com um fluxo de duas telas. O
  Portfolio lista cards com um botao explicito "Editar produto"/"Editar
  servico" que abre um workspace dedicado com 5 abas internas (Geral,
  Custos, Operacao, Posicionamento, Testes e resultados), "Voltar ao
  Portfolio" e "Testar no Laboratorio". As secoes de custo/operacao/
  posicionamento ja existentes foram reaproveitadas dentro das abas - nenhuma
  engine duplicada.
- Fase 9 (Produto vs. Servico): novo tipo ProductKind ("produto"|"servico")
  em business-types.ts e campo ProductServiceItem.kind. Criacao agora exige
  escolha explicita via NewItemChooser. Nova funcao productSegmentFields
  (segment, kind) em product-presets.ts filtra campos de estoque/ingrediente/
  embalagem/validade/SKU/armazenamento quando kind="servico", mesmo em
  segmentos como delivery/varejo - motor de custo/operacao inalterado, so
  rotulos da UI mudam por tipo (ex.: "Perda esperada" -> "Retrabalho
  esperado", "Entrega" -> "Deslocamento", sem "Embalagem" para servico).
- P2 corrigidos: Manual do Negocio ganhou secao explicita "Modelo de
  negocio" (lida direto de dna.businessModel.value); SWOT/FOFA reagrupada
  visualmente sob dois titulos - "Ambiente interno" (Forcas/Fraquezas) e
  "Ambiente externo" (Oportunidades/Ameacas) - cada um com explicacao curta;
  estrutura de dados dos itens SWOT nao mudou.
- P3 corrigido + auditoria de acessibilidade mais ampla: inputs de
  componentes de custo (nome/quantidade/unidade/custo unitario), selects de
  estagio/decisao do Laboratorio, inputs de meta (nome/metrica) e o
  BusinessSourceSelect/botao de fechar do MetricDetailModal (_shared.tsx,
  usados em todo o modulo) ganharam aria-label/<label> associados.
- Fase 13: auditoria de generateId() confirmou que as 5 chamadas (newProduct,
  addTest, addComponent, SWOT addItem, addGoal) ocorrem so dentro de
  handlers de clique, nunca durante render; risco de colisao de ID
  (timestamp base36 + sufixo aleatorio) considerado desprezivel - nao foi
  necessario trocar por contador/UUID.
- Verificado via script ad-hoc (hotfix-verify.js, 22 checks): filtragem de
  campos por segmento/tipo (delivery, varejo, servicos), cenario "Servico de
  consultoria" (custo por hora, sem embalagem, CSV/margem calculados, sem
  NaN/Infinity), e regressao zero nos motores de operacao/matriz/
  laboratorio/campanha reaproveitados (nenhum destes motores foi alterado
  neste hotfix).
- Busca por Math.random/Date.now/new Date(/localStorage/sessionStorage/
  Supabase/fetch(/axios/public_token/service_role nos arquivos alterados:
  zero ocorrencias fora do generateId() ja descrito (roda so em handlers de
  clique).
- Validado `npx tsc --noEmit --skipLibCheck`: zero erros.
- Validado `npm run build`: compilado com sucesso.
- ESLint nos arquivos alterados: zero erros/warnings.
- `git diff --check`: limpo (so avisos de CRLF, sem marcador de conflito).
- `src/config/project-status.ts`: nenhuma area marcada validated - todas
  seguem qa_pending (ou planned/blocked onde ja estavam). Apenas
  next_actions/notes/last_updated atualizados em business_manual,
  business_swot, product_portfolio, product_cost_engineering,
  product_positioning, product_laboratory. global_calendar/V1/V2 nao foram
  tocados.
- Nenhum SQL executado. Nenhuma migration criada. Nenhuma env real alterada.
  Nenhuma biblioteca instalada. Nenhuma integracao AiPede. Nenhuma LLM
  conectada. Nenhum dado real criado ou persistido.
- Limitacao declarada: testes de clique-a-clique (Fase 14, 17 passos) e
  verificacao mobile real nao puderam ser executados neste ambiente por
  falta de navegador - validado via script ad-hoc e leitura de codigo;
  recomenda-se QA manual em navegador antes de qualquer promocao.
- Commits e push feitos somente na branch fix/product-engineering-usability-v1 -
  main nunca tocado, nenhum deployment de producao criado.

## 2026-07-23 - Release canonica LOKAT OS 1.0 - consolidacao de REC OS e Meu Negocio em main (branch local release/canonical-production-v1, mergeada)

- Release local criada a partir de main (075b023). Squash-merge de
  fix/rec-os-global-navigation (71fcf9f) e fix/product-engineering-usability-v1
  (d0ba70e) - as duas unicas branches ja estaveis o suficiente para producao.
- Nao integradas nesta release: feat/motor-lokat-ai-experience-v1 (assistente
  de IA), feat/editor-os-layer-scanner-v1 e fix/editor-os-demo-runtime-v1
  (scanner/OCR e hotfix de runtime do EditorOS) - nenhuma das tres passou por
  QA completo. As tres permanecem intactas, nao apagadas, nao rebaseadas.
- project-status.ts resolvido como uniao real das areas das duas branches
  integradas (nao substituido por inteiro de nenhuma delas). Nenhuma area
  nova marcada validated. global_calendar, V1_PROGRESS (81) e V2_PROGRESS
  (12) intocados.
- /admin/status: adicionado banner de ambiente/branch/commit/deployment lido
  server-side de variaveis publicas da Vercel (nunca segredo); "ultima
  atualizacao" passou a ser calculada a partir do maior last_updated real das
  areas, em vez de uma data fixa no rodape.
- /admin/contentos/selecionar-cliente: parou de manter uma segunda
  implementacao de selecao de cliente baseada em localStorage; agora
  redireciona para o hub com o seletor pesquisavel ja aberto (preservando
  ?client), reaproveitando o unico componente canonico.
- Criado src/config/admin-routes.ts como registro simples de rotas
  administrativas para auditoria - a sidebar (app-sidebar.tsx) continua
  sendo a unica fonte usada por menus/mobile-nav/layouts.
- Verificado: tsc --noEmit limpo; npm run build (Turbopack) concluido com
  exit 0; eslint nos arquivos alterados sem erro novo (3 erros
  pre-existentes confirmados identicos em origin/main/na branch de origem);
  git diff --check limpo; busca por padroes proibidos sem ocorrencia real de
  segredo (so mencoes em documentacao e um campo public_token legitimo e
  pre-existente). Smoke test local (servidor com Supabase real, sem sessao):
  /admin/meu-negocio, /admin/status, /admin/contentos,
  /admin/contentos/aprovacoes, /admin/contentos/producao e
  /admin/contentos/editor-os todos redirecionam corretamente para /login
  (nenhum 404/500).
- Push feito somente de main. Nenhuma branch de feature ou de release foi
  enviada ao remoto.

## 2026-07-23 - Hotfix canonico LOKAT OS 1.0.1 - rotas do REC OS, entrada do EditorOS, hydration e Status de producao (branch local hotfix/canonical-routes-hydration-v1, NAO mergeada)

- QA autenticado em Production (commit 1c92be3) reportou P1: React #418,
  subrotas do REC OS redirecionando ao seletor sem client, EditorOS sem
  landing sem parametros.
- React #418: causa real encontrada em _hub-client-content.tsx (formatDate
  sem timeZone explicito) - corrigido fixando America/Fortaleza. Auditoria
  das 8 rotas do QA nao encontrou outra fonte real de mismatch.
- producao/aprovacoes/resultados ganharam modo global de verdade (nunca mais
  redirecionam sem client). Criar e EditorOS ganharam seletor pesquisavel
  inline em vez de redirect. Radar parou de trocar de rota (nao ganhou dado
  real novo). Calendario antigo virou alias para o Calendario Global.
- Cards do hub corrigidos para sempre apontar para a pagina real, com ou sem
  cliente. Status ganhou deployment ID real (vs hostname), alternancia
  Resumo/Detalhes tecnicos, secao Integridade da Producao e contagem de
  mudancas desde a recalibracao.
- Verificado: tsc limpo, build via webpack fallback com exit 0 real (Turbopack
  falhou por erro interno de I/O, nao memoria), eslint sem erro novo (4
  pre-existentes), diff --check limpo, busca por padroes proibidos limpa.
  Smoke HTTP em build de Production local (npm run start): todas as rotas
  200/307, nenhum 404/500; correcao de timezone confirmada no bundle
  compilado via grep.
- Limitacao declarada: sem navegador neste ambiente, ausencia real de React
  #418 no console nao pode ser observada visualmente - so a causa raiz
  identificada e corrigida por auditoria de codigo. QA local visual (Codex
  Web) e o proximo passo.
- Nenhum push, nenhum Preview, nenhuma alteracao em main ou Production nesta
  sprint.

## 2026-07-28 - Meu Negócio Dashboard Design System V1

- Branch/worktree isoladas criadas a partir do commit `0bc1e8d` da fase anterior.
- Navegação reduzida a oito áreas, com Produtos/Fichas e Estoque/Compras unificados por subnavegação.
- Centro de Comando reconstruído com composição executiva, cascata financeira, gráficos Recharts e estados honestos de fonte.
- Tokens locais consolidados para superfícies, bordas, foco, estados e movimento reduzido.
- Nenhuma fórmula, integração, API OpenAI, SQL, Supabase, Auth, workspace ou dado real foi alterado.
- Testes estruturais novos e regressões anteriores aprovados; build Webpack aprovado com heap local de 4 GB.
- QA visual autenticado permanece pendente; área mantida como `qa_pending`.
## 2026-07-28 - Correcao visual Meu Negocio

- Branch: `fix/meu-negocio-dashboard-visual-contrast-v1`.
- Base: `299a010293e9c7d2d3228cd1790cf0299453f2a4`.
- Causa: componentes claros (`text-slate-950`, `bg-white` e equivalentes) renderizados dentro de paineis escuros.
- Solucao: tokens locais escuros e overrides estritamente escopados por `.mn-dashboard-theme`.
- Funcoes, calculos, fixtures, dados, integracoes, Supabase e Auth nao foram alterados.
- TypeScript, ESLint, testes relevantes e build Webpack passaram.
- Runtime local: `http://127.0.0.1:3002`; QA autenticado pendente.
# Sessão - Meu Negócio Motion V1

- Consolidado tema dark premium com transições GSAP escopadas e reduced motion.
- Integrado piloto Three.js somente no painel Pergunte à Lokat, carregado dinamicamente.
- Adicionada cobertura estrutural para dependências, lifecycle WebGL, acessibilidade e ausência de páginas paralelas.
- Build de produção aprovado; publicação limitada à branch de feature.
