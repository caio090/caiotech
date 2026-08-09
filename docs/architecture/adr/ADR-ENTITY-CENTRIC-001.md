# ADR-ENTITY-CENTRIC-001: LOKAT OS passa a ser arquitetado ao redor de entidades de negócio

**Data:** 2026-08-09
**Status:** Aceito (conceitual — sem implementação nesta sprint)
**Sprint:** Recalibração LOKAT OS 2026-08

## Contexto

LOKAT OS foi construído módulo a módulo: CRM, REC OS, Calendário Global,
Meu Escritório, Meu Negócio, Financeiro, Academy, Operacional, cada um
com sua própria forma de resolver "sobre qual cliente/empresa estou
trabalhando" (`resolveClientContext()` no REC OS, `client_id` de query
string no CRM, nenhum filtro no Calendário/Escritório platform-wide,
uma fixture única no Meu Negócio). A auditoria realizada nesta sprint
(ver `docs/architecture/lokat-os-module-connectivity-map-v1.md`)
confirma: não existe hoje uma entidade central que amarre os módulos, e
essa fragmentação já havia sido identificada anteriormente no próprio
código (`workspace-capabilities.ts` documenta a descoberta de "three
unsynced role/account-type vocabularies" antes da criação do capability
registry atual — o mesmo tipo de fragmentação, em outro eixo).

O produto também cresceu em ambição: de "conjunto de módulos" para "o
sistema operacional central do empreendimento", usado por múltiplas
personas (dono de negócio, agência, social media, comercial, operação)
sobre o mesmo contexto real.

## Decisão

LOKAT OS passa a ser arquitetado prioritariamente ao redor de entidades
de negócio e contexto compartilhado — Workspace → Company → Project →
Work Items → Domain Modules → Domain Events → AI Context — em vez de
módulos isolados que cada um resolve seu próprio contexto.

Isso NÃO significa reescrever os módulos existentes. Significa que:
1. Toda entidade nova de negócio (Company, Project, Work Item) tem exatamente um dono conceitual, formalizado em `lokat-os-entity-centric-v1.md`.
2. Módulos existentes reaproveitam entidades já existentes sempre que possível (`clients` = Company; `content_items`/`operational_tasks`/`approvals` = fonte de Work Items) — nenhuma tabela nova redundante.
3. Novas integrações de contexto entre módulos usam a mesma cadeia, não uma solução pontual por módulo.

## Consequências

**Positivas:**
- Um usuário passa a poder pensar "em qual empresa/projeto estou" em vez de "qual módulo eu abro" (regra de ouro desta recalibração).
- Novos módulos herdam contexto de Company/Project automaticamente, em vez de reimplementar resolução de contexto.
- O padrão de projeção (Work Item sobre entidades de domínio existentes) já está provado em produção (`BusinessOfficeFeedItem`, Sprint Navegação e Experiência 3.0.1.2) — a decisão generaliza algo que já funciona, não introduz um conceito não testado.
- Capability gating por plano pode reaproveitar o mecanismo já existente (`WorkspaceCapabilityGate`) em vez de criar um segundo sistema de gate.

**Negativas / custos:**
- Introduz duas entidades genuinamente novas (Project, Work Item formal) que não existem hoje — trabalho real de schema/RLS/QA quando implementadas (fora do escopo desta sprint).
- Risco de módulos legados (Meu Negócio com fixture única, `_client-content.tsx` órfão) precisarem de trabalho de adaptação, não reescrita, quando a Company Central for implementada.
- Exige disciplina contínua para não duplicar Work Items por módulo (risco já registrado no roadmap recalibrado).

## Alternativas consideradas

1. **Continuar module-centric, resolver fragmentação caso a caso.** Rejeitada — é o padrão que já causou a fragmentação de contexto encontrada na auditoria; resolver "caso a caso" tende a adicionar uma quarta forma de resolver contexto, não reduzir as três já existentes.
2. **Criar uma tabela genérica única para todas as entidades (entidade universal).** Rejeitada explicitamente pelo brief e por esta auditoria — vira um monólito difícil de tipar e de dar RLS específico; o padrão de PROJEÇÃO (Work Item sobre entidades já tipadas) resolve o mesmo problema sem essa desvantagem.
3. **Adiar formalização até o primeiro cliente externo real.** Rejeitada como estratégia total — mas parcialmente aceita: a IMPLEMENTAÇÃO do Connector (NIS) fica condicionada a ter Company/Project/Work Item estáveis primeiro (ver caminho crítico no roadmap recalibrado); a FORMALIZAÇÃO conceitual (esta sprint) não precisa esperar.

## Estratégia de migração

Nenhuma migration nesta sprint. Quando a implementação começar:
1. `clients` continua sendo Company — nenhuma migração de dados.
2. `Project`/`WorkItem` nascem como tabelas novas, aditivas — nunca substituindo `content_items`/`operational_tasks`/`approvals`.
3. Módulos existentes continuam funcionando sem alteração até que, um por um, ganhem (opcionalmente) uma projeção de Work Items — nunca uma migração obrigatória de uma vez.
4. `workspaces` como tabela física só entra em consideração se/quando o produto precisar de múltiplas agências por conta (já registrado como V3 em `LOKAT_TENANCY_MAPPING.md`, não alterado por esta decisão).

## Não-metas (Non-goals)

- Não implica implementar Company Central, Project, Work Items, Domain Events, AI Context, Capabilities ou Connector nesta sprint.
- Não implica descontinuar nenhum módulo existente.
- Não implica uma tabela `workspaces` física imediata.
- Não implica que todo módulo precisa emitir Domain Events desde o primeiro dia — a lista de eventos é priorizada pelo MVP, não exaustiva.
