# Global Calendar V1

Status: planned
Data: 2026-07-15

## Objetivo

Criar uma agenda global do LOKAT OS para enxergar compromissos de todos os clientes em uma unica superficie operacional.

Esta arquitetura nao cria schema, nao executa SQL e nao altera dados.

## Escopo V1

- Conteudos planejados, em producao, em aprovacao e publicados.
- Tarefas operacionais com prazo.
- Briefings pendentes.
- Eventos financeiros relevantes.
- Filtros por cliente, responsavel, status, area e periodo.

## Regras de produto

- A agenda global nunca substitui o calendario por cliente.
- Todo evento deve preservar `client_id`.
- Eventos sem `client_id` devem aparecer como pendencia de classificacao, nao como evento global generico.
- Eventos financeiros nao devem inventar valor quando a fonte externa nao retornou dado.

## Fontes previstas

- REC OS: calendario editorial e aprovacoes.
- Operacional: tarefas e producao.
- Financeiro: vencimentos, cobranças, repasses e conciliacoes futuras.
- CRM: follow-ups comerciais relevantes.

## Estados

- `planned`: arquitetura documentada.
- `blocked_external_infra`: quando depender de provider externo.
- `qa_pending`: quando a tela existir e precisar QA.
- `validated`: somente apos QA em producao.

## Fora de escopo nesta etapa

- Criar tabelas.
- Criar triggers.
- Publicacao social automatica.
- Sincronizacao bidirecional com Google Calendar.
- Webhooks financeiros.

## Proximo passo recomendado

Mapear fontes existentes por tabela/API e definir contrato de leitura unificado antes de qualquer DDL.
