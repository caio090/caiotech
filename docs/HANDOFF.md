# Handoff

Memoria oficial de continuidade entre agentes no projeto Lokat OS.

## Estado atual

- Projeto: Lokat OS
- Pasta: `C:\Users\Trabalho\Desktop\COde\lokat-os`
- Branch principal observada: `main`
- Regra: preservar mudancas locais existentes e nao alterar codigo sem plano aprovado.

### Ultima sessao — 2026-07-04 — Meta Insights real

**Objetivo:** Sair do placeholder "em breve" e buscar metricas reais da Meta por cliente.

**O que foi implementado:**

- `GET /api/meta/insights/status?client_id=<uuid>`
  - Diagnostico seguro sem expor token.
  - Resolve: client_meta_assets → meta_connection → token (presenca + validade).
  - Retorna: ok, hasLinkedAsset, assetType, assetId, username, hasMetaConnection, hasAccessToken, canAttemptInsights, missing[], diagnostics, safeMessage.

- `GET /api/meta/insights?client_id=<uuid>&period=7d|15d|30d|current_month|custom&start_date&end_date`
  - Reescrito completamente.
  - Resolve token server-side via client_meta_assets → meta_connections.access_token.
  - Instagram Business: reach, impressions, profile_views, website_clicks, followers_count.
  - Facebook Page: page_impressions, page_reach.
  - Classifica erros Meta: 190=token_expired, 10=permission_missing, 100=invalid_param, 200=permission_error, 4/17/32=rate_limit.
  - Nunca retorna token.

- `src/app/admin/contentos/insights/_meta-insights-panel.tsx` (novo Client Component)
  - Seletor de periodo: 7 dias / 15 dias / 30 dias / mes atual / personalizado.
  - Chama status + insights no browser.
  - Cards: Alcance, Impressoes, Seguidores, Vis. de perfil, Cliques.
  - Bloco de diagnostico com erro Graph API + permissoes provaveis ausentes.

- `src/app/admin/contentos/insights/page.tsx`
  - Bloco Meta estatico "em breve" substituido por <MetaInsightsPanel clientId={clientId} />.
  - Query client_meta_assets removida do server component (feita pelo painel client-side).

- `src/app/admin/relatorios/page.tsx`
  - useEffect busca /api/meta/status ao montar.
  - Card "Relatorio de Conteudo": status aguardando → em_preparacao quando Meta conectada.

**Commit:** `4364e0d` — feat: adiciona insights reais da meta
**Push:** origin/main

**O que o sistema faz agora ao acessar ContentOS Insights com Meta vinculada:**
1. Mostra painel com seletor de periodo.
2. Chama Graph API com token real.
3. Se retornar metricas: exibe cards com numeros reais.
4. Se retornar erro de permissao (code 10 ou 200): exibe "Meta conectada, mas o app ainda nao tem permissao para ler esses insights" + scope provavel + endpoint + codigo Graph.
5. Se token expirado (code 190): exibe mensagem clara para reconectar.

**SQL necessario:** Nenhum novo. Depende dos SQLs 35, 37, 59/62 ja documentados.

**Pendencias:**
- Testar em producao apos deploy automatico Vercel.
- Se Graph API retornar erro 10 (permission_missing): anotar scope exato e endpoint.
- Se retornar metricas reais: confirmar valores com Codex Web.
- Produtos mais vendidos OlaClick: endpoint /v1/orders nao retorna itens — investigar se ha endpoint especifico para itens de pedido na OlaClick API.

### Ultima sessao — 2026-07-02 — fix OlaClick connect + Meta vinculation

**Causa raiz OlaClick "Selecione um cliente real":**
- `POST /api/olaclick/connect` usava admin client (service role) para validar client_id.
- Se a SUPABASE_SERVICE_ROLE_KEY estava errada/ausente no ambiente, a query retornava erro
  nao tratado e caia no bloco `!client` → mensagem enganosa.
- SQL 39 ja tinha RLS que permite super_admin/admin/agency via session JWT, mas o codigo
  nao usava session client.

**Fix OlaClick:**
- Connect route agora usa SESSION CLIENT por padrao para client lookup E para insert.
- Admin client so e tentado como fallback se session client retornar erro de permissao.
- Mensagem diferenciada: db_error / client_not_found / sql_pending.

**Causa raiz "Meta nao vinculada a este cliente":**
- SQL 37 nao incluia `super_admin` nas RLS policies de `client_meta_assets`.
- Usuario super_admin nao conseguia INSERT nem SELECT via session client.
- Link route chamava `createSupabaseAdminClient()` sem try-catch: exception nao capturada
  se SUPABASE_SERVICE_ROLE_KEY ausente.

**Fix Meta:**
- SQL 59 criado: atualiza policies de client_meta_assets incluindo super_admin em todas as
  operacoes (SELECT/INSERT/UPDATE/DELETE).
- Link route: try-catch em createSupabaseAdminClient(); session client primeiro, admin como
  fallback.

**UI de vinculation (commit e9eb3f7, sessao anterior):**
- Botoes "Vincular" em cada card de Pagina/Instagram em /admin/conexoes.
- Dropdown de cliente + Salvar/Cancelar inline.

**Onde fica salvo:**
- Conexao OlaClick: tabela `olaclick_connections`, coluna `client_id`
- Vinculo Meta: tabela `client_meta_assets`, coluna `client_id`

**Commits:**
- `e9eb3f7` — OlaClick retry logic + Meta vinculation UI (nao tinha sido pushed antes)
- `8ef2aad` — fix definitivo: session client first, SQL 59, link route resiliente

**SQL MANUAL OBRIGATORIO no Supabase (em ordem):**
1. `docs/supabase/39-olaclick-connections.sql` — se nao rodado ainda
2. `docs/supabase/37-client-meta-assets.sql` — se nao rodado ainda
3. `docs/supabase/59-fix-connections-client-linking.sql` — OBRIGATORIO (fix RLS super_admin)

**Pendencias:**
- Rodar os SQLs acima no Supabase SQL Editor.
- Testar conectar OlaClick em /admin/conexoes com Duh Lanches selecionado.
- Testar vincular @duh.lanches ao cliente Duh Lanches via botao "Vincular".
- Depois checar /admin/contentos/insights?client=<id> — deve mostrar "Meta conectada".
- Checar /admin/relatorios/faturamento — deve mostrar conexao OlaClick ativa.
- Portal cliente (dulanche@hotmail.com.br): ainda pendente, nao prioritario.

### Ultima sessao — 2026-07-01 — fix portal cliente via convite pendente

**Causa raiz identificada:**
- `dulanche@hotmail.com.br` nao tem profile no Supabase (nao existia em `public.profiles`).
- Nao tem client_id no profile, nao tem accepted_by no convite.
- `clients.email` estava vazio para Duh Lanches — step E nunca achava.
- Existe 1 `client_invites` com email `dulanche@hotmail.com.br`, `status = pending`, `client_id = 8062a63b-0292-4764-ba02-403c33f638fd`.

**Fix aplicado:**
- `src/lib/client/resolve-client.ts`: step D agora usa `.ilike()` para email, aceita `status pending` e `accepted`, auto-claim de convite pendente (UPDATE status=accepted, accepted_by, accepted_at), upsert profile com `client_id` e `role=client`, upsert `client_user_access`. Novo source: `invite_email_pending_claimed`.
- `src/app/client/home/_client-content.tsx`: fallback `Sua empresa` substituido por `Nenhuma empresa vinculada`.
- `src/app/client/debug-vinculo/page.tsx`: mostra cliente encontrado via client_id do convite, `inviteClaimedId`, `profileRepairedWith`.
- `src/app/admin/conexoes/page.tsx`: dropdown OlaClick mostra nome + email + id curto quando ha clientes com mesmo nome.

**Commits:**
- `d20b4f4` — admin inicio, video-background, smart-start-input, debug-vinculo (inicial)
- `32b4203` — fix resolver + auto-claim convite pendente + OlaClick dropdown

**Pendencias:**
- Testar em producao logando como dulanche@hotmail.com.br em /client/home.
- Verificar /client/debug-vinculo: deve mostrar `source=invite_email_pending_claimed`, `inviteClaimedId` preenchido.
- Apos primeiro login bem-sucedido, na segunda visita `source` deve ser `profile_client_id` (perfil foi reparado).
- OlaClick: verificar se Duh Lanches aparece com dois itens disambiguados no dropdown.
- Meta: card de ativos Meta mostra "Instagram Business desvinculado" — investigar client_meta_assets e fluxo de vinculo de ativo a cliente. Nao foi corrigido nesta sessao.
- Objetivo 5 (Meta ativos) NAO concluido — requer investigacao visual da pagina /admin/conexoes.
- Nao rodar SQL manual adicional — os campos necessarios ja existem (client_invites tem status, accepted_by, accepted_at).

## Ultima sessao

### Feito em 2026-06-29 - criacao e limpeza admin de clientes

- Ajustado `POST /api/admin/clients` para retornar diagnostico seguro e rastreavel de criacao: `step`, `role`, `account_type`, `serviceRoleConfigured`, `usedRpc`, `usedServiceRole`, `supabaseCode` e `supabaseMessage`.
- Confirmado no codigo que a criacao tenta primeiro a RPC `admin_create_client` com os parametros do SQL 51.
- Se a RPC `admin_create_client` estiver ausente ou com assinatura divergente, a API retorna erro claro apontando `docs/supabase/51-admin-create-client-bypass.sql` em vez de mascarar como RLS generico.
- Mantido fallback server-side por service role somente quando a RPC existe/falha por outro motivo e `SUPABASE_SERVICE_ROLE_KEY` esta configurada; nao ha insert pelo browser.
- Ajustado `DELETE /api/admin/clients/[id]` para aceitar `mode=archive` por padrao e `mode=hard` apenas para `super_admin`.
- Criada rota `POST /api/admin/clients/bulk-delete` para arquivar ou apagar definitivamente clientes selecionados usando RPCs do SQL 53.
- Criada rota `GET /api/admin/clients/cleanup` para listar candidatos de limpeza via RPC, sem apagar nada automaticamente.
- Criado `docs/supabase/53-client-admin-cleanup-tools.sql` com:
  - `admin_list_clients_for_cleanup()`
  - `admin_archive_clients(p_client_ids uuid[])`
  - `admin_hard_delete_clients(p_client_ids uuid[])`
  - exemplos comentados de uso manual.
- Ajustada tela `/admin/clientes`:
  - segmentos do modal de novo cliente atualizados;
  - botao "Selecionar clientes";
  - barra com contagem e acoes "Arquivar", "Apagar definitivamente" e "Cancelar selecao";
  - card com acoes textuais "Convite", "Editar", "Arquivar" e "Apagar";
  - modal de arquivar com texto de preservacao;
  - modal de hard delete exigindo nome do cliente ou `APAGAR`;
  - botao/painel "Limpeza" para consultar candidatos, sem pre-selecionar Duh Lanches ou qualquer outro cliente.
- Revalidado que `package.json` e `package-lock.json` nao tem diff.
- Validado `npx tsc --noEmit`.
- Validado `$env:TURBOPACK='0'; npm run build`.
- Validado `git diff --check`.

### Arquivos alterados em 2026-06-29 - criacao e limpeza admin de clientes

- `src/app/api/admin/clients/route.ts`
- `src/app/api/admin/clients/[id]/route.ts`
- `src/app/api/admin/clients/bulk-delete/route.ts`
- `src/app/api/admin/clients/cleanup/route.ts`
- `src/app/admin/clientes/page.tsx`
- `docs/supabase/53-client-admin-cleanup-tools.sql`
- `docs/HANDOFF.md`
- `docs/SESSION_LOG.md`

### Comandos executados em 2026-06-29 - criacao e limpeza admin de clientes

- `git diff -- package.json package-lock.json`
- `git status --short --branch`
- `git branch --show-current`
- `git log --oneline -5`
- `Get-Content AGENTS.md`
- `Get-Content docs/HANDOFF.md`
- `Get-Content docs/AI_CONTEXT.md`
- `Get-Content docs/SESSION_LOG.md`
- `Get-Content docs/DECISIONS.md`
- `Get-Content docs/ROADMAP.md`
- `npx tsc --noEmit`
- `$env:TURBOPACK='0'; npm run build`
- `git diff --check`

### Pendencias em 2026-06-29 - criacao e limpeza admin de clientes

- Rodar manualmente no Supabase SQL Editor: `docs/supabase/53-client-admin-cleanup-tools.sql`.
- Depois do deploy, testar em producao:
  1. criar cliente em `/admin/clientes`;
  2. conferir resposta de erro com `step` se ainda houver falha;
  3. arquivar um cliente teste;
  4. abrir "Limpeza", conferir o relatorio antes de selecionar;
  5. testar hard delete apenas com cliente teste e backup/conferencia manual.
- Nao apagar nem pre-selecionar Duh Lanches.
- Manter `docs/imagens-hero/`, `docs/videosweb-lokat-os/`, `imagens-hero/` e `rec-videos/` fora do commit.

### Proximo passo recomendado em 2026-06-29 - criacao e limpeza admin de clientes

- Fazer commit/push para disparar deploy automatico no Vercel `caiotech`; depois rodar SQL 53 no Supabase e testar `/admin/clientes` em producao.

### Feito em 2026-06-29 - exclusao e visibilidade de clientes

- Corrigida regra de visibilidade de clientes: clientes visiveis sao apenas `active` e `onboarding`.
- Clientes com `deleted_at` ou `archived_at` preenchido nao devem aparecer nas listas, seletores e conexoes.
- Criado helper central `src/lib/client-visibility.ts` com `CLIENT_VISIBLE_STATUSES`, status invisiveis e filtro defensivo de registro.
- Ajustado `GET /api/admin/clients` para nao retornar `inactive`, `archived`, `deleted`, `cancelled`, `test` ou soft-deleted.
- Ajustado `/api/admin/clients/[id]` para buscar apenas cliente visivel e para tentar RPC `admin_delete_client` antes dos fallbacks de soft delete.
- Ajustadas listagens/selecao em Admin Clientes, Diagnosticos, Plataforma, RecOS criar, Kanban Operacional, ContentOS e OlaClick.
- Ajustado portal/layout cliente e layout ContentOS para nao aceitar cliente apagado como ativo.
- Criado `docs/supabase/52-client-delete-and-cleanup.sql` com colunas `deleted_at`/`archived_at`, indices, view `v_real_clients` filtrada, RPC `admin_delete_client` e bloco comentado de limpeza manual dos clientes antigos.
- Atualizado `docs/supabase/51-admin-create-client-bypass.sql` para nao criar cliente com status `inactive`.
- Validado `npx tsc --noEmit`.
- Validado `$env:TURBOPACK='0'; npm run build`.

### Pendencias em 2026-06-29 - exclusao e visibilidade de clientes

- Rodar manualmente `docs/supabase/52-client-delete-and-cleanup.sql` no Supabase SQL Editor.
- Depois testar em producao: criar Duh Lanches, confirmar aparicao nos seletores, apagar no admin, recarregar e confirmar que nao volta.
- Se quiser limpar clientes antigos de teste, rodar primeiro o SELECT comentado no SQL 52 e so executar o UPDATE apos conferencia manual.
- `package.json` e `package-lock.json` tem alteracoes locais de Playwright nao relacionadas a esta tarefa e nao devem ser incluidas neste commit.

### Feito em 2026-06-29 - debug do POST de clientes

- Contexto validado pelo usuario: `SUPABASE_SERVICE_ROLE_KEY` ja esta disponivel em producao; `/api/debug/env-check` retornou service role configurada e `/api/debug/admin-client-test` confirmou leitura de `clients` via service role.
- O erro restante em `/admin/clientes` esta concentrado no `POST /api/admin/clients`, que retorna HTTP 500 ao tentar criar cliente real.
- Ajustado `POST /api/admin/clients` para logar diagnostico seguro do insert: role, `account_type`, `serviceRoleConfigured` e payload sanitizado sem dados sensiveis.
- Ajustado retorno de erro do insert para `code: "CLIENT_INSERT_FAILED"` com `supabaseError.message`, `code`, `details` e `hint`, sem stack trace e sem secrets.
- Ajustado tratamento de erro inesperado do `POST` para retornar `code: "CLIENT_CREATE_UNEXPECTED_ERROR"` e logar somente mensagem segura.
- Ajustado `/admin/clientes` para nao mostrar mensagem falsa sobre `SUPABASE_SERVICE_ROLE_KEY` quando a env esta OK; agora mostra mensagem especifica por `code` e, se existir, "Detalhe tecnico" com a mensagem do Supabase.
- Nao foram alterados `/rec`, landing, ContentOS ou assets locais.
- Validado `npx tsc --noEmit`.
- Validado `$env:TURBOPACK='0'; npm run build`.

### Feito em 2026-06-29 - fallback RLS no create client

- Usuario testou em producao e o erro real apareceu na tela: `new row violates row-level security policy for table "clients"`.
- Diagnostico: a env de service role existe e consegue ler `clients`, mas o insert feito pelo client admin nao esta bypassando RLS em producao. Sem `auth.uid()` na chamada service role, a policy baseada em `public.current_user_role()` nao consegue validar o usuario.
- Ajustado `POST /api/admin/clients` para, quando o insert via admin client retornar RLS, tentar um fallback server-side usando `createServerSupabaseClient()` com a sessao autenticada do admin.
- O fallback continua acontecendo no servidor, nao no browser, e preserva validacao previa de `super_admin`/`admin`.
- Mantidos os mesmos fallbacks de coluna ausente e status `active` -> `onboarding`.
- Validado `npx tsc --noEmit`.

### Arquivos alterados em 2026-06-29 - debug do POST de clientes

- `src/app/api/admin/clients/route.ts`
- `src/app/admin/clientes/page.tsx`
- `docs/HANDOFF.md`
- `docs/SESSION_LOG.md`

### Comandos executados em 2026-06-29 - debug do POST de clientes

- `git status --short --branch`
- `git branch --show-current`
- `git log --oneline -5`
- `npx tsc --noEmit`
- `$env:TURBOPACK='0'; npm run build`

### Pendencias em 2026-06-29 - debug do POST de clientes

- Apos deploy automatico, testar novamente `/admin/clientes` criando o cliente Duh Lanches.
- Se ainda retornar erro, copiar o `supabaseError.message/code/details/hint` retornado pelo `POST /api/admin/clients` ou consultar os logs da Vercel do projeto `caiotech`.
- So criar `docs/supabase/51-fix-clients-create-schema.sql` se o erro real indicar constraint/schema incompatível.
- Manter `docs/imagens-hero/`, `docs/videosweb-lokat-os/`, `imagens-hero/` e `rec-videos/` fora do commit nesta etapa.

### Proximo passo recomendado em 2026-06-29 - debug do POST de clientes

- Fazer push para `origin/main`, aguardar deploy automatico da Vercel no projeto `caiotech` e testar o cadastro real em `https://www.lokat.com.br/admin/clientes`.

### Feito em 2026-06-29 - debug seguro de env em producao

- Criada rota temporaria e segura `GET /api/debug/env-check` para validar em producao se o runtime que serve `www.lokat.com.br` enxerga as variaveis Supabase.
- A rota retorna somente booleanos para `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`, alem de `NODE_ENV`, `VERCEL_ENV` e `projectHint`.
- Nenhum valor, prefixo ou trecho de secret e retornado ou logado.
- Liberada a rota `/api/debug/env-check` no `src/proxy.ts` para evitar redirect para `/login` em producao.
- Reforcada a regra de deploy: publicar somente via `git push origin main` no repo `caiotech`; nao usar `vercel --prod` como padrao e nao criar projeto Vercel novo.

### Pendencias em 2026-06-29 - debug seguro de env em producao

- Apos deploy automatico, testar `https://www.lokat.com.br/api/debug/env-check`.
- Resultado esperado: `"supabaseServiceRoleConfigured": true`.
- Se vier `false`, configurar `SUPABASE_SERVICE_ROLE_KEY` no projeto Vercel correto: `caiotech` -> Settings -> Environment Variables, depois redeploy do ultimo Production.

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
