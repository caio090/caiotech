# Sprint QA Fix 3.0.2.6 — fechamento final do QA autenticado

## Run base

- Run: `31331605580`
- Job: `93290631743`
- Resultado: `FAILED_PRODUCT`
- Antes desta sprint: 190 discovered, 166 executed, 158 passed, 8 failed, 24 skipped, 0 P0.
- Delta vs. a run anterior (após as hotfixes de harness 3.0.2.3-3.0.2.5): +37 passed, -37 failed.
- Infraestrutura, Chrome, auth-setup, login, Super Admin, storageState: PASS. Desktop 61 passed/8 failed/13 skipped; Tablet 14/0; Mobile 390/393/430: 24/0 cada.

Áreas já resolvidas nas sprints anteriores (Workspace Preview, mutation guard, CRM mobile/empty state/filters, overflow em criar/produção/roadmap/mapa-cliente/CRM/Status/Arquitetura, os dois incidentes de Chrome e seletor de login) **não foram reabertas nesta sprint**.

## 1. Meu Escritório (P1)

**Auditoria (Fase 2, respostas):**
1. `EscritorioClient` (`_escritorio-client.tsx`), renderizado por `src/app/admin/escritorio/page.tsx`.
2. Não renderizava quando `requireAdminContentOSContext()` retornava uma `Response` (403 ou 503) — nesse caso a página inteira virava `<AdminContentOSUnavailableState>`.
3. Sim — `if (ctx instanceof Response) { ...; return <AdminContentOSUnavailableState .../> }`.
4. Sim, exatamente esse: `AdminContentOSUnavailableState` cobre 403 e 503 uniformemente.
5. Não havia loading state separado (RSC).
6. Sim — 403 e 503 já eram tratados, só que ambos substituíam a página inteira.
7. Sim: `requireAdminContentOSContext()` retorna 503 quando `SUPABASE_SERVICE_ROLE_KEY` não está configurada — deliberadamente ausente no Environment de CI `local-e2e-qa` (ver `docs/qa/e2e-security-boundaries.md`). Isso não é um bug a "corrigir" adicionando a chave; é o estado real e esperado desse ambiente.
8. Não — `getBusinessOfficeFeed` usa `Promise.allSettled`, nunca falha silenciosamente sem registrar em `sourceErrors`.
9. Não.
10. Sim — era exatamente esse outro branch (`AdminContentOSUnavailableState`) que renderizava sem nenhum dos testids de Escritório.

**Classificação: PRODUCT_FIX.** 503 (fonte de dados temporariamente indisponível) não é o mesmo problema que 403 (sem permissão) — a pessoa continua autenticada e com acesso à ferramenta, só uma fonte de dados está fora do ar. Substituir a ferramenta inteira por uma tela genérica nesse caso é pior do que necessário.

**Fix:** `src/app/admin/escritorio/page.tsx` — 401 continua indo para `/login`; 403 continua mostrando `AdminContentOSUnavailableState` (sem permissão de verdade); 503 agora mantém o shell operacional (`EscritorioClient` com `items=[]`, `todayKey` calculado localmente via `getFortalezaToday()`, que não depende de `adminDb`) com um aviso honesto ("Este recurso está temporariamente indisponível...") reaproveitando o mesmo estilo de banner já usado para `sourceErrors` parciais.

**Contrato final:**
```
escritorio-root
├── header (PageHeader)
├── aviso honesto (quando a fonte principal ou alguma fonte parcial falha)
└── tabs Hoje/Semana/Mês
    └── itens reais ou "ainda não conectado" (nunca fabricados)
```

## 2. Roadmap (P2)

**Auditoria (Fase 6, respostas):**
- Quadro/Lista/Timeline/Calendário: os testids (`roadmap-kanban`, `roadmap-list`, etc.) só existiam dentro do branch `filtered.length > 0` — com `filtered.length === 0`, um único `EmptyState` substituía TODAS as visões.
- O teste falhava em `await expect(page.getByTestId("roadmap-kanban")).toBeVisible();`, antes mesmo de trocar de visão ou comparar contagens.
- Dataset estava vazio porque `src/app/admin/contentos/roadmap/page.tsx` tratava qualquer resposta 403/503 de `requireAdminContentOSContext()` como "sem conteúdo" — sem popular `items`, sem marcar `loadError` (diferente do `catch` de exceção, que já marcava `loadError = true`).
- Seletor não é ambíguo, view troca corretamente, testid não mudou — o problema é anterior a tudo isso: a fonte de dados não chega a ser tratada como indisponível.
- Os unit tests de alias (`ajuste` → `alteracao_solicitada`) **não foram tocados** e continuam 28/28 — o alias nunca foi a causa desta falha específica.

**Classificação: PRODUCT_FIX** (mesma causa raiz de fundo do item 1: 503 silenciosamente tratado como "vazio", não honestamente sinalizado).

**Fix:**
- `src/app/admin/contentos/roadmap/page.tsx`: `else { loadError = true; }` quando `ctx instanceof Response`, reaproveitando o banner de aviso já existente na página (antes só disparado por exceção).
- `src/app/admin/contentos/roadmap/_roadmap-client.tsx`: o `EmptyState` genérico deixou de SUBSTITUIR as 4 visões — agora aparece como informação adicional quando `filtered.length === 0`, e as 4 visões continuam sempre navegáveis (cada uma já tem seu próprio estado vazio interno honesto, ex.: coluna "Vazio" no Quadro) — mais consistente com o próprio princípio do arquivo ("mesma fonte alimenta todas as visões").

**Paridade (Fase 7):** com `filtered=[]` (fonte indisponível), Quadro e Lista comparam 0 contra 0 — uma comparação real, não fabricada; nenhum contador foi manipulado para "passar". Quando a fonte estiver disponível numa run real, a comparação volta a validar contagem real, incluindo os 3 novos casos de alias já cobertos pelos unit tests.

## 3. CRM Pipeline (P3/HARNESS)

**Auditoria:** `src/app/admin/leads/page.tsx` tem DUAS ocorrências do texto "pipeline comercial" — `<p>Pipeline comercial</p>` (título da seção) e a descrição do `PageHeader`, "Leads e pipeline comercial". `getByText()` do Playwright, sem `exact: true`, faz correspondência por substring **case-insensitive** por padrão — as duas batiam, causando strict-mode violation.

**Classificação: HARNESS_EXPECTATION_UPDATE.** Nenhum dos dois textos é indevido — ambos são legítimos e intencionais.

**Fix:** `tests/e2e/crm-canonical.spec.ts` agora usa `getByText("Pipeline comercial", { exact: true })`, que corresponde apenas ao texto completo exato do elemento-título, não à descrição do header. Nenhuma alteração de produto.

## Skips (24, não fechados nesta sprint)

Permanecem como `not_validated`, conforme instruído — não convertidos para passed:
- `rec_os_final_send`: not_validated.
- `radar_create_opportunity`: not_validated quando aplicável (conta E2E sem oportunidade real do Radar).
- `roadmap_calendar_context_navigation`: not_validated quando aplicável.

Esses itens entram no mapa de escopo da recalibração futura, não desta sprint.

## Validação local

- `npx tsc --noEmit --skipLibCheck`: limpo, repetido após cada edição.
- `npm run check:workspace-mutations`: 42 rotas, 0 falhas.
- ESLint: 0 erros/avisos nos arquivos alterados.
- `node .tmp/run-ts-test.cjs src/lib/__tests__/rec-os-roadmap.test.ts`: 28/28 (inalterado, confirma que o alias não foi mexido de novo).
- `node .tmp/run-ts-test.cjs src/app/admin/escritorio/__tests__/escritorio.structural.test.ts`: 25/25, sem regressão.
- `node .tmp/run-ts-test.cjs src/app/admin/contentos/roadmap/__tests__/roadmap.structural.test.ts`: 22/22, sem regressão.
- `node .tmp/run-ts-test.cjs src/app/admin/leads/__tests__/crm-canonical.structural.test.ts`: 19/19, sem regressão.
- `qa:doctor`/`qa:smoke`: autoridade final permanece o GitHub Actions para esta sprint — ver nota de memória abaixo.

### Nota sobre pressão de memória local

O ambiente local voltou a apresentar instabilidade de memória durante
hotfixes anteriores desta série (3.0.2.3-3.0.2.5). Nesta sprint, os gates
que dependem do servidor local (`qa:doctor`/`qa:smoke`) foram executados
quando a memória permitiu; o GitHub Actions continua sendo a autoridade
final para a validação autenticada completa, conforme já estabelecido.
