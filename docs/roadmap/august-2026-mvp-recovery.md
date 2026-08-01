# Plano de recuperação do MVP — Agosto de 2026

Sprint Recovery 2.1.3. Linguagem objetiva, sem maquiar atraso.

## Estado em 31/07/2026

O projeto ultrapassou os prazos anteriores implícitos nas sprints
anteriores. O MVP ainda não está em uso diário em ambiente oficial. Há
uma quantidade grande de código real e testado (Workspaces, Meu Negócio,
Centro de Comando, DNA & Estratégia, 8Ps, SWOT, Concorrência, Produtos e
Fichas, Financeiro, Relatórios, REC OS, Calendário, CRM básico,
Ecossistema, Data Hub, pacotes de nicho, contratos de inteligência,
Domain Events), mas **nenhum QA autenticado formal em Production com
sessão real** foi executado até esta data nesta branch.

## Causas do atraso

1. **Ambiente local instável em memória** — vários hotfixes anteriores
   (Workspaces 1.0.10/1.0.11) registraram OOM reprodutível em `tsc`/`next
   build`/`next dev` (~700-750MB de teto de alocação), o que forçou
   depender do build real da Vercel como gate em vez de validação local.
2. **Ambiguidade de porta de QA** — sprints diferentes usaram 3000, 3002,
   3100, 3101 sem um padrão único, dificultando saber qual servidor local
   correspondia a qual branch/HEAD (corrigido nesta sprint, ver
   `docs/development/local-qa-standard.md`).
3. **Ausência de QA autenticado real** — nenhuma sessão de Super Admin
   real esteve disponível no ambiente de execução até agora; todo QA foi
   estrutural/unitário ou smoke sem sessão.
4. **Recalibração de DNA/Meu Negócio identificou desconexão silenciosa**
   — a Sprint Meu Negócio 2.1.2 descobriu que a camada estratégica (DNA,
   4 Ps, SWOT, Metas) estava em `main` mas desconectada da entrada real
   desde a migração para o Centro de Comando, sem que `project-status.ts`
   tivesse sido atualizado — um sinal de que o processo de status não
   estava sendo mantido em dia.

## Módulos prontos em código (sem QA formal em Production)

Workspaces (preview, capabilities, mutation enforcement), Meu Negócio /
Centro de Comando, DNA & Estratégia, 8Ps LOKAT, SWOT/FOFA, Concorrência,
Manual Vivo, Produtos e Fichas, Estoque e Compras, Financeiro, Relatórios,
REC OS, Calendário Global, CRM básico (leads/funil), Ecossistema
(`/admin/ecossistema`), Data Hub, pacotes de nicho.

## Módulos ainda sem QA

Todos os acima — nenhum recebeu `authenticated_local_qa` nem
`official_domain_qa` nesta branch até 31/07/2026 (ver
`src/config/delivery-status.ts`, `MODULE_VALIDATION_REQUIREMENTS`).

## Módulos apenas conceituais (contratos, sem implementação)

CRM adaptativo (núcleo universal, superfícies, nichos, follow-up,
temperatura, dashboards, IA), WhatsApp (`messaging_provider_contract`),
Google Calendar OAuth/URL (`calendar_provider_contract` — OAuth
`blocked`, iCal `planned`), Fiscal (`fiscal_module_map`), Radar de Produto
persistente, IA contextual real (contratos existem, `unavailable` fixo).

## Bloqueadores

- Nenhuma sessão de Super Admin real disponível neste ambiente de
  execução para QA autenticado — depende do Codex Web.
- Memória local historicamente instável para `tsc`/`build` (mitigado com
  `--max-semi-space-size=16`, mas não eliminado — ver hotfixes 1.0.10/
  1.0.11 do histórico de Workspaces).
- `SUPABASE_SERVICE_ROLE_KEY` não configurada neste `.env.local` (impacta
  rotas real-only de Workspaces, não bloqueia QA de UI/navegação).

## Prioridades

Ver `src/config/project-status.ts` (`priority: "P0" | "P1" | "P2" | "P3"`)
e `src/config/delivery-status.ts`. P0: segurança de preview, isolamento de
tenant, rotas canônicas, integridade do release, QA autenticado local e
no domínio oficial. P1: módulos essenciais para o primeiro uso interno
(Meu Negócio, Centro de Comando, DNA & Estratégia, 8Ps, Workspaces,
painéis Super ADM/Agência/Cliente/Empresa Direta, isolamento do CRM). P2:
evolução (CRM adaptativo, WhatsApp, Google Calendar, Data Hub persistente,
integrações comerciais, estoque completo, IA contextual, conciliação,
Radar de Produto persistente).

## Responsáveis por área

Não há responsáveis nomeados por área nesta sprint — o projeto tem um
único operador (Caio) apoiado por Claude Code. `ownerArea` em
`ProjectAreaStatus` fica disponível para quando houver mais de uma pessoa
executando.

## Checkpoints de 01 a 07 de agosto

| Data | Checkpoint |
|---|---|
| 2026-08-01 | QA autenticado local completo |
| 2026-08-02 | Correção dos problemas P0 e P1 |
| 2026-08-03 | Reexecução do QA local e fechamento dos problemas críticos |
| 2026-08-04 | Integração final e push exclusivo da main |
| 2026-08-05 | Deployment Production e QA no domínio www.lokat.com.br |
| 2026-08-06 | Provisionamento controlado dos ambientes de teste |
| 2026-08-07 | Início do uso diário interno do MVP |

Nenhum checkpoint nasce concluído (`completed: false` em
`MVP_RECOVERY_CHECKPOINTS`) — cada um só é marcado com evidência real.

## Critério de início do uso interno

Super ADM, Meu Negócio, REC OS, Workspaces e módulos essenciais (P0+P1)
navegáveis e validados via `authenticated_local_qa` **e**
`official_domain_qa`, sem P0 aberto, sem bloqueador de release ativo.

## Critério de publicação

`production_release_integrity` sem falha (tsc limpo, build com exit 0
real, ESLint limpo, `git diff --check` limpo, nenhum segredo com valor
exposto) **e** `authenticated_local_qa` concluído sem P0.

## Critério de provisionamento

Somente após `official_domain_qa` concluído — nenhum ambiente de teste
provisionado antes disso nesta sprint nem nas seguintes até essa condição.

## Riscos

- **Alto**: nenhuma sessão de Super Admin real testada nesta branch até
  agora — o primeiro QA autenticado pode revelar problemas não visíveis
  em testes estruturais/smoke.
- **Médio**: memória local instável pode voltar a bloquear `tsc`/`build`
  local, forçando depender do build da Vercel como gate único.
- **Médio**: 3 vocabulários de segmento não unificados
  (`motor-lokat/types.ts`, `business-archetypes/types.ts`,
  `business-profile/types.ts`) podem causar inconsistência ao expandir
  para novos arquétipos.
- **Baixo**: CRM adaptativo é só arquitetura — não há risco de regressão
  no CRM real (`crm`) por esta sprint.

## Plano de contingência

Se `authenticated_local_qa` (01/08) encontrar P0s bloqueantes, os
checkpoints de 02-03/08 absorvem a correção e reexecução — o checkpoint de
04/08 (integração final e push) só ocorre se P0/P1 estiverem fechados. Se
isso empurrar o marco de 07/08, o novo marco deve ser registrado com a
mesma disciplina desta sprint (data explícita, motivo, sem maquiagem) —
nunca silenciosamente adiado sem registro.

## Atualização — Sprint REC OS 3.0.1

A pré-condição desta sprint (Sprint REC OS 3.0.1) foi cumprida após um
bloqueio real: a Sprint QA Local 3.0.2 anterior parou corretamente com
`BLOCKER_REC_OS_3_0_1_NOT_EXECUTED` ao confirmar, por auditoria de
histórico git, que o fluxo criativo canônico/mobile/CRM mobile ainda não
existiam. Esta sprint implementou essas peças; a causa raiz mais provável
de boa parte dos defeitos mobile reportados (viewport meta ausente) foi
encontrada e corrigida. A QA Local 3.0.2 (Playwright) deve ser reaberta
depois desta sprint.

## Atualização — Sprint REC OS 3.0.1.1

Sprint de fechamento funcional executada logo após a 3.0.1: fechou as
lacunas que o próprio relatório da 3.0.1 havia declarado abertas (Radar
sem ação real, Roadmap/Mapa do Cliente só registry, Calendário contextual
não conectado, EditorOS com handoff não estruturado, bottom navigation
com defeito real de rotas ausentes, ação rápida/busca decorativas). Ver
`docs/rec-os/known-gaps-closure-3.0.1.1.md` para o detalhamento completo
lacuna-por-lacuna. A QA Local 3.0.2 (Playwright) pode ser reaberta após
esta sprint.
