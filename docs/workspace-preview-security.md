# Segurança do modo de visualização (preview) — Workspaces 1.0.2

Criado no hotfix 1.0.1 do Sprint Workspaces, para fechar e documentar a
lacuna divulgada na Sprint 1.0: o preview era visualmente somente-leitura,
mas o backend nunca impedia uma mutação real. Atualizado no hotfix 1.0.2
(cobertura completa de mutações, chave de assinatura isolada, defesa em
profundidade no proxy, UX de falha do preview). Este documento descreve o
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
(`src/lib/workspaces/preview-session.ts`). A URL `/admin/visualizar` não
recebe mais nenhum parâmetro de autorização — ela só lê o cookie.

**Chave de assinatura (Fase 2 do hotfix 1.0.2):** a 1.0.1 assinava o token
com `META_APP_SECRET` diretamente — o mesmo segredo usado para assinar o
`state` do OAuth da Meta em outro módulo. Isso significa que um leak de uma
chave comprometia a outra. `getWorkspacePreviewSigningKey()` agora resolve
a chave nesta ordem:

1. `WORKSPACE_PREVIEW_SECRET` (variável dedicada), se configurada — usada
   como está, em qualquer ambiente.
2. Fora de Production real (`VERCEL_ENV !== "production"`): uma subchave
   derivada via **HKDF-SHA256** a partir de `META_APP_SECRET` (contexto fixo
   `"lokat-workspace-preview-v1"`, salt estável não-secreto) — nunca o
   segredo bruto. Um leak desta chave derivada não permite forjar nada que
   dependa de `META_APP_SECRET` diretamente.
3. Em Production real sem `WORKSPACE_PREVIEW_SECRET`: **falha fechado**,
   lançando `WorkspacePreviewSigningKeyUnavailableError` — nenhum preview
   pode ser criado ou verificado até o segredo dedicado ser configurado.
   `verifyPreviewSessionToken()` captura esse erro e devolve
   `{ ok: false, reason: "key_unavailable" }` em vez de deixá-lo escapar —
   ela é chamada em toda leitura de `getWorkspacePreviewContext()`, então
   nunca pode derrubar um request não relacionado.

**Ação pendente antes de qualquer uso em Production:** configurar
`WORKSPACE_PREVIEW_SECRET` na Vercel. Nenhuma variável de ambiente foi
alterada nesta sprint — isso é uma ação futura documentada, não executada.

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

## Rotas mutáveis reais protegidas (29 arquivos, 33 handlers)

Ver `docs/workspace-mutation-inventory.md` para a lista completa,
classificação módulo a módulo, e o raciocínio de reachability. Resumo por
módulo: Clientes (6 rotas — criar, editar, convite, hard-delete, restore,
bulk-delete), REC OS (6 — rascunhos, aprovação, produção, rec-projects),
Relatórios (2 — upload, interpretação IA), Equipe (2 — convite,
delete-test-account), Integrações (4 — OlaClick conectar/editar/testar,
Meta vincular/desvincular), Financeiro (6 — pagamentos, cobrança, cupons,
checkout de plataforma), chamadas de IA (4 — briefing, legenda,
diagnóstico, busca do dashboard, protegidas por serem "chamada externa"
mesmo sem persistência).

## Defesa em profundidade no proxy (Fase 6 do hotfix 1.0.2)

`src/proxy.ts` (Proxy roda em runtime Node.js por padrão nesta versão do
Next.js — confirmado em `node_modules/next/dist/docs`, então reusa
`verifyPreviewSessionToken()` diretamente, sem duplicar criptografia).
Bloqueia com 403 `WORKSPACE_PREVIEW_READ_ONLY` qualquer `POST`/`PUT`/
`PATCH`/`DELETE` para os namespaces `/api/admin/`, `/api/client/`,
`/api/team/`, `/api/payments/`, `/api/olaclick/`, `/api/meta/`,
`/api/billing/`, `/api/ai/` sempre que o cookie de preview for
criptograficamente válido — **sem consultar o Supabase**, verificação
puramente local e rápida. Duas exceções documentadas:
`/api/admin/workspaces/preview` (o próprio entrar/sair do preview) e
`/api/billing/coupons/validate` (nunca persiste nada).

Este bloqueio é **complementar**, não substitui o guard por rota — é uma
rede de segurança contra uma rota mutável futura que ainda não tenha
`withMutationProtection`. Verificado de ponta a ponta contra um servidor
local real (ver `src/lib/workspaces/__tests__/proxy-guard.e2e.test.ts`):
POST com cookie válido → 403 com o código certo; POST sem cookie, GET,
HEAD, OPTIONS, os dois exemptos, um cookie expirado e um cookie malformado
→ nenhum bloqueado, nenhum 500.

## Rota de demonstração removida (Fase 3 do hotfix 1.0.2)

`/api/admin/workspaces/preview-mutation-check`, criada na 1.0.1 só para
provar que o wrapper funcionava, foi **removida** da árvore de rotas —
nenhuma referência a ela existia em nenhum componente. O guard agora é
testado via `proxy-guard.e2e.test.ts` (contra uma rota real já protegida)
em vez de uma rota de diagnóstico dedicada e mutável.

## Limitações declaradas (não corrigidas nesta sprint)

- **Páginas reais não são "preview-aware".** As páginas reais (ex.:
  `/admin/contentos/criar`) não sabem que estão sendo acessadas a partir de
  um preview — não desabilitam botões de salvar nem mostram um aviso
  dedicado de antemão. O bloqueio de escrita funciona de qualquer forma,
  porque o guard está no servidor e independe da UI. A tela de criação
  guiada de conteúdo (Fase 15 do hotfix 1.0.2) agora mapeia especificamente
  o `code: "WORKSPACE_PREVIEW_READ_ONLY"` para "Esta ação está indisponível
  no modo de visualização." — mas isso só acontece depois de uma tentativa
  de salvar falhar, nunca antes.
- **Sem teste automatizado de ponta a ponta do guard por rota.** O guard
  completo (`assertWorkspaceMutationAllowed`) e o resolvedor de contexto
  (`getWorkspacePreviewContext`) dependem de `cookies()`, Supabase e uma
  sessão autenticada real — não têm teste automatizado; precisam de um
  servidor com login real de super_admin, ou de um framework de teste com
  suporte a mocks (nenhum dos dois disponível neste sandbox). O que É
  testável sem login real (a camada de token e o bloqueio do proxy, que não
  consulta o Supabase) tem 49 asserções reais rodando neste hotfix — ver
  `src/lib/workspaces/__tests__/`.
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
`project-status.ts` — hoje ela é `qa_pending`. Um acesso de suporte para um
papel que não seja super_admin herdaria as mesmas lacunas de cobertura.

## Fluxo de saída

`DELETE /api/admin/workspaces/preview` limpa o cookie (`maxAge: 0`) e nunca
toca a sessão de autenticação do Supabase — sair de um preview não desloga
ninguém. Dois pontos da UI chamam essa rota antes de navegar: o botão
"Painel ADM" (`workspace-exit-button.tsx`, sempre visível para super_admin,
funciona mesmo sem preview ativo — é um DELETE idempotente) e "Sair da
visualização" no banner (`workspace-preview-banner.tsx`, só aparece durante
um preview ativo).

**Cookie inválido/expirado/revogado (Fase 17 do hotfix 1.0.2):** antes, um
cookie stale ficava no navegador indefinidamente (funcionalmente inerte,
mas nunca limpo até o usuário clicar em "Sair"). Agora,
`/admin/visualizar/page.tsx` renderiza `<ClearInvalidPreviewCookie />`
sempre que `getWorkspacePreviewContext()` resolve para `invalid`, `expired`
ou `revoked` — um client component que dispara o mesmo `DELETE` assim que
monta. `inactive` (nenhum cookie presente) não dispara nada.

**Falha ao iniciar um preview (Fase 16 do hotfix 1.0.2):** antes, o
switcher fechava o menu silenciosamente quando `POST` retornava
`ok: false`. Agora o menu permanece aberto, mostra uma mensagem — específica
para razões conhecidas e seguras (`client_not_found`,
`no_active_agency_relationship`, `forbidden_not_super_admin`, etc.) ou
genérica ("Não foi possível abrir esta visualização.") caso contrário —
preserva a seleção e permite tentar de novo. Nunca navega, nunca expõe
stack trace ou detalhe de banco.

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

- [ ] `WORKSPACE_PREVIEW_SECRET` configurado na Vercel (obrigatório para
      Production — sem ele, `getWorkspacePreviewSigningKey()` falha fechado
      e nenhum preview pode ser criado).
- [ ] `workspace_mutation_coverage_check` (`npm run check:workspace-mutations`)
      rodando limpo, e `docs/workspace-mutation-inventory.md` revisado.
- [ ] QA local manual confirmando 403 (não 500) em cada rota protegida
      durante um preview ativo, com uma sessão real de super_admin.
- [ ] `DRAFT-support-access-grants.sql` revisado (numeração final,
      políticas RLS reais) antes de aplicar.
- [ ] Nenhum `SupportAccessGrant` real pode ser criado enquanto
      `workspace_preview_mutation_enforcement` não estiver `validated`.
