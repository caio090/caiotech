# Handoff

Memoria oficial de continuidade entre agentes no projeto Lokat OS.

## Estado atual

- Projeto: Lokat OS
- Pasta: `C:\Users\Trabalho\Desktop\COde\lokat-os`
- Branch principal observada: `main`
- Regra: preservar mudancas locais existentes e nao alterar codigo sem plano aprovado.

## Ultima sessao

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
