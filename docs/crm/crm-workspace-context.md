# Contexto de workspace do CRM — Sprint Navegação e Experiência 3.0.1.2

## Estado real da tabela (auditado, não assumido)

`waitlist_entries` (a fonte usada por `/admin/leads` e
`/api/admin/waitlist`) **não tem** coluna de workspace/agência/cliente —
é uma tabela única, de escopo plataforma (leads da própria Lokat).

## resolveCrmWorkspaceContext()

`src/lib/crm/workspace-context.ts` — registra esse fato honestamente:

- `super_admin` → `scope: "platform"` (o único caso real hoje).
- `agency` / `agency_client` / `direct_business` → `scope:
  "not_yet_segmented"` — nunca finge um isolamento que a tabela não
  suporta.
- Nunca aceita `client_id`/role vindos do navegador — só parâmetros já
  resolvidos no servidor (sessão real ou preview).
- `readOnly` sempre `true` em preview, para qualquer superfície.

## O que NÃO foi feito nesta sprint (por restrição explícita)

"Não implementar CRM adaptativo completo." O resolver existe e está
testado (11 asserções), mas **não está conectado** ao componente real de
`/admin/leads` — a página continua servindo os mesmos dados para qualquer
admin/super_admin autenticado, sem segmentação por workspace. Registrado
como `crm_workspace_context: planned` (contrato existe, wiring real não).

## Próximo passo (fora desta sprint)

Adicionar `workspace_id`/`agency_id` a `waitlist_entries` (ou a uma tabela
de CRM comercial separada) é uma decisão de schema/migration — nunca
executada aqui ("não alterar Supabase", "não executar SQL", "não criar
migration").
