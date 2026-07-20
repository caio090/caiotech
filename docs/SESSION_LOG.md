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
