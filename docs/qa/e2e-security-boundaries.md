# Fronteiras de segurança do E2E — Sprint E2E CI 3.0.2.2

## O que o runner pode fazer

- Autenticar como a conta E2E dedicada, pela UI normal de `/login`.
- Ler dados através das telas normais do produto (GET).
- Entrar/sair do Workspace Preview (única mutação explicitamente permitida fora do login).
- Rodar Playwright, TypeScript, mutation coverage, qa:doctor/qa:smoke.

## O que o runner NUNCA pode fazer

- Ler ou usar `SUPABASE_SERVICE_ROLE_KEY` (nunca configurada no Environment do CI).
- Fazer `git push` de volta ao repositório (`persist-credentials: false`, `permissions: contents: read`).
- Fazer deploy, usar Vercel CLI, alterar domínio/alias/Environment/secrets.
- Criar usuário, cliente ou agência.
- Executar SQL, migration, ou qualquer alteração de schema/RLS.
- Enviar conteúdo, aprovar, convidar, arquivar, deletar ou pagar nada.
- Fazer upload de artifact sensível (storageState, traces, vídeos, screenshots, HAR, log com sessão).

## Login e last_sign_in_at

Autenticar a conta E2E atualiza `last_sign_in_at` no Supabase Auth — um
efeito colateral padrão e esperado de qualquer login, não uma alteração
comercial. Não é tratado como mutação a ser bloqueada.

## Por que a conta E2E é segura mesmo sendo Super Admin real

- Isolada: sem cliente, sem agência, sem billing, `account_type` não definido.
- Credenciais só no GitHub Environment `local-e2e-qa` — nunca em código, `.env.local` ou log.
- `tests/e2e/helpers/mutation-guard.ts` intercepta toda requisição
  mutante (POST/PUT/PATCH/DELETE) para os mesmos namespaces de API que
  `src/proxy.ts` já trata como mutáveis (reaproveita
  `src/lib/workspaces/mutation-guard-runtime.ts` — a MESMA lógica pura do
  guard real de produção, nunca uma cópia que pode divergir) e falha o
  teste se algo além de login/logout/entrada-saída do preview tentar
  mutar.
- Os testes de fluxo (Radar → Criar, Roadmap, Finalizar) nunca clicam em
  "Enviar"/"Salvar definitivo" — só navegam e confirmam estrutura, ou se
  auto-pulam quando o contexto necessário (cliente/conteúdo) não existe
  para essa conta.

## O que fazer se um teste tentar mutar algo indevido

`assertNoDangerousMutation()` lança um erro claro identificando o método
e a rota — isso deve ser tratado como um bug do PRÓPRIO teste/harness
(nunca do produto) e corrigido removendo a ação perigosa do teste, nunca
ampliando a lista de exceções sem justificativa registrada aqui.
