# LOKAT OS — Recalibração 2026-08

**Sprint:** Recalibração LOKAT OS 2026-08
**Status:** Documento executivo final. Nenhuma feature implementada nesta sprint.

## Resumo executivo

Depois de uma série de sprints de correção de CI/harness/produto que
culminaram na primeira execução E2E autenticada 100% aprovada no
contrato testado (run `31333187756`: 166/166, 0 P0-P3, 24 skips
conhecidos), esta sprint reavalia a arquitetura e o escopo do LOKAT OS
antes de qualquer nova fase de implementação.

**Achado central:** o produto não tem hoje um problema de qualidade de
código nos módulos existentes (a QA final o confirma) — tem um problema
de FRAGMENTAÇÃO DE CONTEXTO. Cada módulo resolve "qual empresa/cliente é
esse" à sua própria maneira. A decisão formalizada nesta sprint (ver
ADR-ENTITY-CENTRIC-001) é reorganizar em torno de uma cadeia de
entidades compartilhada — Workspace → Company → Project → Work Items →
Domain Modules → Domain Events → AI Context — reaproveitando o que já
existe (a tabela `clients` já é a Company; o padrão de projeção de Work
Items já está provado em produção via `BusinessOfficeFeedItem`) em vez
de propor uma reescrita.

## Estado atual (evidência, não opinião)

- 190 áreas rastreadas em `project-status.ts`: 16 `validated`, 6 `deployed`, 8 `implemented`, 104 `qa_pending`, 9 `blocked`, 46 `planned`, 1 `in_progress`.
- 140+ rotas reais no repositório (`find src/app -name page.tsx`), cobrindo 7 superfícies distintas (público, admin, contentos, client, operacional, growth, academy, financeiro).
- `clients` já cumpre o papel de Company; não existe `workspaces` física (nem é urgente — já registrado como V3); não existe `Project`/`WorkItem` genérico.
- Meu Negócio já é, na prática, o protótipo mais próximo de uma "Company Central" — mas roda sobre uma única empresa de demonstração (fixture), com 17 dos 19 campos de DNA nascendo vazios por padrão (nunca fabricados).
- Um mecanismo de capability gating por SURFACE já existe (`WorkspaceCapabilityGate`) e deve ser reaproveitado, não duplicado, para o novo eixo de capabilities por PLANO.
- Um padrão de "provider" já existe para integrações internas (`src/lib/providers/`) — deliberadamente distinto do conceito novo de Lokat Project Connector (integração externa).

## Escopo: histórico vs. novo

| Categoria | O que inclui |
|---|---|
| **ORIGINAL_SCOPE / ORIGINAL_DELIVERED** | Auth, schema, storage, hero/landing/pré-acesso públicos, onboarding, REC OS, CRM, Calendário Global, Meu Escritório — o V1 originalmente descrito no repositório. |
| **IMPLEMENTED_QA_VALIDATED** | As 16 áreas `validated` + o contrato testado pela run E2E autenticada final (navegação, Workspace Preview, mutation guard, CRM mobile, overflow, Meu Escritório, Roadmap). |
| **IMPLEMENTED_NOT_VALIDATED** | As 104 áreas `qa_pending` — código existe, QA formal não. |
| **BLOCKED** | 9 áreas — em geral aguardando decisão externa (SQL pendente de aprovação, licença de motor externo). |
| **TECH_DEBT** | `_client-content.tsx` órfão em Meu Negócio; três vocabulários de role/account-type pré-capability-registry (já mitigado, não eliminado); fragmentação de resolução de contexto por módulo (o próprio motivo desta recalibração). |
| **NEW_SCOPE_2026_08** | Entity-Centric (Company Central, Project, Work Items, Domain Events, AI Context, Capabilities por plano, Connector/NIS) — 100% conceitual nesta sprint. |
| **FUTURE** | Compras Inteligentes, Finance avançado, Growth avançado, Connector real, primeiro piloto externo. |
| **EXTERNAL_INTEGRATIONS** | CE.SDK (EditorOS), Chatwoot, Postiz — todos `BLOQUEADO` por licença/infraestrutura, sem mudança nesta sprint. |

Nenhum item de `IMPLEMENTED_QA_VALIDATED` foi penalizado por o produto
ter ganhado uma visão maior — a expansão do escopo (Entity-Centric) é
tratada como NEW_SCOPE_2026_08, um denominador adicional, não uma
reclassificação retroativa do que já existe.

## Percentuais recalculados

Metodologia: reaproveita os pesos JÁ CODIFICADOS em `READINESS_WEIGHTS`
e a fórmula já existente `calcV1Readiness()` (`src/config/project-status.ts`)
— nenhuma tabela de pesos nova foi inventada. `planned`/`blocked` = 0.10
(quase nada), `implemented` = 0.50, `qa_pending` = 0.75 (funcional, só
falta QA formal), `validated` = 1.00. Itens concept-only (a nova camada
Entity-Centric) não entram em nenhum destes cálculos — não existe código
para medir ainda.

| Métrica | Valor | Base de cálculo |
|---|---|---|
| **A. Original V1 Completion** | **65** | `calcV1Readiness()` aplicado às 31 áreas atualmente marcadas `phase: "v1"`, mesma fórmula já existente no código. |
| **B. Current MVP Readiness** | **~53** (proxy) | Áreas de categoria `crm`+`conteudo` (56 áreas) como aproximação do novo escopo MVP recalibrado — proxy imperfeito, ver limitação abaixo. |
| **C. Platform Vision Progress** | **57** | Mesma fórmula aplicada às 190 áreas totais rastreadas — não inclui a camada Entity-Centric nova (sem código ainda, denominador ainda vai crescer quando ela ganhar áreas próprias). |
| **D. QA Confidence** | **8%** (16/190) | Fração de áreas com `readiness: "validated"` sobre o total — a métrica mais conservadora e mais honesta das quatro. |

**Limitação registrada, não escondida:** a métrica B usa categorias
(`crm`, `conteudo`) como proxy do novo recorte de MVP porque
`project-status.ts` não tem hoje um campo "está no MVP recalibrado?" —
essa é uma melhoria de tracking recomendada, não implementada nesta
sprint (ver Status Config abaixo).

## Achado crítico durante esta sprint: dois sistemas de status paralelos

Ao editar `V1_PROGRESS` para aplicar a decisão abaixo, a auditoria
descobriu que **existem dois arquivos `project-status` independentes,
não sincronizados**:

- `src/config/project-status.ts` — o sistema detalhado (190 áreas,
  `calcV1Readiness()`, pesos por readiness) que esta recalibração inteira
  audita e estende.
- `src/lib/project-status.ts` — um arquivo MUITO mais simples e mais
  antigo (`PROJECT_DEADLINE_V1`, `V1_PROGRESS`, `V2_PROGRESS`,
  `MILESTONES_V1`/`MILESTONES_V2` como lista plana de marcos) que é o
  que REALMENTE alimenta os dois números "V1 XX%" visíveis na interface
  (`src/app/admin/status/_status-client.tsx:656` e
  `src/app/admin/_layout-client.tsx:517`) — o `V1_PROGRESS` do arquivo
  detalhado NUNCA é lido para exibição, só aparece em comentários/notas
  de texto e no teste unitário do próprio arquivo.

Consequência prática: **a mudança de V1_PROGRESS decidida nesta sprint
(81→65, ver abaixo) NÃO altera nenhum número visível na interface hoje**
— o badge que o usuário vê continua vindo de `src/lib/project-status.ts`,
inalterado por esta sprint (permanece 81%). Adicionalmente,
`PROJECT_DEADLINE_V1 = "2026-07-31"` nesse segundo arquivo já é uma data
passada em relação a hoje (2026-08-09) — outro sinal de que esse arquivo
está desatualizado e desconectado do sistema de tracking mais recente.

**Decisão desta sprint:** não tocar em `src/lib/project-status.ts`.
Alterar o número real exibido na interface é uma mudança de maior
visibilidade e impacto do que o escopo desta sprint (auditoria +
planejamento, sem componente de produto) autoriza sem confirmação
explícita. Esta descoberta é registrada aqui como o achado de duplicação
mais importante da auditoria (Camada 19) e como TECH_DEBT prioritário: a
consolidação dos dois arquivos num único sistema de verdade é
recomendada como um dos primeiros itens da Faixa A do roadmap
recalibrado, antes mesmo do trabalho de Company/Project — corrigir
tracking duplicado é mais barato agora do que depois de mais sprints
lerem do arquivo errado.

## V1_PROGRESS / V2_PROGRESS — decisão

*(Nota: a decisão abaixo se aplica a `src/config/project-status.ts` — o
sistema detalhado. Ver "Achado crítico" acima sobre o segundo arquivo,
`src/lib/project-status.ts`, que continua inalterado e é o que a
interface realmente exibe.)*

**Achado de auditoria (não opinião):** `V1_PROGRESS = 81` foi fixado em
2026-07-12 (commit `f1d0c9f`), num arquivo de 79 linhas — ANTES de
existir o sistema atual de 190 áreas com pesos por readiness. Ou seja,
81 é uma estimativa manual anterior ao próprio mecanismo de cálculo
objetivo que o código tem hoje (`calcV1Readiness()`), não um valor
comparável ponto a ponto com o 65 computado agora.

**Decisão:** atualizar `V1_PROGRESS` de `81` para `65`, com o valor
histórico preservado em comentário no código. Justificativa: 65 é
produzido pela MESMA fórmula já existente no repositório, sobre o
conjunto de áreas `v1` atual (31 áreas: 10 validated, 5 deployed, 7
implemented, 4 qa_pending, 4 blocked, 1 planned) — é mais rigoroso e
mais barato de defender do que preservar um número manual de antes do
sistema de tracking existir. A queda de 81→65 não é regressão de
produto: é o denominador (composição do conjunto `v1`) e a metodologia
mudando, exatamente a situação que o próprio brief desta sprint
autoriza ("é permitido o percentual diminuir se o denominador mudou").

**`V2_PROGRESS` permanece em `12`, NÃO atualizado.** A mesma fórmula
aplicada cegamente às 127 áreas `v2` daria 66 — um número
enganosamente alto: a maioria dessas áreas é `qa_pending` porque foram
REGISTRADAS (documentadas/planejadas) em sprints de arquitetura, não
porque o código foi implementado e só falta o QA formal (o peso 0.75
pressupõe exatamente essa segunda situação). Aplicar a fórmula sem essa
distinção violaria a regra explícita desta recalibração: "itens
concept-only não contam como implementados." `V2_PROGRESS` continua
sendo uma estimativa manual mais conservadora até que `project-status.ts`
distinga "área V2 documentada" de "área V2 com código real qa_pending"
— recomendado, não feito nesta sprint.

## global_calendar — decisão

**Permanece `readiness: "qa_pending"`.** A run E2E autenticada final
validou o contrato testado do Calendário Global (navegação, ausência de
erro), mas `roadmap_calendar_context_navigation` continua `not_validated`
(skip, ver abaixo) — promover para `validated` agora esconderia essa
lacuna real. Não foi inventado nenhum enum novo (`validated_partial` não
existe em `AreaReadiness` e não foi criado); a nuance fica registrada em
texto na nota da área, não num enum novo.

## Skips incorporados ao mapa (não convertidos para passed)

| Skip | Status |
|---|---|
| `rec_os_final_send` | `not_validated` |
| `radar_create_opportunity` | `not_validated` |
| `roadmap_calendar_context_navigation` | `not_validated` |
| `roadmap_alias_ajuste_e2e` | `not_validated` — cobertura unitária existe (28/28 em `rec-os-roadmap.test.ts`), evidência E2E real na conta atual ainda não |

Prioridade de validação futura recomendada: `roadmap_alias_ajuste_e2e`
primeiro (menor esforço — só precisa de um item de conteúdo real com
esse status na conta de QA), depois `roadmap_calendar_context_navigation`,
depois os dois de REC OS (dependem de fluxo de conteúdo real ponta a
ponta, maior esforço).

## Prioridades, prazo e dependências

Ver `docs/product/lokat-os-roadmap-recalibrated-2026-08.md` para o grafo
de dependências completo, as três janelas de prazo (Dogfooding/Pilot/Public
MVP) e os riscos.

## Próximas fases

1. Auditoria independente desta recalibração (Codex Web).
2. Se confirmada: iniciar a Faixa A do roadmap recalibrado (Company
   context unificado → Project → Work Item), a única sequência que
   bloqueia o Dogfooding MVP.
3. Capabilities (Faixa B) e desenho detalhado do Connector (Faixa D,
   documentação apenas) podem começar em paralelo.

## Riscos

Ver seção "Riscos principais" em
`docs/product/lokat-os-roadmap-recalibrated-2026-08.md` — resumo: risco
de duplicar Work Items por módulo, risco de a Company Central virar
"mais um dashboard", risco de IA inventar score sem explicabilidade,
risco de desenhar o Connector antes de ter fundação estável, e a
pressão de memória do ambiente local (não é risco de produto, mas já
demonstrou custo real nesta série de sprints).
