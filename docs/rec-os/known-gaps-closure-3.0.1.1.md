# Fechamento de lacunas — Sprint REC OS 3.0.1.1

A Sprint REC OS 3.0.1 implementou o registry/contratos do fluxo criativo
canônico e o app shell mobile, mas seu próprio relatório final declarou
8 lacunas abertas. Esta sprint fechou cada uma delas. Formato: lacuna →
estado anterior → correção → teste → evidência → limitação remanescente.

## 1. Radar → Criar sem ação real

- **Estado anterior:** `CreateContentSeed` existia como tipo, mas o Radar
  não tinha nenhum botão que o construísse.
- **Correção:** `RADAR_DEMO_OPPORTUNITIES`
  (`src/lib/rec-os-workflow/radar-opportunities.ts`) + `RadarOpportunityCard`
  (`src/app/admin/contentos/radar/_radar-opportunity-card.tsx`) — ação
  "Criar a partir desta oportunidade" só habilitada com `?client=`
  presente na URL (contexto mínimo), navega para
  `/admin/contentos/criar?client=...&seed=<id>&section=ideia`.
- **Teste:** `src/lib/rec-os-workflow/__tests__/radar-opportunities.test.ts`,
  `src/app/admin/contentos/radar/__tests__/radar.structural.test.ts`,
  `src/app/admin/contentos/criar/__tests__/guided-create-flow-3-0-1-1.structural.test.ts`.
- **Evidência:** todos os arquivos citados passam (`node .tmp/run-ts-test.cjs <arquivo>`).
- **Limitação remanescente:** as oportunidades continuam demonstrativas
  (marcadas "Demonstração" na UI) — o Radar ainda não tem detecção real
  de tendências. Nenhuma oportunidade é persistida.

## 2. CalendarNavigationContext sem botão real conectado

- **Estado anterior:** contrato puro testado, mas nenhum botão real do
  REC OS usava `buildCalendarNavigationUrl()`.
- **Correção:** subnav do REC OS, Roadmap e Mapa do Cliente conectados;
  `/admin/calendario` passou a ler `return_to` (banner de origem + botão
  Voltar) e aceitar `month=YYYY-MM` combinado.
- **Teste:** `src/app/admin/calendario/__tests__/calendar-context.structural.test.ts`.
- **Evidência:** 12/12 asserções passam; `tsc`/build limpos.
- **Limitação remanescente:** nem todo botão "Calendário" do produto foi
  auditado individualmente — apenas os pontos do REC OS listados acima.

## 3. Handoff do EditorOS com parâmetros soltos

- **Estado anterior:** `EditorAssetHandoff` existia como tipo; o fluxo
  real montava a URL com concatenação de string.
- **Correção:** `src/lib/rec-os-workflow/editor-handoff.ts`
  (`build/validate/serialize/parse`), usado em `handleOpenEditor()`.
  Mecanismo: parâmetros mínimos validados (nunca `copy`/`restrictions`/o
  objeto inteiro na URL); expiração computada só pelo carimbo de tempo.
- **Teste:** `src/lib/rec-os-workflow/__tests__/editor-handoff.test.ts`,
  `src/app/admin/contentos/editor-os/__tests__/editor-os-handoff.structural.test.ts`.
- **Evidência:** 27 asserções entre os dois arquivos, 0 falhas.
- **Limitação remanescente:** nenhuma — o contrato completo (incluindo
  `width`/`height`/`restrictions`) existe no objeto em memória antes da
  serialização, mesmo que esses campos específicos não sejam enviados na
  URL por design (dados grandes/sensíveis).

## 4. Roadmap de Produção só registry

- **Estado anterior:** `readiness: "planned"`, nenhuma tela.
- **Correção:** `/admin/contentos/roadmap` real — fonte única
  `RecOsRoadmapItem`, 4 visualizações (Quadro/Lista/Linha do
  tempo/Calendário) sobre o mesmo array filtrado.
- **Teste:** `src/lib/__tests__/rec-os-roadmap.test.ts` (lógica pura),
  `src/app/admin/contentos/roadmap/__tests__/roadmap.structural.test.ts`.
- **Evidência:** 25 + 22 asserções, 0 falhas.
- **Limitação remanescente:** sem drag-and-drop (sem mutação segura
  definida); campanha/setor/prioridade não são filtros reais (não são
  colunas reais em `content_items`).

## 5. Mapa do Cliente só registry

- **Estado anterior:** `readiness: "planned"`, nenhuma tela.
- **Correção:** `/admin/contentos/mapa-cliente` real, reaproveitando
  `getRoadmapItems()` e os mesmos primitivos de isolamento já usados por
  Produção/Aprovações.
- **Teste:** `src/app/admin/contentos/mapa-cliente/__tests__/mapa-cliente.structural.test.ts`.
- **Evidência:** 17 asserções, 0 falhas.
- **Limitação remanescente:** isolamento por login real de agência/
  cliente-da-agência/empresa-direta (fora do preview do Super Admin)
  continua não implementado na plataforma como um todo — mesma lacuna já
  registrada para a bottom navigation.

## 6. Bottom navigation com cobertura parcial

- **Estado anterior:** cobertura parcial DECLARADA — mas a auditoria
  desta sprint encontrou um defeito REAL adicional: 3 das rotas
  sugeridas em `SURFACE_BOTTOM_NAV_PRIMARY` (`/admin/ecossistema`,
  `/admin/leads`, `/admin/contentos/aprovacoes`) não existiam em
  `configs.admin.nav`, então eram descartadas silenciosamente pelo
  filtro de segurança — Super ADM tinha só 2 abas fixas em vez de 4.
- **Correção:** as 3 rotas foram registradas no config real da sidebar
  (`src/components/app-sidebar.tsx`); `SURFACE_BOTTOM_NAV_ITEMS`
  (tipado: id/label/route/requiredCapability/activeMatch/priority)
  substitui as duas listas paralelas anteriores.
- **Teste:** `src/lib/mobile-shell/__tests__/mobile-shell-3-0-1-1.structural.test.ts`.
- **Evidência:** 53 asserções, 0 falhas — inclui verificação de que toda
  rota sugerida por superfície existe de fato em `configs.admin.nav`.
- **Limitação remanescente:** a mesma do item 5 — só resolvido com
  segurança para preview do Super Admin / sessão real de super_admin.

## 7. Scanner de camadas sem explicação na UI

- **Estado anterior:** estado `experimental` registrado no tipo, mas
  nada na interface do EditorOS mencionava o scanner.
- **Correção:** nota visível em `EditorOSWorkspace.tsx`
  (`data-testid="layer-scanner-status-note"`) com o texto exigido pelo
  brief. Nenhuma reauditoria de compatibilidade feita (fora do escopo).
- **Teste:** coberto por `editor-handoff.test.ts` (regressão do status).
- **Evidência:** `EDITOR_OS_LAYER_SCANNER_STATUS.availability === "experimental"`.
- **Limitação remanescente:** nenhuma mudança de estado — continua
  bloqueado por falta de revalidação de compatibilidade, não por decisão
  de produto.

## 8. Ação rápida e busca do header decorativas

- **Estado anterior:** "Ação rápida" era um `<button>` sem `onClick`; a
  busca do header nunca teve `value`/`onChange` — decorativa em qualquer
  viewport.
- **Correção:** `QuickActionMenu` (contextual por superfície, itens sem
  rota real ficam "Em breve") e `AdminSearchSheet` (busca real, escopo
  honesto: só módulos/rotas).
- **Teste:** `mobile-shell-3-0-1-1.structural.test.ts`.
- **Evidência:** trigger/sheet/foco/escopo testados, 0 falhas.
- **Limitação remanescente:** busca não cobre clientes/conteúdos —
  declarado explicitamente na própria UI.
