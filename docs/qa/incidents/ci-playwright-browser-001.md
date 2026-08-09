# Incidente CI-PLAYWRIGHT-BROWSER-001 — hotfix E2E CI 3.0.2.3

## Execução afetada

- Run: `30833304673`
- Job: `91752277749`
- Workflow: `LOKAT OS Local E2E QA` (`.github/workflows/local-e2e-qa.yml`)
- Branch: `integration/lokat-core-platform-map-v1`
- Classificação anterior: `FAILED_INFRASTRUCTURE`

## O que passou nessa run (confirmado pelo Codex Web)

Checkout, Setup Node, `npm ci`, instalação do Google Chrome, TypeScript,
mutation coverage, start do Next.js, readiness, `qa:doctor`, `qa:smoke` —
todos passaram.

## Onde falhou

No passo `auth-setup`, antes de `/login` ser aberto. O Playwright tentou
iniciar um executável de `chromium_headless_shell`, que o workflow nunca
instala (o workflow só roda `npx playwright install --with-deps chrome`).

## Causa raiz confirmada

Em `playwright.config.ts`, o bloco `use` global (aplicado a todo projeto
que não sobrescreve os mesmos campos) não declarava `channel: "chrome"`.
O projeto `auth-setup` era o único sem nenhum `use` próprio — por isso era
o único que efetivamente herdava esse `use` global incompleto e caía no
Chromium padrão do Playwright (Headless Shell), nunca instalado pelo
workflow. Os demais projetos (`unauthenticated`, `desktop-chrome`,
`mobile-390/393/430`, `tablet-768`) já declaravam `channel: "chrome"`
individualmente e por isso nunca manifestaram o problema — o que também
os deixava vulneráveis a uma futura divergência caso um novo projeto
fosse criado sem repetir essa linha.

## Consequência

Login não foi tentado, Super Admin não foi confirmado, `storageState` não
foi criado, e nenhum teste autenticado executou (desktop, tablet,
mobile-390, mobile-393, mobile-430). Os testes não autenticados
passaram normalmente. **Nenhuma falha de produto foi comprovada por essa
run** — a suíte autenticada simplesmente nunca chegou a rodar.

## Correção aplicada

Uma única linha adicionada ao `use` global de `playwright.config.ts`:

```ts
use: {
  channel: "chrome",
  // ...demais campos já existentes, inalterados
}
```

Nenhum `executablePath` fixo foi usado (o CI roda Ubuntu; um caminho do
Windows quebraria o runner). Nenhum navegador adicional foi instalado no
workflow — a auditoria confirmou que o Chrome já instalado resolve o
problema sem exigir Chromium extra.

## Validação local desta correção

- `npx playwright test tests/e2e/navigation-auth.spec.ts --project=unauthenticated` → 10/10 passou, Chrome real utilizado, nenhuma referência a `chromium_headless_shell`.
- `npx playwright test --list` → 190 testes em 15 arquivos, `auth-setup` listado uma única vez, nenhum projeto duplicado, nenhum projeto sem `channel: "chrome"`.
- YAML do workflow revalidado com `js-yaml` — inalterado, 15 steps, só instala Chrome.

## O que NÃO foi usado como atalho

- Nenhum `executablePath` fixo.
- Nenhuma instalação de Chromium/Firefox/WebKit adicional.
- Nenhuma alteração de seletor de login (a run anterior nem chegou ao formulário — não havia evidência para justificar mexer nisso).
- Nenhuma alteração de secret/Environment.

## Necessidade de nova run

Sim — esta correção precisa de uma nova execução do GitHub Actions
(disparada pelo próximo push da branch de integração) para confirmar que
`auth-setup` agora completa o login e gera o `storageState`, e que os
projetos autenticados (desktop/tablet/mobile) executam de fato.

## Preview Vercel automático

O push anterior gerou um Preview automático via integração GitHub/Vercel
— efeito colateral externo da integração Git, não criado pelo workflow,
não usado para QA, não promovido, não utilizado nesta sprint. O push
desta hotfix pode gerar um novo Preview automático, com o mesmo
tratamento (registrar e ignorar).
