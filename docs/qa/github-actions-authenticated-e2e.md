# GitHub Actions — E2E autenticado — Sprint E2E CI 3.0.2.2

## Por que o runner usa localhost 3100, não Vercel

O objetivo é validar exatamente o mesmo código e o mesmo modo (`next dev`,
porta 3100) que o QA local sempre usou — nunca uma Preview/Production da
Vercel, que exigiria deploy e teria seu próprio ciclo de vida fora do
controle desta sprint. O workflow sobe `npm run dev:qa` (o mesmo lançador
usado localmente) dentro do runner efêmero do GitHub Actions, espera
`http://127.0.0.1:3100/` responder 200, roda os mesmos `qa:doctor`/
`qa:smoke` do ambiente local, e só então roda o Playwright.

## Por que não usa service role

Todos os testes autenticados entram pela UI normal de login
(`E2E_SUPER_ADMIN_EMAIL`/`E2E_SUPER_ADMIN_PASSWORD`, via
`tests/e2e/auth.setup.ts`) — a mesma forma que qualquer usuário real
entra. Nenhum service role é lido, configurado ou usado pelo runner. A
conta E2E é limitada e read-only por convenção de teste (ver
`e2e-read-only-test-policy.md`), não por um mecanismo de credencial mais
fraca.

## Conta E2E isolada

Super Admin dedicado, `account_type` não definido, sem cliente/agência
vinculados, sem billing, sem dado comercial real. Credenciais só existem
no GitHub Environment `local-e2e-qa` (secrets
`E2E_SUPER_ADMIN_EMAIL`/`E2E_SUPER_ADMIN_PASSWORD`) — nunca em
`.env.local`, nunca impressas, nunca commitadas.

## Environment `local-e2e-qa`

- Secrets (só no passo que roda o Playwright): `E2E_SUPER_ADMIN_EMAIL`, `E2E_SUPER_ADMIN_PASSWORD`.
- Variables (no passo que sobe o Next.js): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Nenhuma outra variável foi adicionada — auditado que o app não exige mais nada além dessas duas para rodar em modo leitura contra o projeto Supabase oficial.

## Workflow e triggers

`.github/workflows/local-e2e-qa.yml`, nome visível "LOKAT OS Local E2E
QA". Dispara em `push` para `integration/lokat-core-platform-map-v1` e,
opcionalmente, `workflow_dispatch` (útil só depois que o workflow já
existir no histórico do repositório). Nunca em `pull_request` nesta
primeira versão — evita expor secrets a um PR de fork.

## Permissões mínimas

`permissions: contents: read` no nível do workflow. `actions/checkout`
com `persist-credentials: false` — o runner nunca tem credencial para dar
push de volta ao repositório.

## Node 24, não Node 20

Auditoria (Fase 33): `next` exige `>=20.9.0`, mas os próprios scripts de
QA (`qa:doctor`, `qa:smoke`, `check:workspace-mutations`) são executados
com `node scripts/*.ts` direto, sem build nem `ts-node` — dependem do
suporte nativo a TypeScript do Node, que só existe a partir da série
22.6+/24. Node 20 quebraria esses três comandos com erro de sintaxe.
Decisão: Node 24 no workflow, igual ao ambiente de desenvolvimento local.

## Nenhum artifact sensível

Nesta primeira versão, nenhum `actions/upload-artifact` é usado. Traces/
vídeos/screenshots/o HTML completo do relatório ficam só em
`.tmp/playwright/` dentro do runner efêmero — descartados quando o job
termina. O único conteúdo que sai do runner é o resumo em Markdown
(`scripts/e2e-summary.ts` → `$GITHUB_STEP_SUMMARY`): contagens, nomes de
teste/projeto/arquivo, nunca e-mail/senha/token/cookie/header/dado de
página.

## Como interpretar uma falha

- **E2E_LOCAL_SERVER_UNAVAILABLE**: o Next.js não respondeu 200 em até 60s (30 tentativas × 2s) — infraestrutura, não produto.
- **E2E_AUTH_SECRETS_MISSING**: o Environment `local-e2e-qa` não tem os secrets configurados — infraestrutura.
- Falha de `qa:doctor`/`qa:smoke`/TypeScript/mutation coverage antes do Playwright — infraestrutura ou harness, nunca produto.
- Falha de um `.spec.ts` específico depois de tudo acima passar — provável falha de produto (ou de seletor/harness, se o mesmo padrão já funcionou localmente antes) — precisa da leitura do nome do teste e do resumo para classificar.

## Limitações desta primeira versão

- Sem `gh` CLI disponível no ambiente de execução deste agente — o
  acompanhamento em tempo real da run fica registrado como
  `ACTION_RUN_MONITORING_UNAVAILABLE`; o push por si só já dispara o
  workflow normalmente.
- Sem verificação prévia, dentro desta sessão, de que a conta E2E
  realmente existe e tem os campos esperados no Supabase oficial — isso
  foi confirmado externamente (pelo Codex Web) antes desta sprint, não
  re-auditado aqui (nenhum acesso a esse projeto Supabase a partir deste
  ambiente).
- Testes que dependem de um cliente/conteúdo específico (ex.: fluxo
  completo de criação no REC OS) se auto-pulam quando a conta E2E não tem
  esse contexto, em vez de assumir dado que pode não existir.
