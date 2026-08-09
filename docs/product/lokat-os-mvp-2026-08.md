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

*(Estrutura em 3 categorias — correção pós-auditoria 2026-08.2, Fase 6:
a lista anterior era um bullet-point plano; agora é explícito o que é
contexto permanente, o que é operação do dia a dia, e o que é
conhecimento/referência.)*

**CORE CONTEXT** (fundação, sem isso nada mais funciona de verdade):
- Company real (não fixture) para pelo menos os projetos internos do time.
- Project + Work Items funcionando de ponta a ponta (mesmo sem UI de Company Central formal — pode nascer dentro do Meu Escritório/Operacional existentes).
- Contexto operacional compartilhado (a mesma Company/Project reconhecida por todos os módulos abaixo, nunca resolvida módulo a módulo).

**DAILY OPERATIONS** (o que o time realmente usa todo dia — não pode ficar de fora):
- Meu Escritório.
- Calendário.
- CRM essencial.
- REC OS.
- Aprovações.
- Pendências.

**KNOWLEDGE** (mínimo para não depender mais do Notion):
- Documentos/referências mínimas (LOKAT Docs conceitual, templates simples).
- Briefing.
- Decisões.

**O que NÃO é exigido no Dogfooding MVP** (excesso a evitar, achado da auditoria): Company Central COMPLETA (contratos mínimos de contexto bastam), Gota Neural completa, IA ampla (Level 0-1 basta), editor documental Notion-like completo, e Connector completo (Dogfooding é 100% interno, não precisa de integração externa).

### External Pilot MVP
**Pergunta que resolve:** o que um primeiro cliente/projeto externo real precisa para operar dentro do LOKAT OS.

**External Pilot Core** (sempre obrigatório, nenhum cliente específico hardcoded):
- Company + Project reais.
- Work Items (tasks/deliverables/approvals).
- Authorization/isolamento entre o piloto e o resto da plataforma (garantia de que dados de um piloto não vazam para outro workspace).
- Approvals.
- Histórico operacional (o que já aconteceu neste piloto, não só o estado atual).
- Recovery/error handling (o que acontece se algo falhar — ver contrato de segurança operacional abaixo).
- Auditabilidade (log mínimo de quem fez o quê, necessário antes de dados reais de terceiros entrarem no sistema).
- Canal de suporte (real, para o piloto reportar problema).
- Critérios claros de saída (o que define "o piloto funcionou" ou "deve ser descontinuado").
- Data ownership garantido (ver NIS — dados do piloto pertencem ao piloto).

**Connector: CONDITIONAL, não universal** (correção pós-auditoria —
a versão anterior deste documento tratava o Connector como requisito
sempre presente do External Pilot; isso estava errado). O Connector só
é necessário QUANDO o piloto precisa integrar um sistema externo que já
existe do lado do cliente. Um piloto cujo trabalho nasce inteiramente
dentro do LOKAT OS (sem sistema externo prévio a sincronizar) é um
External Pilot válido sem nenhum Connector — Calendário/CRM/contatos
entram na lista apenas quando o CASO do piloto exigir, não como
requisito fixo de todos os pilotos.

### Public MVP
Tudo do External Pilot Core, mais: capability registry aplicado de
verdade (plano determina o que a conta vê), self-service de onboarding,
e os módulos CORE_MVP listados acima estáveis e validados (não apenas
`qa_pending`).

**Jornada completa (correção pós-auditoria — antes só se mencionava a
lacuna; agora a jornada está formalizada em detalhe em
`docs/product/lokat-os-activation-v1.md`):**

```
Access → Create/Resolve Company → Company Activation → Initial Context
→ Diagnosis → Priorities → Initiative Classification
→ First Project or Campaign → First Work Item → Operational Entry Point
```

`Operational Entry Point` pode futuramente ser a Company Central ou
outra superfície contextual — não definido rigidamente aqui.

**Lacuna identificada pela auditoria independente — Company Activation
gap (agora endereçada em `lokat-os-activation-v1.md`):** faltava uma
jornada INTEGRADA de ponta a ponta (cadastro →
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

*(Esta sequência é uma APLICAÇÃO específica do loop geral de
orquestração LKT — ver `docs/architecture/lkt-orchestration-framework-v1.md`
para o framework completo e a tabela de correspondência. Não são duas
frameworks concorrentes.)*

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
