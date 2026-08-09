# Lokat Integration Standard (NIS/LKT) v1

**Sprint:** Recalibração LOKAT OS 2026-08
**Status:** Formalização conceitual. Nenhum endpoint, SQL ou código criado nesta sprint.

## Princípio: Control Plane vs Data Plane

```
Client Application (do cliente externo)
   → mantém seu próprio Data Plane (schema, banco, provider)
   → Lokat Project Connector (agente/adaptador do lado do cliente)
   → API autenticada
   → LOKAT OS (Control Plane)
```

LOKAT OS **nunca** deve depender de conhecer:
- schema interno do sistema do cliente;
- service role/credenciais privilegiadas do banco do cliente;
- ORM específico (Prisma, etc.) ou provedor de banco específico;
- estrutura física de tabelas do cliente.

Isso não é uma aspiração nova — é a MESMA disciplina já aplicada
internamente em `docs/architecture/LOKAT_TENANCY_MAPPING.md` ("Mapeamento
para Providers"): o provider nunca recebe `client_id` não validado, nem
role vindo do frontend. O NIS generaliza esse princípio para fora da
plataforma.

## Por que isso já é coerente com o que existe

`src/lib/providers/` já implementa exatamente o padrão que o Connector
precisa (interface comum + registry central + endpoint de status
sanitizado + nunca expor secrets) — só que para motores INTERNOS
(EditorOS, CRM Inbox, Scheduler). O Connector é o mesmo padrão aplicado
a um domínio diferente: sistemas EXTERNOS que pertencem ao cliente, não
ao Lokat. Recomenda-se reaproveitar a disciplina (nunca o código) desse
módulo ao desenhar o Connector real.

## Contrato conceitual do Connector

**Manifest** — o que este cliente expõe e sob quais capabilities.
**Snapshot** — leitura pontual do estado atual (ex.: projetos, pendências).
**Events** — mudanças incrementais desde o último snapshot/cursor.
**Metrics** — indicadores agregados (não dados brutos).
**Health** — o connector está ativo, degradado, ou offline.

### Endpoints conceituais (não implementados)

```
GET /v1/manifest
GET /v1/snapshot
GET /v1/events
GET /v1/metrics
GET /v1/health
```

Todos autenticados; nenhum aceita credencial de banco do cliente; todos
retornam apenas o que o Manifest declarou como capability disponível.

## Catálogo conceitual de capabilities do Connector

```
project
calendar
deliverables
pendings
approvals
crm
contacts
companies
financial
payments
orders
content
campaigns
analytics
documents
suppliers
events
```

Um Connector não precisa implementar todas — o Manifest declara o
subconjunto real. Nenhuma capability é assumida por padrão.

## Event Envelope

```
version
project_id
event_id
event_name
occurred_at
source_system
entity
payload
```

Nenhum nome de vendor/produto específico deve virar parte da taxonomia
core de `event_name` — eventos são descritos em termos de domínio
(`work_item.completed`), nunca em termos da ferramenta de origem.

## Primeiro piloto

O primeiro projeto externo real que testar essa arquitetura serve como
piloto de validação do CONTRATO, não como justificativa para hardcodar
seu nome/schema no core do LOKAT OS. Qualquer particularidade desse
piloto que pareça "genérica o suficiente" deve ser generalizada antes de
entrar no core; o resto fica como configuração específica daquele
Connector.

## ExternalPilotOperationalSafety (adicionado — Sprint Recalibração Corrections 2026-08.2, Fase 8)

Contrato conceitual para o que acontece quando algo dá errado durante um
External Pilot que usa Connector — nenhum runtime implementado nesta
sprint, só o contrato:

- **Integration failure** — uma chamada ao Connector falha: o LOKAT OS mostra o último estado conhecido com `staleness` explícito (ver "External Source Safety" abaixo), nunca finge que o dado está atualizado.
- **Unavailable external source** — o Connector está fora do ar: módulos que dependem dele mostram estado honesto de indisponibilidade (mesmo padrão já usado em `AdminContentOSUnavailableState` para 503 internos), nunca erro genérico nem tela em branco.
- **Degraded connector** — funciona parcialmente (ex.: leitura ok, eventos atrasados): reportado via `health` do Connector, nunca escondido.
- **Disable integration** — desligar um Connector é sempre possível e nunca é destrutivo (ver Data Ownership abaixo).
- **Manual fallback** — quando um dado automatizado falha, deve existir um caminho manual equivalente (ex.: entrada manual de um Work Item que normalmente viria de um evento de Connector).
- **Retry/recovery** — falhas transitórias devem ter uma política de retry conhecida, não silenciosa e não infinita.
- **Audit trail** — toda falha e toda tentativa de recovery fica registrada (mesmo princípio de auditabilidade já exigido do External Pilot Core).
- **Support escalation** — uma falha não resolvida automaticamente tem um caminho claro até o canal de suporte do piloto.
- **Data preservation** — nenhuma falha de Connector pode apagar dado já existente no LOKAT OS (mesmo princípio de Data Ownership abaixo, aplicado a falhas, não só a desconexão deliberada).
- **Exit/rollback** — se o piloto for descontinuado, existe um caminho definido para o cliente levar seus dados (nunca ficam presos).

## Data Ownership

Princípio não-negociável: **dados da empresa pertencem à empresa.** Um
Connector desligado, revogado, ou com erro:
- nunca apaga dados já sincronizados no LOKAT OS;
- nunca corrompe o estado local;
- nunca bloqueia o acesso do cliente aos PRÓPRIOS dados já existentes no LOKAT OS.

LOKAT OS atua como Control Plane — orquestra e centraliza contexto, não
"possui" o dado de origem do cliente.

## Segurança — quatro dimensões que não devem ser confundidas

| Dimensão | Pergunta que responde |
|---|---|
| Authorization | Este usuário pode fazer esta ação no LOKAT OS? |
| Client Visibility | Este dado pode aparecer para o cliente final? |
| Connector Access | Este Connector pode ler/escrever este tipo de dado? |
| AI Access | A IA pode incluir este dado no contexto que monta? |

Flags conceituais possíveis por dado: `internal_only`,
`client_visible`, `connector_readable`, `connector_eventable`,
`future_commandable`. Nenhuma dessas quatro dimensões substitui as
outras — um dado pode ser `client_visible` e ainda assim
`connector_readable: false` (ex.: margem interna calculada a partir de
dados do cliente, mas nunca reexportada).

## O que NÃO fazer

- Não implementar nenhum endpoint desta lista nesta sprint.
- Não criar tabela `integration_connections` (já proposta e `BLOQUEADO` em `LOKAT_TENANCY_MAPPING.md`, aguardando aprovação — este documento não muda esse status).
- Não hardcodar nome de cliente/schema no core.
- Não usar o termo "Provider" para este conceito no código (reservado para `src/lib/providers/*`, propósito diferente) — usar "Connector".
