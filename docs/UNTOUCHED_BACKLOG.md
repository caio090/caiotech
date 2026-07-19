# Untouched Backlog

Itens conhecidos que nao devem ser tratados como concluidos sem sprint propria, autorizacao ou QA formal.

## SQLs

### SQL 82

- Estado: `failed` — erro 42703, column "is_internal" does not exist.
- Nao reexecutar. Requer auditoria de catalogo e conciliacao futura.

### SQL 84

- Estado: `failed` — erro 42703, column "profile_id" does not exist.
- Nao reexecutar. Requer auditoria de catalogo e conciliacao futura.

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

## Admin clientes preso em "Carregando"

- Rota /admin/clientes nunca resolve o estado de loading.
- Registrado no QA da Sprint 3.0.3. Nao corrigido nesta sprint.
- Requer investigacao de query ou RLS em clients.

## Admin financeiro com dados demo

- /admin/financeiro exibe dados declarados (hardcoded demo).
- Registrado no QA da Sprint 3.0.3. Nao corrigido nesta sprint.
- Requer sprint propria para conectar dados reais de faturamento.

## CopyIdButton — integracao concluida e validada (Sprint 3.0.5b / Sprint 3.0)

- Componente criado em src/components/copy-id-button.tsx (Sprint 3.0.4).
- Integrado em: resultado de Criar (task_id/content_id, approval_id/content_id),
  card de tarefa em Produção (task_id, content_item_id), modal técnico de Aprovações
  (approval_id, content_id).
- QA Codex Web final aprovado em 2026-07-19 — item encerrado.

## Favicon ausente

- favicon.ico nao encontrado. Nao bloqueia a Sprint 3.0. Requer sprint propria.

## Upload dependente de extensao do Chrome

- Upload automatizado (ex.: testes) pode ser bloqueado pela extensao do Chrome, ja
  registrado desde a Sprint 3.0.4. Nao bloqueia a Sprint 3.0. Nao alterar a
  implementacao de upload por causa dessa limitacao de ferramenta de teste.

## Calendário Global — hidratação herdada (não corrigida)

- `src/app/contentos/calendario/_client-content.tsx` tem `const _TODAY = new Date()`
  em escopo de módulo e `new Date()` durante o corpo do render de
  `ContentosCalendarioContent`; `src/components/calendar-mock.tsx` também chama
  `new Date()` durante render. Mesma classe de bug já corrigida na Home
  (Sprint 3.0.5b). Identificado na auditoria da Sprint 3.1 Fase 0, não corrigido
  — a Sprint 3.1A implementou uma rota nova (`/admin/calendario`) sem reutilizar
  esse código, mas o calendário antigo por cliente continua com o risco.

## Calendário Global — reuniões (adiado para Sprint 3.1C)

- `commercial_meetings` (CRM comercial, sem client_id) e
  `productivity_meetings`/`productivity_tasks` (SQL 38, com client_id, nunca
  executado/auditado) não entraram no Calendário Global da Sprint 3.1A.
- Antes de decidir a estratégia de reuniões, é preciso auditar manualmente
  (somente `SELECT`) se o SQL 38 já foi executado no Supabase de produção —
  isso não pode ser confirmado por leitura de código.

## Calendário Global — Google Calendar/Meet (adiado para Sprint 3.1D)

- Não existe integração real hoje — `meet_link`/`meet_url` são apenas campos de
  texto livre. Requer OAuth Google, infraestrutura própria e é bloqueado até a
  Sprint 3.1C (reuniões) existir.

## Projeto São Paulo — trilha paralela ativa

- Solicitação mencionada pelo usuário fora do escopo do Calendário Global.
  Pesquisado no repositório e documentos por "Projeto São Paulo", "São Paulo",
  "projeto_sp", "sao_paulo", "projeto-sao-paulo": nenhuma referência real
  encontrada — apenas ocorrências de "São Paulo" como texto de exemplo de
  cidade em formulários (onboarding, equipe, solicitar-acesso), sem relação com
  um projeto ou iniciativa.
- Escopo aguardando recuperação do briefing original. Não inventado, não
  implementado, não misturado ao Calendário Global.

## Regra para execucoes futuras

Antes de alterar codigo, ler:

- `docs/CODEX_CURRENT_CONTEXT.md`
- `docs/IMPLEMENTATION_LEDGER.md`
- `docs/UNTOUCHED_BACKLOG.md`
