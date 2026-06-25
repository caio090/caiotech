# Usuários, Clientes e Organizações

## Entidades

### `profiles`
Um registro por usuário autenticado (Supabase Auth). Campos:

| Campo | Descrição |
|---|---|
| `id` | UUID do usuário (mesmo do `auth.users`) |
| `role` | admin / cliente / social_media / growth / financeiro / operacional / lokat |
| `account_type` | empresa / agencia / cliente_atendido / lokat / nao_definido |
| `name`, `email`, `phone` | Dados pessoais |
| `organization_id` | Agência/empresa a qual este usuário pertence |

### `clients`
Representa marcas ou empresas atendidas. Pode ser:
- A própria empresa do usuário (quando `account_type = empresa`)
- Um cliente gerenciado pela agência (quando `account_type = agencia`)

| Campo | Descrição |
|---|---|
| `id` | UUID da marca/empresa |
| `owner_id` | FK para `profiles.id` do dono |
| `organization_id` | FK para a agência responsável |
| `name`, `slug` | Identificação pública |

### `onboarding_profiles`
Dados preenchidos durante o onboarding. Liga-se a `clients` via `client_id`, não diretamente a `profiles`.

Cadeia de relacionamento: `profiles.id ← clients.owner_id ← onboarding_profiles.client_id`

## Tipos de conta (`account_type`)

| Valor | Descrição |
|---|---|
| `empresa` | Empresa ou autônomo usando a plataforma de forma independente |
| `agencia` | Agência ou produtora gerenciando múltiplos clientes |
| `cliente_atendido` | Cliente de uma agência, acessa apenas seu portal |
| `lokat` | Equipe interna da LOKAT |
| `nao_definido` | Valor padrão antes do onboarding ser concluído |

O `account_type` é definido no onboarding em `/onboarding/tipo` e salvo em:
- `profiles.account_type` (via RPC `set_my_account_type`)
- `sessionStorage["lokat_account_type"]` (para uso client-side imediato)

## Roles vs. Account Types

São conceitos distintos:

- **Role** define o que o usuário pode fazer no sistema (permissões)
- **Account type** define o contexto de negócio do usuário (quem ele é)

Um usuário com role `admin` pode ter `account_type = agencia` (agência usando o plano enterprise) ou `account_type = empresa` (empresa com acesso total).

## Organizações

O campo `organization_id` é usado para scopar dados multi-tenant:
- Cobranças em `finance_charges.organization_id`
- Clientes em `clients.organization_id`
- Membros de equipe em `profiles.organization_id`

Uma organização corresponde ao `id` do usuário admin/dono.

## Convites de equipe (`team_invites`)

Permite adicionar membros à organização via:
1. Link de convite: `/convite/{token}`
2. E-mail com Resend (requer `RESEND_API_KEY`)
3. WhatsApp: link `wa.me/` com mensagem pré-preenchida (MVP)

O token é gerado pelo sistema e associado a `email`, `role` desejado e `organization_id` do convitante.

O aceite é feito na página `/convite/[token]` via RPC `accept_team_invite`.

## Fluxo de onboarding

1. Usuário acessa `/onboarding/tipo`
2. Escolhe entre: empresa, agência, cliente/convite, ou diagnóstico sem conta
3. O `account_type` é salvo em `sessionStorage` e persistido via RPC após autenticação
4. Redirecionamento para `/onboarding/cliente` ou `/convite` conforme escolha

## Diagnóstico público

Disponível em `/diagnostico` sem autenticação. As respostas são salvas em `sessionStorage["lokat_diagnostico_answers"]` e exibidas em `/diagnostico/resultado` com score, problemas e oportunidades gerados por rule-based logic (ou IA quando configurada).

## SQL necessário

- `docs/supabase/32-account-types-and-module-access.sql` — adiciona `account_type` às tabelas e cria funções `get_my_profile_with_account_type` e `set_my_account_type`
