# Handoff

Memoria oficial de continuidade entre agentes no projeto Lokat OS.

## Última sessão — 2026-07-23 — Hotfix canônico LOKAT OS 1.0.1, rotas do REC OS, entrada do EditorOS, hydration e Status de produção (branch local `hotfix/canonical-routes-hydration-v1`, NÃO mergeada nem publicada)

- QA autenticado em Production (commit `1c92be3`, deployment `dpl_3q5h6ZyxBSy6P5TQj1VFU7cZWg4w`) reportou P1: React #418 (hydration mismatch), subrotas do REC OS redirecionando ao seletor sem `?client=`, EditorOS sem landing sem parâmetros.
- **React #418** — causa real encontrada por auditoria de código (não reproduzido visualmente, sem navegador neste ambiente): `src/app/admin/contentos/_hub-client-content.tsx`'s `formatDate()` chamava `toLocaleDateString("pt-BR")` sem `timeZone` explícito — o dia/mês dependia do fuso do runtime (servidor em UTC, navegador local), produzindo texto diferente entre SSR e hidratação. Corrigido fixando `timeZone: "America/Fortaleza"`, mesmo padrão já usado em `src/app/contentos/aprovacoes/_client-content.tsx`. Auditoria completa das 8 rotas do QA não encontrou nenhuma outra fonte real de mismatch.
- **Modo global real**: `/admin/contentos/producao`, `/aprovacoes` e `/resultados` deixaram de redirecionar ao seletor quando `?client=` está ausente — agora suportam "todos os clientes" de verdade (adminDb, sem filtro de cliente, cada linha/card rotulado com o nome do cliente de origem). Novo `src/lib/rec-os-client-context.ts` consolida a interpretação de client ausente/válido/inválido, sem nunca decidir por um redirect universal.
- **Criar e EditorOS** (`client_required`/`content_required`): ganharam landing própria com seletor pesquisável inline (`src/components/inline-client-picker.tsx`) em vez de `redirect()` para o seletor — nunca saem da própria rota.
- **Radar**: auditoria confirmou que não tem nenhuma lógica real por cliente (era um redirect puro para a aba "Oportunidades" de Resultados, ela mesma só conteúdo estático "Em breve"). Corrigido para renderizar esse conteúdo diretamente em `/admin/contentos/radar`, sem redirect — não foi "restaurado" como funcionalidade real, só parou de trocar de rota.
- **Calendário**: `/admin/contentos/calendario` (implementação antiga, per-cliente, com `localStorage`-like redirect ao seletor) virou um alias puro que redireciona para o Calendário Global canônico (`/admin/calendario`), preservando todos os parâmetros da URL.
- **Cards do hub** (`src/lib/rec-os-hub.ts`, `buildCardHref`): agora apontam sempre para a página real, com ou sem cliente selecionado (antes, sem cliente, a maioria caía no Calendário como substituto porque as rotas redirecionavam). "Conteúdos em andamento" corrigido de Resultados (só agregados) para Produção (lista de verdade).
- **Status** (`/admin/status`): banner de deployment agora prefere `VERCEL_DEPLOYMENT_ID` real e só rotula como "Host do deployment" (nunca "ID") quando cai no fallback `VERCEL_URL`. Nova alternância Resumo/Detalhes técnicos nos cards de área. Nova seção "Integridade da Produção" com os 7 itens do QA e as duas novas áreas (`production_route_integrity`, `production_hydration_stability`, ambas `qa_pending`). Nova faixa "Mudanças desde a última recalibração" com contagens honestas (não um delta temporal inventado, já que não há snapshot da recalibração anterior).
- **Meu Negócio**: confirmado que o agrupamento SWOT "Ambiente interno"/"Ambiente externo" já existia (Sprint 1.1.1) e renderiza corretamente — só o texto de "Ambiente externo" foi ajustado para bater exatamente com a redação do ticket.
- Verificado: `tsc --noEmit` limpo, `npm run build --webpack` (Turbopack falhou por um erro interno de I/O, não memória — fallback usado conforme instruído) concluído com exit 0 real (confirmado sem o falso-positivo de exit code do `tee`), `eslint` sem erro novo (4 erros pré-existentes confirmados), `git diff --check` limpo, busca por padrões proibidos sem ocorrência real de segredo. Smoke test HTTP em `npm run start` (build de Production local): todas as 12 rotas do QA + aliases retornam 200/307 (login), nenhum 404/500; confirmado por grep que a correção de timezone está presente no bundle compilado.
- **Limitação declarada**: sem navegador neste ambiente, a ausência real de React #418 no console não pôde ser observada visualmente — só a causa raiz identificada e corrigida por auditoria de código, com evidência indireta (bundle compilado contém a correção). QA local visual (Codex Web) é o próximo passo antes de qualquer merge/push.
- Nenhum push, nenhum Preview, nenhuma alteração em `main` ou em Production nesta sprint — tudo local em `hotfix/canonical-routes-hydration-v1`.

## Sessão anterior — 2026-07-23 — Release canônica LOKAT OS 1.0, consolidação em `main` (branch local `release/canonical-production-v1`, mergeada)

- Objetivo: eliminar a fragmentação entre branches e publicar em `main` só o
  que já estava estável — navegação global do REC OS
  (`fix/rec-os-global-navigation`, commit `71fcf9f`) e o módulo Meu Negócio /
  Motor LOKAT / Engenharia de Produto (`fix/product-engineering-usability-v1`,
  commit `d0ba70e`). Scanner de camadas do EditorOS e o Assistente de IA
  ficaram deliberadamente de fora — nenhum dos dois passou por QA completo.
- Release local criada a partir de `main` (`075b023`), com squash-merge de
  cada branch de origem em commit próprio, revisão de diff antes de cada
  commit, sem `git add .`/`-A`.
- `project-status.ts` resolvido como união real das áreas (REC OS + Meu
  Negócio), sem escolher um arquivo inteiro de uma branch só — nenhuma área
  nova marcada `validated`, `global_calendar` e `V1_PROGRESS`/`V2_PROGRESS`
  (81/12) intocados.
- `/admin/status` deixou de mostrar uma data fixa: agora lê metadados
  server-side seguros da Vercel (`VERCEL_ENV`, `VERCEL_GIT_COMMIT_SHA`,
  `VERCEL_GIT_COMMIT_REF`, `VERCEL_URL` — nunca segredo) via
  `src/lib/deployment-info.ts`, e computa "última atualização" a partir do
  maior `last_updated` real das áreas.
- `/admin/contentos/selecionar-cliente` deixou de ter uma segunda
  implementação de seleção de cliente (baseada em `localStorage`, divergindo
  da regra "URL é a única fonte de verdade" do hub) — agora redireciona para
  o hub com o seletor pesquisável já aberto, preservando `?client` quando
  presente.
- `src/config/admin-routes.ts` criado como registro simples das rotas
  administrativas canônicas, para auditoria — não substitui a config de
  sidebar já existente em `app-sidebar.tsx`, que continua sendo a única fonte
  usada por sidebar/mobile-nav/layouts.
- Verificado: `tsc --noEmit` limpo, `npm run build` (Turbopack) concluído com
  sucesso, `eslint` nos arquivos alterados sem erros novos (3 erros
  pré-existentes confirmados idênticos em `origin/main`/na branch de origem,
  não introduzidos por esta release), `git diff --check` limpo, busca por
  padrões proibidos sem ocorrência real de segredo.
- Scanner de camadas do EditorOS (`feat/editor-os-layer-scanner-v1`) e o
  hotfix de runtime de demonstração (`fix/editor-os-demo-runtime-v1`,
  commits `8659805`/`00b8e6f`) permanecem preservados, não mergeados, não
  apagados — próxima sprint do EditorOS partirá desta nova `main`.
- Push feito somente de `main`; nenhuma branch de feature ou de release foi
  enviada ao remoto.

## Sessão anterior — 2026-07-22 — Sprint Motor LOKAT 1.1.1, hotfix de cadastro, edição e acessibilidade de Produtos e Serviços (branch isolada, NÃO mergeada)

- **Branch `fix/product-engineering-usability-v1`**, criada a partir de
  `origin/feat/product-engineering-preview-v1` (commit-base
  `2637cd483dcfbaa010d9fa8147c24371b344deb8`). Nenhum commit para `main`,
  nenhum deployment de produção.
- Origem: QA do deployment `dpl_EJZuk8trNubpxhi3fqHJs7N4SMJX`
  (P0=0, P1=1, P2=2, P3=1).
- **P1** (edição não evidente): `_products-tab.tsx` reescrito — cada card do
  Portfólio ganhou um botão explícito "Editar produto"/"Editar serviço" que
  abre um workspace dedicado com 5 abas (Geral, Custos, Operação,
  Posicionamento, Testes e resultados), "Voltar ao Portfólio" e "Testar no
  Laboratório". As seções de custo/operação/posicionamento da 1.1 foram
  reaproveitadas dentro das abas, sem duplicar nenhuma engine.
- **Fase 9** (Produto vs. Serviço): novo campo `ProductServiceItem.kind`
  (`"produto" | "servico"`); criação exige escolha explícita; nova função
  `productSegmentFields(segment, kind)` filtra campos de estoque/ingrediente/
  embalagem/validade para serviços, mesmo em segmentos como delivery/varejo.
  Motor de custo/operação inalterado — só rótulos da UI mudam por tipo.
- **P2**: Manual do Negócio ganhou seção explícita "Modelo de negócio"; SWOT
  reagrupada sob "Ambiente interno" (Forças/Fraquezas) e "Ambiente externo"
  (Oportunidades/Ameaças) com explicação curta — dados dos itens inalterados.
- **P3 + acessibilidade**: inputs de custo/meta/laboratório sem label e o
  botão de fechar do `MetricDetailModal` ganharam `aria-label`/`<label>`.
- Verificado via script ad-hoc (22 checks): filtragem por segmento/tipo,
  cenário "Serviço de consultoria", zero regressão nos motores reaproveitados
  (não alterados neste hotfix). `tsc`/`eslint`/`build`/`diff --check` limpos.
- `project-status.ts`: nenhuma área marcada `validated` — só `next_actions`/
  `notes` atualizados nas 6 áreas afetadas. `global_calendar`, `V1_PROGRESS`
  (81) e `V2_PROGRESS` (12) não tocados.
- Limitação declarada: sem navegador neste ambiente, os 17 passos de teste
  manual (Fase 14) e a verificação mobile real não puderam ser executados —
  validado por script ad-hoc e leitura de código; recomenda-se QA manual
  antes de qualquer promoção.

## Sessão anterior — 2026-07-20 — Sprint Motor LOKAT 1.1, DNA do Negócio e Engenharia de Produtos (branch isolada, NÃO mergeada)

- **Branch `feat/product-engineering-preview-v1`**, criada a partir de
  `origin/feat/motor-lokat-preview-v1` (não de `main` — este módulo depende do
  Motor LOKAT 1.0, que também ainda não está em `main`). Nenhum commit para
  `main`, nenhum deployment de produção.
- Duas abas novas dentro de "Meu Negócio": **Empresa** (DNA do Negócio com 19
  campos + origem própria cada um, 4 Ps, SWOT/FOFA com exemplos por segmento
  claramente marcados, Metas de Vendas, Manual do Negócio derivado ao vivo) e
  **Produtos e Serviços** (Portfólio com campos por segmento, Laboratório de
  testes reaproveitando o simulador de campanha já existente — nenhum segundo
  motor financeiro —, Matriz de Desempenho em 4 quadrantes com recomendações
  determinísticas).
- Pontes: "Testar em campanha" (Laboratório → aba Campanhas, via `seedInput`
  + remount por `key`) e "Criar campanha no REC OS" (link real para
  `/admin/contentos/criar?step=brief`, rota auditada antes de usar — contexto
  só exibido, não enviado).
- Reaproveitado sem duplicar: classificadores de meta do motor financeiro
  (agora exportados), utilitários de dinheiro/percentual, o simulador de
  campanha, os presets de segmento e todos os componentes visuais
  compartilhados da Sprint 1.0.
- Achado de lint corrigido: geração de IDs com `Date.now()`/`Math.random()`
  dentro de handlers "adicionar item" disparava `react-hooks/purity` por estar
  textualmente dentro do corpo do componente — extraído para `generateId()`
  em escopo de módulo (mesmo padrão do `uid()` do `CanvasEditor`).
- Verificado via script ad-hoc: os 10 cenários do prompt (matriz de
  desempenho nos 4 quadrantes, serviço sem estoque, produto em teste, produto
  sazonal, capacidade insuficiente, dados ausentes, margem negativa) — zero
  NaN/Infinity, zero classificação sem critério exposto. Suite da 1.0
  re-executada sem regressão.
- `src/config/project-status.ts`: 13 áreas novas (11 `qa_pending`, 1
  `planned`, 1 `blocked` — conector AiPede, bloqueado por documentação/
  autorização de API pendentes), todas anotadas como só desta branch.
  `global_calendar`/V1/V2 inalterados.
- TypeScript zero erros, build limpo, ESLint sem erros/warnings.
- **Se retomar**: confirmar Preview READY, decidir se/quando abrir PR
  (provavelmente encadeado: primeiro `feat/motor-lokat-preview-v1` → main,
  depois esta branch → main), e planejar a próxima fatia (persistência real,
  matriz com dados de vendas reais em vez de resultado de teste, LLM
  conectada).

## Sessão anterior — 2026-07-20 — Sprint Motor LOKAT 1.0 (branch isolada, NÃO mergeada)

- **Trabalho feito inteiramente na branch `feat/motor-lokat-preview-v1`**
  (criada a partir de `main` no commit `075b023`). Nenhum commit foi para
  `main`, nenhum push para `main`, nenhum deployment de produção — só
  `git push -u origin feat/motor-lokat-preview-v1`, aguardando Preview da
  Vercel.
- Nova rota `/admin/meu-negocio` ("Meu Negócio", badge "Motor LOKAT"):
  vertical slice funcional em modo demonstração — sem Supabase, sem
  persistência, tudo em memória. 6 abas: Visão Geral, Precificação,
  Campanhas, Fluxo de Caixa, Fontes, Glossário.
- Motor financeiro determinístico em `src/lib/motor-lokat/` (centavos
  inteiros, nunca float), verificado via script ad-hoc cobrindo os 7
  cenários pedidos (custo 40%/margem 60%, preço mínimo R$150, campanha
  saudável, campanha em prejuízo, CAC > LTV, dados insuficientes, capital de
  giro com 2 meses de cobertura) — zero NaN/Infinity.
- Simulador de campanha com CAC/LTV/payback e ponte de contexto para o REC
  OS (link real para `/admin/contentos/criar?step=brief`, rota auditada
  antes de usar — contexto só exibido, preenchimento automático é próxima
  fatia). Interpretador de insights por regras fixas, nenhuma LLM conectada
  (deixado explícito na tela). Prévia de payload para IA futura, nunca
  enviada a lugar nenhum.
- `src/config/project-status.ts`: 8 áreas novas adicionadas, todas anotadas
  como existentes só nesta branch. `global_calendar` não foi tocado.
- Item "Meu Negócio" na sidebar admin — só nesta branch.
- TypeScript zero erros, build limpo (uma falha de alocação de memória do
  Turbopack se resolveu limpando `.next` — não era um problema de código),
  ESLint sem erros/warnings, busca por padrões proibidos (Math.random,
  Date.now, window., Supabase, fetch, etc.) sem ocorrências reais.
- **Se retomar este trabalho**: confirmar se o Preview ficou READY, decidir
  se/quando abrir PR para `main`, e planejar o próximo vertical slice
  (persistência real, importação AiPede/CSV, preenchimento automático do
  contexto no REC OS).

## Sessão anterior — 2026-07-19 — Sprint 3.1A.3, hotfix definitivo: navegação nativa

- QA da 3.1A.2 reprovou: mesmo com a URL como única fonte de verdade (fix
  anterior), a navegação client-side (`next/link`/`router.push`) continuou
  instável em navegador real — mês anterior não voltava, Hoje ia para o mês
  errado, filtros aplicavam com atraso/invertidos. Causa provável: Client
  Router Cache do Next.js App Router reaproveitando payload RSC antigo.
- Decisão: trocar Anterior/Próximo/Hoje para `<a href>` HTML nativo (navegação
  de documento completo, fora do alcance do router cache); selects de
  cliente/fonte agora usam `window.location.assign(href)` em vez de
  `router.push`. `useRouter`/`useTransition`/`startTransition` removidos por
  completo do arquivo (confirmado por busca no código).
- Adicionado `data-testid` e `aria-label` em todos os 5 controles críticos
  para facilitar QA automatizado futuro.
- **Ressalva**: sem navegador disponível neste ambiente, não foi possível
  reproduzir o bug original nem rodar o roteiro de interação (esperar
  navegação completa entre cada passo). Correção segue a decisão técnica
  exigida pelo ticket e foi verificada por auditoria de código + regressão das
  suites ad-hoc anteriores.
- `global_calendar` continua `qa_pending`. Depois de aprovado, a próxima tarefa
  é a recuperação do núcleo V1 do REC OS — não Google Calendar. Google
  Calendar OAuth, Radar, PNG Vidigal, EditorOS e Projeto São Paulo seguem sem
  mudança.
- TypeScript zero erros, build limpo, ESLint sem erros/warnings novos.

## Sessão anterior — 2026-07-19 — Sprint 3.1A.2, hotfix final de navegação e estado

- Segundo QA Codex Web aprovou quase tudo da 3.1A.1, mas reportou 4 P1 de
  navegação: Hoje ficava preso no mês exibido; selects de cliente/fonte não
  atualizavam a URL; anterior/próximo paravam de funcionar com filtros ativos;
  cabeçalho/URL/filtros/agenda sem uma única fonte de verdade.
- Causa raiz: `GlobalCalendarContent` guardava `filterClient`/`filterSource` em
  `useState` PRÓPRIO, além de já vir da URL via props — dois estados
  concorrentes para o mesmo dado.
- Corrigido: removido esse `useState` duplicado; `filterClient`/`filterSource`
  agora são lidos direto das props (`initialFilterClient`/`initialFilterSource`,
  já validadas pelo servidor). Anterior/Próximo/Hoje agora são `<Link>`
  determinísticos, com hrefs pré-computados por uma função pura nova
  (`buildGlobalCalendarHref` + `shiftMonth` em `src/lib/global-calendar.ts`) —
  nunca dependem de estado local ou closures de `onClick`.
- **Ressalva**: não há navegador disponível neste ambiente para reproduzir o
  bug relatado ao vivo. A correção segue a arquitetura exigida pelo ticket
  (URL como fonte única de verdade) e foi verificada por script ad-hoc (16
  casos de navegação) + regressão das suites anteriores — não por observação
  visual do bug original sendo corrigido.
- `global_calendar` continua `qa_pending`. Google Calendar OAuth segue
  bloqueado até essa aprovação. Restauração UX do REC OS e "Projeto São Paulo"
  seguem na fila, sem mudança.
- TypeScript zero erros, build limpo, ESLint sem erros/warnings novos.

## Sessão anterior — 2026-07-19 — Sprint 3.1A.1, hotfix do Calendário Global pós-QA

- QA Codex Web (reportado pelo usuário) aprovou a base da 3.1A mas encontrou 4 P1:
  Hoje/navegação mensal prendiam a agenda no mês antigo (bug de `useState` não
  ressincronizado com a URL — não hidratação), `client` na URL era ignorado,
  cliente sem evento sumia do seletor, e Conteúdos/Produção não puderam ser
  validados (causa real: `content_items.scheduled_at` — coluna real usada pelo
  `ScheduleModal` da Home — nunca era consultada, só `scheduled_date`).
- Corrigido: `GlobalCalendarContent` agora remonta (`key={year-month-client-source}`)
  a cada mudança de URL, então todo estado inicial pode vir direto das props sem
  risco de ficar desatualizado; `page.tsx` aceita e valida `client`/`source`;
  lista de clientes vem de uma query própria (não mais derivada só dos eventos);
  `content_items` consultado por `scheduled_date` OU `scheduled_at` sem duplicar;
  `responsible_name` agora resolvido via `profiles.name` em lote.
- `global_calendar` continua `qa_pending` — não marcar `validated` até novo QA.
- Restauração UX do REC OS (Aprovações→Home, Radar, Mural de Referências,
  briefing guiado) é a próxima tarefa pendente, ainda **não iniciada**.
- "Projeto São Paulo" segue registrado como trilha paralela sem escopo recuperado.
- TypeScript zero erros, build limpo, ESLint sem erros/warnings novos.

## Sessão anterior — 2026-07-19 — Sprint 3.1A, Calendário Global somente leitura

- Nova rota `/admin/calendario` (admin/super_admin apenas): agrega `content_items`,
  `operational_tasks` e `approvals` de todos os clientes via `src/lib/global-calendar.ts`
  (modelo `GlobalCalendarEvent` + normalizadores puros), grade mensal, agenda do dia,
  filtro por cliente/fonte, modal de detalhe, deep-link para a tela de origem. Somente
  leitura — nenhuma criação/edição de evento.
- Reuniões (`commercial_meetings`, `productivity_meetings`) **não** entraram nesta
  sprint — ficam para 3.1C, junto com uma decisão sobre auditar/executar o SQL 38
  (nunca rodado, não faz parte da lista SQL 82-90).
- Item "Calendário Global" adicionado à sidebar admin.
- `src/config/project-status.ts`: área `global_calendar` (já existia, v2) passou de
  `planned` para `qa_pending`.
- Sem framework de teste no projeto — normalizadores verificados via script ad-hoc
  (`tsc` + `node`), não commitado; todas as asserções passaram.
- "Projeto São Paulo": pesquisado no repositório e docs — **nenhuma referência real
  encontrada** (só menções de "São Paulo" como texto de exemplo de cidade em
  formulários). Trilha paralela ativa, escopo aguardando recuperação do briefing
  original — não inventado, não implementado.
- TypeScript zero erros, build limpo, ESLint sem erros novos.
- Push desta sessão: ver Fase de push do relatório correspondente antes de assumir
  que já está em produção.

## Sessão anterior — 2026-07-19 — Encerramento formal da Sprint 3.0

**Commit validado em produção:** `71350309fcee615de0262f821d60e30beaf13877` (curto: `7135030`)
**Deployment validado:** `dpl_BXYjpnSfhkMbyQy7WMYCrzZ8pBG1`

- Sprint 3.0 encerrada e aprovada após QA final Codex Web: zero P0, zero P1, React #418 não reproduzido, nenhum hydration mismatch. Criar, Persistência, Produção, Aprovação, CopyIdButton e EditorOS (bridge) validados. Mobile aprovado. Nenhum runtime error.
- Resultado do QA reportado pelo usuário/Codex Web; não reexecutado nesta sessão, que foi puramente de fechamento documental/status.
- `src/config/project-status.ts` atualizado: `guided_create_flow`, `guided_create_persistence`, `approval_client_context`, `production_destination_visibility`, `approval_destination_visibility` → `validated`. `editor_os` mantido `qa_pending` (escopo futuro maior do editor não coberto por este QA), com nota clara do que foi validado.
- V1_PROGRESS = 81, V2_PROGRESS = 12 — inalterados.
- Pendências não bloqueantes: favicon.ico ausente, Financeiro com dados demo, upload dependente de extensão do Chrome, SQLs 82/84/86-89/90 aguardando auditoria de catálogo.
- **Próxima sprint autorizada: Sprint 3.1** — não iniciada nesta execução.

## Sessão anterior — 2026-07-18 — Sprint 3.0.5b, conclusão do hotfix de hidratação + CopyIdButton

**Commit:** `7135030` (push confirmado na sessão de encerramento acima)

- Home: `_NOW` de escopo de módulo removido; `serverNow` gerado no Server Component e propagado; atualização dinâmica via `useState(serverNow)` + `useEffect`.
- `onboarding-store.ts` / `canva-store.ts`: `getServerSnapshot`/`subscribe` estabilizados (referências fixas, sem recriação a cada chamada).
- Aprovações: datas formatadas com timezone explícito (`America/Fortaleza`) ou por composição direta dos componentes YYYY-MM-DD; `window.location.origin` movido para depois da montagem no modal técnico.
- EditorOS: `CanvasEditor` agora client-only via `next/dynamic({ ssr: false })`.
- CopyIdButton conectado em Criar, Produção e Aprovações (task_id, content_id, approval_id — nunca public_token).
- TypeScript zero erros, build limpo. ESLint acusa `react-hooks/purity` e `react-hooks/set-state-in-effect` nos arquivos alterados, mas são os mesmos padrões pré-existentes no restante do projeto (confirmado isoladamente em `aprovacoes/page.tsx` e no commit `a6f0f91` já aceito) — não são regressão desta sessão.
- **Pendente**: QA Codex Web (Playwright, navegador real com/sem extensão) não foi executado — sem navegador disponível neste ambiente. Push para `main` e deploy no Vercel também não executados; aguardando confirmação do usuário.
- SQL: nenhum executado. RLS/schema: inalterados. V1=81, V2=12 imutáveis.

## Sessão anterior — 2026-07-06 — waitlist, leads, landing REC OS

**Commit:** `c0f4a6a` — fix: waitlist leads e landing rec os

**P0 — Waitlist POST:**
- SQL 75 aplicado pelo usuário corrigiu `42703` (coluna `social_or_site` ausente na tabela).
- A rota POST `/api/launch/waitlist` já tinha anon fallback do commit anterior — agora deve funcionar.
- Se ainda falhar: verificar se `SUPABASE_SERVICE_ROLE_KEY` na Vercel aponta para o **mesmo projeto** que `NEXT_PUBLIC_SUPABASE_URL`.

**P0 — Admin waitlist (0 registros):**
- A rota já retorna debug `{ rowsReturned, countReturned }`.
- A página agora mostra diagnóstico detalhado quando `entries = []`.
- Causa mais provável: service role key incorreta/apontando para outro projeto → service role opera como anon → RLS filtra silenciosamente.
- **Ação manual**: confirmar no Supabase SQL Editor que `SELECT * FROM launch_waitlist` retorna registros.

**P1 — Central de Leads:**
- Nova rota: `GET /api/admin/leads` — une `launch_waitlist` + `admin_signups_view` (graceful fallback).
- Nova página: `/admin/super/leads` — filtros por fonte/status, ações para waitlist, legado somente leitura.
- Tab "Central de Leads" adicionado em `/admin/super/waitlist`.
- `admin_signups_view` somente leitura até mapear tabela base: rodar `SELECT pg_get_viewdef('public.admin_signups_view', true)` no SQL Editor.

**P2 — Landing:**
- Link "REC OS" no header: `/rec` → `/#rec-os` (seção na home, não o app externo).
- Nova seção `id="rec-os"` (dark) explica briefing/roteiro/calendário/aprovação/performance.
- Gradiente de transição hero → branco com gota vermelha animada (ponte visual Lokat OS → Lokat.rec).
- Beta pricing simplificado: 1 CTA principal + link para planos.

**Documentação:**
- `docs/DATA_MODEL_MULTI_TENANT_ARCHITECTURE.md` — modelo multi-tenant completo criado.
- `docs/DECISIONS.md` — 5 novas decisões registradas.
- `docs/ROADMAP.md` — pendências técnicas atualizadas.

**Pendências para próxima sessão:**
- Testar `/pre-acesso` em produção após deploy.
- Testar `/admin/super/waitlist` — deve mostrar registros ou diagnóstico claro.
- Testar `/admin/super/leads` — deve unir fontes.
- Rodar `SELECT pg_get_viewdef('public.admin_signups_view', true)` para descobrir tabela base.
- Ativar ações delete/archive em admin_signups_view após identificar tabela base.

## Estado atual

- Projeto: Lokat OS
- Pasta: `C:\Users\Trabalho\Desktop\COde\lokat-os`
- Branch principal observada: `main`
- Regra: preservar mudancas locais existentes e nao alterar codigo sem plano aprovado.

### Ultima sessao — 2026-07-04 — Meta Insights real

**Objetivo:** Sair do placeholder "em breve" e buscar metricas reais da Meta por cliente.

**O que foi implementado:**

- `GET /api/meta/insights/status?client_id=<uuid>`
  - Diagnostico seguro sem expor token.
  - Resolve: client_meta_assets → meta_connection → token (presenca + validade).
  - Retorna: ok, hasLinkedAsset, assetType, assetId, username, hasMetaConnection, hasAccessToken, canAttemptInsights, missing[], diagnostics, safeMessage.

- `GET /api/meta/insights?client_id=<uuid>&period=7d|15d|30d|current_month|custom&start_date&end_date`
  - Reescrito completamente.
  - Resolve token server-side via client_meta_assets → meta_connections.access_token.
  - Instagram Business: reach, impressions, profile_views, website_clicks, followers_count.
  - Facebook Page: page_impressions, page_reach.
  - Classifica erros Meta: 190=token_expired, 10=permission_missing, 100=invalid_param, 200=permission_error, 4/17/32=rate_limit.
  - Nunca retorna token.

- `src/app/admin/contentos/insights/_meta-insights-panel.tsx` (novo Client Component)
  - Seletor de periodo: 7 dias / 15 dias / 30 dias / mes atual / personalizado.
  - Chama status + insights no browser.
  - Cards: Alcance, Impressoes, Seguidores, Vis. de perfil, Cliques.
  - Bloco de diagnostico com erro Graph API + permissoes provaveis ausentes.

- `src/app/admin/contentos/insights/page.tsx`
  - Bloco Meta estatico "em breve" substituido por <MetaInsightsPanel clientId={clientId} />.
  - Query client_meta_assets removida do server component (feita pelo painel client-side).

- `src/app/admin/relatorios/page.tsx`
  - useEffect busca /api/meta/status ao montar.
  - Card "Relatorio de Conteudo": status aguardando → em_preparacao quando Meta conectada.

**Commit:** `4364e0d` — feat: adiciona insights reais da meta
**Push:** origin/main

**O que o sistema faz agora ao acessar ContentOS Insights com Meta vinculada:**
1. Mostra painel com seletor de periodo.
2. Chama Graph API com token real.
3. Se retornar metricas: exibe cards com numeros reais.
4. Se retornar erro de permissao (code 10 ou 200): exibe "Meta conectada, mas o app ainda nao tem permissao para ler esses insights" + scope provavel + endpoint + codigo Graph.
5. Se token expirado (code 190): exibe mensagem clara para reconectar.

**SQL necessario:** Nenhum novo. Depende dos SQLs 35, 37, 59/62 ja documentados.

**Pendencias:**
- Testar em producao apos deploy automatico Vercel.
- Se Graph API retornar erro 10 (permission_missing): anotar scope exato e endpoint.
- Se retornar metricas reais: confirmar valores com Codex Web.
- Produtos mais vendidos OlaClick: endpoint /v1/orders nao retorna itens — investigar se ha endpoint especifico para itens de pedido na OlaClick API.

### Ultima sessao — 2026-07-02 — fix OlaClick connect + Meta vinculation

**Causa raiz OlaClick "Selecione um cliente real":**
- `POST /api/olaclick/connect` usava admin client (service role) para validar client_id.
- Se a SUPABASE_SERVICE_ROLE_KEY estava errada/ausente no ambiente, a query retornava erro
  nao tratado e caia no bloco `!client` → mensagem enganosa.
- SQL 39 ja tinha RLS que permite super_admin/admin/agency via session JWT, mas o codigo
  nao usava session client.

**Fix OlaClick:**
- Connect route agora usa SESSION CLIENT por padrao para client lookup E para insert.
- Admin client so e tentado como fallback se session client retornar erro de permissao.
- Mensagem diferenciada: db_error / client_not_found / sql_pending.

**Causa raiz "Meta nao vinculada a este cliente":**
- SQL 37 nao incluia `super_admin` nas RLS policies de `client_meta_assets`.
- Usuario super_admin nao conseguia INSERT nem SELECT via session client.
- Link route chamava `createSupabaseAdminClient()` sem try-catch: exception nao capturada
  se SUPABASE_SERVICE_ROLE_KEY ausente.

**Fix Meta:**
- SQL 59 criado: atualiza policies de client_meta_assets incluindo super_admin em todas as
  operacoes (SELECT/INSERT/UPDATE/DELETE).
- Link route: try-catch em createSupabaseAdminClient(); session client primeiro, admin como
  fallback.

**UI de vinculation (commit e9eb3f7, sessao anterior):**
- Botoes "Vincular" em cada card de Pagina/Instagram em /admin/conexoes.
- Dropdown de cliente + Salvar/Cancelar inline.

**Onde fica salvo:**
- Conexao OlaClick: tabela `olaclick_connections`, coluna `client_id`
- Vinculo Meta: tabela `client_meta_assets`, coluna `client_id`

**Commits:**
- `e9eb3f7` — OlaClick retry logic + Meta vinculation UI (nao tinha sido pushed antes)
- `8ef2aad` — fix definitivo: session client first, SQL 59, link route resiliente

**SQL MANUAL OBRIGATORIO no Supabase (em ordem):**
1. `docs/supabase/39-olaclick-connections.sql` — se nao rodado ainda
2. `docs/supabase/37-client-meta-assets.sql` — se nao rodado ainda
3. `docs/supabase/59-fix-connections-client-linking.sql` — OBRIGATORIO (fix RLS super_admin)

**Pendencias:**
- Rodar os SQLs acima no Supabase SQL Editor.
- Testar conectar OlaClick em /admin/conexoes com Duh Lanches selecionado.
- Testar vincular @duh.lanches ao cliente Duh Lanches via botao "Vincular".
- Depois checar /admin/contentos/insights?client=<id> — deve mostrar "Meta conectada".
- Checar /admin/relatorios/faturamento — deve mostrar conexao OlaClick ativa.
- Portal cliente (dulanche@hotmail.com.br): ainda pendente, nao prioritario.

### Ultima sessao — 2026-07-01 — fix portal cliente via convite pendente

**Causa raiz identificada:**
- `dulanche@hotmail.com.br` nao tem profile no Supabase (nao existia em `public.profiles`).
- Nao tem client_id no profile, nao tem accepted_by no convite.
- `clients.email` estava vazio para Duh Lanches — step E nunca achava.
- Existe 1 `client_invites` com email `dulanche@hotmail.com.br`, `status = pending`, `client_id = 8062a63b-0292-4764-ba02-403c33f638fd`.

**Fix aplicado:**
- `src/lib/client/resolve-client.ts`: step D agora usa `.ilike()` para email, aceita `status pending` e `accepted`, auto-claim de convite pendente (UPDATE status=accepted, accepted_by, accepted_at), upsert profile com `client_id` e `role=client`, upsert `client_user_access`. Novo source: `invite_email_pending_claimed`.
- `src/app/client/home/_client-content.tsx`: fallback `Sua empresa` substituido por `Nenhuma empresa vinculada`.
- `src/app/client/debug-vinculo/page.tsx`: mostra cliente encontrado via client_id do convite, `inviteClaimedId`, `profileRepairedWith`.
- `src/app/admin/conexoes/page.tsx`: dropdown OlaClick mostra nome + email + id curto quando ha clientes com mesmo nome.

**Commits:**
- `d20b4f4` — admin inicio, video-background, smart-start-input, debug-vinculo (inicial)
- `32b4203` — fix resolver + auto-claim convite pendente + OlaClick dropdown

**Pendencias:**
- Testar em producao logando como dulanche@hotmail.com.br em /client/home.
- Verificar /client/debug-vinculo: deve mostrar `source=invite_email_pending_claimed`, `inviteClaimedId` preenchido.
- Apos primeiro login bem-sucedido, na segunda visita `source` deve ser `profile_client_id` (perfil foi reparado).
- OlaClick: verificar se Duh Lanches aparece com dois itens disambiguados no dropdown.
- Meta: card de ativos Meta mostra "Instagram Business desvinculado" — investigar client_meta_assets e fluxo de vinculo de ativo a cliente. Nao foi corrigido nesta sessao.
- Objetivo 5 (Meta ativos) NAO concluido — requer investigacao visual da pagina /admin/conexoes.
- Nao rodar SQL manual adicional — os campos necessarios ja existem (client_invites tem status, accepted_by, accepted_at).

## Ultima sessao

### Feito em 2026-06-29 - criacao e limpeza admin de clientes

- Ajustado `POST /api/admin/clients` para retornar diagnostico seguro e rastreavel de criacao: `step`, `role`, `account_type`, `serviceRoleConfigured`, `usedRpc`, `usedServiceRole`, `supabaseCode` e `supabaseMessage`.
- Confirmado no codigo que a criacao tenta primeiro a RPC `admin_create_client` com os parametros do SQL 51.
- Se a RPC `admin_create_client` estiver ausente ou com assinatura divergente, a API retorna erro claro apontando `docs/supabase/51-admin-create-client-bypass.sql` em vez de mascarar como RLS generico.
- Mantido fallback server-side por service role somente quando a RPC existe/falha por outro motivo e `SUPABASE_SERVICE_ROLE_KEY` esta configurada; nao ha insert pelo browser.
- Ajustado `DELETE /api/admin/clients/[id]` para aceitar `mode=archive` por padrao e `mode=hard` apenas para `super_admin`.
- Criada rota `POST /api/admin/clients/bulk-delete` para arquivar ou apagar definitivamente clientes selecionados usando RPCs do SQL 53.
- Criada rota `GET /api/admin/clients/cleanup` para listar candidatos de limpeza via RPC, sem apagar nada automaticamente.
- Criado `docs/supabase/53-client-admin-cleanup-tools.sql` com:
  - `admin_list_clients_for_cleanup()`
  - `admin_archive_clients(p_client_ids uuid[])`
  - `admin_hard_delete_clients(p_client_ids uuid[])`
  - exemplos comentados de uso manual.
- Ajustada tela `/admin/clientes`:
  - segmentos do modal de novo cliente atualizados;
  - botao "Selecionar clientes";
  - barra com contagem e acoes "Arquivar", "Apagar definitivamente" e "Cancelar selecao";
  - card com acoes textuais "Convite", "Editar", "Arquivar" e "Apagar";
  - modal de arquivar com texto de preservacao;
  - modal de hard delete exigindo nome do cliente ou `APAGAR`;
  - botao/painel "Limpeza" para consultar candidatos, sem pre-selecionar Duh Lanches ou qualquer outro cliente.
- Revalidado que `package.json` e `package-lock.json` nao tem diff.
- Validado `npx tsc --noEmit`.
- Validado `$env:TURBOPACK='0'; npm run build`.
- Validado `git diff --check`.

### Arquivos alterados em 2026-06-29 - criacao e limpeza admin de clientes

- `src/app/api/admin/clients/route.ts`
- `src/app/api/admin/clients/[id]/route.ts`
- `src/app/api/admin/clients/bulk-delete/route.ts`
- `src/app/api/admin/clients/cleanup/route.ts`
- `src/app/admin/clientes/page.tsx`
- `docs/supabase/53-client-admin-cleanup-tools.sql`
- `docs/HANDOFF.md`
- `docs/SESSION_LOG.md`

### Comandos executados em 2026-06-29 - criacao e limpeza admin de clientes

- `git diff -- package.json package-lock.json`
- `git status --short --branch`
- `git branch --show-current`
- `git log --oneline -5`
- `Get-Content AGENTS.md`
- `Get-Content docs/HANDOFF.md`
- `Get-Content docs/AI_CONTEXT.md`
- `Get-Content docs/SESSION_LOG.md`
- `Get-Content docs/DECISIONS.md`
- `Get-Content docs/ROADMAP.md`
- `npx tsc --noEmit`
- `$env:TURBOPACK='0'; npm run build`
- `git diff --check`

### Pendencias em 2026-06-29 - criacao e limpeza admin de clientes

- Rodar manualmente no Supabase SQL Editor: `docs/supabase/53-client-admin-cleanup-tools.sql`.
- Depois do deploy, testar em producao:
  1. criar cliente em `/admin/clientes`;
  2. conferir resposta de erro com `step` se ainda houver falha;
  3. arquivar um cliente teste;
  4. abrir "Limpeza", conferir o relatorio antes de selecionar;
  5. testar hard delete apenas com cliente teste e backup/conferencia manual.
- Nao apagar nem pre-selecionar Duh Lanches.
- Manter `docs/imagens-hero/`, `docs/videosweb-lokat-os/`, `imagens-hero/` e `rec-videos/` fora do commit.

### Proximo passo recomendado em 2026-06-29 - criacao e limpeza admin de clientes

- Fazer commit/push para disparar deploy automatico no Vercel `caiotech`; depois rodar SQL 53 no Supabase e testar `/admin/clientes` em producao.

### Feito em 2026-06-29 - exclusao e visibilidade de clientes

- Corrigida regra de visibilidade de clientes: clientes visiveis sao apenas `active` e `onboarding`.
- Clientes com `deleted_at` ou `archived_at` preenchido nao devem aparecer nas listas, seletores e conexoes.
- Criado helper central `src/lib/client-visibility.ts` com `CLIENT_VISIBLE_STATUSES`, status invisiveis e filtro defensivo de registro.
- Ajustado `GET /api/admin/clients` para nao retornar `inactive`, `archived`, `deleted`, `cancelled`, `test` ou soft-deleted.
- Ajustado `/api/admin/clients/[id]` para buscar apenas cliente visivel e para tentar RPC `admin_delete_client` antes dos fallbacks de soft delete.
- Ajustadas listagens/selecao em Admin Clientes, Diagnosticos, Plataforma, RecOS criar, Kanban Operacional, ContentOS e OlaClick.
- Ajustado portal/layout cliente e layout ContentOS para nao aceitar cliente apagado como ativo.
- Criado `docs/supabase/52-client-delete-and-cleanup.sql` com colunas `deleted_at`/`archived_at`, indices, view `v_real_clients` filtrada, RPC `admin_delete_client` e bloco comentado de limpeza manual dos clientes antigos.
- Atualizado `docs/supabase/51-admin-create-client-bypass.sql` para nao criar cliente com status `inactive`.
- Validado `npx tsc --noEmit`.
- Validado `$env:TURBOPACK='0'; npm run build`.

### Pendencias em 2026-06-29 - exclusao e visibilidade de clientes

- Rodar manualmente `docs/supabase/52-client-delete-and-cleanup.sql` no Supabase SQL Editor.
- Depois testar em producao: criar Duh Lanches, confirmar aparicao nos seletores, apagar no admin, recarregar e confirmar que nao volta.
- Se quiser limpar clientes antigos de teste, rodar primeiro o SELECT comentado no SQL 52 e so executar o UPDATE apos conferencia manual.
- `package.json` e `package-lock.json` tem alteracoes locais de Playwright nao relacionadas a esta tarefa e nao devem ser incluidas neste commit.

### Feito em 2026-06-29 - debug do POST de clientes

- Contexto validado pelo usuario: `SUPABASE_SERVICE_ROLE_KEY` ja esta disponivel em producao; `/api/debug/env-check` retornou service role configurada e `/api/debug/admin-client-test` confirmou leitura de `clients` via service role.
- O erro restante em `/admin/clientes` esta concentrado no `POST /api/admin/clients`, que retorna HTTP 500 ao tentar criar cliente real.
- Ajustado `POST /api/admin/clients` para logar diagnostico seguro do insert: role, `account_type`, `serviceRoleConfigured` e payload sanitizado sem dados sensiveis.
- Ajustado retorno de erro do insert para `code: "CLIENT_INSERT_FAILED"` com `supabaseError.message`, `code`, `details` e `hint`, sem stack trace e sem secrets.
- Ajustado tratamento de erro inesperado do `POST` para retornar `code: "CLIENT_CREATE_UNEXPECTED_ERROR"` e logar somente mensagem segura.
- Ajustado `/admin/clientes` para nao mostrar mensagem falsa sobre `SUPABASE_SERVICE_ROLE_KEY` quando a env esta OK; agora mostra mensagem especifica por `code` e, se existir, "Detalhe tecnico" com a mensagem do Supabase.
- Nao foram alterados `/rec`, landing, ContentOS ou assets locais.
- Validado `npx tsc --noEmit`.
- Validado `$env:TURBOPACK='0'; npm run build`.

### Feito em 2026-06-29 - fallback RLS no create client

- Usuario testou em producao e o erro real apareceu na tela: `new row violates row-level security policy for table "clients"`.
- Diagnostico: a env de service role existe e consegue ler `clients`, mas o insert feito pelo client admin nao esta bypassando RLS em producao. Sem `auth.uid()` na chamada service role, a policy baseada em `public.current_user_role()` nao consegue validar o usuario.
- Ajustado `POST /api/admin/clients` para, quando o insert via admin client retornar RLS, tentar um fallback server-side usando `createServerSupabaseClient()` com a sessao autenticada do admin.
- O fallback continua acontecendo no servidor, nao no browser, e preserva validacao previa de `super_admin`/`admin`.
- Mantidos os mesmos fallbacks de coluna ausente e status `active` -> `onboarding`.
- Validado `npx tsc --noEmit`.

### Arquivos alterados em 2026-06-29 - debug do POST de clientes

- `src/app/api/admin/clients/route.ts`
- `src/app/admin/clientes/page.tsx`
- `docs/HANDOFF.md`
- `docs/SESSION_LOG.md`

### Comandos executados em 2026-06-29 - debug do POST de clientes

- `git status --short --branch`
- `git branch --show-current`
- `git log --oneline -5`
- `npx tsc --noEmit`
- `$env:TURBOPACK='0'; npm run build`

### Pendencias em 2026-06-29 - debug do POST de clientes

- Apos deploy automatico, testar novamente `/admin/clientes` criando o cliente Duh Lanches.
- Se ainda retornar erro, copiar o `supabaseError.message/code/details/hint` retornado pelo `POST /api/admin/clients` ou consultar os logs da Vercel do projeto `caiotech`.
- So criar `docs/supabase/51-fix-clients-create-schema.sql` se o erro real indicar constraint/schema incompatível.
- Manter `docs/imagens-hero/`, `docs/videosweb-lokat-os/`, `imagens-hero/` e `rec-videos/` fora do commit nesta etapa.

### Proximo passo recomendado em 2026-06-29 - debug do POST de clientes

- Fazer push para `origin/main`, aguardar deploy automatico da Vercel no projeto `caiotech` e testar o cadastro real em `https://www.lokat.com.br/admin/clientes`.

### Feito em 2026-06-29 - debug seguro de env em producao

- Criada rota temporaria e segura `GET /api/debug/env-check` para validar em producao se o runtime que serve `www.lokat.com.br` enxerga as variaveis Supabase.
- A rota retorna somente booleanos para `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`, alem de `NODE_ENV`, `VERCEL_ENV` e `projectHint`.
- Nenhum valor, prefixo ou trecho de secret e retornado ou logado.
- Liberada a rota `/api/debug/env-check` no `src/proxy.ts` para evitar redirect para `/login` em producao.
- Reforcada a regra de deploy: publicar somente via `git push origin main` no repo `caiotech`; nao usar `vercel --prod` como padrao e nao criar projeto Vercel novo.

### Pendencias em 2026-06-29 - debug seguro de env em producao

- Apos deploy automatico, testar `https://www.lokat.com.br/api/debug/env-check`.
- Resultado esperado: `"supabaseServiceRoleConfigured": true`.
- Se vier `false`, configurar `SUPABASE_SERVICE_ROLE_KEY` no projeto Vercel correto: `caiotech` -> Settings -> Environment Variables, depois redeploy do ultimo Production.

### Feito em 2026-06-29 - ajuste service role obrigatoria

- Confirmado pelo usuario que `lokat.rec@hotmail.com` existe em `public.profiles` com `role = 'super_admin'`; portanto o erro nao era role do profile.
- Confirmado pelas migrations que `public.current_user_role()` depende de `auth.uid()`, entao retornar `NULL` no Supabase SQL Editor pode ser esperado fora da sessao real do app.
- Criado `docs/supabase/50-debug-current-user-and-client-create.sql` com queries de diagnostico para profiles, policies, RLS, funcao `current_user_role()` e atualizacao manual comentada para `super_admin`.
- Ajustado `createSupabaseAdminClient()` para usar `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, sem anon key e sem sessao de usuario, lancando erro claro se faltar env.
- Ajustado `POST /api/admin/clients` para validar usuario/profile, aceitar explicitamente `super_admin` e `admin`, e criar cliente somente via service role.
- Removido fallback silencioso para insert com anon/session quando `SUPABASE_SERVICE_ROLE_KEY` estiver ausente.
- Retorno de erro da API agora inclui `error`, `code`, `role`, `account_type` e `serviceRoleConfigured`, sem secrets.

### Pendencias em 2026-06-29 - ajuste service role obrigatoria

- Rodar `docs/supabase/50-debug-current-user-and-client-create.sql` apenas se precisar diagnosticar policies/profile no Supabase.
- Configurar `SUPABASE_SERVICE_ROLE_KEY` na Vercel se ainda estiver ausente e fazer novo deploy via GitHub/Vercel.
- Validar em producao a criacao de cliente em `/admin/clientes`.

### Feito em 2026-06-29

- Corrigido o fluxo real de criacao de cliente em `/admin/clientes` para tratar `super_admin` explicitamente.
- Ajustada API `POST /api/admin/clients` para validar sessao/role, usar service role quando disponivel, tentar fallback seguro com RLS e retornar diagnostico amigavel/tecnico sem vazar secrets.
- Adicionado diagnostico de `SUPABASE_SERVICE_ROLE_KEY` ausente no backend.
- Ajustadas rotas `PATCH` e `DELETE /api/admin/clients/[id]` para usar escrita server-side, registrar erros tecnicos e fazer soft delete com fallback para schemas em fases diferentes.
- Corrigida a rota de convite de cliente para nao gerar link falso quando `client_invites`/SQL 42 nao existe; agora mostra mensagem clara para rodar `docs/supabase/42-client-invites.sql`.
- Ajustado modal de novo cliente com lista de segmentos solicitada.
- Ajustada listagem de clientes do admin e do ContentOS para filtrar `deleted_at`/`archived_at` quando essas colunas existirem.
- Atualizado `docs/supabase/48-admin-insert-client.sql` com policies idempotentes para `super_admin`, `admin` e equipe operacional.
- Atualizado `docs/supabase/39-olaclick-connections.sql` para permitir `super_admin`.
- Atualizado `docs/supabase/49-marketing-diagnostics.sql` para permitir `super_admin` na leitura/atualizacao do diagnostico.
- Validado TypeScript com `npx tsc --noEmit`.
- Validado build com `$env:TURBOPACK=0; npm run build`.

### Arquivos alterados em 2026-06-29

- `src/lib/supabase/server.ts`
- `src/app/api/admin/clients/route.ts`
- `src/app/api/admin/clients/[id]/route.ts`
- `src/app/api/admin/clients/[id]/invite/route.ts`
- `src/app/admin/clientes/page.tsx`
- `src/lib/admin-contentos-clients.ts`
- `src/app/api/olaclick/connect/route.ts`
- `docs/supabase/48-admin-insert-client.sql`
- `docs/supabase/39-olaclick-connections.sql`
- `docs/supabase/49-marketing-diagnostics.sql`
- `docs/HANDOFF.md`
- `docs/SESSION_LOG.md`

### Comandos executados em 2026-06-29

- `Get-Content AGENTS.md`
- `Get-Content docs/HANDOFF.md`
- `Get-Content docs/AI_CONTEXT.md`
- `Get-Content docs/SESSION_LOG.md`
- `Get-Content docs/DECISIONS.md`
- `Get-Content docs/ROADMAP.md`
- `git status --short --branch`
- `git branch --show-current`
- `git log --oneline -8`
- `npx tsc --noEmit`
- `$env:TURBOPACK=0; npm run build`

### Pendencias em 2026-06-29

- Conferir na Vercel se `SUPABASE_SERVICE_ROLE_KEY` esta configurada.
- Rodar no Supabase os SQLs atualizados antes do teste real: `docs/supabase/48-admin-insert-client.sql`, `docs/supabase/42-client-invites.sql`, `docs/supabase/39-olaclick-connections.sql` e `docs/supabase/49-marketing-diagnostics.sql`.
- Testar autenticado em producao o fluxo: criar cliente, gerar convite, aceitar convite, selecionar no ContentOS, conectar OlaClick/Cardapio Digital, apagar cliente teste.
- Assets locais de `/rec` continuam nao rastreados e devem permanecer fora deste commit.

### Proximo passo recomendado em 2026-06-29

- Fazer commit/push desta correcao e aguardar deploy automatico da Vercel via GitHub.

### Instrucoes para o proximo agente

- Se `/admin/clientes` ainda mostrar RLS apos o deploy, primeiro confirmar se o SQL 48 atualizado foi rodado e se `SUPABASE_SERVICE_ROLE_KEY` existe na Vercel.
- Nao commitar `docs/imagens-hero/`, `docs/videosweb-lokat-os/`, `imagens-hero/` ou `rec-videos/`.

### Feito

- Continuidade da estabilizacao pos-feature apos commit `a7c39b8`.
- Ajustado `/contentos/selecionar-cliente` legado para listar clientes reais via tabela `clients` para admin/equipe ContentOS, sem depender de `profiles.role='cliente'`.
- Mantido cliente final restrito ao proprio `client_id` em `profiles.client_id` ou ao proprio `owner_id`.
- Ajustada API `GET /api/admin/clients` para nao listar clientes arquivados/deletados/teste nas listas padrao, trazendo apenas `active`, `onboarding` e `inactive`.
- Ajustadas rotas `PATCH` e `DELETE /api/admin/clients/[id]` para validar permissao de admin/super_admin/agency e executar escrita server-side segura.
- Ajustado soft delete de cliente com fallback de status (`archived` -> `inactive` -> `pausado`) para suportar schemas em fases diferentes.
- Ajustada rota `/api/meta/assets/link` para permitir `super_admin` e usar operacao server-side segura no vinculo/remocao de ativos Meta por `client_id`.
- Validado que o Diagnostico de Marketing Local aponta para planos/servicos Lokat e WhatsApp da Lokat, sem oferecer autonomo como caminho principal.
- Validado TypeScript com `npx tsc --noEmit`.
- Validado build com `$env:TURBOPACK=0; npm run build`.
- Estabilizado o fluxo de cadastro de cliente no admin para nao depender de insert direto sujeito a RLS.
- Criado helper server-side `createSupabaseAdminClient` para operacoes sensiveis com service role quando configurada.
- Ajustada API `POST /api/admin/clients` para validar usuario logado e permissao, inserir cliente server-side e retornar erro amigavel se RLS/SQL 48 ainda bloquear.
- Ajustado modal de Novo cliente: placeholder generico "Nome da empresa", opcao "Restaurante + Delivery" e sinalizacao de convite apos criar.
- Ajustada API de convite de cliente para validar permissao e criar/reusar convite com service role quando disponivel.
- Ajustado aceite de convite para nao mostrar sucesso quando a RPC `accept_client_invite` falha.
- Ajustada API de OlaClick para exigir `client_id` real e gravar/desconectar conexoes por cliente com operacao server-side segura.
- Validado TypeScript com `npx tsc --noEmit`.
- Validado build com `TURBOPACK=0`.
- Organizada a memoria oficial inicial para sincronizar Codex e Claude Code.
- Registrado o contexto real da ultima sessao feita no Claude Code.
- Foi criado o Diagnostico de Marketing Local, pronto para teste em `/diagnostico-marketing`.
- Criado funil de diagnostico de marketing local com 4 etapas.
- Criada logica de calculo `calculateMarketingDiagnosticScore`.
- Criada geracao de sugestoes `getMarketingDiagnosticSuggestion`.
- Criada normalizacao de WhatsApp `normalizeWhatsapp`.
- Criada funcao `buildWhatsappUrl`.
- Criada API server-side para salvar diagnostico usando service role.
- Criada notificacao/lead do diagnostico.
- Adicionada aba "Marketing Local" no admin de diagnosticos.
- Clicar em uma linha deve abrir modal com detalhes e botao de WhatsApp.

### Arquivos alterados

- `docs/HANDOFF.md`
- `src/lib/supabase/server.ts`
- `src/app/api/admin/clients/route.ts`
- `src/app/api/admin/clients/[id]/invite/route.ts`
- `src/app/admin/clientes/page.tsx`
- `src/app/convite/cliente/[token]/_client-content.tsx`
- `src/app/api/olaclick/connect/route.ts`
- `src/app/api/admin/clients/[id]/route.ts`
- `src/app/api/meta/assets/link/route.ts`
- `src/app/contentos/selecionar-cliente/page.tsx`

### Arquivos criados na sessao Claude Code

- `src/app/diagnostico-marketing/page.tsx`
- `src/lib/marketing-diagnostic.ts`
- `src/app/api/marketing-diagnostics/route.ts`
- `docs/supabase/49-marketing-diagnostics.sql`

### Arquivo alterado na sessao Claude Code

- `src/app/admin/diagnosticos/page.tsx`

### Comandos executados

- `Get-Content AGENTS.md`
- `Get-Content docs/AI_CONTEXT.md`
- `Get-Content docs/HANDOFF.md`
- `Get-Content docs/SESSION_LOG.md`
- `Get-Content docs/ROADMAP.md`
- `Get-Content docs/DECISIONS.md`
- `git status --short --branch`
- `git branch --show-current`
- `git log --oneline -5`
- `npx tsc --noEmit`
- `npm run build`
- `$env:TURBOPACK=0; npm run build`
- `rg "validateContentOSClient|ACTIVE_CLIENT_KEY|selecionar-cliente|client=" src/app src/components src/lib -n --glob '!node_modules/**'`
- `git diff --check`

### Acoes manuais obrigatorias

- Rodar no Supabase SQL Editor o arquivo `docs/supabase/49-marketing-diagnostics.sql` antes de testar envio real.
- Para resolver erro de cadastro de cliente no admin, rodar tambem `docs/supabase/48-admin-insert-client.sql`.
- Para convite real de cliente, rodar `docs/supabase/42-client-invites.sql`.
- Para conexao real OlaClick/Cardapio Digital, rodar `docs/supabase/39-olaclick-connections.sql`.

### Teste esperado

1. Acessar `/diagnostico-marketing`.
2. Preencher o funil.
3. Enviar o diagnostico.
4. Confirmar que o envio vai para `/api/marketing-diagnostics`.
5. Confirmar que o registro aparece em `/admin/diagnosticos` na aba Marketing Local.
6. Clicar em uma linha e validar modal com detalhes e botao WhatsApp.

### Pendencias

- Executar manualmente os SQLs obrigatorios no Supabase.
- Testar o fluxo real do Diagnostico de Marketing Local.
- Validar a aba Marketing Local em `/admin/diagnosticos`.
- Confirmar se o modal de detalhes e o botao WhatsApp funcionam como esperado.
- Testar em ambiente autenticado a criacao de cliente real via `/admin/clientes`.
- Testar geracao e aceite de convite real apos SQL 42.
- Testar conexao OlaClick por `client_id` apos SQL 39.
- Testar vinculo Meta por `client_id` apos SQL 37.
- Assets locais de `/rec` permanecem nao rastreados e devem ser ignorados nesta etapa.

### Proximo passo recomendado

- Antes de qualquer teste real, aplicar `docs/supabase/49-marketing-diagnostics.sql` no Supabase.
- Se tambem for testar cadastro de cliente no admin, aplicar `docs/supabase/48-admin-insert-client.sql`.
- Depois, testar o fluxo completo descrito acima.

### Instrucoes para o proximo agente

- Leia `AGENTS.md` e os arquivos de memoria em `docs/` antes de agir.
- Nao leia `node_modules`, `.next`, `dist`, `build` ou caches, salvo instrucao explicita posterior.
- Nao altere `src`, `app`, `components`, `lib`, `api` ou banco de dados sem plano aprovado.
- Preserve arquivos modificados e nao rastreados existentes.
- Nao rode `npm run dev`, nao abra navegador, nao commite e nao envie push sem instrucao explicita do usuario.

## 2026-07-15 - Sprint 3.0 checkpoint permanente

### O que foi feito

- Criados documentos permanentes de contexto e backlog para sincronizacao Codex/Claude.
- Registrada decisao de tratar SQL 82, 84, 86, 87, 88 e 89 como `partial_unknown` ate auditoria live.
- Criada auditoria local dos SQLs 82-89 sem executar DDL.
- SQL 90 foi tentado/executado e falhou. Status: `failed`. Nao re-executar.
- Corrigido export PNG do EditorOS para usar Blob, URL temporaria, link anexado ao `body`, estado `exporting` e erro sanitizado.
- Corrigidos links visiveis antigos da Visao Geral para usar `/admin/contentos/*` quando ha `client`.
- Substituida a pagina admin `/admin/contentos/criar` por fluxo unico REC OS em 5 etapas.
- Criadas notas de arquitetura para Calendario Global, Cliente 360 e Financeiro por Cliente.
- Atualizado `src/config/project-status.ts` com estados da Sprint 3.0 sem alterar `V1_PROGRESS` e `V2_PROGRESS`.

### Arquivos alterados/criados

- `docs/CODEX_CURRENT_CONTEXT.md`
- `docs/IMPLEMENTATION_LEDGER.md`
- `docs/UNTOUCHED_BACKLOG.md`
- `docs/DECISIONS.md`
- `docs/HANDOFF.md`
- `docs/SESSION_LOG.md`
- `docs/supabase/AUDIT_SQL_82_89_2026-07-15.md`
- `docs/supabase/90-reconcile-partial-foundations.sql`
- `docs/architecture/GLOBAL_CALENDAR_V1.md`
- `docs/architecture/CLIENT_360_V1.md`
- `docs/architecture/CLIENT_FINANCE_V1.md`
- `src/app/admin/contentos/criar/page.tsx`
- `src/app/admin/contentos/criar/_guided-create-flow.tsx`
- `src/app/admin/contentos/editor-os/CanvasEditor.tsx`
- `src/app/admin/contentos/editor-os/EditorOSWorkspace.tsx`
- `src/app/admin/contentos/visual/page.tsx`
- `src/app/admin/status/page.tsx`
- `src/app/contentos/home/_client-content.tsx`
- `src/config/project-status.ts`

### Comandos executados

- `git fetch origin`
- `git status --short --branch`
- `git branch --show-current`
- `git log --oneline -30`
- `git log origin/main..HEAD --oneline`
- `git diff --stat`
- `git diff --name-status`
- `git diff --check`
- `npx tsc --noEmit`
- `$env:TURBOPACK='0'; npm run build`

### Pendencias

- Nao foi possivel auditar o catalogo live do Supabase nesta sessao porque nao havia canal autenticado de SQL read-only no workspace.
- Rodar manualmente as queries SELECT em `docs/supabase/AUDIT_SQL_82_89_2026-07-15.md`.
- Nao executar `docs/supabase/90-reconcile-partial-foundations.sql` sem revisar o resultado da auditoria live.
- Validar em producao o download PNG do EditorOS.
- Validar em producao o novo fluxo `/admin/contentos/criar?client=<uuid>`.

### Proximo passo recomendado

1. Fazer commit/push dos grupos desta entrega.
2. Aguardar deploy automatico da Vercel.
3. Rodar smoke test autenticado em producao para EditorOS PNG, REC OS Criar e `/admin/status`.
4. Depois, executar somente SELECTs de auditoria no Supabase antes de qualquer SQL corretivo.

### Instrucoes para o proximo agente

- Nao classificar SQL 86-89 como completos nem como nao executados; o estado oficial e `partial_unknown`.
- SQL 85 continua `not_executed`.
- SQL 90: `failed` — tentado e falhou. Nao re-executar. Ver `docs/supabase/90-reconcile-partial-foundations.sql` para contexto.
- Nao renomear rotas tecnicas `/contentos`; apenas manter nome publico visivel como REC OS.
- Assets locais nao rastreados continuam fora do escopo e nao devem ser apagados.

## 2026-07-28 - Meu Negocio Centro de Comando e IA V1

### O que foi feito

- Criado Centro de Comando demonstrativo com cards clicaveis, graficos, alertas e fontes visiveis.
- Criado `MetricCalculationTrace` e drawer "Como calculamos" com formula, inputs, fontes, periodo, cobertura e exclusoes.
- Criado catalogo em memoria de Produtos e Fichas Tecnicas, com busca, filtros, vinculos revisaveis e anexos de sessao.
- Adicionada evolucao e decomposicao explicavel do CMV, sem afirmar causas quando faltam dados.
- Auditada a integracao OlaClick existente, sem chamada runtime e sem inventar estado conectado.
- Criado Assistente Lokat server-side com SDK oficial OpenAI, Responses API, JSON Schema estrito, `store: false`, limite, timeout e fallback sem chave.
- Corrigidos pontos visuais de role Super Admin, selo individual da Duh, linguagem dos quadrantes, profundidade da Visao simples e tooltip/legenda.

### Arquivos principais

- `src/lib/business-command-center/*`
- `src/app/admin/meu-negocio/_restaurant-overview.tsx`
- `src/app/admin/meu-negocio/_product-command-center.tsx`
- `src/app/admin/meu-negocio/_ask-lokat-panel.tsx`
- `src/app/api/meu-negocio/ai/analyze/route.ts`
- `docs/olaclick-command-center-audit.md`
- `src/config/project-status.ts`

### Validacoes

- `npx tsc --noEmit --skipLibCheck`: aprovado.
- ESLint somente nos arquivos alterados: aprovado.
- `npx next build --webpack`: aprovado.
- Testes novos: 92 assercoes aprovadas.
- Estoque, custos e financas anteriores: aprovados.
- Suite antiga de CMV: bloqueada antes das assercoes pela incompatibilidade existente de `require` em escopo ESM no Node 24.
- Servidor: `http://127.0.0.1:3005`, landing/login 200 e rota autenticada redirecionando corretamente ao login.

### Pendencias e proximo passo

- Executar QA visual autenticado em 390, 768, 1024 e 1440 px; navegador interno sem sessao local nesta execucao.
- Validar OlaClick em runtime antes de mudar qualquer capacidade para conectado.
- Configurar `OPENAI_API_KEY` e `OPENAI_MODEL_MEUNEGOCIO` somente no servidor para QA real do assistente.
- Corrigir ou padronizar o runner antigo de CMV para Node 24.
- Branch publicada: `feat/meu-negocio-command-center-ai-v1`; nao houve merge, deploy ou alteracao da main.

## 2026-07-28 - Meu Negócio Navegação e Design Profissional V1

### O que foi feito

- Criada worktree isolada `lokat-os-meu-negocio-dashboard-design` na branch `feat/meu-negocio-dashboard-design-system-v1`.
- Reorganizada a navegação em oito áreas principais, com seletor mobile e subnavegação contextual preservada por área.
- Unificados Produtos e Fichas, e Estoque e Compras, sem apagar os componentes anteriores.
- Criado Centro de Comando executivo com seis KPIs principais, indicadores complementares, cascata de resultado gerencial, CMV, caixa, reserva, produtos, estoque, alertas, qualidade e ações rápidas.
- Criados tokens locais de dashboard, foco visível, reduced motion e estados de fonte.
- Fontes e Integrações passaram a mostrar atualidade, confiabilidade e estado honesto; OlaClick permanece `Não testado`.
- Documentadas cinco referências open source e suas licenças, sem cópia integral ou dependência nova.

### Arquivos principais

- `src/app/admin/meu-negocio/_restaurant-workspace.tsx`
- `src/app/admin/meu-negocio/_command-center-dashboard.tsx`
- `src/app/admin/meu-negocio/_business-result-waterfall.tsx`
- `src/app/admin/meu-negocio/_dashboard-design-tokens.ts`
- `src/app/admin/meu-negocio/_sources-tab.tsx`
- `src/lib/business-command-center/__tests__/dashboard-navigation.structural.test.ts`
- `docs/meu-negocio-dashboard-open-source-references.md`
- `src/config/project-status.ts`

### Validações

- TypeScript aprovado.
- ESLint dos arquivos alterados aprovado.
- 46 asserções novas de navegação/dashboard aprovadas.
- 29 asserções anteriores de UI/IA e 63 do Centro de Comando aprovadas.
- 65 asserções do vertical slice Restaurante e 28 de UI Financeiro aprovadas.
- Suítes puras de estoque (25), custos (21), financeiro (44), mercado UI (12) e CMV UI (20) aprovadas.
- Build Webpack aprovado com `NODE_OPTIONS=--max-old-space-size=4096`; primeira tentativa falhou somente por limite local de heap.

### Pendências

- Executar QA visual autenticado em 390, 768, 1024 e 1440 px.
- Não marcar a área como validada antes do QA visual.
- Validar OlaClick em runtime em sprint própria antes de alterar seu estado.

### Próximo passo recomendado

- Abrir o servidor local desta worktree, autenticar como Super Admin e executar o roteiro visual do Centro de Comando.
