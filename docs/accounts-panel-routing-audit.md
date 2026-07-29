# Auditoria — Contas, Painéis, Workspaces e Roteamento V1

Sprint: `feat/accounts-panel-routing-v1`. Auditoria prévia — nenhuma mutação
foi executada (nenhum INSERT/UPDATE/DELETE, nenhuma migration, nenhuma
alteração de Auth). Todas as consultas ao Supabase (projeto `lokat-os`,
`ziursnveqpvqkqmaacpl`) foram somente leitura. E-mails mascarados no
padrão `xx***@dominio`; UUIDs nunca reproduzidos por extenso.

## 1. Estado atual (resumo executivo)

O sistema tem **dois modelos de acesso que coexistem sem estarem unificados**:

1. **Modelo real, em produção, usado por todo usuário de verdade hoje**:
   `profiles.role` (14 valores fixos, `super_admin` incluso) resolvido por
   `resolveEffectiveUserRole()` → redireciona para uma home fixa por role
   (`ROLE_HOME`) → dentro de `/admin`, `/client`, `/operacional`, `/academy`.
   Um usuário `cliente` está ligado a **no máximo uma** empresa (`clients`
   row), resolvida por uma cadeia de 5 fallbacks em
   `src/lib/client/resolve-client.ts`.

2. **Modelo de Workspaces (agência/cliente-de-agência/empresa-direta)**,
   construído nos hotfixes 1.0–1.0.11 desta sessão: schema real
   (`agency_workspaces`, `agency_clients`, `plan_limits`), tipos completos
   (`WorkspaceContext`, `WorkspaceMembership`, `WorkspaceCapability`), mas
   **usado hoje exclusivamente pelo preview "Visualizar como" do Super
   Admin, com dados de blueprint (fictícios)**. Não existe nenhuma tela ou
   API que crie uma `agency_workspaces` ou `agency_clients` real — as duas
   tabelas têm **0 linhas** em produção. Não existe "Gerenciar empresa"
   real — apenas o preview somente-leitura.

Os dois modelos não colidem hoje porque o segundo nunca é alcançado por
nenhum usuário real (só pelo Super Admin, em modo preview). Mas o dia em
que uma agência real for criada, as duas arquiteturas de autorização
(`profiles.role` fixo vs. `WorkspaceContext`/capability) terão que ser
reconciliadas — isso é o assunto central desta auditoria.

## 2. Modelo de dados (tabelas reais, confirmadas ao vivo)

Fonte: `information_schema.columns` e `pg_constraint` no projeto Supabase
real (não apenas os arquivos em `docs/supabase/*.sql`, que são scripts de
execução manual — a auditoria confirmou o que está de fato aplicado).

### `public.profiles` (25 linhas)
- PK `id` → `auth.users.id`.
- `role` (NOT NULL): CHECK ao vivo — `admin, super_admin, operacional,
  social_media, designer, editor, videomaker, gestor_trafego, financeiro,
  comercial, sdr, closer, cliente, aluno`. Idêntico a `VALID_ROLES` em
  `src/lib/access-control.ts` — **sincronizado corretamente**.
- `account_status`: CHECK — `active, trialing, beta_free, suspended,
  blocked, pending_setup`.
- `account_type` (nullable, sem CHECK ativo hoje apesar do comentário da
  migration 69 dizer `empresa|agencia|invited_client|diagnostic_only|
  super_admin`): **nenhuma das 25 linhas reais tem um desses valores** —
  todas são `nao_definido` ou `null`. A coluna existe mas nunca foi
  preenchida com um valor de classificação real.
- `client_id` (nullable uuid): FK conceitual para `clients.id` — um dos
  três mecanismos concorrentes de vínculo usuário↔cliente (ver seção 4).
- Outras colunas relevantes: `is_test`, `archived_at`, `deleted_at`,
  `source`, `lead_status`, `plan`, `onboarding_type`.
- Sem RLS documentada aqui além do padrão já conhecido de outras sprints.

### `public.clients` (2 linhas: "Duh Lanches", "O Pedreirão")
- PK `id`. `owner_id` (nullable) → `profiles.id`, `ON DELETE SET NULL`.
- **Ambas as linhas reais têm `owner_id = null`** — nenhum cliente real
  está vinculado a um usuário dono via esta coluna.
- `account_type` (nullable, texto livre): ambas as linhas têm o valor
  `"lokat_client"` — que **não existe em nenhum dos outros três
  vocabulários de account_type do projeto** (ver seção 3.3).
- `agency_id` E `parent_agency_id` (ambas nullable uuid, ambas `null` nas
  2 linhas reais) — **duas colunas para o mesmo conceito**, nenhuma usada
  pelo código de resolução real (`preview.ts` usa a tabela separada
  `agency_clients`, não estas colunas). Risco de duplicidade/confusão —
  ver Risco P2 na seção 12.
- `status`: CHECK original — `aguardando_validacao, onboarding, ativo,
  pausado, inadimplente, encerrado` (ambas as linhas reais: `onboarding`,
  nunca saíram desse estado apesar de serem clientes reais e ativos no
  produto).
- `created_by` (uuid): ambas as linhas apontam para o mesmo profile —
  o Super Admin (Caio) — confirmando que foram criadas manualmente pela
  equipe interna, não via nenhum fluxo de self-signup de agência.

### `public.agency_workspaces` (0 linhas)
- PK `id`. `owner_user_id` (NOT NULL) → `auth.users.id` — **um único dono
  por agência**, sem tabela de múltiplos administradores.
- `status` CHECK: `active, trial, suspended, canceled`.
- `plan_slug` (default `'start'`), `max_clients` (default `5`).
- RLS: dono vê a própria linha (`owner_user_id = auth.uid()`) ou
  `super_admin` vê tudo.
- **Nunca inserida por nenhum código da aplicação** — busquei por
  `.insert(` contra esta tabela em todo `src/` e não há nenhuma
  ocorrência. Só pode ser populada manualmente via SQL hoje.

### `public.agency_clients` (0 linhas)
- Join table `agency_id` × `client_id`, UNIQUE(agency_id, client_id),
  `status`: `active, paused, archived`.
- RLS: via agência do dono, ou `super_admin`.
- Mesma conclusão: **nunca inserida por código**, só leitura
  (`preview.ts`, `workspaces/route.ts`).

### `public.plan_limits` (4 linhas: `comunidade`=1, `start`=5, `pro`=15,
`agencia`=50 clientes; `max_team` respectivo 1/3/10/25)
- Única fonte de verdade **atualmente correta e alinhada** com
  `billing_plans` (`start`, `pro`, `agencia` — mesmos slugs, confirmado
  ao vivo). É a tabela que a Fase 7 do ticket deveria usar.

### `public.client_user_access` (0 linhas) — membership real de cliente
- `client_id`, `user_id`, `role` (default `'client'`), `status` (default
  `'active'`). É o mecanismo que **permitiria** múltiplos usuários por
  cliente — mas nunca foi usado em produção (0 linhas) e não tem UI de
  gestão (convite existe via `client_invites`, que ao ser aceito grava
  aqui, ver `resolve-client.ts` fallback D).

### `public.profile_roles` (0 linhas) — múltiplos papéis operacionais
- `user_id`, `role`, `department`, `is_primary`. Usado apenas para
  permitir que um membro da equipe interna tenha mais de um papel
  operacional (ex.: comercial + sdr) — **não é um mecanismo de
  workspace/tenant**, é ortogonal ao problema desta auditoria.

### `public.client_invites` (2 linhas) / `public.team_invites` (4 linhas)
- Convites por e-mail com token, expiração e status. Funcionais e usados
  (`resolve-client.ts`, telas de equipe/clientes).

### `public.account_subscriptions` (profile_id) vs.
`public.client_subscriptions` (client_id) (ambas 0 linhas)
- Duas tabelas de assinatura **deliberadamente separadas** por design
  (comentário da própria tabela: "uma agência tem uma account_subscription
  e vários clients") — correto conceitualmente, mas nenhuma das duas tem
  dado real ainda.

### Tabelas que a hipótese do ticket citou e **não existem** sob esse nome
`workspaces`, `workspace_memberships`, `workspace_clients`, `organizations`,
`tenants`, `subscriptions` (genérica), `capabilities` (tabela — existe só
como `WorkspaceCapability`, um union type TypeScript, e `plan_module_access`
no banco), `permissions` (genérica), `invitations` (genérica — existem
`client_invites`/`team_invites` nomeadas). Não foram inventadas nem
criadas nesta auditoria.

## 3. Autenticação e resolução de papel (role)

### 3.1 Fluxo confirmado (inalterado desde o hotfix 1.0.7)
`resolveEffectiveUserRole()` (`src/lib/access-control.ts`), precedência
`profile.role → user_metadata.role → app_metadata.role → null`, validada
contra `VALID_ROLES` (derivado de `ROLE_HOME`). Compartilhada por
`src/proxy.ts`, o redirect de login e `src/app/admin/layout.tsx` — **uma
única fonte**, sem duplicação nem drift, confirmado por leitura direta.

### 3.2 Papéis reais aceitos (fonte única):
`super_admin, admin, cliente, aluno, operacional, comercial, sdr, closer,
social_media, designer, editor, videomaker, gestor_trafego, financeiro`.
Idêntico ao CHECK constraint ao vivo do banco (seção 2). **Nenhum papel
"agency"/"agencia" ou "team" existe no vocabulário real de `role`.**

### 3.3 Achado central: três vocabulários de "tipo de conta" desalinhados
Confirmado por leitura de código, não suposição:

| Fonte | Valores | Onde é usado |
|---|---|---|
| `docs/supabase/69-...sql` / CHECK pretendido de `profiles.account_type` (não aplicado como CHECK real) | `empresa, agencia, invited_client, diagnostic_only, super_admin` | Comentário da migration; `src/app/api/admin/accounts/route.ts` lê mas não valida |
| `src/lib/account-permissions.ts` (`ACCOUNT_TYPES`) | `lokat_internal, agencia, produtora, empresa, cliente_atendido, diagnostic_only, nao_definido` | `canCreateClient()` (só 1 página usa) |
| `src/lib/account-types.ts` (`CANONICAL_ACCOUNT_TYPES`) | `interno_lokat, agencia_parceira, cliente_direto, cliente_agencia, autonomo, lead, operacional, teste` (+ mapa de "legados": `agency, business, local_business, professional, interested, internal, freelancer, autonomous, social_media, operational, super_admin, cliente, invited_client, diagnostic_only, empresa, agencia`) | `getAccountTypeBadge()` — badges de UI |
| **Valor real observado em `clients.account_type` (2/2 linhas)** | `lokat_client` | — **não existe em NENHUM dos três vocabulários acima** |

Consequência concreta, verificada: `getAccountTypeBadge("lokat_client")`
cai no fallback `UNCLASSIFIED_BADGE` ("Não classificado") para os dois
únicos clientes reais do sistema, porque `lokat_client` não está mapeado.
`src/config/workspace-capabilities.ts` já documenta essa fragmentação no
próprio comentário do arquivo ("três vocabulários de role/account-type
desalinhados... checks espalhados em 20+ arquivos") — **um achado que uma
sprint anterior já tinha identificado mas não unificado.**

### 3.4 Vocabulário de planos também desalinhado (relevante para a Fase 7)
- Banco (`billing_plans` + `plan_limits`, ao vivo, alinhados entre si):
  `comunidade, start, pro, agencia`.
- Código (`src/lib/account-permissions.ts`, `PLANS`): `free, starter,
  agency_start, agency_growth, agency_pro, enterprise`.
- `getClientLimitByPlan(profile.plan)` faz lookup pela chave do enum de
  código — um `profile.plan` real (`"start"`, `"pro"`, `"agencia"`) nunca
  bate com nenhuma chave (`"agency_start"` etc.), então a função sempre
  cai no fallback (`?? 2`). **Isso significa que o único limite de
  clientes já implementado no código está, na prática, sempre retornando
  o valor padrão, nunca o limite real do plano contratado.**

### 3.5 Casos de borda mapeados (sem alterar código)
- Usuário sem `profile` (`profiles` row ausente): `resolveEffectiveUserRole`
  cai para `user_metadata`/`app_metadata`; se nenhum tiver role válida,
  retorna `null` → `getRoleHome(null)` → `/client/home` (fallback seguro,
  nunca `/admin`).
- Usuário com múltiplos workspaces: **não existe hoje** — `profiles.role`
  é uma coluna única, um usuário só pode ter UM papel/UMA home. O único
  "múltiplo" real é `profile_roles` (operacional, não-tenant).
- Workspace suspenso: `agency_workspaces.status = 'suspended'` existe como
  valor possível, mas nenhum código real filtra por ele hoje fora do
  preview (`preview.ts` só filtra `status !== 'active'` para a superfície
  `agency`, nunca chamado com dado real).

## 4. Memberships — respostas às 20 perguntas da Fase 4

1. Um usuário pode pertencer a mais de um workspace? **Não, hoje não.**
   `profiles.role` é único; `client_user_access`/`agency_clients` (as
   tabelas many-to-many que permitiriam isso) têm 0 linhas.
2. Usuário em agência E cliente ao mesmo tempo? **Não modelado nem
   possível hoje** — não há um usuário real ligado a `agency_workspaces`.
3. Uma empresa pode ter mais de um usuário? **Sim, via `client_user_access`
   ou `client_invites`**, mas nunca exercido em produção (0 linhas).
4. Uma agência pode ter vários administradores? **Não** —
   `agency_workspaces.owner_user_id` é uma FK NOT NULL única, sem tabela
   de múltiplos admins.
5. Um cliente pode existir sem agência? **Sim — os dois clientes reais
   existem exatamente assim** (sem `agency_clients` row).
6. `parent_workspace_id` representa agência? Não existe essa coluna;
   equivalente é `agency_clients.agency_id` (join table), não uma coluna
   direta em `clients`.
7. Membership possui role própria? Sim, em `client_user_access.role`
   (default `'client'`) — mas nunca usada.
8. Membership possui status? Sim (`active` default) em ambas as tabelas
   de vínculo (`agency_clients`, `client_user_access`).
9. Existe convite pendente? Sim, `client_invites`/`team_invites`
   (`status = 'pending'`), funcional e em uso real (2 e 4 linhas).
10. Existe aceite de convite? Sim (`accepted_at`, `accepted_by`).
11. Existe remoção lógica? `clients.deleted_at`/`archived_at` sim;
    `agency_clients`/`client_user_access` não têm soft-delete — só um
    campo `status` (`paused`/`archived` para o primeiro).
12. Existe soft delete geral? Parcial — `profiles` e `clients` têm
    `deleted_at`/`archived_at`; as tabelas de vínculo novas não.
13. Como um usuário escolhe o workspace atual? **Não escolhe** — hoje um
    usuário `cliente` só pode ter UM `clients` vinculado (resolvido, não
    escolhido). O único "workspace switching" real do sistema é o preview
    do Super Admin (`WorkspaceViewSwitcher`), que não é membership, é
    simulação read-only.
14. Onde o workspace atual é armazenado? Para o Super Admin em preview:
    cookie assinado HttpOnly (`lokat_workspace_preview`). Para um `cliente`
    real: não é "armazenado" — é resolvido a cada request via
    `resolveCurrentClient()` (server-side, com fallback de 5 fontes).
15. Existe cookie? Sim, só para o preview (não para o contexto real de
    cliente).
16. Existe URL? Não — nenhuma rota carrega `?workspaceId=` como fonte de
    autorização (isso já foi endereçado nos hotfixes de preview: URL nunca
    é confiável, sempre revalidado no servidor).
17. Existe sessão server-side? Sim, via cookies de auth do Supabase +
    revalidação a cada request (`getCurrentUser()`).
18. Existe risco de trocar workspace só alterando URL? **Não para o
    preview** (cookie assinado, revalidado). **Não se aplica ao cliente
    real** (não há seleção de workspace por URL). Ver Risco P2 (seção 12)
    sobre `profiles.client_id` como um vínculo direto que, se um dia for
    editável pelo próprio usuário via alguma API, precisaria de guard
    explícito — hoje não encontrei nenhuma rota que permita ao cliente
    alterar seu próprio `client_id`.
19. Fluxo completo hoje, para um `cliente` real: login → `proxy.ts` resolve
    role → `/client/home` → `_layout-client.tsx` faz `fetch("/api/client/current")`
    client-side → API chama `resolveCurrentClient()` (5 fallbacks) →
    módulos client-side leem o `clientId` resolvido.
20. Fluxo completo para o Super Admin em preview: login →
    `/admin/dashboard` → "Visualizar como" → `POST /api/admin/workspaces/preview`
    → cookie assinado → `/admin/visualizar` → `getWorkspacePreviewContext()`
    revalida tudo a cada request.

## 5. Painéis e rotas — matriz

| Rota | Super Adm | Agência | Cliente agência | Empresa direta | Guard atual | Risco |
|---|---|---|---|---|---|---|
| `/admin/*` | ✅ | — | — | — | `proxy.ts` (role) + `admin/layout.tsx` (server, revalida role + preview) | Baixo — dupla camada |
| `/admin/visualizar` | ✅ (preview) | — | — | — | `getWorkspacePreviewContext()`, fail-closed | Baixo |
| `/client/*` | — | — | — | — (não existe surface própria; usa mesma rota) | **Só `proxy.ts`** — `client/layout.tsx` não tem nenhum guard server-side próprio | **P2** — single point of failure, sem defesa em profundidade |
| `/operacional/*` | — | — | — | — | `proxy.ts` (`OPERACIONAL_ALLOWED`) | Baixo |
| `/academy/*` | — | — | — | — | `proxy.ts` (`role === 'aluno'`) | Baixo |
| `/admin/meu-negocio` | ✅ | — | — | — | Nenhum — **100% demo em memória, zero Supabase** | Nenhum (sem dado real para vazar) |
| `/admin/financeiro` | ✅ | — | — | — | Guard de role só (`admin`/`super_admin`) | Não avaliado a fundo (financeiro interno da Lokat, não por-cliente) |
| Painel real de agência | **não existe** | **não existe** | — | — | — | — |
| Painel real de empresa direta | **não existe** | — | — | **não existe** | `preview.ts` recusa explicitamente (`direct_business_real_not_yet_classified`) | N/A — bloqueado por design, não por bug |

**Conclusão da matriz**: apenas 4 superfícies reais existem hoje
(`/admin`, `/client`, `/operacional`, `/academy`), todas gateadas por
`profiles.role` fixo. As "quatro superfícies" do modelo conceitual do
ticket (Super Adm / Agência / Cliente de agência / Empresa direta) só
existem, de fato, dentro do preview do Super Admin — nunca como uma
sessão real de um usuário `agencia`/`empresa`.

## 6. Visualizar como vs. Gerenciar empresa

1. Já existe um modo real de gerenciamento? **Não.**
2. Existe apenas o preview? **Sim**, e mesmo o preview de `direct_business`
   com workspace real é recusado (`preview.ts`); só blueprint funciona.
3. Existe troca de contexto real? **Não** — todo "contexto" hoje é
   `profiles.role` fixo por sessão.
4. Como o Super Admin gerencia uma empresa hoje? Diretamente, como
   `admin`/`super_admin`, sem passar por nenhum "workspace" — os dois
   clientes reais foram criados assim (`created_by` = Super Admin).
5. O sistema confunde preview e gerenciamento? **Não hoje** — a separação
   é limpa porque gerenciamento real simplesmente não existe ainda para
   este modelo; não há como confundir dois caminhos quando só um existe.
6. Risco de o Super Admin editar dados enquanto o preview está ativo?
   **Não** — `assertWorkspaceMutationAllowed()` bloqueia toda mutação de
   negócio durante preview (403 `WORKSPACE_PREVIEW_READ_ONLY`), com
   exceção exata e testada para a própria saída do preview (hotfix 1.0.11).
7. Risco de um usuário comum ativar um contexto diferente? **Não** — só
   `super_admin` pode iniciar um preview (`profile.role !== "super_admin"`
   → 403, tanto na ativação quanto, agora, na saída).
8. É necessário um `selectedWorkspaceId` server-side? **Sim, quando o
   gerenciamento real for construído** — recomendação na seção 9.
9. É necessário um `adminManagementContext` separado do preview? **Sim** —
   ver arquitetura recomendada abaixo.
10. Arquitetura recomendada (sem implementar): um **segundo cookie
    assinado**, distinto de `lokat_workspace_preview` (nome sugerido:
    `lokat_admin_management_context`), emitido só quando o Super Admin
    tem uma `SupportAccessGrant` ativa (já hoje um contrato TypeScript não
    persistido — `docs/supabase/DRAFT-support-access-grants.sql`) — nunca
    reutilizando o cookie de preview para permitir mutação, exatamente
    para não repetir o padrão de bug que os hotfixes 1.0.9–1.0.11 corrigiram
    (dois controles fazendo a mesma coisa de formas diferentes). Mutação
    real exigiria: grant ativo E não expirado E revalidado a cada request,
    nos mesmos moldes de `getWorkspacePreviewContext()`.

## 7. Limite de clientes por agência

- Plano armazenado: `agency_workspaces.plan_slug` (banco, correto) e
  separadamente `profiles.plan` (usado só pelo código legado
  desalinhado — seção 3.4).
- `max_clients` existe em DOIS lugares: `agency_workspaces.max_clients`
  (coluna própria, default 5) e `plan_limits.max_clients` (lookup por
  `plan_slug`) — redundante mas não necessariamente incorreto (a coluna
  na própria linha permite override por agência; `plan_limits` é o
  default do plano). Nenhum código hoje lê nenhum dos dois para validar
  uma criação, porque não existe fluxo de criação de `agency_clients`.
- Validação: **não existe nenhuma** — nem cliente, nem servidor, nem
  camada de serviço, nem transação. `canCreateClient()` em
  `account-permissions.ts` é a única validação de limite que existe no
  código, mas (a) só é chamada por uma página de UI, nunca por uma API
  route, e (b) usa um vocabulário de planos que nunca bate com o real
  (seção 3.4), então na prática nunca aplica o limite correto.
- Race condition: impossível avaliar hoje — não existe o INSERT a
  proteger.
- Regra final proposta (não implementada):
  ```
  active_agency_clients (status='active' in agency_clients)
  + pending_accepted_client_invites (status IN ('pending','accepted') com client vinculável)
  <= plan_limits.max_clients (via agency_workspaces.plan_slug)
  ```
  A aplicar em uma única função de serviço server-side
  (`assertAgencyCanAddClient(agencyId)`), chamada dentro de uma transação
  Postgres (ou com `SELECT ... FOR UPDATE` na linha da agência) no momento
  da criação — nunca só no frontend.

## 8. Entidades conhecidas (auditoria ao vivo, mascarada)

| Entidade | Existe? | Registros | Tipo | Observações |
|---|---|---|---|---|
| **Agência Lokat** | **Não** | 0 | — | Nenhuma linha em `agency_workspaces`, nenhum `clients.company_name` correspondente, nenhum `profiles.name` correspondente. |
| **Duh Lanches** | **Sim** | 1 | `clients` row | `account_type="lokat_client"`, `owner_id=null`, `agency_id=null`, `status="onboarding"`, criada pelo Super Admin. Sem duplicidade (busquei todas as 2 linhas de `clients` — só existe uma). |
| **Focus** | **Não** | 0 | — | Nenhuma linha em `agency_workspaces`; nenhum `clients.company_name` nem `profiles.name`/e-mail correspondente encontrado entre os 25 profiles reais. **Não presuma que existe antes de criar** — auditoria confirma ausência total. |
| **Cliente Teste Focus 01** | **Não** | 0 | — | Depende de Focus existir primeiro; nenhuma linha correspondente encontrada. |
| **Açaí do Gordo** | **Não** | 0 | — | Nenhuma linha em `clients`, nenhum `profiles.name` correspondente. Como não existe ainda, a questão do e-mail acentuado (ticket) é apenas um alerta preventivo para quando for criado — não há e-mail já cadastrado para verificar hoje. |

Duplicidades: nenhuma encontrada (só 2 clientes reais no total, nomes
distintos, sem variações tipo "Duh"/"Duh Lanches 2").

Dados incompletos observados (não corrigidos, apenas registrados): ambos
os clientes reais têm `status="onboarding"` apesar de aparentemente
estarem em uso operacional (referenciados extensivamente nos hotfixes de
Workspaces como clientes reais de produção); `account_type="lokat_client"`
não está em nenhum vocabulário de badge, exibindo "Não classificado" na UI.

## 9. Plano idempotente futuro (desenho, não implementado)

Funções propostas, todas puras/determinísticas na decisão, mutação
sempre isolada e explícita:

- `findOrCreateWorkspace(input: { type, ownerUserId?, name, slugHint? })`
  → busca por `owner_user_id` (se `type="agency"`) antes de qualquer
  criação; nunca cria uma segunda `agency_workspaces` para o mesmo
  `owner_user_id` sem confirmação explícita.
- `findOrCreateProfile(input: { email, authUserId? })` → busca por
  `id` (se auth user já existe) e por `email` (normalizado,
  `lower(trim(email))`) como apoio, nunca como chave primária de decisão.
- `findOrCreateMembership(input: { userId, targetType, targetId, role })`
  → grava em `client_user_access` (para `clients`) — não inventa uma
  tabela nova.
- `findOrCreateAgencyClient(input: { agencyId, clientId })` → checa
  `UNIQUE(agency_id, client_id)` antes; se já existe com `status='archived'`,
  retorna `ALREADY_LINKED` com o status atual, não reativa silenciosamente.
- `linkExistingBusiness(input: { clientId, agencyId })` → exige que
  `clientId` já exista (nunca cria um `clients` novo dentro desta função).

Estados de retorno (todos explícitos, nenhuma mutação silenciosa):
`FOUND_EXACT`, `FOUND_CONFLICT` (ex.: e-mail bate mas nome da empresa
diverge), `FOUND_MULTIPLE` (mais de um candidato — nunca escolhe
automaticamente), `MISSING_SAFE_TO_CREATE`, `MISSING_REQUIRED_DATA`,
`INVALID_EMAIL` (ex.: caractere não-ASCII antes do `@` rejeitado pelo
provedor/Supabase Auth — nunca corrigido automaticamente, sempre reportado
para decisão humana), `INVALID_PARENT` (agência referenciada não existe
ou está `suspended`/`canceled`), `ALREADY_LINKED`, `LINK_REQUIRED`,
`ROLE_CONFLICT` (ex.: profile já é `role='cliente'` de outro client),
`MEMBERSHIP_CONFLICT`.

Cada função deve suportar um modo `dryRun: true` que retorna o estado
resolvido (`FOUND_EXACT` etc.) e o payload que SERIA gravado, sem gravar
nada — exatamente o que o Fase 9 pediu, para qualquer execução futura
poder ser revisada antes de rodar de verdade.

## 10. Meu Negócio, Precificação e módulos de negócio

- **Meu Negócio** (`/admin/meu-negocio`, inclui a aba "Precificação" —
  não é uma rota separada): confirmado por leitura direta de
  `page.tsx` — **100% demo em memória, zero chamada a Supabase, zero
  workspaceId/clientId**. Cada usuário vê seus próprios dados de exemplo,
  que não persistem. **Sem risco de vazamento entre clientes porque não
  há dado real para vazar.**
- **Produtos / Insumos / Fichas técnicas**: não existem como rotas
  próprias — são conceitos/abas dentro do mesmo módulo demo.
- **Financeiro** (`/admin/financeiro`): painel interno da própria Lokat
  (visão do time, não por-cliente) — fora do escopo de isolamento
  tenant-a-tenant desta auditoria.
- **Compras / Estoque**: não encontrei rotas correspondentes em `src/app`.
- **Conclusão da Fase 10**: nenhum destes módulos usa `workspaceId` hoje
  porque nenhum precisa — todos ou são demo puro ou são internos da
  plataforma. **O primeiro módulo que precisará ser conectado a um
  workspace real é, portanto, o próprio "Meu Negócio", no dia em que
  deixar de ser demo** — a recomendação é que ele receba o
  `WorkspaceContext`/`clientId` resolvido no servidor (mesmo padrão já
  usado por `admin/layout.tsx` e `resolveCurrentClient()`), nunca um
  `workspaceId` de query string ou `localStorage`.

## 11. Testes de isolamento propostos (desenho, não implementados)

Quatro logins, conforme o ticket. Pré-requisito não atendido hoje: os
quatro logins pressupõem que Focus, Cliente Teste Focus 01 e Açaí do
Gordo existam — e a seção 8 confirmou que nenhum existe ainda. Portanto
estes testes **não podem ser implementados nesta sprint** (seriam testes
sobre dados fictícios, o que o CLAUDE.md/AGENTS.md e as restrições do
próprio ticket já desencorajam — "não inventar dados que não estejam no
sistema"). O desenho abaixo é o contrato para quando as contas existirem:

- **LOGIN 1 — Super Admin**: setup = sessão real já existente (Caio).
  URL inicial `/admin/dashboard` → 200. Ativar preview de cada superfície
  → `/admin/visualizar` → 200. Tentar mutação durante preview → 403
  `WORKSPACE_PREVIEW_READ_ONLY`. Sair do preview → 303 → `/admin/dashboard`
  sem banner (já coberto por testes reais nos hotfixes 1.0.10/1.0.11).
- **LOGIN 2 — Agência Focus**: bloqueado até Focus existir. Contrato:
  login → home da agência (rota ainda não construída) → listar só
  `agency_clients` da própria `agency_id` → tentar acessar
  `agency_workspaces.id` de outra agência via URL direta → 403/404, nunca
  200 com dado de outra agência.
- **LOGIN 3 — Cliente Teste Focus 01**: bloqueado até existir. Contrato:
  login → `/client/home` → `resolveCurrentClient()` deve resolver
  exatamente este cliente → tentar acessar outro `clientId` via API
  direta → 403, nunca dado de outro cliente.
- **LOGIN 4 — Açaí do Gordo**: bloqueado até existir. Contrato: login →
  `/client/home` (mesma rota — hoje "empresa direta" não tem painel
  próprio, usa a mesma superfície de `cliente`) → acessar Meu Negócio →
  200 com dados próprios → tentar acessar `/admin/*` → redirect, nunca 200.

## 12. Riscos classificados

**P0 — nenhum encontrado.** Não há hoje nenhum caminho, em código real
(fora do preview, que já tem 260 asserções reais cobrindo isolamento),
que vaze ou altere dado de uma empresa a partir de outra — porque o
modelo multi-tenant real (agência↔múltiplos clientes) simplesmente ainda
não está em uso por nenhum usuário de verdade.

**P1**:
- O único limite de clientes por plano implementado em código
  (`canCreateClient`/`getClientLimitByPlan`) usa um vocabulário de planos
  que nunca corresponde ao vocabulário real do banco — na prática,
  **o limite nunca é o contratado, sempre o fallback**. Não é explorável
  hoje (não há fluxo de criação de agência real para testar), mas será um
  bug ativo no dia em que existir.
- `/client/layout.tsx` não tem nenhum guard server-side próprio — depende
  inteiramente de `proxy.ts`. Não é uma vulnerabilidade hoje (o proxy é
  server-side, roda antes de qualquer render), mas é um único ponto de
  falha sem a defesa em profundidade que `/admin` já tem
  (`admin/layout.tsx` revalida independentemente).

**P2**:
- Quatro vocabulários de "tipo de conta"/"plano" desalinhados (seção 3.3,
  3.4) — risco de manutenção e de bugs de exibição (já confirmado: badge
  "Não classificado" para os únicos 2 clientes reais).
- `clients.agency_id` e `clients.parent_agency_id`: duas colunas para o
  mesmo conceito, ambas sempre `null`, nenhuma usada pelo código real
  (que usa a tabela `agency_clients` em vez disso) — candidatas a
  remoção ou a documentação explícita de qual é a fonte de verdade.
- `resolve-client.ts`'s `upsertProfile()` grava `role: "client"` (inglês)
  em vez de `"cliente"` (o único valor aceito pelo CHECK real) — esse
  upsert falharia silenciosamente (capturado por `try/catch`, empurrado
  para `debug.errors`, nunca propagado) sempre que executado; não é um
  P1 porque o profile já teria uma role válida na maioria dos casos reais
  (o upsert é best-effort de reparo), mas é um bug real, não hipotético.
- RLS policies em pelo menos 8 migrations (`59`–`67`, `82`–`85`)
  referenciam `role IN (..., 'agency', 'team')` — valores que o CHECK
  real de `profiles.role` **não permite existir**. São branches de OR
  sempre falsas, não uma falha de segurança, mas código morto que confunde
  quem ler essas policies pensando que 'agency'/'team' são roles válidas.

## 13. Próximas fases recomendadas

1. Decidir e documentar formalmente qual vocabulário de account_type e de
   plano é o canônico (recomendação: o do banco — `plan_limits`/
   `billing_plans` — por já estar correto e ser a fonte que qualquer
   validação server-side precisa consultar de qualquer forma).
2. Implementar `assertAgencyCanAddClient()` (seção 7) antes de construir
   qualquer UI de criação de cliente por agência.
3. Construir o primeiro fluxo real de `findOrCreateWorkspace`/
   `findOrCreateAgencyClient` (seção 9) em modo `dryRun` primeiro,
   validado manualmente pelo Codex Web/Claude Web antes de qualquer
   execução real.
4. Só depois disso, com o consentimento explícito do usuário e uma
   ficha de dados real (nome, e-mail ASCII válido, etc.) fornecida por
   ele, criar a agência Focus e vincular Cliente Teste Focus 01 e Açaí do
   Gordo — nunca inventar esses dados.

## 14. Ações manuais / Web

- Confirmar com o usuário o e-mail definitivo (ASCII) para Açaí do Gordo
  antes de qualquer criação futura.
- Confirmar se "Duh Lanches" e "O Pedreirão" devem ganhar `owner_id`
  retroativo e/ou virar `agency_clients` de uma agência real, ou se
  devem permanecer como `lokat_client` diretos.
- Decidir, com o usuário, se o "Gerenciar empresa" real (seção 6) é uma
  prioridade de curto prazo antes de reconciliar os vocabulários da
  seção 3.
