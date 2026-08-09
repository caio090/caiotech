# LOKAT OS — Roadmap Recalibrado 2026-08

**Sprint:** Recalibração LOKAT OS 2026-08
**Status:** Planejamento. Nenhuma implementação, nenhuma data comercial prometida.

## Prioridades recalibradas

Duas dimensões separadas, nunca fundidas:

- **Product Priority** — o que move mais a visão do produto para frente.
- **Technical Severity** — o que quebra ou bloqueia algo hoje (P0-P3 de QA, inalterado, ver `project-status.ts`).

Um item pode ser Product Priority alta e Technical Severity zero (ex.:
Company Central — nada está quebrado, mas é a peça que destrava tudo o
mais). Ordem de Product Priority recomendada por esta auditoria:

```
1. Entity-Centric foundation (Company/Project/Work Item conceituais — já formalizados nesta sprint)
2. Company context unificado (consolidar a resolução de "qual empresa" hoje fragmentada entre módulos, sobre clients já existente)
3. Project/Work Item spine (entidade nova + projeção sobre content_items/operational_tasks/approvals — mínimo necessário para Dogfooding)
4. Company Central (evoluir Meu Negócio consumindo a spine acima, não criar do zero — depende do item 3 existir de verdade, nunca antes)
5. Module connectivity (conectar módulos existentes aos Work Items, começando pelo padrão já provado em Meu Escritório)
6. AI context (Level 0-1, sobre a spine já existente)
7. Capabilities (plan registry, reaproveitando WorkspaceCapabilityGate — paralelo, não depende dos itens acima)
8. Dogfooding (uso interno real)
9. Connector contract (só depois de ter algo real para conectar)
10. Premium modules (Finance avançado, Growth, Compras Inteligentes)
```

**Correção pós-auditoria independente:** a versão anterior desta lista
colocava "Company Central" (item 2) antes de "Project/Work Item spine"
(item 3), contradizendo o próprio grafo de dependências desta seção
(que sempre teve Company Central consumindo Work Items, nunca o
contrário). Reordenado para bater com o grafo: Company context → Project
→ Work Items → Company Central.

Esta ordem é uma RECOMENDAÇÃO baseada na auditoria (dependências reais),
não uma decisão de negócio — precisa de validação humana antes de virar
compromisso.

## Grafo de dependências

**Pré-requisito adicionado pós-auditoria independente:** antes de
qualquer trabalho novo de Project/Work Item, consolidar (a) o sistema
duplicado de status (`src/lib/project-status.ts` vs
`src/config/project-status.ts` — fachada já implementada nesta sprint,
consolidação completa ainda pendente) e (b) um contrato único de
resolução de contexto Company/Workspace (hoje cada módulo resolve
`client_id`/`account_type` à sua própria maneira — ver
`lokat-os-module-connectivity-map-v1.md`). Sem isso, a Company Central e
o AI Context herdariam a mesma fragmentação que esta recalibração inteira
existe para resolver.

```
Governança de status + contrato único de resolução Company/Workspace (pré-requisito, ver acima)
   ↓
Company foundation (já existe: `clients`)
   ↓
Company context (unificar resolução de contexto — hoje fragmentada entre módulos)
   ↓
Project relation (entidade nova)
   ↓
Work Items (projeção sobre content_items/operational_tasks/approvals — padrão já provado)
   ↓
Domain Events (opcional para MVP; necessário para Connector)
   ↓
Company Central (consome Company context + Work Items)
   ↓
AI Context (consome Company Central + Work Items)
   ↓
Capabilities (paralelo — não depende da cadeia acima)
   ↓
Connectors (depende de Domain Events + Company Central estáveis)
   ↓
Advanced modules (Finance avançado, Growth, Compras Inteligentes — paralelos entre si)
```

**Paralelizável desde já:** Capabilities (plan registry) não depende de
nenhuma peça nova da cadeia Entity-Centric — pode avançar em paralelo,
reaproveitando `WorkspaceCapabilityGate`.

## Timeline

**Premissas explícitas** (não são compromisso comercial):
- Baseado no ritmo real de commits/sprints observado neste repositório (múltiplas sprints de correção/QA concluídas em sequência rápida nesta série, mas cada uma delas foi CORRETIVA/DE QA sobre código já existente — muito mais rápida que construir uma entidade nova com schema, RLS e QA de produção).
- Trabalho de schema novo (Project, Work Item) exige: desenho de schema, SQL, RLS, migration, QA funcional, QA de regressão nos módulos que passarem a alimentar Work Items — um ciclo mais lento que os hotfixes de harness/CSS desta série.
- Nenhuma data de calendário é prometida; contagem é em "sprints equivalentes" ao padrão já observado neste projeto (uma sprint = um ciclo de auditoria→implementação→QA→push como os já executados).

| Fase | Earliest | Likely | Conservative |
|---|---|---|---|
| **MVP Dogfooding** | 3 sprints | 5 sprints | 8 sprints |
| **MVP External Pilot** | 6 sprints | 10 sprints | 16 sprints |
| **MVP Public** | 10 sprints | 18 sprints | 30 sprints |

Justificativa do maior salto (Dogfooding → External Pilot): mesmo no
cenário SEM Connector (External Pilot Core, ver
`lokat-os-mvp-2026-08.md` — Connector é `CONDITIONAL`, não obrigatório
para todo piloto), o Pilot já exige isolamento/autorização real entre
workspaces, auditabilidade e Data Ownership — nenhum desses existe hoje
com o rigor necessário para dados de terceiros. As estimativas LIKELY e
CONSERVATIVE desta tabela assumem o cenário mais comum e mais caro (um
piloto que PRECISA do Connector, sem precedente de código reaproveitável
além do padrão de `providers/` interno) — um piloto que dispensa
Connector pode chegar mais perto do EARLIEST.

## Caminho crítico

```
Company context unificado → Project entity → Work Item projection
→ Company Central mínima → Dogfooding MVP
```

Tudo mais (AI Context, Capabilities, Connector, Premium) pode atrasar
sem bloquear o Dogfooding MVP — mas o caminho acima é sequencial e não
pode ser paralelizado (cada peça depende da anterior existir de verdade,
não só conceitualmente).

## Riscos principais

1. **Duplicar Work Items em vez de projetar** — se cada módulo criar sua própria tabela "tarefa" em vez de reaproveitar `content_items`/`operational_tasks`/`approvals` via projeção, a arquitetura vira exatamente o problema que tenta resolver (Camada 5 do brief já alerta para isso).
2. **Company Central como "mais um dashboard"** — o risco identificado no próprio brief: se a nova tela repetir dado já visível em outro módulo sem uni-los de verdade, vira duplicação de UI, não unificação de contexto.
3. **IA "inventando" score/prioridade** — mitigado pela exigência de explicabilidade já formalizada em `lokat-os-ai-context-v1.md` e `lokat-os-entity-centric-v1.md`.
4. **Connector prematuro** — construir o Connector antes de ter Company/Project/Work Item estáveis internamente significa desenhar um contrato externo sobre uma fundação que ainda vai mudar.
5. **Pressão de memória do ambiente local** — não é risco de produto, mas já demonstrou impacto real nesta série de sprints (múltiplos OOMs durante QA local); recomenda-se que qualquer trabalho de schema/migration futuro valide em CI (GitHub Actions), não dependa exclusivamente do ambiente local para QA de produção.

## Faixas paralelas (podem avançar simultaneamente)

- **Faixa A (fundação):** Company context → Project → Work Item.
- **Faixa B (capabilities):** plan registry sobre `WorkspaceCapabilityGate`, sem dependência da Faixa A.
- **Faixa C (documentação):** LOKAT Docs conceitual → mínimo viável de templates, sem dependência da Faixa A além de `company_id`/`project_id` como referência.
- **Faixa D (NIS):** desenho detalhado do contrato do Connector pode avançar em paralelo (documentação, sem implementação) — só a IMPLEMENTAÇÃO do Connector depende da Faixa A estar pronta.
