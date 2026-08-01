# Navegação interna autenticada — Sprint Navegação e Experiência 3.0.1.2

## O bug relatado

Usuário autenticado (admin/super_admin) clicava em "Calendário Global" ou
"REC OS" e caía no login, mesmo com sessão válida.

## Causa raiz encontrada (auditoria de código, Fase 1)

`requireAdminContentOSContext()` (`src/lib/admin-contentos-api.ts`) retorna
um `NextResponse` (nunca lança) em 4 casos:

| Status | Motivo real |
|---|---|
| 503 | `SUPABASE_SERVICE_ROLE_KEY` ausente/serviço indisponível |
| 401 | Sessão realmente ausente (`auth.getUser()` retornou null) |
| 401 | Perfil não encontrado |
| 403 | Role não é admin/super_admin |

`src/app/admin/calendario/page.tsx` e `src/app/admin/contentos/page.tsx`
(o hub principal do REC OS) faziam:

```ts
if (ctx instanceof Response) redirect("/login");
```

Ou seja: **qualquer** uma das 4 causas virava "vá para o login" — inclusive
503 (config ausente) e 403 (sem permissão), que nunca são "sessão
inválida". Confirmado ao vivo: `SUPABASE_SERVICE_ROLE_KEY` está
genuinamente ausente em `.env.local` neste ambiente local (`grep -c
"^SUPABASE_SERVICE_ROLE_KEY=" .env.local` → 0), então **toda** requisição
a essas duas rotas batia 503 e caía no login — para qualquer admin, com
qualquer sessão, sempre.

## Correção

Só `ctx.status === 401` ainda chama `redirect("/login")`. 403/503 renderizam
`AdminContentOSUnavailableState` (`src/components/admin-contentos-unavailable-state.tsx`)
— nunca menciona service role, env ou credencial; oferece "Tentar
novamente" (mesma URL) e "Voltar ao Dashboard".

## "REC OS ou caminho relacionado à criação"

Investigado: `/admin/contentos/criar` e `/admin/contentos/editor-os` não
tinham esse defeito — `criar/page.tsx` nunca usa
`requireAdminContentOSContext()` (usa `createServerSupabaseClient()`
direto, com fallback gracioso); `editor-os/page.tsx` só redireciona ao
login em ausência **real** de `user`. O defeito real estava
especificamente no **hub** `/admin/contentos` (o link "REC OS" da
sidebar/bottom-nav/quick action aponta para lá).

## Auditoria de links absolutos/hardcoded

Nenhum link interno usa `www.lokat.com.br` ou `127.0.0.1:3100` fixo.
`window.location.assign`/`.href` legítimos encontrados (nunca para rota
interna comum, sempre navegação relativa ou destino já validado):

- `admin/calendario/_client-content.tsx` — troca de filtro cliente/fonte, mesma página.
- `workspace-view-switcher.tsx` — `body.destination` vem de uma resposta de API já validada no servidor.
- `inline-client-picker.tsx` — troca de cliente, mesma página.

Nenhum caso encontrado apontando para produção a partir do ambiente local.
