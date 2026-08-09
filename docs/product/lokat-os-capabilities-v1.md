# LOKAT OS — Capability Registry v1

**Sprint:** Recalibração LOKAT OS 2026-08
**Status:** Formalização conceitual. Nenhum gating novo implementado.

## O que já existe (auditado)

Dois mecanismos de gating já existem e **não devem ser duplicados**:

1. **`WorkspaceCapability`** (`src/config/workspace-capabilities.ts`) — gating por SURFACE (`super_admin`/`agency`/`direct_business`/`agency_client`), aplicado via `WorkspaceCapabilityGate`. Responde "que tipo de conta é essa" — não "que plano essa conta pagou".
2. **Feature flags** (`src/lib/feature-flags.ts`, documentado em `docs/architecture/LOKAT_PROVIDER_ARCHITECTURE.md`) — liga/desliga providers internos (`editor_os`, `crm_inbox`, `social_scheduler`...) por ambiente/role, não por plano pago.
3. **`profiles.plan`** (`comunidade | start | pro | agencia`, documentado em `LOKAT_TENANCY_MAPPING.md`) — já existe o CAMPO de plano, mas auditoria não encontrou um registry de capabilities por plano conectado a esse campo — hoje o plano é armazenado, não necessariamente aplicado de forma central.

**Decisão desta sprint:** a nova camada de capabilities (MVP/Premium) é
um TERCEIRO EIXO, ortogonal aos dois primeiros — não os substitui:

```
SURFACE capability   → "que tipo de conta é essa" (já existe)
FEATURE FLAG         → "esse motor está ligado neste ambiente" (já existe)
PLAN capability       → "o plano contratado inclui isso" (NOVO, conceitual)
```

Um módulo real pode precisar checar as três: é `direct_business`
(surface) + o motor está `active` (feature flag) + o plano inclui
`rec_os.enabled` (plan capability).

## Catálogo conceitual de plan capabilities

Nomes não são finais — são o ponto de partida para o registry real.

```
companies.max
projects.max

crm.basic
crm.ai
crm.advanced

rec_os.enabled

financial.basic
financial.advanced

analytics.basic
analytics.advanced

integrations.max
integrations.advanced

automation.level

documents.enabled

growth.enabled

inventory.enabled

purchasing.smart
```

## Onde isso se conecta ao que já existe

O mecanismo de GATE (`WorkspaceCapabilityGate`) já é reaproveitável —
seu design (checar uma capability nomeada, nunca `role === "x"`
espalhado) é exatamente o padrão certo para plan capabilities também.
A recomendação técnica (não implementada nesta sprint) é estender esse
componente para aceitar checagem combinada de surface + plan capability,
em vez de criar um segundo componente de gate paralelo.

## Não fazer

- Não implementar o registry de plan capabilities nesta sprint.
- Não conectar `profiles.plan` a nenhum gate real ainda.
- Não assumir os nomes acima como finais — são candidatos para validação com o time comercial.
