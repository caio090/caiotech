# Plano de provisionamento — Workspaces 1.0

Documento técnico para a etapa **futura**, executada pelo Codex Web após o
QA do código desta sprint. **Nenhuma destas ações foi executada nesta
sprint.** Nenhum SQL foi rodado, nenhum usuário ou cliente foi criado.

## Pré-requisito: confirmar schema

1. Confirmar se `docs/supabase/69-account-types-agency-workspaces.sql`
   (`agency_workspaces`, `agency_clients`, `plan_limits`, `profiles.account_type`)
   já foi aplicada ao banco real. O código desta sprint funciona nos dois
   cenários (trata a ausência das tabelas como "recurso indisponível", nunca
   como erro fatal), mas o provisionamento real exige que existam.
2. Se não aplicada: aplicar `69-account-types-agency-workspaces.sql` (já
   existe, não foi alterado nesta sprint) antes de prosseguir.
3. Se for necessário controle de acesso de suporte temporário: aplicar
   `docs/supabase/DRAFT-support-access-grants.sql` (criado nesta sprint,
   ainda em rascunho — revisar nome final da tabela/numeração antes de
   aplicar).

## Sequência de provisionamento

1. Identificar ou criar o workspace da agência de teste (`agency_workspaces`,
   `name = "Agência de Teste"`, `status = "active"`).
2. Localizar o workspace **existente** da Duh Lanches na tabela `clients`
   pelo `company_name` ou `id` já conhecido — **não criar um novo registro**.
3. Vincular a Duh Lanches à agência de teste: inserir uma linha em
   `agency_clients (agency_id, client_id, status)` com o `id` real da Duh
   Lanches — nunca duplicar o cadastro.
4. Localizar o **usuário existente** vinculado à Duh Lanches (via
   `clients.owner_id` ou `profiles` com `client_id` equivalente, conforme o
   padrão real confirmado no banco).
5. Confirmar que esse usuário está corretamente associado ao portal
   `/client/*` (nenhuma alteração de papel deve ser necessária — o modelo de
   preview desta sprint não depende de mudar o papel de ninguém).
6. Criar o segundo cliente de teste (`clients`, novo registro, dados
   fictícios claramente de teste) e vinculá-lo à mesma agência de teste via
   `agency_clients`.
7. Criar um usuário de teste para esse segundo cliente.
8. Criar a empresa/autônomo de teste como um registro em `clients` **sem**
   linha correspondente em `agency_clients` (o que a torna "direta" segundo
   a lógica de `src/lib/workspaces/preview.ts`).
9. Criar um usuário de teste para essa empresa direta.
10. Confirmar/criar as memberships necessárias (papel de cada usuário nos
    workspaces acima), de acordo com a tabela real de perfis já existente —
    esta sprint não criou uma tabela de memberships própria porque nenhuma
    lacuna real foi confirmada além do que `profiles.role` já resolve.
11. Criar um `support_access_grants` de teste para a Duh Lanches, se e
    somente se `DRAFT-support-access-grants.sql` tiver sido aplicado —
    `access_level = 'read_only'`, `reason` preenchido, `expires_at` definido.
12. Marcar toda integração (OlaClick, etc.) desses registros de teste como
    `demo` ou `disconnected` explicitamente — nunca `connected` sem uma
    integração real por trás.
13. Não criar nenhuma credencial externa (token OlaClick, chave de API) como
    parte deste provisionamento de teste.
14. Não criar duplicidade — antes de cada inserção, confirmar por busca que
    o registro (agência de teste, segundo cliente, empresa direta) ainda não
    existe.

## Validação pós-provisionamento

- Super Admin consegue abrir "Visualizar como → Agência → Agência de Teste"
  e ver a Duh Lanches e o segundo cliente na carteira (uma vez que o painel
  real da agência leia `agency_clients` — funcionalidade ainda não construída
  nesta sprint, ver relatório final).
- Super Admin consegue abrir "Visualizar como → Cliente da agência → Duh
  Lanches" e ver o portal com "Atendido por: Agência de Teste".
- Super Admin consegue abrir "Visualizar como → Empresa/Autônomo → Empresa
  de Teste" e ver o painel sem carteira de clientes.
- Um usuário comum (não super_admin) confirma que não vê o switcher.
