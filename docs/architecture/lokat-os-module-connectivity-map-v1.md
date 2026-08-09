# LOKAT OS — Mapa de Conectividade de Módulos v1

**Sprint:** Recalibração LOKAT OS 2026-08
**Status:** Auditoria + mapeamento conceitual — nenhum código alterado.

## Método

Inventário construído a partir de `find src/app -name page.tsx` (140+
rotas reais encontradas) e leitura direta do código de cada módulo
listado no brief, mais os módulos adicionais que a auditoria revelou
(Financeiro, Academy, Operacional, Growth, portal do Cliente). Rotas
puramente públicas (blog, landing, planos) e onboarding ficam fora deste
mapa — são fluxo de aquisição, não módulos operacionais.

## Inventário por módulo

Colunas: rota-base · propósito · entidades lidas · entidades escritas ·
contexto atual (workspace/company/project) · estado real · estado de QA
· estado MVP recomendado · dependências · duplicação/gaps.

### Dashboard
- **Rotas:** `/admin/dashboard`
- **Propósito:** ponto de entrada pós-login, visão geral por superfície.
- **Lê:** perfil, contagens agregadas de outros módulos.
- **Escreve:** nada.
- **Contexto:** Workspace (surface-aware); nenhum Company/Project ainda.
- **Estado real:** implementado, QA autenticado passou (dashboard-mobile.spec.ts).
- **MVP:** CORE_MVP.
- **Gap:** não tem um "seletor de Company" — é genérico por surface, não por empresa. É o candidato natural a virar a Central Global (Camada 2 do brief).

### Meu Negócio (`/admin/meu-negocio`)
- **Propósito:** Centro de Comando de uma empresa — DNA, 8Ps, SWOT, Metas, Financeiro simplificado, Estoque, Motor de decisão.
- **Lê:** fixture `RestaurantWorkspace` (uma única empresa de demonstração), `src/lib/business-strategy/*`, `src/lib/motor-lokat/*`.
- **Escreve:** estado em memória/sessão para a maior parte das abas (confirmado em `docs/meu-negocio/business-dna-restoration.md`: 17 de 19 campos do DNA nascem vazios, sem persistência real).
- **Contexto:** hoje é 1 empresa fixa, não múltiplas Companies reais — é o protótipo mais próximo da "Central da Empresa" pedida nesta recalibração, mas ainda sem seleção real de empresa nem diagnóstico vivo conectado a dados reais da plataforma.
- **Estado real:** implementado (UI completa), maioria dos dados = session/fixture, não persistência real.
- **MVP:** núcleo é CORE_MVP (é o protótipo da Company Central); a extensão para múltiplas empresas reais é NEW_SCOPE_2026_08.
- **Gap crítico:** este módulo já É conceitualmente a Central da Empresa em miniatura — a recalibração recomenda EVOLUIR este módulo, não criar um novo do zero.

### CRM (`/admin/leads`, alias `/admin/crm`)
- **Propósito:** leads/waitlist, pipeline comercial (em preparação), ferramentas relacionadas de onboarding de plataforma (`/admin/super/waitlist`, `/admin/super/leads`).
- **Lê/escreve:** `waitlist_entries` (real, persistido).
- **Contexto:** hoje é platform-wide (Super Admin) — `resolveCrmWorkspaceContext()` existe e está testado mas não conectado à página real (`crm_real_workspace_wiring: not_implemented`, já documentado desde a Sprint REC OS 3.0.1).
- **Estado real:** implementado, QA autenticado passou (crm-canonical/crm-mobile specs). Pipeline comercial é UI honesta "Em preparação" (`byStatus`, sem drag-and-drop).
- **MVP:** CORE_MVP (leitura/triagem de leads); pipeline completo é PLANNED.
- **Domain Events (recomendado):** `lead.created`, `lead.updated`, `lead.converted`.
- **Work Items que cria:** nenhum hoje — candidato natural a criar Work Items do tipo `follow_up`.

### REC OS (`/admin/contentos/*`, `/admin/rec/*`, `/admin/recos/*`)
- **Propósito:** o módulo mais extenso do repositório — Radar, Criar (fluxo guiado), Produção, Aprovações, Roadmap, Mapa do Cliente, Calendário do REC OS, EditorOS (handoff), Resultados/Insights.
- **Lê/escreve:** `content_items`, `operational_tasks`, `approvals`, `rec_projects`.
- **Contexto:** já tem `resolveClientContext()` (Company real por `client_id`) e é o módulo mais avançado em isolamento por Company hoje.
- **Estado real:** implementado e extensamente QA'd (Sprints REC OS 3.0.1/3.0.1.1, QA Fix 3.0.2.5/3.0.2.6) — passou no contrato testado na run autenticada final.
- **MVP:** CORE_MVP.
- **Work Items que cria:** já demonstrado — `BusinessOfficeFeedItem` normaliza `content_item`/`operational_task`/`approval` de dentro do REC OS.
- **Domain Events (recomendado):** `content.created`, `content.approved`, `content.published`.
- **Gap:** `rec_os_final_send`, `radar_create_opportunity`, `roadmap_calendar_context_navigation` permanecem `not_validated` (skips E2E, ver Camada de Skips).

### Calendário Global (`/admin/calendario`)
- **Propósito:** visão cross-cliente somente leitura, agrega `content_items`/`operational_tasks`/`approvals` via `GlobalCalendarEvent`.
- **Contexto:** platform-wide (Super Admin), sem filtro de Company por padrão.
- **Estado real:** implementado, QA pendente formal (`readiness: qa_pending`), navegação autenticada corrigida e validada.
- **MVP:** CORE_MVP.
- **Gap:** financeiro ainda não incluído como fonte (já documentado).

### Meu Escritório (`/admin/escritorio`)
- **Propósito:** "o que fazer hoje/semana/mês" — reaproveita EXATAMENTE os normalizadores do Calendário Global.
- **Contexto:** hoje platform-wide (mesma limitação do Calendário); é o protótipo mais próximo de uma visão "Work Items agregados" cross-módulo.
- **Estado real:** implementado, corrigido nesta série de sprints (shell preservado mesmo com fonte 503 — Sprint QA Fix 3.0.2.6), QA autenticado passou no contrato testado.
- **MVP:** CORE_MVP — é literalmente o precedente funcional mais próximo do que a Central da Empresa/Central Global precisam fazer.

### EditorOS (`/admin/contentos/editor-os`)
- **Propósito:** handoff estruturado para edição de visual final.
- **Estado real:** implementado (handoff via parâmetros mínimos validados, nunca memória/localStorage — decisão já registrada em sprints anteriores).
- **Provider:** usa o padrão `DesignEditorProvider` (`src/lib/providers/design-editor/`), hoje em `mock`/`disabled` — motor real (CE.SDK) é `BLOQUEADO` por licença.
- **MVP:** handoff é CORE_MVP; editor real é PREMIUM/BLOQUEADO (depende de licença externa).

### Status / Arquitetura (`/admin/status`, `/admin/status/arquitetura`)
- **Propósito:** central de controle técnico (V1/V2 readiness, maturidade, prioridade, prazo) + mapa técnico de módulos/dados/integrações (ex-Ecossistema).
- **Contexto:** não é sobre Company/Project — é meta-informação sobre a PLATAFORMA. Continua sendo essa função nesta arquitetura (nunca compete com Company Central).
- **Estado real:** implementado, é a própria fonte que esta recalibração está auditando.
- **MVP:** INTERNAL_ONLY (uso do time Lokat, não do cliente final).

### Financeiro (`/admin/financeiro`, `/financeiro/*`, `/client/financeiro`)
- **Propósito:** pagamentos, contratos, inadimplência, planos, recibos.
- **Estado real:** parcialmente implementado; billing/pricing documentado em `docs/product-roadmap/billing-and-pricing.md` como trabalho em andamento.
- **MVP:** básico é CORE_MVP (visibilidade); avançado (CMV, fluxo de caixa) é PREMIUM — ver Camada Finance/Growth.

### Academy (`/academy/*`)
- **Propósito:** cursos/treinamentos para clientes/alunos.
- **Contexto:** não depende de Company/Project — é conteúdo educacional plano.
- **MVP:** LOCKED_VISIBLE/PLANNED — fora do núcleo Entity-Centric, não bloqueia MVP.

### Operacional (`/operacional/*`)
- **Propósito:** kanban interno, tarefas, comercial (pipeline/follow-ups/propostas/reuniões/leads), briefings, minhas tarefas.
- **Contexto:** já é, na prática, uma visão Work-Item-like por responsável — outro precedente forte para a camada de Work Items formalizada nesta sprint.
- **Estado real:** implementado.
- **MVP:** parcial CORE_MVP (minhas-tarefas/kanban), pipeline comercial expandido é PREMIUM/FUTURE.

### Portal do Cliente (`/client/*`)
- **Propósito:** visão do cliente final — aprovações, calendário, conteúdos, financeiro, solicitações, suporte.
- **Contexto:** é a superfície `agency_client`/`direct_business` do lado do cliente — já usa `WorkspaceCapability` (`client_portal.*`).
- **MVP:** CORE_MVP (é a experiência que o cliente do MVP externo (Camada 25) efetivamente usaria).

### Growth (`/growth/*`)
- **Propósito:** diagnósticos, funil, metas, ofertas, plano de ação, concorrentes.
- **Estado real:** implementado como módulo próprio, sem conexão hoje com o diagnóstico vivo de Meu Negócio.
- **MVP:** PLANNED/PREMIUM (Camada de Finance/Growth, mapeado só conceitualmente nesta sprint).

## Perguntas por módulo (síntese)

Para os módulos CORE_MVP (Dashboard, Meu Negócio, CRM, REC OS,
Calendário, Meu Escritório, Portal do Cliente), a resposta às 10
perguntas do brief converge:

1. **Company atual?** Resolvida hoje via `client_id`/`resolveClientContext()` (REC OS) ou platform-wide sem filtro (Calendário/Escritório) — inconsistente entre módulos, é o gap que a Company Central resolve.
2. **Project ativo?** Nenhum módulo tem essa noção hoje — 100% novo.
3. **Entidades lidas:** ver tabela acima, todas reais (`clients`, `content_items`, `operational_tasks`, `approvals`, `waitlist_entries`).
4. **Entidades escritas:** mesma lista, mais `onboarding_profiles`.
5. **Work Items criados:** só formalizado explicitamente em Meu Escritório (`BusinessOfficeFeedItem`); os demais módulos são a FONTE dos mesmos dados, sem o adaptador.
6. **Domain Events emitidos:** nenhum hoje (nenhum barramento existe).
7. **Domain Events consumidos:** nenhum.
8. **Dados na Company Central:** nenhum módulo alimenta uma tela assim hoje — não existe.
9. **Dados na Central Global:** idem.
10. **Contexto para IA:** só `ai-suggestions.ts`, pontual, sem hierarquia.

## Duplicações e dead ends encontrados

- **CRM:** três telas sobre a mesma tabela (`/admin/leads`, `/admin/super/waitlist`, `/admin/super/leads`) — já resolvido com honestidade na Sprint Navegação 3.0.1.2 (relação explícita, não fusão forçada).
- **Ecossistema → Status/Arquitetura:** alias mantido, conteúdo reaproveitado sem duplicação (Sprint 3.0.1.2).
- **`_client-content.tsx` órfão em Meu Negócio:** código antigo (BusinessTab/DNA/4Ps/SWOT/Manual) continua compilando mas não é mais importado por nenhuma rota desde a sprint do vertical slice Restaurante — dead end confirmado, não apagado (decisão correta documentada, evita perda de trabalho até uma decisão explícita).
- **Dois "provider" diferentes com o mesmo nome:** `src/lib/providers/*` (motores internos: editor/inbox/scheduler) vs. o conceito de "Lokat Project Connector" desta recalibração (integração externa com sistemas de clientes) — nomes parecidos, propósitos diferentes. Recomenda-se nomear o novo como "Connector", nunca "Provider", para evitar confusão no código.
