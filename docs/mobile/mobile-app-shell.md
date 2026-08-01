# App Shell Mobile — Sprint REC OS 3.0.1

## Causa raiz principal encontrada: viewport meta ausente

`src/app/layout.tsx` **nunca exportou `viewport`** — confirmado ao vivo:
`curl http://127.0.0.1:3100/` não retornava nenhuma tag
`<meta name="viewport">`. Sem essa tag, o navegador mobile assume a
largura de desktop (padrão do navegador, tipicamente 980px) e escala a
página inteira para caber na tela — a causa mais provável, sozinha, de
boa parte dos sintomas reportados: necessidade de zoom manual após o
login, conteúdo "começando fora da viewport", cards/botões parecendo
maiores que a tela.

Corrigido: `export const viewport: Viewport = { width: "device-width",
initialScale: 1, maximumScale: 5, viewportFit: "cover" }`. `viewportFit:
"cover"` também é necessário para que `env(safe-area-inset-bottom)` (já
usado em `mobile-nav.tsx` e nos novos sheets) funcione de verdade — sem
ele, o navegador ignora essa variável CSS mesmo com o código certo.

## PageHeader — título cortado / botão ultrapassando

`src/components/page-header.tsx`: layout antigo (`flex items-start
justify-between`, sem `flex-wrap` nem stacking) colocava o título e o
botão de ação (ex.: "Ação rápida") competindo pela mesma linha em
qualquer largura. Corrigido para empilhar em coluna até `sm:` (`flex-col
sm:flex-row`) e o título ganhou `min-w-0 truncate` para nunca forçar
overflow do contêiner mesmo com texto longo. Usado por várias páginas
(Dashboard, Relatórios, CRM, etc.) — um fix no componente compartilhado
corrige a causa raiz em todas de uma vez.

## DashboardCard — cards maiores que a viewport

`src/components/dashboard-card.tsx`: o título do card (`span` dentro de um
`flex items-start justify-between`) não tinha `min-w-0`/`flex-1` —
títulos longos ("Solicitações de Equipe", "Projetos em Andamento") podiam
forçar o item flex (e por consequência o card, e a linha do grid) a ficar
mais largo que a coluna do grid disponível. Corrigido com `min-w-0
flex-1 break-words` no título e `flex-shrink-0` no ícone, em ambas as
variantes do componente (padrão e `premium`).

## Bottom navigation por superfície

Ver `docs/mobile/crm-mobile-experience.md` (seção de navegação) e
`src/lib/mobile-shell/types.ts`. `MobileBottomNav` (já existente, robusto:
5 itens no máximo, `env(safe-area-inset-bottom)`, drawer "Mais") ganhou um
prop opcional `surface` que, quando informado, usa
`SURFACE_BOTTOM_NAV_PRIMARY[surface]` em vez do `ADMIN_PRIMARY` fixo
anterior — filtrado sempre contra os itens que a capability do usuário já
libera, nunca concedendo acesso novo.

**Limitação registrada honestamente**: hoje `surface` só é passado com
segurança em dois casos — preview ativo do Super Admin (`previewContext.surface`,
já resolvido no servidor) e a própria sessão real de `super_admin`. Para
sessões reais (fora de preview) de agency/agency_client/direct_business, a
superfície ainda não é resolvida por `_layout-client.tsx` — cai no
comportamento anterior (`ADMIN_PRIMARY` fixo), sem regressão, mas também
sem a diferenciação completa que o ticket pediu para as 4 superfícies.
Resolver isso por completo exigiria threading de `WorkspaceSurface`
através do layout do admin para sessões não-preview, fora do escopo
seguro desta sprint (histórico de 3 hotfixes de produção em resolução de
papel documentados em `project-status.ts::workspace_preview_security`).

## `env(safe-area-inset-bottom)`

Já usado corretamente em `mobile-nav.tsx` antes desta sprint — só não
funcionava por causa da ausência de `viewport-fit=cover` (corrigida
acima). O novo `CrmMobileFilterSheet` também usa a mesma variável no seu
próprio padding inferior.

## Dashboard mobile — grid de 2 colunas

Mantido `grid-cols-2` no dashboard: com o fix de `DashboardCard`
(min-w-0/break-words), 2 colunas de ~187px em 390px são viáveis — forçar
1 coluna desperdiçaria espaço vertical sem necessidade uma vez que a causa
real do overflow (título forçando largura mínima) foi corrigida na raiz.

## Não testado nesta sprint

QA visual real em navegador (Chromium/Playwright) não foi executado — sem
acesso a navegador neste ambiente de execução. As correções acima foram
verificadas por leitura de código, pela confirmação ao vivo da tag
viewport via `curl`, e por `tsc`/build limpos — não por captura de tela
real. QA visual fica para a próxima sprint dedicada de QA local
(Playwright), quando a Sprint REC OS 3.0.1 estiver com commits confirmados.

## Nota — Sprint REC OS 3.0.1.1 (defeito real corrigido + ação rápida/busca)

A auditoria desta sprint encontrou que `SURFACE_BOTTOM_NAV_PRIMARY`
(criado na Sprint REC OS 3.0.1) apontava para três rotas que **não
existiam** em `configs.admin.nav` (`src/components/app-sidebar.tsx`):
`/admin/ecossistema`, `/admin/leads` e `/admin/contentos/aprovacoes`. O
filtro em `mobile-nav.tsx` (que só mostra rotas já autorizadas) as
descartava silenciosamente — na prática, Super ADM tinha só 2 abas fixas
no rodapé em vez de 4, e Cliente da Agência só 3 em vez de 4. Corrigido
registrando as 3 rotas no config real da sidebar (a mesma fonte usada
pelo desktop) — nenhuma segunda lista de rotas foi criada.
`SURFACE_BOTTOM_NAV_ITEMS` (nova fonte tipada — id/label/route/
requiredCapability/activeMatch/priority) substituiu as duas listas
paralelas anteriores; `SURFACE_BOTTOM_NAV_PRIMARY`/`_LABEL` continuam
exportados, derivados dela, para compatibilidade.

"Ação rápida" (`src/components/quick-action-menu.tsx`) deixou de ser um
`<button>` sem `onClick` — agora é um menu real, contextual por
superfície (mesmo par de casos conhecidos com segurança: preview do
Super Admin / sessão real de super_admin). Itens sem rota real (registrar
lead manualmente, adicionar tarefa manualmente, registrar oportunidade de
produto) ficam desabilitados com badge "Em breve" — nunca disparam uma
ação inexistente.

A busca do header (`<input placeholder="Buscar..." />`) nunca teve
`value`/`onChange` — era decorativa em qualquer viewport, não só mobile.
Substituída por `src/components/admin-search-sheet.tsx`: botão real que
abre uma sheet com busca funcional, escopo honesto (só módulos/rotas já
visíveis via `configs.admin.nav` — clientes/conteúdos ainda não são
pesquisáveis).
