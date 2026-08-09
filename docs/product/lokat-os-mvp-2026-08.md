# LOKAT OS — MVP Recalibrado 2026-08

**Sprint:** Recalibração LOKAT OS 2026-08
**Status:** Planejamento. Nenhuma feature nova implementada.

## Classificação por módulo

Baseada no inventário real de `docs/architecture/lokat-os-module-connectivity-map-v1.md`.

| Módulo | Classificação | Justificativa |
|---|---|---|
| Dashboard | CORE_MVP | Implementado, QA autenticado passou. |
| CRM (`/admin/leads`) | CORE_MVP | Implementado, QA autenticado passou; pipeline avançado é PLANNED. |
| REC OS | CORE_MVP | Módulo mais maduro e mais testado do repositório. |
| Calendário Global | CORE_MVP | Implementado, agrega dados reais. |
| Meu Escritório | CORE_MVP | Implementado, corrigido e validado nesta série de sprints. |
| Meu Negócio (núcleo) | CORE_MVP | É o protótipo funcional da Company Central — ver decisão abaixo. |
| Portal do Cliente | CORE_MVP | Necessário para qualquer piloto externo (Camada 25). |
| EditorOS (handoff) | CORE_MVP | Handoff estruturado já funciona sem motor externo. |
| EditorOS (motor CE.SDK) | LOCKED/BLOQUEADO | Depende de licença externa, já registrado como bloqueado. |
| Financeiro básico | CORE_MVP | Visibilidade de pagamentos/contratos. |
| Financeiro avançado (CMV, fluxo de caixa) | PREMIUM/PLANNED | Depende de Camada Finance/Growth (conceitual nesta sprint). |
| Growth | PLANNED/PREMIUM | Implementado como módulo isolado, sem conexão ao diagnóstico vivo ainda. |
| Academy | LOCKED_VISIBLE | Não bloqueia o núcleo Entity-Centric. |
| Operacional (kanban/tarefas) | CORE_MVP (parcial) | Precedente forte de Work Items; pipeline comercial expandido é PLANNED. |
| Status/Arquitetura | INTERNAL_ONLY | Uso do time Lokat, nunca do cliente final. |
| Company Central (tela nova) | NEW_SCOPE_2026_08 | Não implementar nesta sprint — formalizada em `lokat-os-entity-centric-v1.md`. |
| Central Global (tela nova) | NEW_SCOPE_2026_08 | Idem. |
| Project/Work Item (entidades novas) | NEW_SCOPE_2026_08 | Idem. |
| Lokat Project Connector | FUTURE | Depende do primeiro piloto externo (Camada 25). |
| Compras Inteligentes | FUTURE | Mapeado conceitualmente, ver seção própria abaixo. |
| CMV avançado | FUTURE/PREMIUM | Idem Financeiro avançado. |

**Nenhum item acima foi movido para `validated` nesta sprint** — a
classificação é sobre PRIORIDADE DE PRODUTO (o que entra no MVP), não
sobre estado de QA (isso continua vindo de `project-status.ts`).

## Três MVPs, não um

### Dogfooding MVP
**Pergunta que resolve:** o que precisa existir para o próprio time
Lokat parar de depender de Trello/Notion no fluxo principal?

Requisitos mínimos:
- Company real (não fixture) para pelo menos os projetos internos do time.
- Project + Work Items funcionando de ponta a ponta (mesmo sem UI de Company Central formal — pode nascer dentro do Meu Escritório/Operacional existentes).
- Board/kanban equivalente ao Trello atual (já existe em `/operacional/kanban` — avaliar extensão em vez de nova tela).
- Documentos estruturados equivalentes ao uso atual de Notion (briefing, decisões, notas de projeto) — via LOKAT Docs conceitual.
- **Calendário, CRM essencial, REC OS e aprovações precisam estar EXPLICITAMENTE dentro do mínimo diário** — são módulos que o próprio time já usa diariamente hoje; excluí-los do Dogfooding MVP faria o time continuar dependendo das ferramentas atuais para essa parte do fluxo, contradizendo o objetivo (achado da auditoria independente).
- **O que NÃO precisa entrar no Dogfooding MVP** (excesso a evitar): editor documental completo (LOKAT Docs pode nascer com templates simples, não um editor rico), IA ampla (Level 0-1 basta), e Company Central COMPLETA (contratos mínimos de contexto bastam inicialmente — a tela completa é do External Pilot em diante).

### External Pilot MVP
**Pergunta que resolve:** o que um primeiro cliente/projeto externo real precisa para operar dentro do LOKAT OS.

Requisitos (nenhum cliente específico hardcoded):
- Company + Project reais.
- Work Items (tasks/deliverables/approvals).
- Documentos.
- Calendário.
- CRM/contatos quando aplicável ao caso.
- Connector com escopo mínimo (mesmo que só leitura inicial — `connector_readable` sem `connector_eventable`).
- Health check e data ownership garantidos (ver NIS).
- **Itens que faltavam nesta lista (achado da auditoria independente) e são obrigatórios antes de um piloto real:**
  - **Ativação da empresa** (Company Activation — hoje só existe como fluxo conceitual, ver Camada 4 da entidade-central; sem isso não há como o piloto sequer começar a usar a Company real).
  - **Isolamento/autorização** entre o piloto externo e o resto da plataforma (garantia de que dados de um piloto não vazam para outro workspace).
  - **Recuperação operacional** (o que acontece se o Connector cair, se um sync falhar — não pode deixar o piloto num estado inconsistente sem saída).
  - **Suporte** (canal real para o piloto reportar problema — não implementado hoje).
  - **Auditoria** (log mínimo de quem fez o quê, necessário antes de dados reais de terceiros entrarem no sistema).
  - **Critérios claros de saída** (o que define "o piloto funcionou" ou "o piloto deve ser descontinuado" — sem isso o piloto nunca termina nem é avaliado objetivamente).

### Public MVP
Tudo do External Pilot MVP, mais: capability registry aplicado de
verdade (plano determina o que a conta vê), self-service de onboarding,
e os módulos CORE_MVP listados acima estáveis e validados (não apenas
`qa_pending`).

**Lacuna identificada pela auditoria independente — Company Activation
gap:** falta uma jornada INTEGRADA de ponta a ponta (cadastro →
diagnóstico → prioridades → primeiro Project → primeiro Work Item). Hoje
essas peças existem separadamente (cadastro via onboarding atual,
diagnóstico via `business-strategy/*`, Project/Work Item ainda
conceituais) mas nunca foram desenhadas como um ÚNICO fluxo contínuo —
sem isso, o self-service do Public MVP não tem um caminho real de
"primeira empresa criada até primeiro Work Item concluído" para o
usuário seguir sozinho.

## Trello / Notion / Drive — escopo mínimo de substituição

**Trello-like** (via Operacional/Work Items, não uma tela nova):
tasks, owners, due dates, status, kanban, comments, dependencies,
attachments/references.

**Notion-like** (via LOKAT Docs, não um editor genérico):
structured docs, briefing, decisions, project notes, references,
reusable templates — sempre referenciando `company_id`/`project_id`,
nunca páginas soltas sem contexto.

**Drive:** não recriar armazenamento de arquivos — Drive continua sendo
a fonte, o LOKAT OS referencia/conecta (link + metadata), não duplica
binários.

## LOKAT Docs — camada documental, não cérebro central

Tipos de documento previstos: `diagnosis`, `proposal`, `scope`,
`architecture`, `budget`, `roadmap`, `approval`, `briefing`, `report`,
`closure`, `learning`, `templates`. Todo documento referencia
`company_id`, `project_id`, `related_entity` — nunca solto. Não
implementado nesta sprint.

## Central de Projetos — motor, não módulo isolado

```
Opportunity → Diagnosis → Strategy → Offer → Architecture → Scope
→ Deliverables → Work → Execution → Measurement → Closure → Learning
→ Productization
```

Quatro entradas possíveis: cliente ativo, lead inbound, prospect
outbound, projeto interno/laboratório (usado pelo próprio Dogfooding
MVP). Nenhum cliente específico hardcoded no motor.

## Níveis (Company / Project / Deliverable)

Três níveis INDEPENDENTES — um projeto pode ter nível diferente da
empresa que o contratou, e um entregável pode ter nível diferente do
projeto:

1. **Company Level** — maturidade/tamanho da operação da empresa.
2. **Project Level** — profundidade do projeto contratado.
3. **Deliverable Level** — `minimal | recommended | expanded`.

Capacidades desejadas do motor de níveis (não implementado): nível
atual, nível desejado, comparação entre níveis, o que entra/sai ao
mudar de nível, impacto em preço/prazo/equipe/operação/margem/risco, e
histórico de mudanças de nível.

## Entregáveis — duas dimensões independentes

**Participation** (o entregável faz parte do escopo contratado?):
`included | optional | not_included | consideration | future_phase |
additional_opportunity | cancelled`.

**Client Visibility** (o cliente final enxerga isso?):
`internal_confidential | client_summary | portal_visible | link | file
| training | ownership_handoff | not_delivered`.

Nunca confundir as duas — um entregável pode ser `included` e ainda
assim `internal_confidential` (ex.: a estratégia interna por trás de
uma campanha). Margem interna, custo de equipe, negociação interna,
estratégia confidencial e análise de productization **nunca** têm
visibilidade além de `internal_confidential`.

## Personas ≠ Role

**Role** controla permissão (autorização — já existe, 14 roles
auditadas em `src/lib/access-control.ts`: `super_admin`, `admin`,
`cliente`, `aluno`, `operacional`, `comercial`, `sdr`, `closer`,
`social_media`, `designer`, `editor`, `videomaker`, `gestor_trafego`,
`financeiro`).

**Persona** controla prioridade de experiência/UX — o MESMO core, com
prioridade de tela diferente:

| Persona | Prioridade de tela |
|---|---|
| Business Owner | resultados, prioridades, projetos, vendas, alertas |
| Agency | companies, projects, deliverables, approvals, team |
| Social Media | companies, calendar, briefs, content, approvals |
| Sales | CRM, opportunities, follow-ups, proposals |
| Operations | Work Items, kanban, tarefas |
| Admin/Super Admin | Status, Arquitetura, controle da plataforma |

Persona é uma camada de PREFERÊNCIA sobre a mesma navegação — nunca deve
ser confundida com authorization (`role`) nem implementada como um
segundo sistema de permissão.

## Navigation Model — dois modos, mesmas entidades

**Context-first:** Company → Company Central → Project → Work.
**Specialist-first:** CRM / REC OS / Calendar / Projects direto.

Um usuário especialista (ex.: Social Media) pode abrir o REC OS
diretamente; um gestor pode começar pela Company. Ambos os caminhos
terminam nas MESMAS entidades (nunca dados duplicados por caminho de
navegação) — consistente com a regra de ouro desta recalibração: "o
usuário não deve precisar pensar primeiro em qual módulo abrir."

## Finance / Growth — mapeamento conceitual (não implementado)

`investment`, `internal_cost`, `external_cost`, `ad_budget`, `revenue`,
`margin`, `contribution`, `break_even`, `ROI`, `ROAS`, `CAC`, `CPL`,
`ticket`, `LTV`, `payback`, `capacity`, `risk`. Princípio: **IA explica,
matemática permanece determinística** — nenhum desses valores deve ser
"estimado" pela IA sem fórmula auditável.

## Compras Inteligentes — mapeamento conceitual (não implementado)

Módulo futuro dentro de Meu Negócio → Estoque e Compras:

```
target_stock
+ forecast_consumption_during_lead_time
+ safety_stock
- usable_current_stock
- open_purchases
```

## Dogfooding — regra formal

LOKAT usa LOKAT OS para operar a própria operação. A plataforma deve
substituir progressivamente Trello e Notion no fluxo principal do time,
e organizar (não recriar) referências hoje espalhadas no Drive.
