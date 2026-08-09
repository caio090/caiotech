# Incidente CI-E2E-AUTH-SELECTOR-001 — hotfix E2E harness 3.0.2.4

## Execução afetada

- Run: `31324959232`
- Job: `93273739539`
- Workflow: `LOKAT OS Local E2E QA` (`.github/workflows/local-e2e-qa.yml`)
- Branch: `integration/lokat-core-platform-map-v1`
- Classificação: `FAILED_HARNESS`

## O que passou nessa run (confirmado pelo Codex Web)

GitHub Actions, Chrome instalado e abrindo (CI-PLAYWRIGHT-BROWSER-001
permanece resolvido — `chromium_headless_shell` não foi procurado),
Next.js ativo em `127.0.0.1:3100`, `qa:doctor`, `qa:smoke`, TypeScript,
mutation coverage, `/login` carregando corretamente, secrets disponíveis
e mascarados, `auth-setup` iniciando.

## Onde falhou

Em `tests/e2e/auth.setup.ts`, no preenchimento do e-mail: `getByLabel(/e-?mail/i)`
excedeu o timeout de 10s. O formulário nunca chegou a ser enviado.

## Causa raiz confirmada

Auditoria do DOM real de `src/app/(public)/login/page.tsx` (nenhuma
alteração feita nesse arquivo): o `<label>` visual ("E-mail"/"Senha") não
tem `htmlFor`/`id` associando-o ao `<input>` correspondente — por isso
`getByLabel()` (que depende dessa associação semântica ou de
`aria-labelledby`) nunca encontra o campo. Nenhum dos dois inputs tem
`name` ou `aria-label`. Confirmado: `input[type="email"]` e
`input[type="password"]` são, cada um, o único elemento desse tipo no DOM
inicial da tela (o único outro `input[type="text"]` — o campo de código
de convite — só é renderizado depois de um clique em "Recebi um
convite", nunca disparado pelo harness).

## Consequência

Nenhum problema funcional do produto foi comprovado. Chrome funcionou,
`/login` carregou, mas o e-mail nunca foi preenchido — logo o formulário
nunca foi enviado, Super Admin nunca foi confirmado, `storageState` nunca
foi criado, e nenhum teste autenticado (desktop/tablet/mobile) executou.

## Correção aplicada

Em `tests/e2e/auth.setup.ts`:

- `getByLabel(/e-?mail/i)` → `page.locator('input[type="email"]')`
- `getByLabel(/senha|password/i)` → `page.locator('input[type="password"]')`
- Botão de submit mantido como estava (`getByRole("button", { name: /entrar/i })`)
  — nunca foi a causa da falha (accessible name vem do próprio texto
  "Entrar", não depende de associação de label), simplificado apenas para
  remover a alternativa `|login` que não corresponde a nenhum texto real
  da tela.
- Adicionado `expect(...).toBeVisible()` explícito nos dois campos antes
  do preenchimento, com mensagem de erro dedicada
  (`E2E_AUTH_LOGIN_FORM_UNAVAILABLE`) caso o formulário não renderize.
- Adicionada confirmação explícita pós-submit: se a navegação para uma
  rota `/admin/` não ocorrer em 15s, o teste falha com
  `E2E_AUTH_LOGIN_REJECTED` — nunca lê ou imprime e-mail/senha/token/cookie.

Nenhuma cadeia de fallbacks foi criada — cada campo tem exatamente um
seletor primário, sem heurística adicional que pudesse selecionar o
elemento errado silenciosamente.

## Observação de acessibilidade (não é escopo desta sprint)

O `<label>` sem `htmlFor`/`id` em `/login` é uma melhoria de
acessibilidade possível para o produto (leitores de tela não anunciam a
associação label→input corretamente hoje). Registrado aqui apenas como
observação futura — nenhuma alteração de UI foi feita nesta hotfix, que é
estritamente sobre o harness de teste.

## Validação local desta correção

- Auditoria de DOM (leitura de código, sem alteração): confirmado `type="email"`/`type="password"` únicos no render inicial.
- Validação estrutural com Playwright real contra `http://127.0.0.1:3100/login`: `input[type="email"]` (1 encontrado, visível), `input[type="password"]` (1 encontrado, visível), botão "Entrar" (1 encontrado, visível).
- `npx playwright test tests/e2e/navigation-auth.spec.ts --project=unauthenticated` → 10/10 passou, Chrome real, nenhuma referência a `chromium_headless_shell` (confirma que CI-PLAYWRIGHT-BROWSER-001 continua resolvido).
- `npx playwright test --list` → 190 testes em 15 arquivos, inalterado.
- `npx tsc --noEmit --skipLibCheck`, `npm run check:workspace-mutations` (42 rotas, 0 falhas), `npm run qa:doctor`/`qa:smoke` (pós-commit) — todos limpos.

## O que NÃO foi usado como atalho

- Nenhuma alteração em `src/app/(public)/login/page.tsx` ou qualquer componente de produto.
- Nenhum `executablePath` fixo, nenhuma alteração em `playwright.config.ts` ou no workflow (auditoria confirmou que a causa era só o seletor).
- Nenhuma credencial local criada/copiada para validar (validação estrutural feita sem login real).
- Nenhuma cadeia grande de fallbacks de seletor.

## Necessidade de nova run

Sim — esta correção precisa de uma nova execução do GitHub Actions para
confirmar que `auth-setup` agora preenche o formulário, submete, navega
para uma rota `/admin/`, confirma Super Admin em `/admin/status/arquitetura`
e gera o `storageState`, permitindo que os projetos autenticados
(desktop/tablet/mobile) executem pela primeira vez.

## Pressão de memória local (nota operacional, não relacionada ao harness)

Durante a validação desta hotfix, o ambiente local voltou a apresentar
picos severos de memória virtual livre (chegando a ~23MB em um
momento), causando lentidão extrema e uma queda do servidor de QA local
(OOM do processo Node do Next.js). Isso não é um defeito do harness nem
do produto — é uma condição do ambiente local (mesma classe de problema
já registrada na hotfix anterior, CI-PLAYWRIGHT-BROWSER-001). O servidor
foi reiniciado e todas as validações desta hotfix foram concluídas com
sucesso depois da recuperação de memória.
