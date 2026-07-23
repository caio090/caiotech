# Implementation Ledger

Formato append-only para continuidade entre agentes.

## 2026-07-23 (Release canônica LOKAT OS 1.0 — consolidação de REC OS e Meu Negócio em `main`)

### Branch

`release/canonical-production-v1`, local, criada a partir de `main`
(`075b023`). Mergeada em `main` via `--no-ff` após todas as fases desta
release; `main` é o único ref enviado ao remoto.

### Executor

Claude Code

### Origem

Ticket "RELEASE CANÔNICA LOKAT OS 1.0" — eliminar a fragmentação entre
branches, publicando em `main` somente o que já era estável.

### O que entrou

- `fix/rec-os-global-navigation` (`71fcf9f`) — squash em `feat(rec-os):
  consolidate global navigation`.
- `fix/product-engineering-usability-v1` (`d0ba70e`) — squash em
  `feat(meu-negocio): integrate Motor LOKAT and product engineering`.
- `fix(admin): unify canonical routes and navigation` — consolidação de
  `/admin/contentos/selecionar-cliente` (parou de usar `localStorage`,
  passou a redirecionar para o hub com o seletor aberto) + criação de
  `src/config/admin-routes.ts` (registro simples, não substitui a sidebar).
- `feat(status): consolidate production status metadata` — `/admin/status`
  ganhou banner de ambiente/branch/commit/deployment lido server-side de
  variáveis públicas da Vercel.
- `docs(context): record canonical production release` — este registro.

### O que NÃO entrou (permanece preservado em branch separada)

- `feat/motor-lokat-ai-experience-v1` (assistente de IA — P1 conhecido na
  rota server-side).
- `feat/editor-os-layer-scanner-v1` e `fix/editor-os-demo-runtime-v1`
  (scanner/OCR/conversão/serialização do EditorOS, commits `8659805`/
  `00b8e6f` — QA completo ainda pendente).

### Verificação

`tsc --noEmit --skipLibCheck` limpo · `npm run build` (Turbopack) concluído
com exit 0 · `eslint` nos arquivos alterados sem erro novo (3 erros
pré-existentes, confirmados idênticos em `origin/main`/na branch de origem
via `git show`, não introduzidos por esta release) · `git diff --check`
limpo · busca por padrões proibidos (`<<<<<<<`, `OPENAI_API_KEY`,
`service_role`, `public_token` etc.) sem ocorrência real de segredo — só
menções em documentação e um campo `public_token` legítimo e pré-existente
em `_client-content.tsx` (token de aprovação pública, não credencial). Smoke
test local (servidor com `.env.local` real, sem sessão autenticada):
`/admin/meu-negocio`, `/admin/status`, `/admin/contentos`,
`/admin/contentos/aprovacoes`, `/admin/contentos/producao` e
`/admin/contentos/editor-os` — todos HTTP 307 para `/login`, nenhum 404/500.

### project-status.ts

Resolvido como união das áreas das duas branches integradas (nunca um
arquivo inteiro escolhido de uma branch só). Nenhuma área nova marcada
`validated`. `global_calendar`, `V1_PROGRESS` (81) e `V2_PROGRESS` (12)
intocados.

### Push

Somente `main` foi enviado ao remoto. Nenhuma branch de feature ou de
release foi enviada.

## 2026-07-22 (Sprint Motor LOKAT 1.1.1 — hotfix de cadastro, edição e acessibilidade, branch isolada)

### Branch

`fix/product-engineering-usability-v1`, criada a partir de
`origin/feat/product-engineering-preview-v1` (commit-base
`2637cd483dcfbaa010d9fa8147c24371b344deb8`). **Nada mergeado ou enviado para
`main`.**

### Executor

Claude Code

### Origem

QA do deployment `dpl_EJZuk8trNubpxhi3fqHJs7N4SMJX` (P0=0, P1=1, P2=2, P3=1).

### P1 — edição detalhada não evidente/acessível

Antes: um único acordeão plano por card do Portfólio mostrava tudo (geral +
custos + operação + posicionamento) sem nenhum botão de edição explícito.
Depois: `_products-tab.tsx` reescrito com um fluxo de duas telas —
lista → botão "Editar produto"/"Editar serviço" → workspace com 5 abas
internas (Geral, Custos, Operação, Posicionamento, Testes e resultados),
"Voltar ao Portfólio" e "Testar no Laboratório". As seções de custo/operação/
posicionamento já existentes foram reaproveitadas dentro das abas — nenhuma
engine duplicada.

### Fase 9 — Produto vs. Serviço

Novo tipo `ProductKind` (`business-types.ts`) e campo `ProductServiceItem.kind`.
Criação passa a exigir escolha explícita (`NewItemChooser`). Nova função
`productSegmentFields(segment, kind)` em `product-presets.ts` filtra campos
de estoque/ingrediente/embalagem/validade/SKU/armazenamento para serviços,
mesmo em segmentos como delivery/varejo. Motor de custo/operação inalterado —
só rótulos da UI mudam por tipo (ex.: "Perda esperada" -> "Retrabalho
esperado" para serviço).

### P2 — Manual e SWOT

`_business-tab.tsx`: Manual do Negócio ganhou seção explícita "Modelo de
negócio" (lida de `dna.businessModel.value`); SWOT/FOFA reagrupada sob
"Ambiente interno" (Forças/Fraquezas) e "Ambiente externo"
(Oportunidades/Ameaças), cada um com explicação curta — estrutura de dados
dos itens não mudou.

### P3 + acessibilidade

Inputs de componentes de custo, selects de estágio/decisão do Laboratório,
inputs de meta e `BusinessSourceSelect`/botão fechar do `MetricDetailModal`
(`_shared.tsx`) ganharam `aria-label`/`<label>` associados.

### Verificação

`hotfix-verify.js` (script ad-hoc, 22 checks): filtragem de campos por
segmento/tipo, cenário "Serviço de consultoria" (custo por hora, sem
embalagem, sem NaN/Infinity), zero regressão nos motores de operação/
matriz/laboratório/campanha (não alterados neste hotfix). `tsc`, `eslint`,
`npm run build` e `git diff --check` limpos. Busca por
`Math.random|Date.now|localStorage|sessionStorage|Supabase|fetch(|axios|
service_role|public_token` não encontrou nada fora do `generateId()`
pré-existente (já auditado na 1.1).

### Status

`project-status.ts`: nenhuma área marcada `validated` — todas seguem
`qa_pending`/`planned`/`blocked` como já estavam. Só `next_actions`/`notes`/
`last_updated` atualizados em `business_manual`, `business_swot`,
`product_portfolio`, `product_cost_engineering`, `product_positioning`,
`product_laboratory`. `global_calendar`, `V1_PROGRESS` (81) e
`V2_PROGRESS` (12) não tocados.

### Limitação declarada

Testes de clique-a-clique e verificação mobile real não puderam ser
executados neste ambiente por falta de navegador — verificado via script
ad-hoc e leitura de código. Recomenda-se QA manual em navegador antes de
qualquer promoção.

## 2026-07-20 (Sprint Motor LOKAT 1.1 — DNA do Negócio e Engenharia de Produtos, branch isolada)

### Branch

`feat/product-engineering-preview-v1`, criada a partir de
`origin/feat/motor-lokat-preview-v1` (não de `main`, pois este módulo depende
do Motor LOKAT 1.0). **Nada mergeado ou enviado para `main`.**

### Executor

Claude Code

### Objetivo

Expandir o preview do Motor LOKAT com DNA do Negócio (perfil estratégico, 4 Ps,
SWOT, metas, manual consolidado) e Engenharia de Produtos e Serviços
(portfólio, composição de custo, operação/capacidade, laboratório de testes,
matriz de desempenho, recomendações determinísticas, pontes para Campanhas e
REC OS) — sem duplicar o motor financeiro ou o simulador de campanha já
existentes.

### Auditoria de reuso (Fase 1)

Antes de escrever qualquer código novo, auditados `src/app/admin/meu-negocio/`,
`src/lib/motor-lokat/` e `src/config/project-status.ts` da Sprint 1.0.
Reaproveitado sem duplicar: `combineConfidence`, `classifyCostVsGoal`/
`classifyMarginVsGoal` (agora exportados de `financial-engine.ts`),
`safeDivide`/`formatCents`/`formatPercent`/`parseCentsInput`/`parsePercentInput`
(`money.ts`), `calculateCampaignProjection` (`campaign-engine.ts`),
`SEGMENT_PRESETS`/`SEGMENT_ORDER`, todos os componentes de `_shared.tsx`
(`MoneyInput`, `PercentInput`, `NumberInput`, `SourceBadge`, `ConfidenceLabel`,
`StatusPill`, `GlossaryHelpIcon`, `MetricCard`, `MetricDetailModal`).

### Arquivos criados

- `src/lib/motor-lokat/business-types.ts` — tipos de DNA do Negócio (com
  `BusinessDataSource` de 5 valores, incluindo "diagnostico"), 4 Ps, SWOT,
  Metas de Vendas, Produtos/Serviços, Laboratório e Matriz de Desempenho.
  Mantido separado de `types.ts` para não tocar no código já shipado da 1.0.
- `src/lib/motor-lokat/product-cost-engine.ts` — custo direto, CMV/CSV e
  margem de contribuição unitária, reaproveitando os classificadores do motor
  financeiro em vez de duplicar a lógica de comparação com meta.
- `src/lib/motor-lokat/product-operations-engine.ts` — capacidade projetada,
  utilização, vendas possíveis, gargalo e risco operacional — nunca inventa
  demanda, só compara capacidade informada contra capacidade máxima informada.
- `src/lib/motor-lokat/performance-matrix.ts` — classificação em 4 quadrantes
  (venda × margem) contra meta configurada ou mediana da categoria (critério
  sempre exposto) + recomendações determinísticas por quadrante.
- `src/lib/motor-lokat/lab-decision-rules.ts` — sugestão de decisão pós-teste
  (manter/ajustar preço/reformular/retirar/expandir/etc.), nunca executada
  automaticamente.
- `src/lib/motor-lokat/product-presets.ts` — campos extras por segmento
  (delivery, varejo, clínica, serviços/agência, SaaS).
- `src/lib/motor-lokat/ai-pede-contract.ts` — contrato conceitual de campos
  (Fase 19) — zero chamada de API, zero endpoint, zero dado real.
- `src/app/admin/meu-negocio/_business-tab.tsx` — aba Empresa: DNA do Negócio
  (19 campos com origem própria), 4 Ps, SWOT/FOFA (com exemplos por segmento
  claramente marcados como exemplo), Metas de Vendas (real/meta/diferença/%
  atingido), Manual do Negócio (derivado ao vivo, não é cópia separada).
- `src/app/admin/meu-negocio/_products-tab.tsx` — aba Produtos e Serviços:
  Portfólio (cadastro em memória com campos por segmento), Laboratório
  (fluxo Ideia→Planejamento→Teste→Resultado→Decisão reaproveitando
  `calculateCampaignProjection`), Matriz de Desempenho (4 quadrantes +
  recomendações), pontes "Testar em campanha" e "Criar campanha no REC OS".

### Arquivos alterados

- `src/lib/motor-lokat/financial-engine.ts` — `classifyCostVsGoal`/
  `classifyMarginVsGoal` exportados (eram privados) para reuso em
  `product-cost-engine.ts`. Nenhuma mudança de comportamento.
- `src/app/admin/meu-negocio/_shared.tsx` — `BusinessSourceSelect`/
  `DnaTextField` (badge/input com origem de 5 valores) e `generateId()`
  (gerador de id de módulo, usado por todos os "adicionar item" das novas
  abas — extraído para resolver um achado de lint, ver abaixo).
- `src/app/admin/meu-negocio/_campaign-tab.tsx` — novo prop opcional
  `seedInput`, usado pela ponte de Produtos e Serviços/Laboratório; banner
  informando que os dados vieram de Produtos e Serviços quando presente.
- `src/app/admin/meu-negocio/_client-content.tsx` — duas novas abas
  ("Empresa", "Produtos e Serviços") na ordem pedida; estado de DNA/4Ps/SWOT/
  Metas/Produtos/Laboratório levantado para o shell (nunca resetado por troca
  de segmento); `campaignSeed`/`campaignSeedVersion` para a ponte de campanha
  (remount via `key`, mesmo padrão determinístico das sprints do Calendário
  Global).
- `src/config/project-status.ts` — 13 áreas novas.

### Achado de qualidade corrigido

Geração de IDs (`Date.now()`/`Math.random()`) dentro dos handlers de
"adicionar item" (SWOT, produto, componente de custo, teste de laboratório,
meta) disparava `react-hooks/purity` — o linter não consegue provar que uma
chamada textualmente dentro do corpo do componente só roda em handler de
clique. Corrigido extraindo `generateId()` para escopo de módulo em
`_shared.tsx` (mesmo padrão do `uid()` já usado em `CanvasEditor.tsx`).

### Verificação

- Script ad-hoc (`tsc` standalone + `node`, sem framework de teste instalado):
  os 10 cenários do prompt — 4 quadrantes da matriz de desempenho, serviço
  sem estoque (capacidade sem depender de inventário), produto em teste
  (Laboratório reaproveitando o simulador), produto sazonal, capacidade
  insuficiente (utilização >90% → risco alto), dados ausentes (confiança
  "insuficiente", nenhum NaN), margem negativa (status "crítico") — todos
  passaram. Suite da Sprint 1.0 (7 cenários) re-executada sem regressão após
  exportar os classificadores.
- Busca por `Math.random`/`Date.now`/`new Date(`/`localStorage`/
  `sessionStorage`/`Supabase`/`fetch(`/`axios`/`public_token`/`service_role`
  nos arquivos alterados: zero ocorrências fora do `generateId()` já descrito
  (que só roda em handlers de clique, nunca durante o render).

### SQL

- Nenhum SQL executado, nenhuma migration criada, nenhuma env real alterada,
  nenhuma biblioteca instalada, nenhuma chamada de API externa.

### Qualidade

- `npx tsc --noEmit --skipLibCheck`: zero erros.
- `npm run build`: compilado com sucesso.
- ESLint nos arquivos alterados/criados: zero erros/warnings (após o fix do
  `generateId`).
- `git diff --check`: sem erros.

### Resultado

- V1_PROGRESS = 81, V2_PROGRESS = 12 (imutáveis). `global_calendar` inalterado.
- Push feito somente da branch `feat/product-engineering-preview-v1` — `main`
  nunca tocado, nenhum deployment de produção criado.

---

## 2026-07-20 (Sprint Motor LOKAT 1.0 — preview "Meu Negócio", branch isolada)

### Branch

`feat/motor-lokat-preview-v1`, criada a partir de `main` no commit `075b023`.
**Nada desta sprint foi mergeado ou enviado para `main`.**

### Executor

Claude Code

### Objetivo

Entregar um vertical slice funcional e demonstrável do módulo "Meu Negócio"
(Motor LOKAT): visão geral financeira, precificação, campanhas, fluxo de
caixa, fontes e glossário — editável, com cálculos reagindo em tempo real,
sem depender de Supabase.

### Arquivos criados

- `src/lib/motor-lokat/types.ts` — tipos compartilhados (segmento, perfil
  financeiro, métrica com origem/confiança/fórmula, precificação, fluxo de
  caixa, campanha, contexto REC OS, glossário, payload LLM, insight).
- `src/lib/motor-lokat/money.ts` — cents-based (`formatCents`,
  `parseCentsInput`, `formatPercent`, `parsePercentInput`, `safeDivide`,
  `roundFraction`) — nunca float para dinheiro.
- `src/lib/motor-lokat/financial-engine.ts` — `buildFinancialSnapshot()`:
  faturamento bruto, receita reconhecida/líquida, custo direto (%),
  despesas variáveis (%), margem de contribuição (%), despesas fixas,
  resultado operacional (%), ticket médio, ponto de equilíbrio (faturamento
  e quantidade), capital de giro sugerido — cada métrica com fórmula,
  explicação simples/técnica, origem, confiança e status vs. meta
  configurável (nunca limite universal escondido).
- `src/lib/motor-lokat/pricing-engine.ts` — `calculatePricing()`: Preço =
  Custo ÷ [1 − (fixas% + variáveis% + margem%)], com bloqueio quando a soma
  ≥ 100%.
- `src/lib/motor-lokat/cash-flow-engine.ts` — `calculateCashFlow()`: saldo
  projetado/realizado, capital de giro, meses de cobertura, risco.
- `src/lib/motor-lokat/campaign-engine.ts` — `calculateCampaignProjection()`:
  desconto financiado pela empresa, receita reconhecida/margem por pedido,
  investimento fixo, pedidos para equilíbrio, CAC, LTV de receita/
  contribuição, LTV/CAC, payback, classificação de status (saudável / viável
  com atenção / margem apertada / prejuízo projetado / dados insuficientes),
  com tratamento diferenciado para objetivo "fortalecer marca".
- `src/lib/motor-lokat/segment-presets.ts` — 6 presets (delivery, varejo,
  clínica, serviços, agência, SaaS) com labels de custo, exemplos de perdas e
  metas sugeridas.
- `src/lib/motor-lokat/glossary.ts` — 26 termos com nome simples/técnico,
  fórmula, exemplo, erros comuns, termos relacionados.
- `src/lib/motor-lokat/insight-rules.ts` — interpretador determinístico
  (`generateFinancialInsights`, `generateCampaignInsights`) — nenhuma LLM
  conectada, cada insight expõe motivo, dado usado, qualidade e limites.
- `src/app/admin/meu-negocio/page.tsx` + `_client-content.tsx` +
  `_overview-tab.tsx` + `_pricing-tab.tsx` + `_campaign-tab.tsx` +
  `_cashflow-tab.tsx` + `_sources-tab.tsx` + `_glossary-tab.tsx` +
  `_shared.tsx` — shell com seletor de segmento, banner de modo demonstração
  permanente, 6 abas, cards com detalhe, gráficos em barra CSS (sem
  biblioteca nova), prévia de payload LLM, contexto REC OS com link real
  para `/admin/contentos/criar?step=brief` (rota auditada antes de usar).

### Arquivos alterados

- `src/components/app-sidebar.tsx` — item "Meu Negócio" adicionado ao nav
  admin (ícone `Sparkles`, já importado). Só existe nesta branch.
- `src/config/project-status.ts` — 8 áreas novas (`business_os_preview`,
  `financial_intelligence_engine`, `campaign_profitability_simulator`,
  `financial_glossary`, `financial_data_quality` em `qa_pending`;
  `campaign_rec_os_bridge`, `aipede_csv_import`, `inventory_and_losses` em
  `planned`), todas anotadas como existentes somente na branch de preview.
  `global_calendar` não foi tocado. `V1_PROGRESS`/`V2_PROGRESS` inalterados.

### Verificação

- Sem framework de teste instalado — verificado via script ad-hoc (`tsc`
  standalone + `node`), cobrindo os 7 cenários do prompt: (1) preço R$40/
  custo R$16 → custo 40%/margem 60%; (2) custo R$75, fixas 20%/variáveis 10%/
  margem 20% → preço mínimo R$150; (3) campanha com margem positiva →
  status saudável; (4) campanha com prejuízo → status prejuízo_projetado;
  (5) CAC > LTV de contribuição → insight `cac_above_ltv` disparado; (6)
  dados insuficientes → status dados_insuficientes, CAC/LTV `null` (nunca
  NaN); (7) capital de giro com 2 meses de cobertura numa meta de 3 →
  risco "atenção". Mais checagens de divisão por zero/dados ausentes — zero
  NaN/Infinity em qualquer cenário. Script descartado, não commitado.
- Busca explícita nos arquivos alterados por `Math.random`, `Date.now`,
  `new Date(`, `localStorage`, `sessionStorage`, `window.`, `public_token`,
  `service_role`, `Supabase`, `fetch(`, `axios`: zero ocorrências reais (só
  menções em comentários explicando a ausência).

### SQL

- Nenhum SQL executado, nenhuma migration criada, nenhuma env real alterada.

### Qualidade

- `npx tsc --noEmit --skipLibCheck`: zero erros.
- `npm run build`: compilado com sucesso (após limpar `.next` — uma falha de
  alocação de memória do Turbopack no cache antigo não se repetiu depois).
- ESLint nos arquivos alterados/criados: zero erros/warnings.
- `git diff --check`: sem erros.

### Resultado

- V1_PROGRESS = 81, V2_PROGRESS = 12 (imutáveis). `global_calendar` inalterado.
- Push feito somente da branch `feat/motor-lokat-preview-v1` — `main` nunca
  tocado, nenhum deployment de produção criado.

---

## 2026-07-19 (Sprint 3.1A.3 — Hotfix definitivo: navegação nativa)

### Sprint

Sprint 3.1A.3 — substitui a navegação client-side (SPA) por links nativos.

### Executor

Claude Code

### QA anterior (reportado pelo usuário/Codex Web, não reexecutado por mim)

Reprovado: mês anterior/próximo/Hoje e seleção de cliente/fonte se comportaram
de forma instável/invertida/atrasada em navegador real, apesar da correção
lógica da 3.1A.2 (remoção do `useState` duplicado). Sintomas: Julho→Agosto
manteve "anterior" em Agosto; "Hoje" partindo de Agosto foi para Setembro;
seleção de cliente/fonte com atraso ou invertida.

### Causa provável

A navegação client-side via `next/link`/`router.push` fica sujeita ao Client
Router Cache do Next.js App Router, que pode reaproveitar um payload RSC já
visitado para uma URL, em vez de buscar o servidor de novo — explicando
sintomas de "estado antigo"/"direção errada" mesmo com a lógica de href já
correta. Auditoria de DOM (Fase 1) não encontrou sobreposição, z-index ou
hitbox incorretos — o layout já era um flex simples.

### Decisão técnica

Navegação crítica (anterior/próximo/Hoje) trocada para `<a href>` HTML nativo
— documento completo, fora do Client Router Cache. Selects de cliente/fonte
continuam com `onChange`, mas chamam `window.location.assign(href)` (também
navegação nativa), nunca `router.push`. `useRouter`/`useTransition` removidos
do arquivo.

### Arquivos alterados

- `src/app/admin/calendario/_client-content.tsx` — `useRouter`, `useTransition`,
  `startTransition` removidos. Anterior/Próximo/Hoje viraram `<a>` nativas com
  `aria-label`, `data-testid` (`calendar-previous-month`, `calendar-next-month`,
  `calendar-today`) e `onClick` apenas cosmético (`setIsNavigating(true)`, sem
  `preventDefault`). Novo `isNavigating` (estado puramente operacional) via
  `useState`, com `navigateToCalendarHref()` usado pelos selects
  (`window.location.assign`, com guard contra href igual ao atual ou navegação
  já em curso). `data-testid` também nos dois `<select>`
  (`calendar-client-filter`, `calendar-source-filter`).
- `src/lib/global-calendar.ts` — inalterado nesta sprint (a lógica pura de
  `buildGlobalCalendarHref`/`shiftMonth` já estava correta; o problema era só
  o mecanismo de navegação client-side).

### Verificação

- Busca explícita no arquivo por `router.push`, `router.replace`,
  `router.refresh`, `useTransition`, `startTransition`, `setFilterClient`,
  `setFilterSource`, `useRouter`: zero ocorrências reais (só uma menção em
  comentário explicando a decisão).
- Suites ad-hoc das sprints 3.1A/3.1A.1/3.1A.2 re-executadas sem regressão
  (lógica pura de `global-calendar.ts` não mudou).
- **Não foi possível reproduzir o bug original nem rodar o roteiro de
  interação da Fase 13 do prompt** — sem navegador disponível neste ambiente.
  Correção validada por auditoria de código e lógica pura, não por observação
  visual direta.

### SQL

- Nenhum SQL executado. Nenhuma consulta a content_items/operational_tasks/
  approvals/clients/profiles alterada — fora de escopo desta sprint.

### Qualidade

- `npx tsc --noEmit --skipLibCheck`: zero erros.
- `npm run build`: compilado com sucesso.
- ESLint nos arquivos alterados: zero erros/warnings novos.
- `git diff --check`: sem erros.

### Resultado

- `global_calendar` mantido `qa_pending`.
- V1_PROGRESS = 81, V2_PROGRESS = 12 (imutáveis).
- Google Calendar OAuth continua bloqueado.
- Próxima tarefa após aprovação: recuperação do núcleo V1 do REC OS (não
  Google Calendar).

---

## 2026-07-19 (Sprint 3.1A.2 — Hotfix final de navegação e estado)

### Sprint

Sprint 3.1A.2 — corrige os 4 P1 do segundo QA Codex Web (navegação/estado).

### Executor

Claude Code

### QA anterior (reportado pelo usuário/Codex Web, não reexecutado por mim)

Aprovado: autenticação, rota, sidebar, isolamento Duh/O Pedreirão, lista completa
de clientes, client/source direto na URL, estados vazios, Aprovações, deep-link,
ausência de React #418/hydration mismatch, console, runtime, ausência de
public_token/service role.

P1: (1) botão Hoje permanecia no mês exibido; (2) selects de cliente/fonte não
atualizavam a URL; (3) com cliente+fonte selecionados, anterior/próximo paravam
de navegar; (4) cabeçalho/URL/filtros/agenda sem fonte única de verdade.
Conteúdos/Produção com zero legítimo — não é P1.

### Causa raiz confirmada

`GlobalCalendarContent` mantinha `filterClient`/`filterSource` em `useState`
próprio, além de já vir de `initialFilterClient`/`initialFilterSource` (props
derivadas da URL) — dois estados concorrentes para o mesmo dado. A navegação
usava `onClick handlers` chamando uma `buildUrl` local que lia esse estado
(closures), em vez de derivar sempre da URL/props atuais.

### Arquivos alterados

- `src/lib/global-calendar.ts` — novas funções puras `shiftMonth(year, month, delta)`
  (aritmética de mês/ano sem `Date`) e `buildGlobalCalendarHref({year, month,
  client, source})` (builder canônico de URL: sempre `URLSearchParams` novo,
  nunca inclui `client`/`source` quando "all").
- `src/app/admin/calendario/_client-content.tsx` — `useState` de
  `filterClient`/`filterSource` removido; agora lidos direto de
  `initialFilterClient`/`initialFilterSource`. Anterior/Próximo/Hoje viraram
  `<Link href=...>` com hrefs pré-computados via `buildGlobalCalendarHref` +
  `shiftMonth` (determinísticos a partir das props, nunca de estado). Selects
  de cliente/fonte mantêm `onChange` (não dá para virar `Link`), mas agora
  constroem o href a partir das props atuais, nunca de estado local.
  `useTransition` adicionado para desabilitar a toolbar durante a navegação.
  `aria-current` no botão Hoje quando já no mês atual.

### Verificação

- Script ad-hoc (mesma abordagem das sprints anteriores): as 16 combinações da
  Fase 13 do prompt (viradas de mês/ano em ambas direções, preservação de
  client/source isolados e combinados, "Todos"/"Todas" removendo parâmetro,
  source inválido em "all", sem URL duplicada nem `undefined`) — todas
  passaram. Suites da 3.1A e 3.1A.1 re-executadas sem regressão.
- **Não foi possível reproduzir o bug relatado ao vivo em navegador** (sem
  navegador disponível neste ambiente) — a correção segue a arquitetura
  prescrita (URL como única fonte de verdade) e foi verificada por lógica pura
  + regressão de teste, não por observação visual direta do bug original.

### SQL

- Nenhum SQL executado.

### Qualidade

- `npx tsc --noEmit --skipLibCheck`: zero erros.
- `npm run build`: compilado com sucesso.
- ESLint nos arquivos alterados: zero erros/warnings novos.
- `git diff --check`: sem erros.

### Resultado

- `global_calendar` mantido `qa_pending`.
- V1_PROGRESS = 81, V2_PROGRESS = 12 (imutáveis).
- Google Calendar OAuth continua bloqueado até aprovação do QA desta sprint.
- Restauração UX do REC OS não foi iniciada.

---

## 2026-07-19 (Sprint 3.1A.1 — Hotfix do Calendário Global após QA)

### Sprint

Sprint 3.1A.1 — corrige os 4 P1 e 1 P2 reportados pelo QA Codex Web da 3.1A.

### Executor

Claude Code

### QA anterior (reportado pelo usuário/Codex Web, não reexecutado por mim)

Aprovado: deployment, autenticação, rota, sidebar, grade mensal, agenda, Aprovações,
detalhe, deep-link de Aprovação, React #418, hidratação, console, mobile, runtime,
ausência de public_token, ausência de service role.

P1: (1) Hoje/navegação mensal deixavam `selectedDay` preso no mês anterior;
(2) parâmetro `client` na URL não era reconhecido; (3) cliente sem evento no mês
sumia do seletor; (4) Conteúdos e Produção não puderam ser validados (suspeita:
`content_items.scheduled_at` não estava sendo consultado).

P2: `responsible_name`/descrição ausentes no detalhe.

### Causa raiz confirmada

1. `GlobalCalendarContent` usava `useState(serverToday)`/`useState("all")` — o
   valor inicial de `useState` só se aplica na montagem; ao navegar entre meses
   (mesma instância do componente, só props novas via searchParams), o estado
   não se realinhava com a nova URL. Clássico bug de estado desatualizado, não
   um problema de hidratação.
2. `searchParams` do `page.tsx` só aceitava `year`/`month` — `client`/`source`
   nunca chegavam ao servidor.
3. A lista de clientes do filtro era derivada só de `clientNames` (que só continha
   clientes com evento na janela) — nunca existia uma query própria e completa
   de `clients`.
4. `content_items` só era consultado por `scheduled_date`; `ScheduleModal` da
   Home (`src/app/contentos/home/_client-content.tsx`) grava a data real de
   publicação em `scheduled_at` (timestamptz, coluna real confirmada em
   `docs/supabase/14-contentos-approval-production-flow.sql`) sem tocar em
   `scheduled_date` — conteúdo agendado por lá nunca aparecia no calendário.

### Arquivos alterados

- `src/lib/global-calendar.ts` — `ContentItemRow` ganhou `scheduled_at`/`caption`;
  `normalizeContentItems` prefere `scheduled_at` (all_day=false) sobre
  `scheduled_date` (all_day=true), nunca gera duas linhas para o mesmo registro;
  `caption` vira `description`; novo `ResponsibleNameLookup` usado por
  `normalizeContentItems`/`normalizeOperationalTasks` (profiles.name, com
  fallback para `assigned_role` nas tarefas); nova `resolveInitialSelectedDay()`
  e `resolveRequestedSource()`.
- `src/app/admin/calendario/page.tsx` — `searchParams` aceita `client`/`source`;
  nova query de `clients` completa e independente de eventos (mesma lógica de
  `CLIENT_VISIBLE_STATUSES`/`isVisibleClientRecord` de `src/lib/client-visibility.ts`);
  `client` param validado contra essa lista (inválido → "all", nunca 500);
  `content_items` consultado por `scheduled_date` OU `scheduled_at`; lookup em
  lote de `profiles.name` para `responsible_id`/`assigned_to`; componente filho
  recebe `key={year-month-client-source}` para remontar de forma limpa a cada
  mudança de URL.
- `src/app/admin/calendario/_client-content.tsx` — estado inicial 100% derivado
  de props (seguro por causa do `key` acima); navegação (mês anterior/próximo/
  Hoje) e os dois `<select>` preservam os demais parâmetros na URL; badges de
  contagem por fonte; estados vazios contextuais (cliente sem evento, fonte sem
  evento, fonte com erro) distintos entre si.

### Verificação

- Script ad-hoc atualizado (`tsc` standalone + `node`, sem instalar framework):
  `scheduled_at` vence `scheduled_date` sem duplicar; `responsible_name` cai
  corretamente para `assigned_role`/null; `resolveInitialSelectedDay` cobre mês
  atual vs. outro mês; `resolveRequestedSource` valida/rejeita. Suite da 3.1A
  original re-executada sem regressões.
- Não foi possível confirmar contagens reais em produção (sem acesso a
  ferramenta de query neste ambiente) — a correção do filtro `scheduled_at` foi
  validada por auditoria de schema/código (coluna real, usada por
  `ScheduleModal`), não por contagem ao vivo.

### SQL

- Nenhum SQL executado, nenhuma migration criada.

### Qualidade

- `npx tsc --noEmit --skipLibCheck`: zero erros.
- `npm run build`: compilado com sucesso.
- ESLint nos arquivos alterados: zero erros/warnings novos.
- `git diff --check`: sem erros.

### Resultado

- `global_calendar` mantido `qa_pending` (não marcado `validated`).
- V1_PROGRESS = 81, V2_PROGRESS = 12 (imutáveis).
- Restauração UX do REC OS **não** foi iniciada nesta sprint.
- Projeto São Paulo continua registrado como trilha paralela sem escopo recuperado.

---

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
