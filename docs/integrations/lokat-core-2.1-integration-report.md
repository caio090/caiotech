# Integração controlada — Lokat Core 2.1 sobre a main atual

Sprint: INTEGRAÇÃO LOKAT CORE 2.1.1. Branch de integração:
`integration/lokat-core-platform-map-v1`. Sem push, sem PR, sem deploy.

## Base e feature

- **Base da integração**: `origin/main` em `c89c80fd3c4d2a1e5a4e849fc44aef0e01448663`
  ("docs(status): register custom period production hotfix v1.0.1").
- **Feature integrada**: `feat/lokat-core-platform-map-v1` em
  `adba4413be5b50590a46a5032ae4434afd655373` (11 commits, Sprint LOKAT OS
  Core 2.1 completa — ver `docs/platform-master-map.md`).
- **Base original da feature** (agora obsoleta): `feat/workspace-panels-v1`
  em `fa2fa0138970326602534b6d89e55e0c70341610` — confirmado como ancestral
  de `origin/main` via `git merge-base`, ou seja, tudo que a Core 2.1
  presumia como "estado atual" na época já está contido na main de hoje,
  mais ~109 commits adicionais (Meu Negócio Command Center, hotfix de
  período personalizado em Production, etc.).
- Método: `git switch --create integration/lokat-core-platform-map-v1
  origin/main` seguido de `git merge --no-commit --no-ff
  feat/lokat-core-platform-map-v1`.

## Conflitos

Apenas **1 conflito real**, previsto antes do merge via
`git diff --stat fa2fa01..origin/main -- <arquivo>`:

- `src/config/project-status.ts` — main adicionou 285 linhas / removeu 16
  desde a base antiga (novas áreas de rollout pós-`fa2fa01`); a feature
  adicionou 20 áreas novas da Core 2.1. Resolvido preservando **todas** as
  áreas de ambos os lados, sem duplicar IDs, sem alterar `V1_PROGRESS`/
  `V2_PROGRESS`/`readiness` de nenhuma área pré-existente.
- `docs/workspace-visibility-matrix.md` — **previsto sem conflito** (main
  nunca tocou o arquivo desde a base) e confirmado: merge automático limpo,
  nota da Core 2.1 preservada integralmente.

Nenhum outro arquivo colidiu — os demais 66 arquivos da feature são
adições novas (`A`) que o merge aplicou diretamente.

## Bug de resolução detectado e corrigido

Ao remover as 3 linhas de marcador de conflito (`<<<<<<<`, `=======`,
`>>>>>>>`) de `project-status.ts` com um `sed` line-based, a entrada
`public_home_canonical_route` ficou sem o `},` de fechamento — porque o
diff do Git ancorou o conflito numa linha `  },` duplicada (idêntica a
dezenas de outras no arquivo), deslocando a fronteira real do conflito.
Detectado por releitura manual da região; corrigido inserindo o `},`
faltante. Verificado com `ts.transpileModule(source, { reportDiagnostics:
true })` → `NO_SYNTAX_DIAGNOSTICS`, contagem de 130 entradas `id: "`,
zero IDs duplicados (`grep -oE 'id: "[a-z_0-9]+"' | sort | uniq -d` vazio),
e as 20 IDs da Core 2.1 presentes exatamente uma vez cada.

## Adaptação estrutural (fora de conflito de merge)

`src/config/platform-modules.ts`, entrada `meu_negocio`: a Core 2.1 foi
construída sobre `feat/workspace-panels-v1`, uma base anterior ao Centro de
Comando real de Meu Negócio. A descrição original referenciava a demo
antiga (`_client-content.tsx`, 8 abas: overview/business/products/pricing/
campaigns/cashflow/sources/glossary) que não existe mais na main atual.
Corrigido para descrever a arquitetura real vigente
(`src/app/admin/meu-negocio/_entry.tsx` → `_restaurant-workspace.tsx`,
Centro de Comando já publicado em Production com o hotfix de período
personalizado) e o modelo de qualidade de dado real
(`src/lib/data-quality/`, não mais `src/lib/motor-lokat/types.ts`). Nenhum
outro módulo do registro precisou de ajuste (`src/lib/data-hub/sources.ts`
já é genérico o suficiente).

## Testes — Core 2.1 (re-executados sobre a integração, não assumidos)

Comando: `node .tmp/run-ts-test.cjs <arquivo>` (harness CJS com
`ts.transpileModule`, sem infraestrutura de test runner).

| Arquivo | Resultado |
|---|---|
| `src/config/__tests__/platform-modules.test.ts` | 15 passed |
| `src/config/__tests__/business-niche-packs.test.ts` | 19 passed |
| `src/lib/business-profile/__tests__/business-profile.test.ts` | 4 passed |
| `src/lib/data-hub/__tests__/data-hub.test.ts` | 25 passed |
| `src/lib/domain-events/__tests__/domain-events.test.ts` | 19 passed |
| `src/lib/domain-events/__tests__/bridges.test.ts` | 8 passed |
| `src/lib/reports/__tests__/view-modes.test.ts` | 8 passed |
| `src/lib/financial-reconciliation/__tests__/calculations.test.ts` | 10 passed |
| `src/lib/global-calendar-v2/__tests__/global-calendar-v2.test.ts` | 13 passed |
| `src/lib/intelligence/__tests__/intelligence.test.ts` | 10 passed |
| `src/lib/operational-templates/__tests__/operational-templates.test.ts` | 5 passed |
| `src/app/admin/ecossistema/__tests__/integrity.structural.test.ts` | 11 passed |

**Total: 147 asserções, 147 aprovadas, 0 falhas**, em 12 arquivos — número
idêntico ao da sprint original, mas obtido por execução real sobre o
estado pós-merge (não declarado por memória).

## Testes — relevantes da main (executados sobre a integração)

29 arquivos cobrindo período personalizado/FormData, Meu Negócio,
Workspaces, cobertura de mutação, controle de acesso e layout admin — todos
`exit=0`, 0 falhas. Dois arquivos `.dom.test.tsx` exigiram recriar
`.tmp/run-tsx-dom-test.cjs` (harness com jsdom, gitignorado e específico do
worktree) com a correção já conhecida `globalThis.FormData =
dom.window.FormData` mais um `DOM_GLOBALS` allowlist (apenas globais de
DOM/BOM — nunca intrínsecos de JS como `Array`/`Object`, para não quebrar
checagens cross-realm como `Array.isArray` usadas internamente pelo próprio
compilador TypeScript).

Destaques:
- `period-selector-form-submission.dom.test.tsx` — 14 passed (hotfix de
  FormData em Production, os 3 caminhos do ticket: onChange normal,
  input-only, DOM direto sem evento React).
- `period-selector-rendered.dom.test.tsx` — 34 passed.
- `period-selector-bugfix.structural.test.ts` — 38 passed.
- `mutation-guard-runtime.test.ts` — 41 passed.
- `preview-session.test.ts` — 39 passed.
- `command-center.test.ts` — 63 passed.
- `restaurant-vertical-slice.structural.test.ts` — 65 passed.
- 3 arquivos `*.e2e.test.ts` (`atomic-exit-endpoint`, `mutation-guard-routes`,
  `proxy-guard`) se auto-reportaram "no server reachable at
  http://127.0.0.1:3000, skipping" — comportamento pré-existente do próprio
  arquivo (`BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3000"`),
  não uma supressão feita nesta sprint. Re-executados depois com
  `BASE_URL=http://127.0.0.1:3100` contra o servidor de integração (ver
  seção de servidor local abaixo).

Nenhum teste foi pulado, apagado ou alterado para forçar resultado verde.

## `npm run check:workspace-mutations`

Resultado: **42 rotas mutáveis encontradas, 1 falha** —
`meu-negocio/ai/analyze/route.ts` (POST) sem classificação no ALLOWLIST.

Investigado e confirmado como **pré-existente na main, não introduzido por
esta integração**:
- `git diff origin/main -- src/app/api/meu-negocio/ai/analyze/route.ts` →
  diff vazio (arquivo byte-idêntico antes/depois do merge).
- Commit que introduziu o arquivo: `a00819e` ("feat(ai): add server-side
  Lokat business assistant"), datado de 2026-07-28.
- `git merge-base --is-ancestor a00819e origin/main` → confirmado
  ancestral de `origin/main`.

Ou seja: `npm run check:workspace-mutations` já falharia exatamente da
mesma forma em `origin/main` sozinho, sem qualquer código da Core 2.1
envolvido. Não é uma regressão desta integração e está fora do escopo
deste sprint (que é integrar a Core 2.1, não sanar débito pré-existente da
main). Registrado aqui para visibilidade e não corrigido nesta sprint.

Nenhum `pending_protection` encontrado. Nenhuma regressão de proxy.

## Preservação confirmada

- Hotfix de FormData/onInput no seletor de período: presente e coberto por
  teste (`_period-selector.tsx`).
- Centro de Comando de Meu Negócio (`_entry.tsx` → `_restaurant-workspace.tsx`):
  intacto, e a descrição do módulo na Core 2.1 foi corrigida para refleti-lo
  (ver seção de adaptação acima).
- `src/config/workspace-capabilities.ts`: sem alterações no merge.
- `src/proxy.ts`: zero mudanças staged pelo merge.
- `package.json`: sem conflito (feature nunca tocou o arquivo);
  `check:workspace-mutations` e demais scripts da main preservados.
- `operational_user` permanece exclusivamente conceitual em
  `platform-modules.ts` — não vira `WorkspaceSurface`, role, autorização,
  superfície de preview, tipo aceito por API ou membership em nenhum ponto
  do código integrado.

## `npm ci`

Necessário: `package.json` da main adicionou `jsdom`,
`@testing-library/react`, `@testing-library/dom` desde a base antiga da
feature (10 inserções / 1 remoção desde `fa2fa01`), e `node_modules/jsdom`
estava ausente no worktree de integração. `npm ci --no-audit --no-fund`
concluído com sucesso: 478 pacotes, ~5 minutos, exit 0.

## Pendências para as próximas seções deste relatório

As seções de qualidade (tsc/eslint/diff-check), build (webpack + fallback
Turbopack), varredura final de padrões proibidos, servidor local na porta
3100 e o commit de merge em si serão adicionadas/atualizadas nas próximas
fases desta mesma sprint, antes do relatório final numerado.
