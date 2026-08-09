# LOKAT Digital Integration Catalog v1

**Sprint:** Gota Neural Foundation V1
**Status:** Documentação executável (`src/lib/neural-core/integrations.ts`, `INTEGRATION_CATALOG_FOUNDATION`). Nenhum adapter real, nenhum SDK instalado.

## Princípio: catálogo, não dependência

Cada entrada abaixo é um `IntegrationDefinition` — documenta que o
LOKAT OS SABE que essa integração existe e para que capabilities ela
serve, nunca que o LOKAT OS DEPENDE dela. Nenhuma marca listada aqui é
importada como pacote/SDK; `futureAdapterKey` é só um identificador
estável reservado para quando um adapter real for construído (sprint
futura, fora deste escopo).

## Categorias e plataformas conhecidas (exemplos, não requisitos)

| Categoria | Plataformas conhecidas | Capabilities |
|---|---|---|
| **ADVERTISING** | Meta Ads, Google Ads, TikTok Ads, Kwai Ads, Taboola | `advertising`, `attribution` |
| **SOCIAL** | Instagram, Facebook, TikTok, YouTube | `social_content` |
| **MESSAGING** | WhatsApp | `messaging` |
| **ATTRIBUTION** | UTMs, Pixels, Conversion APIs, Webhooks, provedores de atribuição (ex.: UTMify) | `attribution` |
| **COMMERCE** | Checkout providers, plataformas de venda/e-commerce | `checkout`, `commerce` |
| **PAYMENTS** | (catálogo aberto — nenhum provider fixo nesta sprint) | `payment` |
| **CRM** | (o CRM canônico do próprio LOKAT OS já cobre isso — ver `docs/crm/canonical-crm-route.md`) | `crm` |
| **ANALYTICS** | (catálogo aberto) | `analytics` |
| **PRODUCTIVITY** | Google Calendar, Google Drive | `calendar`, `documents` |
| **LOCAL_PRESENCE** | Google Business | `local_presence` |
| **STORAGE** | Google Drive | `documents` |
| **GENERIC_CONNECTOR** | Lokat Project Connector (ver `lokat-integration-standard-v1.md`), Webhooks | variável, declarado pelo Manifest |

## Por que nenhuma dessas plataformas é dependência do core

Padrão obrigatório (Fase 32 da sprint):

```
Capability → Integration Definition → Adapter → Connection
```

O Adapter é a ÚNICA camada que, no futuro, importaria um SDK real. O
core (`neural-core`, módulos de produto) nunca fala diretamente com
Meta/Google/WhatsApp/UTMify — fala com a Capability abstrata
(`crm`, `advertising`, `messaging`...) e deixa o Adapter (não
implementado) resolver qual provider concreto está por trás.

## Estado real hoje

`status: "documented"` para a maioria das entradas — só documentação,
sem qualquer implementação. `status: "planned"` para o `lokat_project_connector`
(depende do primeiro piloto externo, ver
`docs/product/lokat-os-mvp-2026-08.md`). Nenhuma entrada tem
`status: "unavailable"` ainda nesta sprint (reservado para quando uma
integração for avaliada e explicitamente descartada).

## Não fazer

- Não instalar nenhum SDK das plataformas listadas.
- Não criar Connection real para nenhuma delas.
- Não tratar esta lista como compromisso de roadmap — é um catálogo de compatibilidade CONCEITUAL, priorização real fica com o roadmap de produto.
