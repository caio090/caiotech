# Module Lifecycle Registry V2 — Mapa Oficial de Ciclo de Vida

**Missão:** LKT MISSION CARD — MODULE LIFECYCLE REGISTRY V2 FOUNDATION
**Natureza:** documento (não código) — nenhum campo novo foi adicionado a `PlatformModuleDefinition` (`src/config/platform-modules.ts`). Este mapa é uma LEITURA estruturada do registry real através do vocabulário MODULE/TYPE/MATURITY/VERSION/DEPENDENCIES/OWNER pedido pela missão — nunca uma quarta fonte de verdade paralela. `docs/architecture/module-lifecycle-registry-v1.md` continua válido (5 módulos documentados em prosa longa); este V2 é o mapa completo da plataforma inteira, mais compacto.

## Por que nenhum campo novo em código

O LOKAT OS já tem 4 taxonomias reais, cada uma respondendo a uma pergunta:

| Taxonomia | Onde vive | Pergunta |
|---|---|---|
| `AreaReadiness` | `project-status.ts` | Está pronto para release/QA? |
| `PlatformModuleMaturity` | `platform-modules.ts` | O que existe de fato na arquitetura hoje? |
| `LktEventStatus` | `lkt-activity/types.ts` | O que ESTE evento entrega, honestamente? |
| Módulo lifecycle v1 (REAL/PLANNED/COMING_SOON/NOT_IMPLEMENTED/LEGACY) | `module-lifecycle-registry-v1.md` | Leitura humana simplificada de `PlatformModuleMaturity` |

Este V2 não cria uma 5ª. MATURITY/TYPE/VERSION abaixo são **lentes de leitura** sobre `category`/`maturity`/`dependsOn` já reais — o mapeamento exato está documentado, então nunca diverge silenciosamente do código.

### Mapeamento MATURITY (5 estados pedidos ← `PlatformModuleMaturity` real)

| MATURITY (este mapa) | `PlatformModuleMaturity` real |
|---|---|
| **REAL** | `production` |
| **PARTIAL** | `qa_pending`, `preview`, `experimental`, `blocked` (existe de verdade, mas não é 100% real/produção ainda) |
| **PLANNED** | `planned` |
| **COMING_SOON** | `coming_soon` |
| **NOT_IMPLEMENTED** | `not_implemented` |

Nunca REAL quando o código real é `qa_pending`/`preview`/`experimental` — "Status não pode mentir" também vale para este mapa.

### Mapeamento TYPE (novo vocabulário, aplicado por posição na árvore + `category`)

- **CORE MODULE**: sem módulo pai (raiz de uma seção) ou fundação transversal (`workspaces_core`).
- **SUBMODULE**: tem `dependsOn` apontando para outro módulo do mapa, vive dentro do módulo pai (nunca navega para fora).
- **TOOL**: utilitário compartilhado consumido por mais de um submódulo irmão (ex.: Projection Engine).
- **INTEGRATION**: `category: "integrations"` ou conecta a um sistema externo.
- **INTELLIGENCE**: `category: "intelligence"` — analisa/planeja, nunca executa sozinho.

### Mapeamento VERSION (reusa o modelo já documentado em `platform-modules.ts`, nunca um 2º modelo V1/V2/V3)

- **V1 — Operacional**: o módulo executa (produção/operação real).
- **V2 — Inteligência**: o módulo analisa/planeja/integra antes de executar.
- **V3 — Automação**: o módulo executa sozinho (publicação, otimização automática).

### OWNER (neste mapa) ≠ `owner` do código

O campo `owner` em `platform-modules.ts` é o TIME dono (`product`/`platform`/`commercial`/...). **OWNER neste mapa é o MÓDULO PAI que controla** (resposta a "qual módulo controla?", pedido pela missão) — derivado de `dependsOn`, nunca do campo `owner` do código. Um módulo sem pai tem OWNER: `(nenhum -- módulo raiz)`.

---

## CORE

### Workspaces Core
MODULE: Workspaces Core · TYPE: CORE MODULE · MATURITY: PARTIAL (`qa_pending`) · VERSION: V1 · DEPENDENCIES: nenhuma (raiz de toda autorização) · OWNER: (nenhum — módulo raiz) · REGISTRY ID: `workspaces_core` · ROTAS: `/admin/visualizar`

### Status
MODULE: Status · TYPE: CORE MODULE · MATURITY: REAL · VERSION: V1 · DEPENDENCIES: Workspaces Core · OWNER: (nenhum — módulo raiz) · REGISTRY ID: `status` · ROTAS: `/admin/status`

### Command Center
MODULE: Command Center · TYPE: CORE MODULE · MATURITY: REAL · VERSION: V1 · DEPENDENCIES: Workspaces Core · OWNER: (nenhum — módulo raiz) · REGISTRY ID: `command_center` (**novo nesta missão** — código real já existia, gap de registry) · ROTAS: `/admin/inicio`

### Jarvis
MODULE: Jarvis · TYPE: CORE MODULE · MATURITY: REAL · VERSION: V1 (assistente hoje é acoplado à Web; suas funções internas já são reutilizadas por V2 pela Conversational Layer) · DEPENDENCIES: Workspaces Core · OWNER: (nenhum — módulo raiz) · REGISTRY ID: `jarvis` (**novo nesta missão**) · ROTAS: 5 rotas `/api/jarvis/*`

---

## BUSINESS

### Meu Negócio
MODULE: Meu Negócio · TYPE: CORE MODULE · MATURITY: PARTIAL (`preview`, 100% fixture) · VERSION: V1 · DEPENDENCIES: Workspaces Core · OWNER: (nenhum — módulo raiz) · REGISTRY ID: `meu_negocio` · ROTAS: `/admin/meu-negocio`

### Meu Escritório
MODULE: Meu Escritório · TYPE: CORE MODULE · MATURITY: REAL · VERSION: V1 · DEPENDENCIES: Workspaces Core, REC OS (consome as mesmas projeções de projeto) · OWNER: (nenhum — módulo raiz) · REGISTRY ID: `meu_escritorio` · ROTAS: `/admin/escritorio`

### Organização
MODULE: Organização (Minha Agência / Minha Organização) · TYPE: CORE MODULE · MATURITY: REAL · VERSION: V1 · DEPENDENCIES: Workspaces Core · OWNER: (nenhum — módulo raiz) · REGISTRY ID: `minha_organizacao` · ROTAS: `/admin/organizacao`

### Minha Empresa
MODULE: Minha Empresa (Company Central) · TYPE: CORE MODULE · MATURITY: PARTIAL (`qa_pending`) · VERSION: V1 · DEPENDENCIES: Workspaces Core · OWNER: (nenhum — módulo raiz) · REGISTRY ID: `empresa_central` · ROTAS: `/admin/empresa`
> Mapeamento: o mapa base da missão lista "Minha Empresa" separado de "Organização" — o único registro real que preenche essa 4ª posição sem inventar nada é `empresa_central` ("Company Central"), confirmado na auditoria da missão anterior (LKT OPERATING STANDARD V1).

---

## OPERATION

### REC OS
MODULE: REC OS · TYPE: CORE MODULE · MATURITY: REAL · VERSION: V1 — Operacional · DEPENDENCIES: Workspaces Core · OWNER: (nenhum — módulo raiz) · REGISTRY ID: `rec_os` · ROTAS: `/admin/contentos`, `/admin/rec-os` (redirect)
> "Content OS" é só o nome técnico antigo desta MESMA rota (`/admin/contentos`) — nunca uma entrada separada. **REC OS não controla Influence OS** (regra desta missão): os filhos `rec_os_creator_dna`/`rec_os_influencer_radar`/`rec_os_growth_analytics` (ver GROWTH) são versões por-cliente, escopo de aquisição — nunca o produto Influence OS.

### Projetos
MODULE: Projetos · TYPE: CORE MODULE · MATURITY: REAL · VERSION: V1 · DEPENDENCIES: Workspaces Core · OWNER: (nenhum — módulo raiz) · REGISTRY ID: `projetos` (**novo nesta missão**) · ROTAS: `/admin/projetos`

### CRM
MODULE: CRM (Leads e Clientes) · TYPE: CORE MODULE · MATURITY: REAL · VERSION: V1 · DEPENDENCIES: Workspaces Core · OWNER: (nenhum — módulo raiz) · REGISTRY ID: `crm_leads_clientes` · ROTAS: `/admin/leads`, `/admin/clientes`

### Calendário (Global)
MODULE: Calendário · TYPE: SUBMODULE · MATURITY: PARTIAL (`qa_pending`) · VERSION: V1 · DEPENDENCIES: REC OS · OWNER: REC OS · REGISTRY ID: `calendario_global` · ROTAS: `/admin/calendario`

### Aprovações
MODULE: Aprovações · TYPE: SUBMODULE · MATURITY: REAL (parte do fluxo real de REC OS) · VERSION: V1 · DEPENDENCIES: REC OS · OWNER: REC OS · REGISTRY ID: *(sub-rota de `rec_os`, `/admin/contentos/aprovacoes` — nunca teve/precisa de id próprio; listada aqui só para responder ao mapa da missão)*

---

## GROWTH

**Separação crítica (regra da missão, já registrada em código desde a missão anterior):** `growth_os` (**GrowthOS**, agência inteira, `/growth/**`, diagnóstico/funil/metas) **NUNCA** é o mesmo módulo que `rec_os_growth` (**REC OS Growth**, por cliente, dentro do REC OS). Mesmo nome de produto, dados/escopo completamente diferentes.

### GrowthOS (agência — fora da árvore do REC OS)
MODULE: GrowthOS · TYPE: INTELLIGENCE · MATURITY: PARTIAL (`preview`, 100% fixture) · VERSION: V2 — Inteligência · DEPENDENCIES: nenhuma · OWNER: (nenhum — módulo raiz, fora da árvore REC OS) · REGISTRY ID: `growth_os` · ROTAS: 6 rotas `/growth/*`

### REC OS Growth
MODULE: REC OS Growth · TYPE: SUBMODULE · MATURITY: NOT_IMPLEMENTED · VERSION: V2 — Inteligência · DEPENDENCIES: REC OS · OWNER: REC OS · REGISTRY ID: `rec_os_growth`

### Growth Planner
MODULE: Growth Planner · TYPE: SUBMODULE · MATURITY: PLANNED (próxima frente real) · VERSION: V2 — Inteligência · DEPENDENCIES: REC OS Growth · OWNER: REC OS Growth · REGISTRY ID: `rec_os_growth_planner`

### Paid Traffic Planner
MODULE: Paid Traffic Planner · TYPE: SUBMODULE · MATURITY: PLANNED · VERSION: V2 — Inteligência (planejamento/simulação; a execução real de anúncio é V3, ver Meta Publish/Google Ads em INTEGRATIONS) · DEPENDENCIES: REC OS Growth · OWNER: REC OS Growth · REGISTRY ID: `rec_os_paid_traffic_planner`

### Campaign Planner
MODULE: Campaign Planner · TYPE: SUBMODULE · MATURITY: NOT_IMPLEMENTED · VERSION: V2 — Inteligência · DEPENDENCIES: REC OS Growth · OWNER: REC OS Growth · REGISTRY ID: `rec_os_campaign_planner` (**novo nesta missão**)

### Projection Engine
MODULE: Projection Engine · TYPE: TOOL (compartilhado por Growth Planner e Paid Traffic Planner) · MATURITY: NOT_IMPLEMENTED · VERSION: V2 — Inteligência · DEPENDENCIES: REC OS Growth · OWNER: REC OS Growth · REGISTRY ID: `rec_os_projection_engine` (**novo nesta missão**)

### Content Planner
MODULE: Content Planner · TYPE: SUBMODULE · MATURITY: NOT_IMPLEMENTED · VERSION: V2 · DEPENDENCIES: REC OS Growth · OWNER: REC OS Growth · REGISTRY ID: `rec_os_content_planner`

---

## CONTENT

Content OS = REC OS (mesmo módulo, nome técnico antigo — ver seção OPERATION). Calendário/Aprovações também já listados em OPERATION (submódulos de REC OS, não uma árvore CONTENT separada) — o mapa base da missão os agrupa por afinidade temática, mas o registry real não duplica a entrada.

---

## INFLUENCE

**Guarda-chuva:** `influence_os` — TYPE: INTELLIGENCE · MATURITY: NOT_IMPLEMENTED · VERSION: V2 — Inteligência · DEPENDENCIES: nenhuma · OWNER: (nenhum — módulo raiz) · REGISTRY ID: `influence_os`

### Creator DNA
MODULE: Creator DNA · TYPE: SUBMODULE · MATURITY: NOT_IMPLEMENTED · VERSION: V2 · DEPENDENCIES: Influence OS · OWNER: Influence OS · REGISTRY ID: `creator_dna`
> Par por-cliente dentro de REC OS Growth: `rec_os_creator_dna` (escopo diferente — growth/aquisição, nunca o mesmo módulo).

### Influencer Radar
MODULE: Influencer Radar · TYPE: INTELLIGENCE · MATURITY: NOT_IMPLEMENTED · VERSION: V2 · DEPENDENCIES: Influence OS · OWNER: Influence OS · REGISTRY ID: `creator_radar`
> **IMPORTANTE (regra da missão): Radar nunca deve existir como dado falso — depende de integrações reais futuras.** Enquanto NOT_IMPLEMENTED, nenhuma UI pode fingir tendência real. Par por-cliente: `rec_os_influencer_radar` (direção inversa: cliente procurando criador).

### Trends
MODULE: Trends · TYPE: SUBMODULE · MATURITY: NOT_IMPLEMENTED · VERSION: V2 · DEPENDENCIES: Influence OS · OWNER: Influence OS · REGISTRY ID: `creator_trends` (**novo nesta missão**)
> Distinto de Radar: Radar descobre O QUE está em alta (tendência de mercado); Trends cataloga COMO estruturar o formato (biblioteca de templates).

### Partnerships
MODULE: Partnerships · TYPE: SUBMODULE · MATURITY: NOT_IMPLEMENTED · VERSION: V2 · DEPENDENCIES: Influence OS · OWNER: Influence OS · REGISTRY ID: `creator_partnerships`

### Analytics
MODULE: Analytics · TYPE: INTELLIGENCE · MATURITY: NOT_IMPLEMENTED · VERSION: V2 · DEPENDENCIES: Influence OS · OWNER: Influence OS · REGISTRY ID: `creator_analytics`
> Par por-cliente: `rec_os_growth_analytics`.

### Creator Calendar
MODULE: Creator Calendar · TYPE: SUBMODULE · MATURITY: NOT_IMPLEMENTED · VERSION: V2 · DEPENDENCIES: Influence OS · OWNER: Influence OS · REGISTRY ID: `creator_calendar`
> Reusa a mesma arquitetura de projeção contextual do Calendário Global — nunca uma segunda fonte de eventos.

### Creator Branding
MODULE: Creator Branding · TYPE: SUBMODULE · MATURITY: NOT_IMPLEMENTED · VERSION: V2 · DEPENDENCIES: Influence OS, Creator DNA · OWNER: Influence OS · REGISTRY ID: `creator_branding`

---

## CONVERSATIONAL

### Conversation Core
MODULE: Conversation Core · TYPE: CORE MODULE · MATURITY: PARTIAL (`qa_pending`, real e testado, não confirmado em Production) · VERSION: V1 · DEPENDENCIES: Workspaces Core · OWNER: (nenhum — módulo raiz) · REGISTRY ID: `conversation_core`

### Telegram
MODULE: Telegram (Adapter) · TYPE: SUBMODULE (channel adapter) · MATURITY: PARTIAL (`qa_pending`, webhook/normalização/sender reais e testados, sem tráfego real ainda) · VERSION: V1 · DEPENDENCIES: Conversation Core · OWNER: Conversation Core · REGISTRY ID: `telegram_adapter` · ROTAS: `/api/integrations/telegram/webhook`

### Telegram Identity Link
MODULE: Telegram Identity Link · TYPE: SUBMODULE · MATURITY: PLANNED (lógica real e testada, sem persistência durável) · VERSION: V1 · DEPENDENCIES: Telegram Adapter · OWNER: Telegram · REGISTRY ID: `telegram_identity_link`

### Telegram Domain Actions
MODULE: Telegram Domain Actions · TYPE: SUBMODULE · MATURITY: NOT_IMPLEMENTED · VERSION: V3 — Automação · DEPENDENCIES: Telegram Identity Link · OWNER: Telegram · REGISTRY ID: `telegram_domain_actions`

### Telegram Voice / Telegram Approvals
MODULE: Telegram Voice · TYPE: SUBMODULE · MATURITY: COMING_SOON · VERSION: V2 · DEPENDENCIES: Telegram Adapter · OWNER: Telegram · REGISTRY ID: `telegram_voice`
MODULE: Telegram Approvals · TYPE: SUBMODULE · MATURITY: COMING_SOON · VERSION: V2 · DEPENDENCIES: Telegram Identity Link · OWNER: Telegram · REGISTRY ID: `telegram_approvals`

### WhatsApp Future
MODULE: WhatsApp Adapter · TYPE: SUBMODULE (channel adapter) · MATURITY: PLANNED · VERSION: V1 · DEPENDENCIES: Conversation Core · OWNER: Conversation Core · REGISTRY ID: `whatsapp_adapter`

---

## INTEGRATIONS (referenciadas pelos módulos acima, categoria `integrations`)

MODULE: Meta Publish · TYPE: INTEGRATION · MATURITY: COMING_SOON · VERSION: V3 — Automação · DEPENDENCIES: nenhuma · OWNER: (nenhum) · REGISTRY ID: `meta_publish`
MODULE: Google Ads · TYPE: INTEGRATION · MATURITY: COMING_SOON · VERSION: V3 — Automação · DEPENDENCIES: nenhuma · OWNER: (nenhum) · REGISTRY ID: `google_ads`
MODULE: Paid Traffic Persistence · TYPE: TOOL · MATURITY: NOT_IMPLEMENTED · VERSION: V2 · DEPENDENCIES: Paid Traffic Planner · OWNER: REC OS Growth · REGISTRY ID: `paid_traffic_persistence`

---

## Regras de navegação (item 10 da missão — já aplicadas em código, aqui só documentadas)

Todo submódulo deve permanecer DENTRO do módulo pai (ex.: REC OS → Growth → Paid Traffic, nunca REC OS → página externa perdida) — mesmo padrão já validado em REC OS Context Foundation V1 (calendário/conexões contextuais) e Telegram Adapter V1 (Conversation Core nunca sai para uma página web). Quando sair do módulo for necessário, é sempre um link SECUNDÁRIO explícito (ex.: `rec_os_calendario_global` em `admin-routes.ts`), nunca a navegação padrão.
