# Module Lifecycle Registry v1

**Missão:** LKT MISSION CARD — LKT Operating Standard + Module Lifecycle Registry (V1 Foundation)
**Natureza:** documento (não código) — template + entradas preenchidas para os módulos pedidos nesta missão. Ver `docs/architecture/lkt-orchestration-framework-v1.md` para o padrão de Deploy/Release/Navegação/Status Activity que acompanha este registro.

## Por que este documento existe e não um 4º tipo TypeScript

O LOKAT OS já tem três taxonomias de status, cada uma respondendo a uma
pergunta diferente e documentada como tal:

| Taxonomia | Onde vive | Pergunta que responde |
|---|---|---|
| `AreaReadiness` | `src/config/project-status.ts` | Está pronto para release/QA? |
| `PlatformModuleMaturity` | `src/config/platform-modules.ts` | O que existe de fato na arquitetura hoje? |
| `LktEventStatus` | `src/lib/lkt-activity/types.ts` | O que ESTE evento específico entrega, honestamente? |

Este documento não cria uma quarta. O vocabulário de 5 estados pedido
pela missão (**REAL / PLANNED / COMING_SOON / NOT_IMPLEMENTED /
LEGACY**) é uma leitura simplificada de `PlatformModuleMaturity`, feita
para humanos lerem um módulo inteiro de uma vez sem abrir código. Mapa
de tradução:

| Estado deste documento | `PlatformModuleMaturity` correspondente |
|---|---|
| REAL | `production` (dado real confirmado) — `qa_pending`/`preview`/`experimental` também aparecem como REAL aqui quando a UI/dado já existe de verdade, com a ressalva anotada em "Estado atual" |
| PLANNED | `planned` |
| COMING_SOON | `coming_soon` |
| NOT_IMPLEMENTED | `not_implemented` |
| LEGACY | Não existe hoje como valor de `PlatformModuleMaturity` — usado aqui só quando um módulo é real mas foi deliberadamente descontinuado a favor de outro (ex.: nenhum módulo desta leva está nesse estado; registrado para o vocabulário existir quando for necessário) |

Cada entrada abaixo cita o(s) id(s) real(is) em `platform-modules.ts`
entre parênteses — a fonte de verdade continua sendo o registry de
código; este documento nunca diverge dele silenciosamente.

## Template

```
## <Nome do módulo>

### Identificação
Nome:
Objetivo:
Usuário:
Dependências:

### Estado atual
REAL | PLANNED | COMING_SOON | NOT_IMPLEMENTED | LEGACY

### Roadmap
V1 — Fundação:
V2 — Integrações:
V3 — Execução:
```

---

## REC OS

### Identificação
**Nome:** REC OS (`rec_os`)
**Objetivo:** Gestão operacional e crescimento do cliente — produção de conteúdo, aprovações, calendário/conexões contextuais.
**Usuário:** Agência (multi-cliente), empresa direta (uso próprio), operacional (produção/execução), cliente da agência (aprovações/calendário/resultados, sem produção).
**Dependências:** `workspaces_core`.

### Estado atual
**REAL** — rota `/admin/contentos` em Production, dado real (Supabase), confirmado em REC OS ARCHITECTURE ALIGNMENT V1 e REC OS Context Foundation V1.

### Roadmap
**V1 — Fundação:** projetos, produção, aprovações, calendário contextual, conexões contextual, Company Context — já entregue (V1 Operacional no modelo geral de evolução).
**V2 — Integrações:** Growth (ver árvore abaixo) — planejamento antes de integrar Meta Ads/Google Ads de verdade.
**V3 — Execução:** automação (publicação assistida, otimização) — ainda not_implemented, depende de V2 completo.

---

## REC OS Growth

### Identificação
**Nome:** REC OS — Growth (`rec_os_growth`)
**Objetivo:** Planejamento de crescimento por cliente dentro do REC OS — nunca confundir com GrowthOS (`growth_os`, agência inteira, `/growth/**`, diagnóstico/funil/metas — módulo different, registrado separadamente).
**Usuário:** Agência e empresa direta, por cliente/empresa selecionada.
**Dependências:** `rec_os`.

### Estrutura (registrada em REC OS GROWTH PLANNER V1 ARCHITECTURE FOUNDATION)

```
REC OS Growth
├── Growth Planner       (rec_os_growth_planner)      -- PLANNED
├── Paid Traffic Planner (rec_os_paid_traffic_planner) -- PLANNED
├── Content Planner      (rec_os_content_planner)      -- NOT_IMPLEMENTED
├── Creator DNA          (rec_os_creator_dna)          -- NOT_IMPLEMENTED
├── Influencer Radar     (rec_os_influencer_radar)     -- NOT_IMPLEMENTED
└── Growth Analytics     (rec_os_growth_analytics)     -- NOT_IMPLEMENTED
```

Cada um dos 4 últimos tem um par agência-inteira sob `influence_os`
(`creator_dna`/`creator_radar`/`creator_analytics`) — escopos
deliberadamente diferentes (por-cliente vs. agência), cross-referenciados
nos dois sentidos em `platform-modules.ts`.

### Estado atual
**NOT_IMPLEMENTED** (o nó pai) — **PLANNED** para `Growth Planner` e `Paid Traffic Planner` (próxima frente real), **NOT_IMPLEMENTED** para os demais 4.

### Roadmap
**V1 — Fundação:** Planejamento — usuário define objetivo, público, cidade, orçamento, tipo de criativo, canal. Nenhuma chamada externa.
**V2 — Integrações:** Meta Ads API, métricas, sincronização de campanhas.
**V3 — Execução:** criar campanhas, publicar anúncios, otimização automática.

---

## Meu Negócio

### Identificação
**Nome:** Meu Negócio (`meu_negocio`)
**Objetivo:** Gestão operacional da empresa cliente — estoque, fichas técnicas, CMV, relatórios, DNA/estratégia (8Ps, SWOT).
**Usuário:** Empresa direta (acesso completo), agência (condicional, ainda não implementado por plano), cliente da agência (condicional).
**Dependências:** `workspaces_core`.

### Estado atual
**REAL** (estrutura visual publicada em Production) com ressalva honesta: hoje 100% em memória (fixtures), sem Supabase — `PlatformModuleMaturity: preview`, nunca `production`, conforme já testado em `src/config/__tests__/platform-modules.test.ts` ("meu_negocio nunca é declarado production").

### Roadmap
**V1 — Fundação:** estrutura visual — já entregue (Centro de Comando, `src/app/admin/meu-negocio/_entry.tsx`).
**V2 — Integrações:** dados persistentes (Supabase real, substituindo fixtures) — não iniciado.
**V3 — Execução:** indicadores inteligentes (recomendações automáticas a partir de dado real) — depende de V2.

---

## Meu Escritório

### Identificação
**Nome:** Meu Escritório (`meu_escritorio` — **novo nesta missão**, rota já existia mas não estava no registry)
**Objetivo:** Gestão interna da agência/operador — "o que fazer hoje, esta semana e como foi este mês", a partir de módulos reais (projetos, tarefas). Futuro: clientes, equipe, financeiro, processos.
**Usuário:** Agência/admin — modo por-cliente (`?client=`) e modo Global ("Todas as empresas", quando nenhum cliente selecionado, restrito a admin/super_admin com Companies autorizadas).
**Dependências:** `workspaces_core`, `rec_os` (consome projeções de projetos que também alimentam REC OS).

### Estado atual
**REAL** — rota `/admin/escritorio`, dado real via `getBusinessOfficeFeed`/`getProjectProjections` (Supabase, sem fixture), já usa `resolveCompanyContext()` canônico. **Registrado em `platform-modules.ts` nesta missão** (gap confirmado: existia em código, não no registry).

### Roadmap
**V1 — Fundação:** feed do dia/semana/mês por empresa selecionada + modo Global — já entregue.
**V2 — Integrações:** Clientes/Equipe/Financeiro como abas reais dentro do mesmo ambiente (hoje são módulos separados) — não iniciado.
**V3 — Execução:** Processos (automação de rotina da agência) — não iniciado.

---

## Minha Empresa

### Identificação
**Nome:** mapeado para `/admin/organizacao` (`minha_organizacao` — **novo nesta missão**), rota que hoje se autodenomina "Minha Organização" na UI.
**Objetivo:** Dados institucionais — identidade da própria agência ("Minha Agência") ou da própria empresa direta, dependendo de `account_type`.
**Usuário:** Agência e empresa direta (nunca papel `cliente`, redirecionado para `/client/home`).
**Dependências:** `workspaces_core`.

### ✅ Colisão de nome corrigida (Deployment Production Flow + Organization Naming Separation V1)
Quando `account_type` era `direct_business`, `/admin/organizacao`
renderizava o título **"Meu Negócio"** (`src/app/admin/organizacao/
page.tsx`) — o mesmo texto que o módulo operacional real em
`/admin/meu-negocio` já usa. Eram duas telas reais, ambas tituladas
"Meu Negócio", por rotas diferentes — recorrência do mesmo tipo de
ambiguidade que missões anteriores (Audiovisual Route Separation, Meu
Negócio Access Restore) já haviam corrigido em outros pontos do
produto. **Renomeado para "Minha Organização"** (decisão explícita do
usuário — reaproveita o texto já usado nos estados de loading/erro da
própria página, nenhum texto novo inventado). `label`/`PageHeader`
corrigidos em `src/app/admin/organizacao/page.tsx`; `/admin/meu-negocio`
não foi tocado. Existe ainda um terceiro candidato próximo,
`/admin/empresa` ("Company Central", cockpit por-empresa-selecionada,
registrado como `empresa_central` nesta mesma leva) — três telas
institucionais/de-empresa distintas (`/admin/organizacao`,
`/admin/empresa`, `/admin/meu-negocio`), agora todas nomeadas sem
colisão entre si.

### Estado atual
**REAL** — dado real via `getOwnOrganizationSummary()` (Supabase), sem fixture. **Registrado em `platform-modules.ts` nesta missão.**

### Roadmap
**V1 — Fundação:** identidade + carteira de clientes (agência) / identidade da empresa (business) — já entregue.
**V2 — Integrações:** nenhuma prevista ainda — não documentado em nenhuma sprint anterior.
**V3 — Execução:** nenhuma prevista ainda.
