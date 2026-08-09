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

- 206 áreas rastreadas em `project-status.ts` (190 antes desta série de sprints + 13 áreas conceituais Entity-Centric/tech-debt + 3 contratos de Activation na correção 2026-08.2): 16 `validated`, 6 `deployed`, 9 `implemented`, 104 `qa_pending`, 9 `blocked`, 61 `planned`, 1 `in_progress` (o `dual_project_status_tracking_debt` moveu de `blocked` para `implemented` nesta mesma correção, refletindo a fachada já implementada). *(Nota: este denominador muda a cada sprint que registra novas áreas conceituais — o valor correto é sempre o resultado de `PROJECT_AREAS.length` no HEAD atual, não um número fixo neste texto. Histórico: 190 → 203 → 206 ao longo desta série de correções.)*
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
| **TECH_DEBT** | `src/app/admin/meu-negocio/_client-content.tsx` órfão (P3 — dead code confirmado, sem importador real; não confundir com o padrão de nome `_client-content.tsx`, comum e majoritariamente vivo no resto do repositório); dois sistemas `project-status` paralelos (P1 — ver seção própria abaixo); três vocabulários de role/account-type pré-capability-registry (já mitigado, não eliminado); fragmentação de resolução de contexto por módulo (P2 hoje, torna-se P1 antes de expor ações de IA ou contexto persistente — o próprio motivo desta recalibração). |
| **NEW_SCOPE_2026_08** | Entity-Centric (Company Central, Project, Work Items, Domain Events, AI Context, Capabilities por plano, Connector/NIS) — 100% conceitual nesta sprint. |
| **FUTURE** | Compras Inteligentes, Finance avançado, Growth avançado, Connector real, primeiro piloto externo. |
| **EXTERNAL_INTEGRATIONS** | CE.SDK (EditorOS), Chatwoot, Postiz — todos `BLOQUEADO` por licença/infraestrutura, sem mudança nesta sprint. |

Nenhum item de `IMPLEMENTED_QA_VALIDATED` foi penalizado por o produto
ter ganhado uma visão maior — a expansão do escopo (Entity-Centric) é
tratada como NEW_SCOPE_2026_08, um denominador adicional, não uma
reclassificação retroativa do que já existe.

## Percentuais recalculados

*(Seção reescrita após auditoria independente — os nomes abaixo
substituem a versão anterior, que rotulava métricas diferentes como se
fossem a mesma "progresso", causando confusão. Cada linha agora mede
UMA coisa específica, nomeada para não ser confundida com as outras.)*

Metodologia: reaproveita os pesos JÁ CODIFICADOS em `READINESS_WEIGHTS`
e a fórmula já existente `calcV1Readiness()` (`src/config/project-status.ts`)
— nenhuma tabela de pesos nova foi inventada. `planned`/`blocked` = 0.10
(quase nada), `implemented` = 0.50, `qa_pending` = 0.75 (funcional, só
falta QA formal), `validated` = 1.00. Itens concept-only (a nova camada
Entity-Centric) não entram em nenhum destes cálculos — não existe código
para medir ainda.

### Métricas de escopo (readiness ponderado)

| Métrica | Valor | Base de cálculo |
|---|---|---|
| **Historical V1 Completion Estimate** | **81%** | Valor manual fixado em 2026-07-12 (commit `f1d0c9f`), antes de existir o sistema atual de 190+ áreas — preservado como registro histórico, não uma medição comparável às demais linhas desta tabela. |
| **Current Tracked V1 Readiness** | **65%** | `calcV1Readiness()` aplicado às 31 áreas atualmente marcadas `phase: "v1"` — mesma fórmula já existente no código, sobre o conjunto de áreas de hoje. Não é "o V1 caiu"; é uma métrica diferente, mais rigorosa, substituindo uma estimativa manual antiga. |
| **Historical/Manual V2 Delivery Estimate** | **12%** | Valor manual preservado — ver decisão de não recalcular abaixo. Não acompanhado, nesta sprint, de uma métrica de "cobertura arquitetural V2" separada (melhoria recomendada, não implementada). |
| **Platform Vision Progress** | **53.3%** | Mesma fórmula aplicada às 206 áreas totais rastreadas hoje. Cresce em denominador a cada sprint que a camada Entity-Centric/Activation ganha áreas próprias, sem que isso signifique regressão — sempre recalcular a partir de `PROJECT_AREAS.length` real, nunca copiar este número em texto por muito tempo. |

### Métricas de confiança de QA (nunca uma métrica única — ver correção abaixo)

A versão anterior deste documento publicava um único "QA Confidence: 8%",
que a auditoria independente corretamente apontou como enganoso: soa
como "8% de confiança no sistema todo", quando na verdade mistura duas
coisas muito diferentes — quantas áreas têm QA FORMAL registrado
(baixo, porque é um processo caro e ainda não aplicado a tudo) vs.
quantos dos testes que RODARAM realmente passaram (altíssimo). São
separadas agora:

| Métrica | Valor | O que mede |
|---|---|---|
| **Formal Validation Coverage (por área)** | **7.8%** (16/206) | Fração de áreas com `readiness: "validated"` sobre o total rastreado — a métrica mais rigorosa; a maioria das áreas nunca passou por QA formal ainda, o que é esperado num produto deste tamanho, não um sinal de qualidade ruim. |
| **E2E Executed Pass Rate** | **100%** (166/166) | De todos os testes que RODARAM na run autenticada final (`31333187756`), quantos passaram — a suíte que executa está inteiramente verde, 0 P0-P3. |
| **E2E Suite Execution Rate** | **87.4%** (166/190) | Dos 190 testes descobertos pela suíte, quantos realmente rodaram (o restante foi pulado por falta de dado/contexto na conta de QA, nunca por falha). |
| **E2E Not-Validated Rate** | **12.6%** (24/190) | Os mesmos 24 skips — dado de forma direta, sem escondê-lo atrás de uma média. |

**Leitura correta:** o produto tem baixa cobertura de QA FORMAL
(esperado, produto em crescimento) e altíssima taxa de acerto no que já
é testado automaticamente (o oposto de "pouca confiança"). Nenhuma
dessas quatro métricas deve ser citada sozinha como "a" métrica de
confiança do produto.

### Current MVP Readiness (proxy, mantido com a mesma limitação já registrada)

| Métrica | Valor | Base de cálculo |
|---|---|---|
| **Current MVP Readiness (proxy)** | **~51%** | Áreas de categoria `crm`+`conteudo` (51 áreas) como aproximação do novo escopo MVP recalibrado — proxy imperfeito, ver limitação abaixo. |

**Limitação registrada, não escondida:** esta métrica usa categorias
(`crm`, `conteudo`) como proxy do novo recorte de MVP porque
`project-status.ts` não tem hoje um campo "está no MVP recalibrado?" —
essa é uma melhoria de tracking recomendada, não implementada nesta
sprint (ver Status Config abaixo).

## Achado crítico durante esta sprint: dois sistemas de status paralelos

**Estado ENCONTRADO originalmente** (antes de qualquer correção nesta
sprint): ao editar `V1_PROGRESS`, a auditoria descobriu que **existiam
dois arquivos `project-status` independentes, não sincronizados**:

- `src/config/project-status.ts` — o sistema detalhado (190 áreas
  rastreadas naquele momento, 206 hoje após as sucessivas adições
  conceituais desta série de sprints — ver "Status config changed" —
  `calcV1Readiness()`, pesos por readiness) que esta recalibração
  inteira audita e estende.
- `src/lib/project-status.ts` — um arquivo MUITO mais simples e mais
  antigo (`PROJECT_DEADLINE_V1`, `V1_PROGRESS`, `V2_PROGRESS`,
  `MILESTONES_V1`/`MILESTONES_V2` como lista plana de marcos) que, NAQUELE
  MOMENTO, tinha seu PRÓPRIO `V1_PROGRESS = 81` hardcoded e era o que
  REALMENTE alimentava os dois números "V1 XX%" visíveis na interface
  (`src/app/admin/status/_status-client.tsx:656` e
  `src/app/admin/_layout-client.tsx:517`) — o `V1_PROGRESS` do arquivo
  detalhado NÃO era lido para exibição, só aparecia em comentários/notas
  de texto e no teste unitário do próprio arquivo.

**Estado ATUAL (corrigido ainda dentro desta sprint, em resposta à
auditoria independente — Correção Pós-Auditoria 2026-08.2):**
`src/lib/project-status.ts` **não tem mais um `V1_PROGRESS`/`V2_PROGRESS`
próprios** — ambos são reexportados diretamente de
`src/config/project-status.ts` (`export { V1_PROGRESS, V2_PROGRESS }
from "@/config/project-status"`), coberto por
`src/lib/__tests__/project-status.test.ts`. Ou seja: hoje, o arquivo
detalhado **É** lido para exibição, através da fachada. O badge "V1 XX%"
na interface mostra **65%** (o valor canônico), não mais 81%.
`PROJECT_DEADLINE_V1 = "2026-07-31"` (já uma data passada em relação a
hoje, 2026-08-09) e `MILESTONES_V1`/`MILESTONES_V2` permanecem no
arquivo simples, classificados explicitamente como **legacy
compatibility metadata** (ver comentário em `src/lib/project-status.ts`
e decisão completa abaixo) — nunca uma segunda fonte canônica
concorrente, mas também não fingindo ser uma consolidação total enquanto
esses dois campos não migrarem.

**Decisão original desta sprint (já superada pela correção acima,
mantida aqui só como registro histórico):** não tocar em `src/lib/project-status.ts`
— alterar o número real exibido na interface parecia uma mudança de
maior visibilidade do que uma sprint de auditoria/planejamento deveria
fazer sem confirmação explícita.

**Correção pós-auditoria independente (mesma sprint, resposta ao
achado P1):** a auditoria confirmou o risco como "alto e já
materializado" (a interface mostra 81% enquanto a recalibração registra
65%) e recomendou explicitamente tornar `src/config/project-status.ts`
canônico, convertendo `src/lib/project-status.ts` numa FACHADA
TEMPORÁRIA — reexportando `V1_PROGRESS`/`V2_PROGRESS` do arquivo
detalhado em vez de manter um segundo valor hardcoded e divergente.
Implementado: `src/lib/project-status.ts` agora reexporta os dois
valores de `src/config/project-status.ts`; `PROJECT_DEADLINE_V1` e
`MILESTONES_V1`/`MILESTONES_V2` permanecem no arquivo simples (fora do
escopo da divergência apontada). Consequência visível: o badge "V1 XX%"
na interface passa a mostrar **65%**, não mais 81% — mudança
intencional, não efeito colateral. Consolidação mais profunda (unificar
os dois arquivos de fato) permanece recomendada para a Faixa A do
roadmap, não feita nesta sprint.

## V1_PROGRESS / V2_PROGRESS — decisão

*(Nota: a decisão abaixo se aplica a `src/config/project-status.ts` — o
sistema detalhado. Ver "Achado crítico" acima sobre o segundo arquivo,
`src/lib/project-status.ts` — que, após a correção pós-auditoria
registrada acima, agora reexporta esses dois valores em vez de manter
uma cópia própria, e É o que a interface realmente exibe hoje.)*

**Achado de auditoria (não opinião):** `V1_PROGRESS = 81` foi fixado em
2026-07-12 (commit `f1d0c9f`), num arquivo de 79 linhas SEM NENHUM
`PROJECT_AREAS` ainda (0 áreas rastreadas naquele momento — o sistema de
pesos por readiness nem existia). Ou seja, 81 é uma estimativa manual
anterior à própria existência do mecanismo de cálculo objetivo que o
código tem hoje (`calcV1Readiness()`), não um valor comparável ponto a
ponto com o 65 computado agora sobre as 31 áreas `phase:"v1"` das 206
áreas totais rastreadas hoje.

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
