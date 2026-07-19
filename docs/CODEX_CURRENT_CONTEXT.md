# Codex Current Context

## 1. Projeto

- Nome: LOKAT OS
- Repositorio: `caio090/caiotech`
- Branch principal: `main`
- Pasta local: `C:\Users\Trabalho\Desktop\COde\lokat-os`

## 2. Producao

- Dominio oficial: `https://www.lokat.com.br`
- Deploy oficial: GitHub `main` -> Vercel projeto `caiotech`
- Nao usar `vercel --prod` como padrao.

## 3. Sprint atual

- Sprint: 3.0 — **ENCERRADA E APROVADA** em 2026-07-19
- Commit validado em produção: `71350309fcee615de0262f821d60e30beaf13877` (curto: `7135030`)
- Deployment validado: `dpl_BXYjpnSfhkMbyQy7WMYCrzZ8pBG1`
- QA final Codex Web: **APROVADO** — zero P0, zero P1, React #418 não reproduzido, nenhum hydration mismatch. Criar, Persistência, Produção, Aprovação, CopyIdButton e EditorOS (bridge) validados. Mobile aprovado. Nenhum runtime error. Nenhuma regressão crítica.
- Resultado do QA reportado externamente pelo usuário/Codex Web; não reexecutado nesta sessão de fechamento documental.
- Sprint 3.1 iniciada em 2026-07-19: Fase 0 (auditoria/arquitetura do Calendário Global) concluída, seguida por **Sprint 3.1A (implementação, somente leitura)** — ver seção 3a. QA Codex Web da 3.1A pendente.

## 3a. Sprint 3.1A — Calendário Global somente leitura

- Data: 2026-07-19
- Rota criada: `/admin/calendario` (`src/app/admin/calendario/page.tsx` + `_client-content.tsx`), admin/super_admin somente, via `requireAdminContentOSContext()` + `adminDb`. Não substitui `/admin/contentos/calendario` (calendário por cliente do REC OS, preservado).
- Modelo normalizado: `src/lib/global-calendar.ts` — `GlobalCalendarEvent`, normalizadores puros para `content_item`/`operational_task`/`approval`, grade mensal (`buildMonthWindow`) e resolução de mês (`resolveRequestedMonth`) calculados via `Date.UTC`/`Intl.DateTimeFormat` com `America/Fortaleza` explícito — nunca `new Date()` cru no primeiro render.
- Fontes: `content_items` (scheduled_date), `operational_tasks` (due_date ?? start_date), `approvals` (approval_due_at ?? approval_sent_at ?? created_at). `commercial_meetings`, `productivity_meetings`/`productivity_tasks` e `content_campaigns` **não** entraram nesta sprint (reuniões ficaram para 3.1C).
- Verificação: sem framework de teste no projeto — normalizadores verificados via script ad-hoc (`tsc` standalone + `node`) cobrindo os casos A–L da Fase 21 do prompt (fallbacks de data, group_key compartilhado, ids únicos, ausência de public_token, origin_href interno, exclusão de eventos sem client_id). QA Codex Web em navegador real ainda pendente.
- Item "Calendário Global" adicionado à sidebar admin (`src/components/app-sidebar.tsx`), ícone `CalendarDays` já existente.
- Nenhum SQL executado. `productivity_meetings`/`productivity_tasks` (SQL 38) permanecem não executados/não auditados.

## 3b. Sprint 3.0.5b — Conclusão do hotfix de hidratação (Home/Aprovações/EditorOS) + CopyIdButton real

- Executor: Claude Code
- Data: 2026-07-18
- Commit HEAD pré-sprint: `77efe13` (Sprint 3.0.5 docs, pós a6f0f91)
- Estado: implementado, TypeScript zero erros, build limpo, commitado e enviado para produção (commit `7135030`). Validado pelo QA final Codex Web da Sprint 3.0 (ver seção 3).

## 4. O que foi feito na Sprint 3.0.1 (reprovada por RLS)

- APIs POST/GET/PATCH /drafts e POST send-to-production / send-to-approval criadas.
- _guided-create-flow.tsx reescrito com persistência real, autosave, URL update, visual bridge.
- EditorOS: return_to sanitizado, botão Voltar ao conteúdo, CanvasEditor com banner de import.
- Aprovações: activeClientId/activeClientName no server component, demo mode suprimido para admin.
- SubNav: initialClientId passado server-side em todas as páginas REC OS.
- REPROVADA: POST /drafts falhou com RLS em content_items.

## 4f. O que foi feito na Sprint 3.0.5b (conclusão do hotfix + CopyIdButton)

- Home: `const _NOW = Date.now()` (escopo de módulo) removido de `_client-content.tsx`. `serverNow` agora gerado em ambos `page.tsx` (admin e não-admin) e propagado como prop obrigatória; primeiro render usa `serverNow`, atualização dinâmica via `useState(serverNow)` + `useEffect`.
- `onboarding-store.ts`: `getServerSnapshot` estabilizado (`EMPTY_ONBOARDING` congelado, mesma referência sempre); `subscribe` estabilizado em `noopSubscribe`.
- `canva-store.ts`: `subscribe` estabilizado em `noopSubscribe`.
- Aprovações: `formatDueDate()` com `timeZone: "America/Fortaleza"` explícito; nova `formatScheduledDate()` monta data a partir dos componentes YYYY-MM-DD sem passar por `new Date()` (evita shift de dia); `window.location.origin` no modal técnico movido para `useState + useEffect`.
- EditorOS: `CanvasEditor` agora importado via `next/dynamic({ ssr: false })` com fallback estático; cabeçalho/autenticação continuam no fluxo server-side original.
- CopyIdButton conectado de fato em: resultado de Criar (task/content/approval), cards de Produção (task_id/content_item_id), modal técnico de Aprovações (approval_id/content_id).
- TypeScript: zero erros. Build: limpo.
- QA Codex Web (Playwright, com/sem extensão) NÃO executado — sem navegador real disponível nesta sessão. Ver seção 5.

## 4e. O que foi feito na Sprint 3.0.5 (hotfix final de hidratação)

- admin/status/page.tsx: getDaysRemainingV1() removido de render em EffortSection() e StatusPage(); substituído por useState(0) + useEffect em ambas as funções. useEffect adicionado aos imports.
- admin/equipe/_client-content.tsx: Math.random() em escopo de módulo em MOCK_PROFILES (causa definitiva de #418) substituído por timestamps determinísticos fixos (1748736000000 - i * 45 dias).
- rec/page.tsx: useIsMobile e introComplete tinham useState(() => window.innerWidth...) — SSR retornava false, cliente mobile retornava true → #418. Corrigido para useState(false) + useEffect com check() imediato.
- TypeScript: zero erros. Build: limpo.

## 4d. O que foi feito na Sprint 3.0.4 (hidratação + produção + IDs + SQLs)

- React #418 corrigido: getDaysRemainingV1() movido para useEffect em _layout-client.tsx.
- React #418 corrigido: serverNow propagado de page.tsx → ContentosAprovacoesContent; todos os Date.now() em render substituídos por serverNow em _client-content.tsx.
- producao/page.tsx: empty state contraditório corrigido — quando tasks > 0 e inProduction = 0, mostra aviso em vez de "Nenhum conteúdo em produção". Highlight de tarefa reforçado (badge "Tarefa selecionada", ring, aria-current, id HTML estável).
- CopyIdButton criado em src/components/copy-id-button.tsx: texto visível, feedback "Copiado" 1.5s, fallback execCommand, sem hidratação.
- SVG removido de ALLOWED_MIME e do input accept em _guided-create-flow.tsx (risco XSS).
- SQL 82: status partial_unknown → failed (erro 42703 confirmado).
- SQL 84: status partial_unknown → failed (erro 42703 confirmado).
- TypeScript: zero erros. Build: limpo.

## 4c. O que foi feito na Sprint 3.0.3 (P1 + P2)

- producao/page.tsx: requireAdminContentOSContext + adminDb; filtro expandido para "producao"/"em_producao"; STATUS_LABEL/COLOR para producao e alteracao_solicitada; seção operational_tasks; searchParams content_id e task.
- aprovacoes/page.tsx: requireAdminContentOSContext + adminDb para approvals; fallback sem join; searchParam content_id.
- _guided-create-flow.tsx: DestinationResult com contentId/existed (token removido); links incluem content_id+task/approval; microcopy differencia existed=true/false; IDs completos com Copy.
- _client-content.tsx: removido const _NOW = Date.now() em escopo de módulo (React #418); substituído por Date.now() inline.
- SQL 90: marcado como failed em todos os docs.
- project-status.ts: production_destination_visibility e approval_destination_visibility adicionados.
- TypeScript: zero erros. Build: limpo. 5 commits. Push: feito.

## 4b. O que foi feito na Sprint 3.0.2 (hotfix)

- Criado src/lib/admin-contentos-api.ts: requireAdminContentOSContext() e validateAdminClient().
- Todas as 5 rotas API corrigidas: authClient para auth/role, adminDb para DB.
- criar/page.tsx: adminDb para content_items com guard hasSupabaseServiceRoleKey().
- Frontend: mensagens de erro mapeadas por status HTTP.
- SubNav: Suspense boundary adicionado para isolar useSearchParams (React #418).
- TypeScript: zero erros. Build: limpo.
- Nenhum SQL executado. Nenhuma RLS alterada. V1=81, V2=12 imutáveis.

## 5. Próximos passos

- QA Sprint 3.0.3: testar destino Produção (tarefa aparece na página), destino Aprovação (aparece em Aprovações), IDs copiáveis, links corretos.
- Verificar READY no projeto lokat-os (dpl_EPMCQcFovLUWdmVL6Dq8hHv6JUZL).
- Flash "Nenhum cliente selecionado": P2 investigar — _layout-client.tsx usa localStorage/fetch async; fix requer cookie ou header server-side.
- QA Codex Web da Sprint 3.0.5b/3.0: **concluído e aprovado** em 2026-07-19 (zero P0, zero P1). Ver seção 3.

### Pendências não bloqueantes (não impedem o encerramento da Sprint 3.0)

- favicon.ico ausente.
- Financeiro (`/admin/financeiro`) ainda exibe dados demo declarados — requer sprint própria para dados reais de faturamento.
- Upload automatizado pode depender de permissão da extensão do Chrome (já registrado como P2 desde Sprint 3.0.4).
- SQLs 82, 84, 86-89, 90 aguardam auditoria controlada de catálogo antes de qualquer nova tentativa.

## 4. Deployment atual

- Deployment inicial esperado: `dpl_HTRqmmLYfvqUzXwaWJvLtCceccqE`
- Status esperado: `READY`

## 5. V1_PROGRESS

- `V1_PROGRESS = 81`
- Manter inalterado nesta sprint.

## 6. V2_PROGRESS

- `V2_PROGRESS = 12`
- Manter inalterado nesta sprint.

## 7. Ultima sprint concluida

- Sprint V2.2.1 aprovada com ressalvas.
- REC OS tem navegacao reduzida a cinco areas.
- EditorOS existe como motor de canvas local em avaliacao.
- Faturamento OlaClick carregou dados reais, sem duplicacao observada.

## 8. Ultimo QA

- QA em producao via Chrome.
- Aprovado com ressalvas:
  - P1: Exportar PNG do EditorOS nao iniciou download.
  - P2: texto visivel legado `ContenOS Implementado`.
  - P2: links antigos iniciando com `/contentos/` na Visao Geral.

## 9. Funcionalidades validadas

- REC OS com cinco areas: Visao Geral, Campanhas, Criar, Calendario, Resultados.
- Redirects legados preservando `client`.
- Duh Lanches com Cardapio Digital/OlaClick conectado.
- Faturamento real OlaClick carregado.
- Client_id preservado nas rotas admin REC OS.

## 10. Funcionalidades com ressalva

- EditorOS: canvas, texto, forma, imagem e rascunho local existem; exportacao PNG precisa ser corrigida e validada.
- OlaClick formas de pagamento: provider nao enviou campo de pagamento; estado correto e `blocked_provider_data`.
- REC OS Visao Geral: ainda havia links antigos para `/contentos/`.

## 11. Bloqueadores

- SQLs 82, 84 e 86-89 estao em estado parcial/desconhecido.
- SQL 85 nao foi executado.
- Typebot patch local nao deve ser restaurado nesta sprint.
- Meta QA completo pendente.
- Asaas sandbox pendente.
- Chatwoot e Postiz dependem de infraestrutura externa.

## 12. SQLs

- SQL 82: `failed` — erro 42703 (column "is_internal" does not exist). Nao re-executar.
- SQL 84: `failed` — erro 42703 (column "profile_id" does not exist). Nao re-executar.
- SQL 85: `not_executed`
- SQL 86: `partial_unknown` — historico indica tentativa parcial; catalogo nao auditado.
- SQL 87: `partial_unknown` — constraints inconsistentes; SQL 90 tentado como fix e falhou.
- SQL 88: `partial_unknown` — historico indica tentativa parcial; catalogo nao auditado.
- SQL 89: `partial_unknown` — historico indica tentativa parcial; catalogo nao auditado.
- SQL 90: `failed` — tentado/executado e falhou. Nao re-executar.

## 13. Integracoes

- Meta: OAuth global existente; ativos devem ser vinculados por cliente.
- OlaClick: conexao da Duh Lanches ativa; formas de pagamento bloqueadas por ausencia de dados do provider.
- WhatsApp: em preparacao.
- Asaas: sandbox nao homologado.
- Chatwoot: nao instalado.
- Postiz: nao instalado.

## 14. Areas congeladas

- Nao alterar Typebot.
- Nao alterar Meta.
- Nao conectar providers.
- Nao executar DDL/DML no Supabase.
- Nao executar novamente SQL 82 a 89.
- Nao emitir nota fiscal.
- Nao alterar percentuais V1/V2.

## 15. Proxima sprint

- Sprint 3.0: checkpoint permanente, auditoria SQL parcial, fechamento V2.2.1 e novo fluxo Criar da REC OS.

## 16. Proxima acao exata

1. Auditar catalogo PostgreSQL somente com `SELECT`.
2. Corrigir exportacao PNG do EditorOS.
3. Corrigir nomenclatura visivel e links legados.
4. Unificar `/admin/contentos/criar` em fluxo guiado de cinco etapas.
5. Documentar calendario global, Cliente 360 e financeiro do cliente.

## Regra para execucoes futuras

Antes de alterar codigo, todo agente deve ler:

- `docs/CODEX_CURRENT_CONTEXT.md`
- `docs/IMPLEMENTATION_LEDGER.md`
- `docs/UNTOUCHED_BACKLOG.md`
- `AGENTS.md`
- `docs/HANDOFF.md`
- `docs/DECISIONS.md`
