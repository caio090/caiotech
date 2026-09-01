# Inventário de mutações — Workspaces 1.0.2

Criado na Fase 4 do hotfix 1.0.2. Levantamento manual (grep sistemático por
`export async function POST|PUT|PATCH|DELETE`, `.insert(`, `.update(`,
`.upsert(`, `.delete(`, chamadas a `fetch("/api...")` a partir das páginas
reais, e checagem de role/link) sobre toda a árvore `src/app/api` e as
páginas reais reachable a partir dos três previews. **Nenhum script
estático substitui esta revisão manual** — ver `workspace_mutation_coverage_check`
(Fase 18) para o que a heurística automatizada consegue e não consegue
provar sozinha.

## Como "alcançável pelo preview" foi definido

O guard (`assertWorkspaceMutationAllowed`) deriva o bloqueio do cookie de
sessão, que é **global ao navegador**, não escopado à aba ou à página do
shell de demonstração (`/admin/visualizar`). Por isso "alcançável" aqui
significa: **qualquer rota que o navegador autenticado do Super Admin possa
invocar enquanto um preview estiver ativo** — não apenas os cards com `href`
funcional no shell de demonstração hoje. Duas consequências práticas:

- Cards do shell com `href: null` (ex.: "Clientes" na superfície Agência)
  ainda contam como alcançáveis, porque a página real de gestão de clientes
  já existe e é navegável por URL direta — o card desabilitado é uma
  limitação de UI do shell de demonstração, não uma barreira de segurança.
- Uma rota só é `not_reachable_from_preview` quando não existe **nenhum**
  link, em nenhuma página real usada pelos três módulos que os previews
  expõem, apontando para ela — tipicamente porque é uma ferramenta de
  plataforma (`/admin/super/*`) sem qualquer relação com um workspace
  específico.

## Legenda de classificação

| Classificação | Significado |
|---|---|
| `protected` | Envolvida em `withMutationProtection`; 403 durante preview. |
| `demo_memory_only` | Não persiste em lugar nenhum — React state apenas. |
| `not_reachable_from_preview` | Sem link de nenhuma página usada pelos previews. |
| `read_only_operation` | Não faz insert/update/upsert/delete apesar de método POST. |
| `excluded_with_reason` | Webhook inbound ou ponto de entrada/saída do próprio preview. |

## Rotas protegidas nesta sprint (16 novas + 12 da 1.0.1 = 28 arquivos, 32 handlers)

| Arquivo | Métodos | Módulo | Motivo |
|---|---|---|---|
| `api/admin/clients/route.ts` | POST | Clientes | 1.0.1 |
| `api/admin/clients/[id]/invite/route.ts` | POST | Clientes | 1.0.1 |
| `api/admin/contentos/actions/send-to-approval/route.ts` | POST | REC OS | 1.0.1 |
| `api/admin/contentos/actions/send-to-production/route.ts` | POST | REC OS | 1.0.1 |
| `api/admin/contentos/drafts/route.ts` | POST | REC OS | 1.0.1 |
| `api/admin/contentos/drafts/[id]/route.ts` | PATCH | REC OS | 1.0.1 |
| `api/team/invite/send-email/route.ts` | POST | Equipe | 1.0.1 |
| `api/olaclick/connect/route.ts` | POST, DELETE | Integrações | 1.0.1 |
| `api/olaclick/connections/[id]/route.ts` | PATCH | Integrações | 1.0.1 |
| `api/payments/manual-confirm/route.ts` | POST | Financeiro | 1.0.1 |
| `api/payments/create-charge/route.ts` | POST | Financeiro | 1.0.1 |
| `api/payments/asaas/create-charge/route.ts` | POST | Financeiro | 1.0.1 |
| `api/admin/clients/[id]/route.ts` | PATCH, DELETE | Clientes | Real, navegável por URL direta mesmo com card desabilitado no shell |
| `api/admin/clients/[id]/hard-delete/route.ts` | DELETE | Clientes | Apaga cliente definitivamente — alto risco |
| `api/admin/clients/[id]/restore/route.ts` | POST | Clientes | Idem |
| `api/admin/clients/bulk-delete/route.ts` | POST | Clientes | Idem, em lote |
| `api/admin/rec-projects/[id]/route.ts` | DELETE | REC OS | Apaga projeto real |
| `api/admin/reports/interpret/route.ts` | POST | Relatórios | Linkado de `/admin/relatorios` (não é a "Relatórios adaptativos" pausada — feature pré-existente na main) |
| `api/admin/reports/uploads/route.ts` | POST | Relatórios | Idem — grava upload + insere metadado |
| `api/meta/assets/link/route.ts` | POST, DELETE | Integrações | Vincula/desvincula ativo Meta real |
| `api/olaclick/test/route.ts` | POST | Integrações | Atualiza status/last_sync da conexão + chamada externa |
| `api/admin/billing/coupons/route.ts` | POST | Financeiro | Linkado de "Abrir Billing →" no card Financeiro |
| `api/admin/billing/coupons/[id]/route.ts` | PATCH, DELETE | Financeiro | Idem |
| `api/ai/briefing/route.ts` | POST | REC OS | Chamada externa (OpenAI), sem persistência — protegida por "chamada externa" |
| `api/ai/dashboard-search/route.ts` | POST | Global (header admin) | Idem |
| `api/ai/diagnostico/route.ts` | POST | Meu Negócio | Idem |
| `api/ai/legenda/route.ts` | POST | REC OS | Idem |
| `api/meu-negocio/ai/analyze/route.ts` | POST | Meu Negócio | Chamada externa (OpenAI) do Assistente LOKAT — Sprint Meu Negócio 2.1.2 aplicou `withMutationProtection` (faltava desde a sprint que criou a rota); side effect e custo mesmo sem persistência, por isso "protected" e não "read_only_operation" |
| `api/billing/checkout/route.ts` | POST | Financeiro (plataforma) | Side effect financeiro real (cria checkout session) |
| `api/admin/users/delete-test-account/route.ts` | DELETE | Equipe | Linkado de `/admin/equipe` — alteração de autenticação (hard delete de usuário) |
| `api/jarvis/chat/route.ts` | POST | Jarvis (Sprint MVP Experience Completion V0.1) | Chamada externa (OpenAI Responses API, streaming), sem persistência — protegida por "chamada externa", mesmo padrão de `api/ai/*` |
| `api/jarvis/transcribe/route.ts` | POST | Jarvis | Chamada externa (OpenAI Whisper); áudio processado só em memória, nunca gravado |
| `api/jarvis/speech/route.ts` | POST | Jarvis | Chamada externa (OpenAI TTS); áudio de saída devolvido direto ao browser, nunca persistido |
| `api/studio/skills/execute/route.ts` | POST | REC OS > Studio (Sprint REC OS Studio Foundation V0.2) | Chamada externa (OpenAI Responses API, texto estruturado via json_schema) da skill Vidigal PNG; sem persistência (nenhuma tabela nova), sem geração de imagem — mesmo padrão "chamada externa" de `api/jarvis/*`/`api/meu-negocio/ai/analyze` |

## Meu Negócio — `demo_memory_only`, confirmado por inspeção

`src/app/admin/meu-negocio/page.tsx` já documenta no próprio topo do arquivo:
"this first vertical slice runs entirely in demo mode: no Supabase reads or
writes, no persistence." Confirmado via grep: nenhuma das 10 abas
(`_business-tab`, `_products-tab`, `_pricing-tab`, `_campaign-tab`,
`_cashflow-tab`, `_overview-tab`, `_glossary-tab`, `_sources-tab`,
`_client-content`, `_shared`) referencia `supabase`, `fetch("/api`,
`.insert(`, `.update(` ou `localStorage`. Um banner "Modo demonstração"
**já é sempre visível** em `_client-content.tsx`, informando "Nada aqui é
salvo — os dados existem apenas durante esta sessão da página." Nenhuma
mudança de código foi necessária — o requisito da Fase 8 já estava
satisfeito antes desta sprint começar.

## Financeiro (`/admin/financeiro`) — `read_only_operation`

A página é puramente informativa (KPIs com valor fixo "—", badges "demo"),
sem nenhum campo editável. As únicas mutações financeiras reais são as 6
rotas de pagamento/cobrança já listadas na tabela acima.

## CRM — `not_reachable_from_preview`, confirmado por ausência

Não existe nenhuma capability `crm.*` em `src/config/workspace-capabilities.ts`
nem nenhum card CRM/Leads em `src/app/admin/visualizar/_visualizar-shell.tsx`.
A única rota real que insere na tabela `leads`
(`api/leads/typebot/route.ts`) é um webhook inbound do Typebot, nunca
chamado pela nossa UI. O pipeline comercial real vive em
`/operacional/comercial/*`, sob o papel `operacional` — um papel
completamente diferente dos três previews desta sprint, sem nenhuma ponte
de navegação entre eles. **Se um card CRM for adicionado a uma superfície de
preview no futuro, esta classificação precisa ser revisada antes desse
card ir ao ar.**

## Não protegidas — `not_reachable_from_preview`

| Arquivo | Motivo |
|---|---|
| `api/admin/accounts/[id]/classification/route.ts` | Só usada em `/admin/super/accounts` — ferramenta de plataforma, sem link de nenhum preview |
| `api/admin/waitlist/route.ts` | Só usada em `/admin/leads` e `/admin/super/waitlist` — leads de vendas da própria LOKAT, não do cliente |
| `api/billing/coupons/validate/route.ts` | Só usada em `(public)/planos` — fluxo de autoatendimento; além disso não persiste nada (`read_only_operation`) |
| `api/contato/route.ts`, `api/launch/waitlist/route.ts`, `api/marketing-diagnostics/route.ts` | Site público de marketing, fora de `/admin` inteiramente |

## Não protegidas — `excluded_with_reason` (webhooks inbound / próprio preview)

| Arquivo | Motivo |
|---|---|
| `api/leads/typebot/route.ts` | Webhook inbound do Typebot, autenticado por `LOKAT_TYPEBOT_WEBHOOK_SECRET`, nunca chamado pela nossa UI |
| `api/webhooks/billing/[provider]/route.ts` | Webhook inbound de provedor de billing externo |
| `api/webhooks/payments/asaas/route.ts` | Webhook inbound do Asaas |
| `api/webhooks/payments/route.ts` | Webhook inbound genérico de pagamentos |
| `api/admin/workspaces/preview/route.ts` (POST, DELETE) | É o próprio ponto de entrada/saída do preview — exceção estrita exigida pelo ticket |
| `api/admin/workspaces/preview/exit/route.ts` (POST) | Hotfix 1.0.10 — saída atômica dedicada (cookie deletion + HTTP 303 na mesma resposta); mesma natureza da exceção acima, não é uma mutação de dado de negócio |

## Mutações de controle de sessão de preview explicitamente permitidas no runtime (proxy) — Fase 8 do hotfix 1.0.11

Esta tabela é a única fonte de verdade sobre o que o **guard em tempo de execução**
(`src/proxy.ts`, via `shouldBlockMutationInPreview()` em
`src/lib/workspaces/mutation-guard-runtime.ts`) efetivamente deixa passar durante
um preview ativo. A tabela `excluded_with_reason` acima é só a classificação do
script `check-workspace-mutation-coverage.ts` (análise estática de arquivo, sem
efeito em runtime) — **hotfix 1.0.11 encontrou exatamente essa lacuna**: a rota
`api/admin/workspaces/preview/exit/route.ts` foi classificada ali no hotfix 1.0.10,
mas nunca foi adicionada à allowlist real do proxy, que a bloqueava com 403
`WORKSPACE_PREVIEW_READ_ONLY` antes mesmo de o handler ser alcançado.

| Pathname | Método | Motivo | Matcher runtime | Teste associado |
|---|---|---|---|---|
| `/api/admin/workspaces/preview` | POST, DELETE | Entrada/saída original do preview (ativação e limpeza best-effort) | `MUTATION_GUARD_EXEMPT_PATHS` (Set, exceção por path, qualquer método mutante) | `mutation-guard-runtime.test.ts` — "a rota antiga ... continua exempta para POST/DELETE" |
| `/api/admin/workspaces/preview/exit` | **POST somente** | Hotfix 1.0.10/1.0.11 — saída atômica (Set-Cookie + HTTP 303 na mesma resposta); DELETE/PUT/PATCH permanecem bloqueados nesse mesmo path, pois a rota só implementa POST | `isWorkspacePreviewControlMutation()` (exceção exata método+path, não um Set de path) | `mutation-guard-runtime.test.ts` — Cenário A + matriz exaustiva de allow/deny |

Qualquer rota nova adicionada sob os namespaces mutáveis do proxy
(`/api/admin/`, `/api/client/`, `/api/team/`, `/api/payments/`,
`/api/olaclick/`, `/api/meta/`, `/api/billing/`, `/api/ai/`) que precise ser
alcançável durante um preview ativo **deve** ganhar uma linha nesta tabela E uma
asserção correspondente em `mutation-guard-runtime.test.ts` — nunca apenas uma
entrada em `check-workspace-mutation-coverage.ts`, que não tem nenhum efeito
sobre o que o proxy realmente bloqueia.

## Server Actions (Fase 7)

`grep -rl '"use server"' src` não retornou nenhum resultado. **Não existe
nenhuma Server Action no projeto** — todas as mutações passam por Route
Handlers (`src/app/api/**/route.ts`). A Fase 7 do ticket ("aplicar o guard
em server actions") não tem nenhum alvo real hoje; documentado aqui em vez
de silenciosamente ignorado. Se uma Server Action for introduzida no
futuro, `assertWorkspaceMutationAllowed()` deve ser sua primeira operação,
antes de qualquer leitura de formulário — ver a nota da documentação oficial
do Next.js citada em `docs/workspace-preview-security.md`: Proxy não cobre
Server Functions cujo matcher as exclua, então o guard não pode depender só
do proxy.

## Totais

- Arquivos de rota com método mutável: 37 (antes desta sprint, incluindo os
  12 já protegidos na 1.0.1).
- Protegidos ao final da 1.0.2: 29 arquivos / 33 handlers (28 arquivos
  listados acima menos 1 duplicata de contagem + `delete-test-account`
  adicionado após a primeira varredura).
- `not_reachable_from_preview`: 4 arquivos.
- `excluded_with_reason`: 5 handlers (4 webhooks + o próprio endpoint de
  preview).
- `read_only_operation`: 1 arquivo dedicado (`coupons/validate`) + a página
  inteira de Financeiro + a página inteira de Meu Negócio.
- `demo_memory_only`: todo o módulo Meu Negócio (10 arquivos de aba).
- `pending_protection`: **nenhum item permanece sem classificação** — toda
  linha desta tabela tem uma classificação e uma razão.
