# LOKAT OS — Arquitetura Entity-Centric v1

**Sprint:** Recalibração LOKAT OS 2026-08
**Status:** Arquitetura formalizada (conceitual) — nenhuma implementação nesta sprint.

## Por que mudar

LOKAT OS foi construído módulo a módulo (CRM, REC OS, Calendário, Meu
Escritório, Meu Negócio, Financeiro, Academy...). Cada módulo é
funcional isoladamente, mas o repositório não tem hoje uma entidade
central que amarre "sobre qual empresa/projeto estou trabalhando" —
cada módulo resolve seu próprio contexto (`client_id` via query string,
`profiles.account_type`, `resolveClientContext()`, `getWorkspacePreviewContext()`,
cada um com sua própria lógica). Isso já foi identificado internamente:
`src/config/workspace-capabilities.ts` documenta que a auditoria "found
missing: three unsynced role/account-type vocabularies" antes da
criação do capability registry atual.

A decisão formalizada aqui (ver ADR-ENTITY-CENTRIC-001) é: **parar de
adicionar contexto módulo a módulo e formalizar uma cadeia de entidades
compartilhada**, reaproveitando o que já existe sempre que possível.

## A cadeia

```
WORKSPACE
   ↓
COMPANY
   ↓
PROJECT
   ↓
WORK / OPERATIONAL ITEMS
   ↓
DOMAIN MODULES
   ↓
DOMAIN EVENTS
   ↓
AI CONTEXT
```

### Workspace

**Já existe, parcialmente.** Não há tabela `workspaces` (confirmado em
`docs/architecture/LOKAT_TENANCY_MAPPING.md`, que já registra isso como
"V3 — não urgente"). O que existe e já cumpre o papel de limite
organizacional:

- `WorkspaceSurface` (`src/lib/workspaces/types.ts`): `super_admin | agency | agency_client | direct_business` — já é o eixo que separa "que tipo de conta é essa" e já alimenta capability gating (`WorkspaceCapabilityGate`) e o Workspace Preview (somente leitura).
- `profiles.account_type` + `profiles.owner_id` — proxy real de isolamento hoje.

**Decisão desta sprint:** `WorkspaceSurface` já É o Workspace na prática
atual — não propor uma segunda abstração paralela. Uma tabela
`workspaces` física só se justifica quando o produto precisar de
múltiplas agências por conta (ver Migração Futura em
`LOKAT_TENANCY_MAPPING.md`, já registrado como V3).

### Company

**`PARTIAL_REUSE`** (classificação confirmada por auditoria
independente — não é um reaproveitamento 1:1 completo). A tabela
`clients` já é, na prática e na documentação existente, a base
operacional correta para "empresa atendida" — `LOKAT_TENANCY_MAPPING.md`
já o rotula explicitamente como "Company / Tenant". Mas `clients` ainda
concentra nomenclatura e relações históricas de "cliente de agência"
(o nome da tabela, `owner_id` como dono/agência, campos pensados para
esse relacionamento específico) — o domínio `Company` que esta
arquitetura propõe precisa ENCAPSULAR `clients`, não apenas renomeá-la
na documentação. Isso significa: uma camada de leitura/contrato
(`Company`) que resolve para `clients` por baixo, permitindo que o
conceito de Company inclua no futuro empresas que não são "clientes de
uma agência" (ex.: o próprio uso interno do Lokat, Camada Dogfooding) sem
forçar essa relação onde ela não existe. O que falta não é só a
tabela — é essa camada de encapsulamento, a CAMADA DE EXPERIÊNCIA em
torno dela (ver Central da Empresa, abaixo) e a consolidação de dados
hoje espalhados:

| Conceito | Onde vive hoje | Estado real |
|---|---|---|
| Identidade/cadastro | `clients` | Real, persistido |
| Marca/onboarding | `onboarding_profiles` | Real, persistido |
| DNA/8Ps/SWOT/Metas | `src/lib/business-strategy/` + `src/app/admin/meu-negocio/_strategy/` | Real como código; dados reais só para a única empresa de demonstração do Centro de Comando (`RestaurantWorkspace`) — os demais campos nascem vazios com `source: "missing"`, nunca fabricados |
| Acesso por usuário | `client_user_access` | Real, persistido |
| Contexto de preview (Super Admin) | `getWorkspacePreviewContext()` | Real, cookie assinado, somente leitura |

Ver mapa completo de migração/adaptação na seção "Mapa de Entidades"
abaixo.

### Project

**Não existe como entidade cross-módulo hoje.** Existe `rec_projects`
(tabela real, mas específica de produção audiovisual do REC OS — não é
um Project genérico). Existe também o registry `rec_os_roadmap` (Sprint
REC OS 3.0.1), que é sobre CONTEÚDO, não sobre projetos de negócio.
**Esta é a peça genuinamente nova** desta arquitetura — formalizada
conceitualmente aqui, sem tabela, sem migration.

Contrato conceitual (sem SQL):

```
Project
  id
  company_id
  workspace_id
  objective
  problem
  diagnosis_snapshot   -- referência ao estado do diagnóstico no momento da criação
  strategy
  desired_result
  level                 -- ver Camada de Níveis
  status
  roadmap
  deliverables          -- ver contrato de Entregáveis
  work_items            -- referências, não cópias
  responsibilities
  values
  metrics
  documents
  approvals
  integrations
  events
  closure
  learning
```

Um Project pertence a exatamente uma Company. Uma Company pode ter
múltiplos Projects concorrentes (ex.: "Reposicionamento de marca" e
"Campanha de Natal" rodando em paralelo).

### Work / Operational Items

**Parcialmente existe, fragmentado.** Já existem, hoje, pelo menos
quatro fontes reais de "coisas para fazer": `content_items`,
`operational_tasks`, `approvals`, e o próprio adaptador
`BusinessOfficeFeedItem` (`src/lib/business-office/types.ts`, criado na
Sprint Navegação e Experiência 3.0.1.2) que já normaliza as três
primeiras para um único array — exatamente o padrão que esta camada
formaliza.

**Decisão:** Work Item não é uma tabela nova que substitui
`content_items`/`operational_tasks`/`approvals`. É uma PROJEÇÃO
compartilhada sobre entidades de domínio que já têm sua própria
identidade e ciclo de vida — o padrão já provado por
`BusinessOfficeFeedItem` generaliza-se para o restante do sistema (ver
"Source of Truth vs Projections" abaixo).

Contrato conceitual (campos, sem SQL/migration):

```
WorkItem
  id
  workspace_id
  company_id
  project_id
  type                  -- task | deliverable | pending | approval | milestone
                        -- | meeting | follow_up | decision | alert | operational_activity
  title
  description
  status
  priority
  owner
  team
  module
  source
  source_entity_type    -- ex.: "content_item", "operational_task", "approval"
  source_entity_id
  due_at
  started_at
  completed_at
  dependency_refs
  approval_ref
  created_at
  updated_at
```

### Domain Modules

Ver `docs/architecture/lokat-os-module-connectivity-map-v1.md` para o
inventário completo com contrato de entrada/saída por módulo.

### Domain Events

Não existe hoje um barramento de eventos. Existe, sim, um precedente
direto de "efeito colateral registrado explicitamente": o próprio
código já documenta (ex.: `docs/qa/e2e-security-boundaries.md`) que
login atualiza `last_sign_in_at` como "efeito colateral padrão e
esperado" — ou seja, o produto já pensa em termos de eventos ao
documentar comportamento, só não tem uma camada formal. Ver
`docs/architecture/lokat-os-module-connectivity-map-v1.md` para o
catálogo de eventos recomendado. Não implementado nesta sprint.

### AI Context

Não existe hoje uma camada de contexto de IA hierárquica. Existe
`src/lib/ai-suggestions.ts` (`getContentOSSuggestions`, usado em
`producao/page.tsx` via `SmartSuggestionsPanel`) — sugestões pontuais,
sem hierarquia Global/Company/Project/Module/Item. Ver
`docs/product/lokat-os-ai-context-v1.md`.

## Mapa de Entidades — CURRENT → TARGET → MIGRATION

| CURRENT ENTITY | TARGET ROLE | MIGRATION/ADAPTATION (futuro, não nesta sprint) |
|---|---|---|
| `clients` (tabela) | **Company** | Nenhuma migration necessária — já é a entidade certa. Adicionar campos conceituais (nível, diagnostic snapshot ref) só quando a Central da Empresa for implementada. |
| `profiles.account_type` + `owner_id` | **Workspace** (proxy) | Mantém-se via `WorkspaceSurface`; tabela `workspaces` física só em V3 (já registrado como não urgente). |
| `onboarding_profiles` | Dado de **Company** (marca) | Passa a ser lido pela Central da Empresa como uma das fontes, não migrado. |
| `src/lib/business-strategy/*` (DNA/8Ps/SWOT/Metas) | Fonte do **Diagnóstico Vivo** | Hoje é uma camada por-empresa dentro do Centro de Comando (`_restaurant-workspace.tsx`); vira uma das entradas do diagnóstico vivo da Company Central quando essa tela existir. |
| `rec_projects` | Entidade de domínio do REC OS (permanece) | NÃO vira o Project genérico — é uma entidade de domínio (produção audiovisual) que pode futuramente CRIAR ou REFERENCIAR um Project genérico, análogo a Lead/Content/Campaign. |
| `content_items` / `operational_tasks` / `approvals` | Entidades de domínio que geram **Work Items** (projeção) | Já demonstrado pelo padrão `BusinessOfficeFeedItem` — generalizar esse adaptador, nunca duplicar as tabelas. |
| `waitlist_entries` | Entidade de domínio do CRM (onboarding de plataforma) | Permanece — já documentado como propósito distinto de CRM operacional (`docs/crm/canonical-crm-route.md`). |
| `WorkspaceCapability` (`workspace-capabilities.ts`) | Metade do **Capability Registry** (eixo "surface") | Mantém-se; a nova camada de capabilities de plano (MVP/Premium) é um EIXO DIFERENTE (ver `docs/product/lokat-os-capabilities-v1.md`) — não substitui, complementa. |
| `src/lib/providers/*` (design-editor/customer-inbox/social-scheduler) | Precedente de padrão para o **Lokat Project Connector** | Mesmo princípio (interface comum, registry central, nunca expõe secrets, status sanitizado) aplicado a um domínio diferente (integração com sistemas EXTERNOS de clientes, não motores internos). Não confundir os dois. |

## Não-metas desta arquitetura

- Não centraliza tudo em uma tabela monolítica (Camada 5 do brief é explícita sobre isso).
- Não substitui `content_items`/`operational_tasks`/`approvals`/`rec_projects` por uma tabela genérica.
- Não implica reescrever módulos existentes — eles continuam funcionando; a formalização é sobre COMO NOVOS módulos e integrações se conectam, e como módulos existentes PODEM (não devem obrigatoriamente, de imediato) expor uma projeção de Work Items.
