# Segurança do modo de visualização (preview) — Workspaces 1.0.1

Criado no hotfix 1.0.1 do Sprint Workspaces, para fechar e documentar a
lacuna divulgada na Sprint 1.0: o preview era visualmente somente-leitura,
mas o backend nunca impedia uma mutação real. Este documento descreve o
desenho atual, o que ele cobre, e o que ainda não cobre.

## Preview ≠ impersonation

Entrar em "Visualizar como" nunca troca a sessão de autenticação do Super
Admin, nunca gera um token de outro usuário, nunca chama `signInAs` ou
equivalente. O Super Admin continua logado como ele mesmo o tempo todo — o
que muda é apenas um cookie adicional (`lokat_workspace_preview`) que outras
partes do sistema passam a consultar para saber "estou dentro de um preview
agora, e qual".

## Contexto server-side: cookie assinado, nunca a URL

Antes (Sprint 1.0): `/admin/visualizar?preview_surface=...&workspace_id=...`
— qualquer um que soubesse editar a URL podia tentar forjar um preview.

Agora (1.0.1): `POST /api/admin/workspaces/preview` grava um cookie
`HttpOnly`, `SameSite=Lax`, assinado com HMAC-SHA256
(`src/lib/workspaces/preview-session.ts`, reaproveitando `META_APP_SECRET` —
nenhuma variável de ambiente nova foi criada). A URL `/admin/visualizar` não
recebe mais nenhum parâmetro de autorização — ela só lê o cookie.

O payload do token (`PreviewSessionPayload`) contém `uid`, `surface`,
`workspaceId`, `parentWorkspaceId`, `isBlueprint`, um nonce, `iat`/`exp` e
uma versão de schema. **Deliberadamente não existe um campo `readOnly`** —
um preview ativo É somente leitura, sempre; não há booleano para adulterar
porque não há nada para ler além de "existe um preview válido ou não".

Toda leitura do cookie (`getWorkspacePreviewContext()`,
`src/lib/workspaces/context.ts`) revalida do zero, a cada request:

1. A assinatura do token (HMAC, comparação em tempo constante).
2. A expiração (2 horas desde a emissão).
3. Que o usuário autenticado atual ainda é o mesmo `uid` do token.
4. Que esse usuário ainda tem `profiles.role = 'super_admin'` — se o papel
   foi revogado depois de o preview começar, o contexto morre nesse mesmo
   request (`status: "revoked"`).
5. Para workspaces reais (não blueprint): que o workspace ainda existe e que
   a relação (ex.: cliente pertence à agência) ainda é válida, via
   `resolveWorkspacePreview()` — a mesma função que validou na entrada.

Qualquer falha em qualquer um desses passos retorna um status explícito
(`inactive` | `invalid` | `expired` | `revoked`) e **nunca** um contexto
ativo por omissão — fail-closed.

## O guard de mutação

`assertWorkspaceMutationAllowed()` (`src/lib/workspaces/assert-not-preview.ts`)
é a função que qualquer rota mutável deveria chamar antes de tocar no
Supabase, disparar e-mail ou chamar uma integração externa. Ela:

- Não recebe nenhum parâmetro do chamador.
- Chama `getWorkspacePreviewContext()` internamente.
- Se não houver preview ativo (`status !== "active_read_only"`), deixa a
  mutação prosseguir (retorna `null`).
- Se houver, registra o evento `workspace_preview_mutation_blocked` (ver
  seção de auditoria) e responde `403` com
  `{ error: "...", code: "WORKSPACE_PREVIEW_READ_ONLY" }` — nunca `500`.

`withMutationProtection(handler)` é o wrapper de conveniência usado nas
rotas reais: roda o guard primeiro, e só chama o handler original se ele
liberar.

```ts
export const POST = withMutationProtection(async function POST(req) {
  // ... lógica real da rota, inalterada ...
});
```

Como o guard deriva o bloqueio inteiramente do cookie assinado — nunca de um
campo do corpo da requisição, query string ou header — não existe nenhum
valor que o cliente possa enviar para desativar o bloqueio. A versão anterior
(Sprint 1.0) aceitava um booleano `readOnly` vindo do chamador; essa versão
foi removida.

## Rotas mutáveis reais já protegidas nesta sprint (12)

Amostra representativa, priorizada pelo que é alcançável a partir das três
superfícies de preview (Agência, Cliente da agência, Empresa direta) — não
uma varredura completa do projeto:

| Módulo | Rota | Método(s) |
|---|---|---|
| Clientes | `/api/admin/clients` | POST |
| Clientes | `/api/admin/clients/[id]/invite` | POST |
| REC OS | `/api/admin/contentos/actions/send-to-approval` | POST |
| REC OS | `/api/admin/contentos/actions/send-to-production` | POST |
| REC OS | `/api/admin/contentos/drafts` | POST |
| REC OS | `/api/admin/contentos/drafts/[id]` | PATCH |
| Equipe | `/api/team/invite/send-email` | POST |
| Integrações | `/api/olaclick/connect` | POST, DELETE |
| Integrações | `/api/olaclick/connections/[id]` | PATCH |
| Financeiro | `/api/payments/manual-confirm` | POST |
| Financeiro | `/api/payments/create-charge` | POST |
| Financeiro | `/api/payments/asaas/create-charge` | POST |

## Limitações declaradas (não corrigidas nesta sprint)

- **Cobertura parcial.** Dezenas de outras rotas mutáveis reais — Meu
  Negócio (Empresa, DNA, SWOT, Metas, Produto, Serviço, Campanha,
  Precificação, Fluxo de Caixa), CRM (leads), billing/coupons,
  rec-projects — não foram retrofitadas. Ver
  `workspace_preview_mutation_enforcement` em `project-status.ts` para a
  lista completa de pendências.
- **Páginas reais não são "preview-aware".** As páginas reais (ex.:
  `/admin/contentos/criar`) não sabem que estão sendo acessadas a partir de
  um preview — não desabilitam botões de salvar nem mostram um aviso
  dedicado. O bloqueio de escrita funciona de qualquer forma, porque o guard
  está no servidor e independe da UI, mas a experiência de erro é genérica
  (ex.: a tela de criação guiada de conteúdo já mapeia HTTP 403 para "Seu
  usuário não possui permissão para salvar este conteúdo", que não é
  tecnicamente errado, mas também não diz "você está em modo de
  visualização").
- **Sem teste automatizado de ponta a ponta.** O projeto não tem um test
  runner instalado (nenhum jest/vitest em `package.json`). O único teste
  automatizado desta sprint (`src/lib/workspaces/__tests__/preview-session.test.ts`,
  28 asserções, roda com `node` puro graças ao suporte nativo a TypeScript do
  Node 24) cobre a camada de assinatura/verificação do token — a única parte
  sem dependência de `cookies()`, Supabase ou uma sessão autenticada. O guard
  completo e o resolvedor de contexto não têm teste automatizado; precisam de
  um servidor rodando com uma sessão real de super_admin, ou de um framework
  de teste com suporte a mocks (nenhum dos dois disponível neste sandbox).
- **Nenhuma verificação em navegador.** O comportamento visual do banner e
  do switcher (persistência entre navegações, comportamento mobile) foi
  revisado por leitura de código, não por um teste manual em navegador —
  este sandbox não tem uma sessão de login real para abrir `/admin`.

## Blueprints permanecem sempre somente leitura

IDs de blueprint (`blueprint-agency-01`, etc., `src/lib/workspaces/blueprint-fixtures.ts`)
nunca correspondem a uma linha real no banco — não existe cliente, agência
ou UUID real com esse formato. `getWorkspacePreviewContext()` trata blueprints
num ramo separado que nunca consulta o Supabase para resolvê-los; o guard de
mutação bloqueia do mesmo jeito (deriva só de "há preview ativo", não de "é
um workspace real"), então uma tentativa de mutação durante um preview de
blueprint recebe o mesmo 403 que uma tentativa num workspace real.

## Acesso de suporte futuro (SupportAccessGrant)

O contrato de tipos e o rascunho de schema
(`docs/supabase/DRAFT-support-access-grants.sql`) continuam não aplicados.
**Pré-condição explícita, adicionada nesta sprint**: nenhum
`support_access_grants` real pode ser criado enquanto a área
`workspace_preview_mutation_enforcement` não estiver `validated` em
`project-status.ts` — hoje ela é `qa_pending` e cobre apenas as 12 rotas
listadas acima. Um acesso de suporte para um papel que não seja super_admin
herdaria as mesmas lacunas de cobertura.

## Fluxo de saída

`DELETE /api/admin/workspaces/preview` limpa o cookie (`maxAge: 0`) e nunca
toca a sessão de autenticação do Supabase — sair de um preview não desloga
ninguém. Dois pontos da UI chamam essa rota antes de navegar: o botão
"Painel ADM" (`workspace-exit-button.tsx`, sempre visível para super_admin,
funciona mesmo sem preview ativo — é um DELETE idempotente) e "Sair da
visualização" no banner (`workspace-preview-banner.tsx`, só aparece durante
um preview ativo).

## Log de auditoria (contrato, não persistido)

`src/lib/workspaces/audit-log.ts` define 4 eventos —
`workspace_preview_started`, `workspace_preview_ended`,
`workspace_preview_expired`, `workspace_preview_mutation_blocked` — e uma
função `recordWorkspaceAuditEvent()` já chamada nos 4 pontos reais
correspondentes. Ela **não grava em nenhuma tabela**: hoje só emite
`console.info("[workspace_audit]", JSON.stringify(evento))`. Nenhum dado
sensível (token, cookie) é logado. Trocar por persistência real é trabalho
futuro, dependente de schema aprovado (provavelmente reaproveitando a mesma
migration de `support_access_grants`, já que os dois têm o mesmo dono
lógico: rastrear quem viu o quê e por quanto tempo).

## Checklist de pré-provisionamento

Antes de qualquer provisionamento real (ver
`docs/workspace-provisioning-plan.md`):

- [ ] `workspace_preview_mutation_enforcement` revisado e, se cobertura
      total for exigida, ampliado além das 12 rotas atuais.
- [ ] QA local manual confirmando 403 (não 500) em cada rota protegida
      durante um preview ativo, com uma sessão real de super_admin.
- [ ] `DRAFT-support-access-grants.sql` revisado (numeração final,
      políticas RLS reais) antes de aplicar.
- [ ] Nenhum `SupportAccessGrant` real pode ser criado enquanto
      `workspace_preview_mutation_enforcement` não estiver `validated`.
