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
- Sprint 3.1 iniciada em 2026-07-19: Fase 0 (auditoria/arquitetura do Calendário Global) concluída, seguida por **Sprint 3.1A**, **3.1A.1**, **3.1A.2** e **3.1A.3** (hotfixes sucessivos pós-QA) — ver seções 3a-x/3a-0/3a-i/3a-ii. QA Codex Web da 3.1A.3 pendente. Google Calendar OAuth continua bloqueado até essa aprovação; a próxima tarefa depois de validado é a recuperação do núcleo V1 do REC OS (não Google Calendar). Restauração UX do REC OS (Aprovações na Home, Radar, Mural de Referências, briefing guiado) é a tarefa registrada na fila.

## 3y. Sprint Motor LOKAT 1.1 — DNA do Negócio e Engenharia de Produtos e Serviços (branch isolada, não mergeada)

- Data: 2026-07-20
- **Esta sprint existe somente na branch `feat/product-engineering-preview-v1`, criada a partir de `origin/feat/motor-lokat-preview-v1`** (não de `main` — este módulo depende do Motor LOKAT 1.0, que também não está em `main`). Nenhum commit foi para `main`, nenhum deployment de produção.
- Dentro de "Meu Negócio", duas abas novas: **Empresa** (sub-abas DNA do Negócio, 4 Ps, SWOT/FOFA, Metas de Vendas, Manual do Negócio) e **Produtos e Serviços** (sub-abas Portfólio, Laboratório, Matriz de Desempenho) — navegação final: Visão Geral, Empresa, Produtos e Serviços, Precificação, Campanhas, Fluxo de Caixa, Fontes, Glossário.
- Novos módulos em `src/lib/motor-lokat/`: `business-types.ts` (tipos de DNA/4Ps/SWOT/Metas/Produtos/Laboratório/Matriz — arquivo separado de `types.ts` para não tocar no código já existente da 1.0), `product-cost-engine.ts` (reaproveita `classifyCostVsGoal`/`classifyMarginVsGoal`, agora exportados de `financial-engine.ts`, para custo/margem por unidade), `product-operations-engine.ts` (capacidade/utilização/gargalo), `performance-matrix.ts` (classificação em 4 quadrantes + recomendações determinísticas), `lab-decision-rules.ts` (sugestão de decisão pós-teste, nunca executada automaticamente), `product-presets.ts` (campos extras por segmento), `ai-pede-contract.ts` (contrato conceitual, sem integração real).
- Laboratório de produtos reaproveita `CampaignInput`/`calculateCampaignProjection` (Sprint 1.0) para o teste — nenhum segundo simulador financeiro criado. Ponte "Testar em campanha" prepara os dados e leva à aba Campanhas (`CampaignTab` ganhou um `seedInput` opcional, com remount via `key` para adotar o novo seed com segurança — mesmo padrão de remount determinístico já validado nas sprints do Calendário Global). Ponte "Criar campanha no REC OS" aponta para `/admin/contentos/criar?step=brief` (rota real, auditada antes de usar).
- Verificado via script ad-hoc (mesma abordagem das sprints anteriores): os 10 cenários do prompt (4 quadrantes da matriz, serviço sem estoque, produto em teste, produto sazonal, capacidade insuficiente, dados ausentes, margem negativa) — nenhum NaN/Infinity, nenhuma classificação sem critério, nenhuma recomendação sem motivo. Suite da 1.0 (7 cenários) re-executada sem regressão após exportar as funções de classificação.
- Achado de qualidade corrigido durante a sprint: geração de IDs (`Date.now()`/`Math.random()`) dentro de handlers de "adicionar item" (SWOT, produto, componente de custo, teste de laboratório, meta) disparava `react-hooks/purity` por estar textualmente dentro do corpo do componente — extraído para `generateId()` em `_shared.tsx` (função de módulo, mesma lógica do `uid()` já usado em `CanvasEditor.tsx`), zero erros/warnings de ESLint no resultado final.
- `src/config/project-status.ts`: 13 novas áreas (11 `qa_pending`, 1 `planned`, 1 `blocked` — `aipede_product_connector`, motivo: documentação/autorização oficial da API pendentes), todas anotadas como existentes só nesta branch. `global_calendar`, `V1_PROGRESS` e `V2_PROGRESS` não foram tocados.
- Nenhum SQL, nenhuma migration, nenhuma env real, nenhuma biblioteca nova, nenhuma chamada de API externa, nenhum dado real do AiPede.

## 3z. Sprint Motor LOKAT 1.0 — preview do módulo "Meu Negócio" (branch isolada, não mergeada)

- Data: 2026-07-20
- **Esta sprint existe somente na branch `feat/motor-lokat-preview-v1`, criada a partir de `main` no commit `075b023`.** Nenhum commit desta sprint foi enviado para `main`; nenhum deployment de produção foi criado. A branch foi enviada para o remoto (`git push -u origin feat/motor-lokat-preview-v1`) e deve gerar um Preview da Vercel — a URL do Preview não deve ser promovida a produção sem uma sprint própria de validação.
- Rota nova: `/admin/meu-negocio`, nome visível "Meu Negócio", badge "Motor LOKAT". Roda inteiramente em modo demonstração — nenhuma chamada a Supabase, nenhuma persistência (nem banco, nem localStorage/sessionStorage). Todos os valores são exemplos editáveis, existem só em memória durante a sessão da página.
- Motor financeiro determinístico em `src/lib/motor-lokat/` (`financial-engine.ts`, `pricing-engine.ts`, `cash-flow-engine.ts`, `campaign-engine.ts`, `insight-rules.ts`, `glossary.ts`, `segment-presets.ts`, `money.ts`, `types.ts`) — todo valor monetário em centavos inteiros, toda métrica carrega origem/confiança/fórmula/comparação com meta.
- UI em `src/app/admin/meu-negocio/`: seis abas (Visão Geral, Precificação, Campanhas, Fluxo de Caixa, Fontes, Glossário), cards clicáveis com detalhe, simulador de campanha com CAC/LTV/payback, ponte de contexto para o REC OS (`/admin/contentos/criar?step=brief`, rota real auditada antes de implementar — não fictícia), prévia de payload para LLM futura (nunca enviada) e interpretador determinístico por regras (nenhuma IA conectada).
- Verificado via script ad-hoc (mesma abordagem de sprints anteriores, sem framework de teste instalado): os 7 cenários do prompt (custo 40%/margem 60%, preço mínimo R$150, campanha saudável, campanha em prejuízo, CAC > LTV, dados insuficientes, capital de giro com 2 meses de cobertura) mais checagens de divisão por zero/dados ausentes — nenhum NaN/Infinity encontrado.
- `src/config/project-status.ts`: 8 novas áreas adicionadas (`business_os_preview`, `financial_intelligence_engine`, `campaign_profitability_simulator`, `financial_glossary`, `financial_data_quality` em `qa_pending`; `campaign_rec_os_bridge`, `aipede_csv_import`, `inventory_and_losses` em `planned`), todas marcadas como existentes somente na branch de preview. `global_calendar` não foi tocado.
- Item "Meu Negócio" adicionado à sidebar admin (`src/components/app-sidebar.tsx`) — só existe nesta branch até um eventual merge.
- Nenhum SQL executado, nenhuma migration criada, nenhuma env real alterada, nenhuma biblioteca instalada.

## 3a-x. Sprint 3.1A.3 — Hotfix definitivo: navegação nativa (sem SPA client-side)

- Data: 2026-07-19
- QA da 3.1A.2 reprovado: navegação client-side (Next.js `<Link>`/`router.push`/`useTransition`) mostrou-se instável no navegador real — mês anterior não voltava, "Hoje" ia para o mês errado, seleção de cliente/fonte aplicava com atraso ou invertida. Sintomas consistentes com o Client Router Cache do Next.js App Router reaproveitando um payload RSC antigo em vez de buscar o servidor de novo para a nova combinação de searchParams.
- Auditoria de DOM/controles (Fase 1 do prompt): nenhuma sobreposição, `z-index` ou hitbox incorreto encontrado — layout já era um flex simples com gap visível. A causa não era estrutural/visual, e sim a navegação client-side em si.
- **Decisão técnica**: substituída toda a navegação crítica por comportamento nativo determinístico. Anterior/Próximo/Hoje agora são `<a href>` HTML puro (não `next/link`) — navegação de documento completo, fora do alcance do Client Router Cache. Os `<select>` de cliente/fonte continuam com `onChange` (não dá para virar link), mas agora chamam `window.location.assign(href)` dentro do handler, nunca `router.push`.
- `useRouter`, `router.push`, `useTransition`, `startTransition` removidos por completo do arquivo (confirmado por busca — só resta a palavra em um comentário explicando a decisão).
- Novo `isNavigating` (estado puramente operacional, nunca guarda year/month/client/source) desabilita os selects e aplica `aria-busy` imediatamente após a escolha; um guard evita nova navegação se o href já é o atual ou se uma navegação já está em curso.
- `data-testid` (`calendar-previous-month`, `calendar-next-month`, `calendar-today`, `calendar-client-filter`, `calendar-source-filter`) e `aria-label` adicionados a todos os 5 controles críticos.
- `todayHref`/`previousMonthHref`/`nextMonthHref` continuam vindos de `buildGlobalCalendarHref`/`shiftMonth` (`src/lib/global-calendar.ts`, inalterado desde a 3.1A.2) — `todayHref` deriva exclusivamente de `serverToday`, nunca de `shiftMonth` ou do mês exibido.
- Verificado via script ad-hoc: as mesmas 16 combinações de URL das sprints anteriores (nenhuma mudou na lógica pura) mais confirmação de que `previousMonthHref`/`nextMonthHref`/`todayHref` nunca coincidem indevidamente. Busca por `router.push`/`router.replace`/`router.refresh`/`useTransition`/`startTransition`/`setFilterClient`/`setFilterSource` no arquivo: zero ocorrências reais.
- **Não há navegador disponível neste ambiente** para reproduzir o bug original em condições reais nem para rodar o roteiro de interação da Fase 13 do prompt (aguardar navegação completa, clicar em sequência). A correção foi validada por auditoria de código + lógica pura, não por observação visual.
- `global_calendar` mantido `qa_pending`.

## 3a-0. Sprint 3.1A.2 — Hotfix final de navegação e estado (URL como fonte única de verdade)

- Data: 2026-07-19
- Segundo QA Codex Web aprovou a base da 3.1A.1 (autenticação, rota, sidebar, isolamento Duh/O Pedreirão, lista completa de clientes, client/source direto na URL, estados vazios, Aprovações, deep-link, ausência de React #418/hydration mismatch, console, runtime, ausência de public_token/service role), mas reportou 4 P1 novos: (1) botão Hoje permanecia no mês exibido em vez de ir para o mês real; (2) selecionar cliente/fonte nos `<select>` não atualizava a URL; (3) com cliente+fonte selecionados, anterior/próximo paravam de navegar corretamente; (4) cabeçalho/URL/filtros/agenda não tinham uma única fonte de verdade. Conteúdos/Produção com contagem zero legítima não foi tratado como P1.
- Causa raiz confirmada por auditoria de código: `GlobalCalendarContent` mantinha `filterClient`/`filterSource` em `useState` próprio **além** da URL — dois estados concorrentes que podiam divergir — e a navegação de mês/Hoje/filtros era feita via `onClick`/`onChange` chamando `router.push` com uma função `buildUrl` inline que lia esse estado local (não determinística a partir das props).
- Corrigido: `useState` de `filterClient`/`filterSource` removido — agora são lidos diretamente de `initialFilterClient`/`initialFilterSource` (props), tornando a URL a única fonte de verdade, sem estado paralelo para divergir. Criadas em `src/lib/global-calendar.ts` duas funções puras: `shiftMonth(year, month, delta)` (aritmética de mês/ano, sem `Date`) e `buildGlobalCalendarHref({year, month, client, source})` (builder canônico de URL, sempre um `URLSearchParams` novo, nunca inclui `client`/`source` quando "all"). Anterior/Próximo/Hoje viraram `<Link href=...>` determinísticos (em vez de `onClick` + estado), eliminando qualquer dependência de closures potencialmente desatualizadas. Os `<select>` de cliente/fonte continuam com `onChange` (não dá para ser `<Link>`), mas agora constroem o href com `buildGlobalCalendarHref` usando as props atuais — nunca estado local. `useTransition` adicionado para desabilitar a toolbar durante a navegação e evitar cliques duplicados.
- Verificado via script ad-hoc (mesma abordagem das sprints anteriores, sem framework de teste instalado): as 16 combinações da Fase 13 do prompt (viradas de mês em ambas direções, virada de ano, preservação de client/source isolados e combinados, "Todos"/"Todas" removendo o parâmetro, source inválido caindo em "all", ausência de URL duplicada ou parâmetro `undefined`) — todas passaram. Suites das sprints 3.1A e 3.1A.1 re-executadas sem regressão.
- **Ressalva de transparência**: não há navegador disponível neste ambiente para reproduzir ao vivo o bug relatado (ex.: confirmar visualmente que "Hoje" realmente navega para fora de Agosto). A correção segue exatamente a arquitetura prescrita no ticket (URL como fonte única, hrefs determinísticos via função pura, eliminação do estado duplicado) e foi verificada por lógica pura + regressão, não por observação em navegador real.
- `global_calendar` mantido `qa_pending` — não marcado `validated`.

## 3a-i. Sprint 3.1A.1 — Hotfix do Calendário Global após QA de produção

- Data: 2026-07-19
- QA Codex Web anterior aprovou deployment/autenticação/rota/sidebar/grade/agenda/Aprovações/detalhe/deep-link/React #418/hidratação/mobile/runtime/ausência de public_token e service role, mas reportou 4 P1 e 1 P2 (ver seção 3a-ii para os P1 originais).
- `src/lib/global-calendar.ts`: `ContentItemRow` ganhou `scheduled_at`/`caption`; `normalizeContentItems`/`normalizeOperationalTasks` agora recebem um `ResponsibleNameLookup` (profiles.name) e preenchem `responsible_name` de verdade; nova `resolveInitialSelectedDay()` (mês atual → serverToday, outro mês → dia 1) e `resolveRequestedSource()` (valida `source` param).
- `src/app/admin/calendario/page.tsx`: `searchParams` agora aceita `client`/`source`; clientes agora vêm de uma query própria e completa (`clients` com `CLIENT_VISIBLE_STATUSES`, mesma lógica de `src/lib/client-visibility.ts`/`admin-contentos-clients.ts`) — não mais derivados só dos eventos do mês, então um cliente sem evento no período continua aparecendo no filtro; `client` param é validado contra essa lista (inválido cai em "all", nunca 500); `content_items` agora também consulta `scheduled_at` (coluna real, timestamptz, usada por `ScheduleModal` da Home) além de `scheduled_date`, sem duplicar evento por linha; `responsible_id`/`assigned_to` são resolvidos em lote via `profiles.name`. O componente cliente é remontado (`key={year-month-client-source}`) a cada mudança de URL, eliminando a classe de bug de estado desatualizado (dia selecionado preso no mês anterior).
- `src/app/admin/calendario/_client-content.tsx`: estado inicial (`selectedDay`, `filterClient`, `filterSource`) agora vem só de props resolvidas no servidor — seguro porque o componente remonta a cada mudança de URL; navegação de mês/Hoje/filtros preserva os outros parâmetros na URL; badges de contagem por fonte; estados vazios contextuais distintos de "fonte falhou ao carregar".
- Verificado via script ad-hoc (mesma abordagem da 3.1A, sem framework de teste instalado): `scheduled_at` vence `scheduled_date` sem duplicar evento, `responsible_name` cai para `assigned_role`/null quando o profile não tem nome, `resolveInitialSelectedDay`/`resolveRequestedSource` cobrem os casos do prompt. Suite original da 3.1A também re-executada sem regressões.
- `global_calendar` mantido `qa_pending` — não marcado `validated` antes de novo QA Codex Web.

## 3a-ii. Sprint 3.1A — Calendário Global somente leitura (implementação original)

- Data: 2026-07-19
- Rota criada: `/admin/calendario` (`src/app/admin/calendario/page.tsx` + `_client-content.tsx`), admin/super_admin somente, via `requireAdminContentOSContext()` + `adminDb`. Não substitui `/admin/contentos/calendario` (calendário por cliente do REC OS, preservado).
- Modelo normalizado: `src/lib/global-calendar.ts` — `GlobalCalendarEvent`, normalizadores puros para `content_item`/`operational_task`/`approval`, grade mensal (`buildMonthWindow`) e resolução de mês (`resolveRequestedMonth`) calculados via `Date.UTC`/`Intl.DateTimeFormat` com `America/Fortaleza` explícito — nunca `new Date()` cru no primeiro render.
- Fontes: `content_items` (scheduled_date), `operational_tasks` (due_date ?? start_date), `approvals` (approval_due_at ?? approval_sent_at ?? created_at). `commercial_meetings`, `productivity_meetings`/`productivity_tasks` e `content_campaigns` **não** entraram nesta sprint (reuniões ficaram para 3.1C).
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
