# QA visual local — navegação/Meu Escritório/CRM — Sprint QA Local 3.0.2

## Ambiente

- Projeto: LOKAT OS
- Branch: `integration/lokat-core-platform-map-v1`
- HEAD no início desta sprint: `8c4ceaac9c5901f24ec1b338c433f9ad62fe3dbb`
- origin/main preservada: `c89c80fd3c4d2a1e5a4e849fc44aef0e01448663`
- Ambiente: `http://127.0.0.1:3100` (nunca Production)
- Navegador: Google Chrome do sistema, via `channel: "chrome"` do Playwright (`C:\Program Files\Google\Chrome\Application\chrome.exe`, já instalado — nenhum Chromium/Firefox/WebKit baixado)
- Data-base: 2026-08-01, fuso America/Fortaleza

## Resultado — BLOCKER_LOCAL_AUTH_FIXTURE_UNAVAILABLE

O QA visual **autenticado** (Fases 8-43 do brief: Calendário, REC OS, Meu
Escritório, CRM canônico, Status/Arquitetura, Meu Negócio, EditorOS,
Roadmap, Mapa do Cliente, Workspace Preview, mobile autenticado) **não
pôde ser executado**. Auditoria completa (Fase 6), em ordem de
preferência:

1. Credencial de QA já existente no ambiente local — **não encontrada**.
   `.env.local` não contém nenhuma das variáveis
   `SUPER_ADMIN_TEST_EMAIL`/`SUPER_ADMIN_TEST_PASSWORD`,
   `QA_EMAIL`/`QA_PASSWORD`, `E2E_EMAIL`/`E2E_PASSWORD`,
   `TEST_EMAIL`/`TEST_PASSWORD` (confirmado por grep, nenhum valor
   impresso).
2. Fixture de login existente — **não encontrada** (nenhum
   `auth.setup`/`storageState` pré-existente em todo o repositório antes
   desta sprint).
3. Conta de teste documentada — **não encontrada** em nenhum doc.
4. Login normal automatizado — depende de uma credencial real, que não
   existe (não posso criar uma: "não criar usuário", "não redefinir
   senha").
5. storageState gerado pelo login acima — depende do item 4.

Nenhum mecanismo proibido foi usado como atalho (service role, bypass de
middleware, cookie fabricado, token copiado, usuário criado agora, banco
para fabricar sessão, perfil pessoal do Chrome). Login manual não foi
solicitado ao usuário (proibido pelo brief). `tests/e2e/auth.setup.ts`
detecta a ausência da credencial e **pula (skip) o teste com uma mensagem
clara**, em vez de travar ou fabricar uma sessão — confirmado rodando
`npx playwright test --project=auth-setup` (1 skipped, mensagem
`BLOCKER_LOCAL_AUTH_FIXTURE_UNAVAILABLE` impressa).

## O que FOI executado e verificado de verdade

### Playwright — instalação e configuração

- `@playwright/test` instalado como devDependency (`^1.62.1`) — não era Puppeteer/Selenium, não havia nenhuma ferramenta E2E prévia.
- Nenhum navegador baixado: `npx playwright install chrome` confirmou que o Chrome do sistema já está instalado e pode ser usado via `channel: "chrome"`.
- `playwright.config.ts`: baseURL `http://127.0.0.1:3100`, `outputDir`/relatório HTML sob `.tmp/playwright/` (já coberto por `.gitignore`), `trace: on-first-retry`, `screenshot: only-on-failure`, `video: retain-on-failure`. Projetos: `auth-setup`, `unauthenticated` (não depende de login), `desktop-chrome` (1440×900), `mobile-390`, `mobile-393`, `mobile-430`, `tablet-768` (768×1024) — os 5 últimos dependem de `auth-setup` e usam o `storageState` que seria gerado por ele.
- Nenhum `webServer` automático configurado — o Playwright usa o servidor de QA já em execução; nunca inicia nem derruba o servidor sozinho.
- `.gitignore` atualizado (`/playwright-report/`, `/test-results/` — fallback defensivo; `.tmp/playwright/` já coberto pela regra `.tmp/` existente).

### Testes reais executados (Chrome real, servidor de QA real)

`tests/e2e/navigation-auth.spec.ts` — a única cobertura possível sem
autenticação — **rodou de verdade contra `http://127.0.0.1:3100`, 9/9
passou**:

- `/` responde HTTP 200, tem `<meta name="viewport" content="width=device-width...">`, zero erros de console.
- `/admin/calendario`, `/admin/contentos`, `/admin/escritorio`, `/admin/leads`, `/admin/crm`, `/admin/status/arquitetura`, `/admin/ecossistema` — todas, sem sessão, redirecionam para `/login` (nunca HTTP 5xx, nunca abrem a página protegida). Isso confirma ao vivo, num navegador real, que o proxy protege corretamente TODAS as rotas novas/corrigidas nas últimas duas sprints — algo que os testes estruturais anteriores só verificavam por leitura de código.
- `/login` renderiza sem `pageerror`.

Nenhum erro/warning apareceu no log do servidor (`.tmp/lokat-os-qa-3100.log`) durante a execução.

## O que NÃO foi validado (por causa do bloqueio)

Todo o restante do objetivo desta sprint — a validação visual autenticada
de Calendário Global, REC OS (Radar/Criar/Produzir/Finalizar/Roadmap/Mapa
do Cliente), Meu Escritório (Hoje/Semana/Mês, rascunhos), CRM canônico
(estados available_empty/available_with_data/unavailable/unauthorized/
preview_read_only, desktop e mobile), Status/Arquitetura, EditorOS,
Workspace Preview, dashboard mobile, bottom navigation, busca, ação
rápida, Meu Negócio, Relatórios, acessibilidade por teclado — **não pôde
ser exercitada em navegador real nesta sprint**. Tudo isso continua
apoiado apenas na auditoria de código e nos testes estruturais das
sprints anteriores (REC OS 3.0.1/3.0.1.1, Navegação e Experiência
3.0.1.2) — nunca confirmado visualmente.

## Limitações já conhecidas (reafirmadas, não nesta sprint)

- **Isolamento por login real**: Agência/Cliente da Agência/Empresa
  Direta fora do preview do Super Admin continuam sem isolamento
  diferenciado real — mesma lacuna documentada desde a Sprint REC OS
  3.0.1.
- **CRM workspace wiring**: `resolveCrmWorkspaceContext()` existe e está
  testado, mas não está conectado a `/admin/leads` — classificado como
  `crm_real_workspace_wiring: not_implemented`, limitação planejada (a
  interface atual não expõe dado de outro workspace nem concede acesso
  indevido — não há vazamento, só ausência de segmentação).
- **Persistência do Escritório**: rascunhos de metas/decisões continuam
  só em memória (`useState`), nunca localStorage/sessionStorage, nunca
  persistidos — confirmado por leitura de código nesta sprint (não
  alterado).

## Resultado

QA visual autenticado: **bloqueado** (`BLOCKER_LOCAL_AUTH_FIXTURE_UNAVAILABLE`), não reprovado por defeito de produto. QA visual não-autenticado: **aprovado** (9/9).

## Próxima ação

Disponibilizar uma credencial de QA/teste já existente (nunca criada por
este processo) em `.env.local`, usando um dos pares documentados em
`tests/e2e/auth.setup.ts` (`SUPER_ADMIN_TEST_EMAIL`/`_PASSWORD`,
`QA_EMAIL`/`_PASSWORD`, `E2E_EMAIL`/`_PASSWORD` ou
`TEST_EMAIL`/`_PASSWORD`), depois repetir `npx playwright test` — toda a
infraestrutura (config, projetos por viewport, storageState) já está
pronta para funcionar sem nenhuma alteração adicional.

## Atualização — Sprint E2E CI 3.0.2.2

O BLOCKER_LOCAL_AUTH_FIXTURE_UNAVAILABLE registrado acima foi resolvido
externamente: existe agora uma conta E2E dedicada (Super Admin, isolada,
sem dado comercial real) com credenciais no GitHub Environment
`local-e2e-qa`. `tests/e2e/auth.setup.ts` foi adaptado para consumir
`E2E_SUPER_ADMIN_EMAIL`/`E2E_SUPER_ADMIN_PASSWORD`. A suíte completa de
testes autenticados (Calendário, REC OS, Meu Escritório, CRM, mobile,
overflow, Workspace Preview) foi escrita nesta sprint e roda via GitHub
Actions (`.github/workflows/local-e2e-qa.yml`), não mais localmente —
ver `docs/qa/github-actions-authenticated-e2e.md` para o resultado da
primeira execução.
