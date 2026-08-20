# LKT — Lokat Orchestration Framework v1

**Sprint:** Recalibração Corrections 2026-08.2
**Status:** Formalização conceitual. Nenhum runtime, bus, ou motor implementado.

## LKT não é módulo

LKT é um FRAMEWORK/LIFECYCLE de orquestração — um padrão de raciocínio
recorrente que pode orientar qualquer coisa que evolua ao longo do
tempo dentro do LOKAT OS: a evolução de uma Company, um Project, uma
Campaign, ou uma melhoria operacional. Não é uma tela, não é uma tabela,
não é um agente específico.

```
CONTEXT
   ↓
DIAGNOSIS
   ↓
DIRECTION
   ↓
INITIATIVE
   ↓
ARCHITECTURE
   ↓
CONNECTIONS
   ↓
EXECUTION
   ↓
MEASUREMENT
   ↓
LEARNING
   ↓
UPDATED CONTEXT (fecha o loop — nunca um fim absoluto)
```

Ao contrário de um fluxo linear com fim ("projeto entregue, fim"), o LKT
é um LOOP: `LEARNING` sempre realimenta `CONTEXT`, porque toda execução
muda o que se sabe sobre a Company/Project/Campaign.

## Relação com a Central de Projetos

`docs/product/lokat-os-mvp-2026-08.md` já descreve um motor específico
para projetos client-facing:

```
Opportunity → Diagnosis → Strategy → Offer → Architecture → Scope
→ Deliverables → Work → Execution → Measurement → Closure → Learning
→ Productization
```

**Esta não é uma segunda framework concorrente — é uma APLICAÇÃO
específica do loop LKT geral**, para o caso particular de "transformar
uma oportunidade comercial em um projeto entregue e, possivelmente, num
produto replicável (productization)". A correspondência:

| LKT (geral) | Central de Projetos (aplicação a projeto client-facing) |
|---|---|
| CONTEXT | Opportunity |
| DIAGNOSIS | Diagnosis |
| DIRECTION | Strategy |
| INITIATIVE | Offer |
| ARCHITECTURE | Architecture / Scope |
| CONNECTIONS | (implícito em Scope/Deliverables — quais módulos/integrações o projeto usa) |
| EXECUTION | Work / Execution |
| MEASUREMENT | Measurement |
| LEARNING | Learning |
| UPDATED CONTEXT | Closure → Productization (o aprendizado vira contexto reutilizável, inclusive para replicar como oferta) |

Outras aplicações do MESMO loop LKT, formalizadas apenas conceitualmente
aqui (nenhuma implementação):

- **Company evolution** — o loop se repete cada vez que a Company muda de fase (nova rodada de diagnóstico, nova direção, novas iniciativas).
- **Campaign** — versão mais curta do loop, focada em marketing/comunicação/aquisição/conversão/retenção.
- **Operational Improvement** — versão do loop para melhorias internas de processo, sem necessariamente virar um Project formal.

## O que o LKT NÃO é

- Não é um Event Bus (`Domain Events`, formalizado separadamente em `lokat-os-module-connectivity-map-v1.md`, é a camada técnica; LKT é o raciocínio que decide QUANDO um evento importa).
- Não é a Gota Neural (a Gota Neural pode usar o LKT como um dos modelos de raciocínio que aplica, mas o LKT existe independentemente de qualquer IA — é útil mesmo como checklist manual).
- Não substitui Initiative Classification (`lokat-os-activation-v1.md`) — a classificação decide QUAL aplicação do LKT usar (projeto, campanha, melhoria operacional); o LKT é o loop que roda depois dessa decisão.

## Non-goals desta sprint

Nenhum motor, bus, scheduler, ou runtime implementado. Este documento é
puramente conceitual — formaliza um vocabulário e uma estrutura de
raciocínio compartilhada, para que sprints futuras de implementação não
inventem uma quarta forma de descrever o mesmo loop.

---

# LKT Operating Standard v1 (fundação: LKT MISSION CARD — LKT Operating Standard + Module Lifecycle Registry)

**Atenção — isto é um LKT diferente do loop de produto acima.** O loop
`CONTEXT → ... → LEARNING` (seção anterior) é sobre como uma Company/
Project/Campaign evolui como PRODUTO. O que segue é sobre como O PRÓPRIO
LOKAT OS é desenvolvido, testado, revisado e entregue — o processo de
engenharia, não o ciclo de vida de um cliente. Mesma marca ("LKT"),
propósito deliberadamente diferente; nunca misturar os dois vocabulários.

## Ambientes (regra dura)

- **Desenvolvimento** — ambiente onde código é criado (worktree local,
  `npm run dev -- -p 3124`). Nunca visível ao usuário final.
- **Preview** — ambiente temporário de validação interna (deploy de
  branch/PR, domínio `*.vercel.app`). Serve para revisão, nunca é
  considerado entrega.
- **Production** — ambiente oficial entregue ao usuário (branch `main`,
  domínio real `www.lokat.com.br`).

**Regra: nenhum recurso é considerado entregue enquanto não existir
Production Deploy.** Preview passando não é "pronto"; é "pronto para
revisão". Um recurso pode estar 100% funcional em Preview e ainda assim
valer `PLANNED`/`NOT_IMPLEMENTED` no Module Lifecycle Registory até o
deploy de Production acontecer e ser confirmado (ver Release Record
abaixo).

## LKT Deploy Standard v1

Fluxo oficial, sem etapas puladas:

```
Feature Branch
   ↓
Desenvolvimento Local  (DEV_URL local, ex.: http://localhost:3124)
   ↓
Testes                 (unit + structural relacionados à mudança)
   ↓
Build                  (npm run build — retry limpo se OOM, nunca mascarar erro real)
   ↓
Review                 (diff auditado, git status revisado, nada fora de escopo)
   ↓
Merge --ff-only em main  (nunca merge commit, nunca --no-verify)
   ↓
Push main
   ↓
Vercel Production Deploy  (auto-triggered pelo push, confirmado via MCP/API)
   ↓
Smoke Test              (curl/HTTP real: 200 na raiz, redirects corretos, zero 5xx)
```

Preview é tratado só como ambiente intermediário — nunca a etapa final
de uma missão de release. Este fluxo já é o que toda missão
"PRODUCTION RELEASE" desta sessão vem seguindo; esta seção só o torna
canônico e citável em vez de implícito.

### Auditoria de alinhamento (Deployment Production Flow + Organization Naming Separation V1)

Confirmado via Vercel MCP (`get_project`/`list_deployments`/
`get_deployment`, projeto `prj_DjSreQY8WOm1UweAAI7OvnRLrKas`) que o
fluxo acima já é exatamente o que a Vercel executa hoje, sem
misalinhamento e sem necessidade de alterar configuração:

- Todo deployment com `githubCommitRef: "main"` tem `target: "production"`
  e recebe o alias `www.lokat.com.br` (verificado no deployment de
  produção atual, `dpl_8YE512AeRgdsXWwQvDZu7BUsrFxR`, commit `e718dbe`,
  `readyState: "READY"`, `aliasError: null`).
- Todo deployment de qualquer outra branch (`feat/mvp-final-
  consolidation-v1`, `feat/personal-strategy-os`) tem `target: null`
  (Preview) e nunca recebe o alias de produção (verificado no deployment
  mais recente da feature branch, `dpl_AXWah4tufrtPYwyZVigbdX2iDRjY`,
  commit `3632a30`, alias só `*-git-feat-mvp-final-consolidation-v1-*.vercel.app`).
- Nenhuma configuração da Vercel foi alterada nesta missão — auditoria
  confirmou alinhamento, não achou nada para corrigir.

## LKT Release Record Standard v1

Todo release deve registrar, no LKT Activity Log
(`src/lib/lkt-activity/`, via `npm run lkt:record`, nunca editado à mão):
Projeto, Módulo, Versão, Branch, Commit inicial, Commit final, Ambiente,
Deployment ID, Status, Smoke test, Pendências. Estes 11 campos mapeiam
diretamente para o schema já existente em `LktActivityEvent`
(`src/lib/lkt-activity/types.ts`) — nenhum campo novo, nenhum sistema
paralelo:

| Campo do padrão de release | Campo em `LktActivityEvent` |
|---|---|
| Projeto | (implícito — este repositório; não versionado por evento) |
| Módulo | `module` |
| Versão | Incluída no `title` (ex.: "REC OS Growth Foundation V1") |
| Branch | `branch` (autodetectada pelo `lkt-record`, nunca digitada) |
| Commit inicial | `references[]` com `label: "commit inicial"` |
| Commit final | `references[]` com `label: "commit final"` (ou `commit` quando só um) |
| Ambiente | `environment` (`local` \| `preview` \| `production`) |
| Deployment ID | `deployment` (sempre opcional — nunca bloqueia o registro do evento) |
| Status | `status` (REAL/PARTIAL/DEMO/COMING_SOON/NOT_IMPLEMENTED/LEGACY/BLOCKED) + `build` (PASS/FAIL/NOT_RUN) |
| Smoke test | `tests[]` (suite `"smoke"`, passed/failed reais) |
| Pendências | `nextAction` e/ou `blocker` |

Um evento de release usa `kind: "RELEASE"`. Nunca inventar um Deployment
ID quando ele não foi confirmado — o campo fica ausente, igual já
documentado em `types.ts`.

## LKT Navigation Standard v1

Módulos relacionados devem manter contexto — regra já aplicada em
código real (REC OS Context Foundation V1: calendário/conexões
contextuais) e agora formalizada como padrão obrigatório para qualquer
módulo novo:

**Correto:** REC OS → Calendário contextual → dentro do cliente
selecionado (`/admin/contentos/calendario`, mesma normalização de
`global-calendar.ts`, nunca sai do módulo).

**Evitar:** REC OS → abrir outro módulo só para visualizar uma
informação relacionada, perdendo `?client=`/contexto no caminho.

Todo módulo deve respeitar, nesta ordem: empresa atual (Company
Context, `resolveCompanyContext()`), cliente atual (`?client=`
propagado), ambiente atual (local/preview/production). Quando sair do
módulo for genuinamente necessário (ex.: "Abrir Calendário Global"),
isso deve ser um link secundário explícito, nunca a navegação padrão —
mesmo padrão já registrado em `src/config/admin-routes.ts`
(`rec_os_calendario_global`/`rec_os_conexoes_global`).

## LKT Status Activity Standard v1

O padrão "Movimento / Estado / Próxima ação" pedido para o Status
Activity já existe e não precisa de um novo mecanismo — é uma leitura
direta do LKT Activity Log já em produção nesta branch
(`/admin/status`, `src/lib/lkt-activity/`):

| Conceito pedido | Fonte real |
|---|---|
| Movimento (ex.: "REC OS Growth Planner V1 criado") | `LktActivityEvent.title` do evento mais recente (`getLatestMovement()`) |
| Estado (Planejado / Em desenvolvimento / Disponível) | `LktActivityEvent.status` — mapeamento: Planejado≈`NOT_IMPLEMENTED`/`COMING_SOON`, Em desenvolvimento≈`PARTIAL`, Disponível≈`REAL` |
| Próxima ação (ex.: "Criar UX Foundation") | `LktActivityEvent.nextAction` |

Nenhum campo novo necessário. Continuar registrando via
`npm run lkt:record`, nunca editando `activity.json` manualmente.

## Module Lifecycle Registry v1

Estrutura de documentação (não um tipo TypeScript novo, para não criar
uma quarta taxonomia de status ao lado de `AreaReadiness`
(`project-status.ts`, release/QA), `PlatformModuleMaturity`
(`platform-modules.ts`, arquitetura observada) e `LktEventStatus`
(`lkt-activity/types.ts`, honestidade por evento) — ver
`docs/architecture/module-lifecycle-registry-v1.md` para o template e
os módulos já documentados (REC OS, REC OS Growth, Meu Negócio, Meu
Escritório, Minha Empresa). O vocabulário de 5 estados pedido nesta
missão (REAL/PLANNED/COMING_SOON/NOT_IMPLEMENTED/LEGACY) é uma LENTE de
leitura simplificada sobre `PlatformModuleMaturity`, nunca uma fonte de
verdade paralela — o documento explica o mapeamento exato.
