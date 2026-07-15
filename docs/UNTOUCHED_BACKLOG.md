# Untouched Backlog

Itens conhecidos que nao devem ser tratados como concluidos sem sprint propria, autorizacao ou QA formal.

## SQLs

### SQL 82

- Estado: `attempted_failed_partial_unknown`
- Nao reexecutar nesta sprint.
- Requer auditoria de catalogo e conciliacao futura.

### SQL 84

- Estado: `attempted_failed_partial_unknown`
- Nao reexecutar nesta sprint.
- Requer auditoria de catalogo e conciliacao futura.

### SQL 85

- Estado: `not_executed`
- Criado como corretivo, mas nao aplicado.
- Nao executar nesta sprint.

### SQL 86

- Estado: `attempted_failed_partial_unknown`
- Erro observado: policy `Admin can manage integration connections` already exists.
- Nao tratar como nao executado nem como concluido.

### SQL 87

- Estado: `attempted_failed_partial_unknown`
- Erro observado: policy `Admin manages design projects` already exists.
- Nao tratar como nao executado nem como concluido.

### SQL 88

- Estado: `attempted_failed_partial_unknown`
- Erro observado: policy `Admin manages conversation links` already exists.
- Nao tratar como nao executado nem como concluido.

### SQL 89

- Estado: `attempted_failed_partial_unknown`
- Erro observado: policy `Admin manages scheduled publications` already exists.
- Nao tratar como nao executado nem como concluido.

## Typebot patch

- Alteracoes Typebot nao estao no repositorio.
- Estao preservadas em patch local.
- Nao restaurar nesta sprint.

## Meta QA

- QA completo de wizard, retorno OAuth contextual, Hub persistido e isolamento por connection_id segue pendente.

## Asaas

- Sandbox nao homologado.
- Nao ativar producao, nao emitir cobranca real, nao alterar env vars sem sprint propria.

## Chatwoot

- Motor candidato para CRM Inbox.
- Nao instalado.
- Depende de infraestrutura externa.

## Postiz

- Motor candidato para Social Scheduler.
- Nao instalado.
- Depende de infraestrutura externa e decisao de licenca.

## OlaClick payment data

- Provider nao enviou campo de forma de pagamento no QA.
- Estado correto: `blocked_provider_data`.
- Nao inventar dados de pagamento.

## EditorOS cloud persistence

- Persistencia atual: rascunho local por client_id.
- Persistencia cloud depende de reconciliacao SQL 87/design tables.

## Integracoes fiscais

- Contratos TypeScript/documentacao existem.
- Nenhuma emissao fiscal ativa.
- Nao integrar SEFAZ/NF-e/NFS-e nesta sprint.

## Regra para execucoes futuras

Antes de alterar codigo, ler:

- `docs/CODEX_CURRENT_CONTEXT.md`
- `docs/IMPLEMENTATION_LEDGER.md`
- `docs/UNTOUCHED_BACKLOG.md`
