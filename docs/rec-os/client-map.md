# Mapa do Cliente — Sprint REC OS 3.0.1 → 3.0.1.1

**Estado: `qa_pending`.** Implementado em `/admin/contentos/mapa-cliente`
(`src/app/admin/contentos/mapa-cliente/page.tsx`) na Sprint REC OS
3.0.1.1.

## O que a tela mostra

Agrega, para um cliente, contagens reais de conteúdos (reaproveita
`getRoadmapItems()`, a mesma fonte do Roadmap — nenhuma segunda consulta
duplicada), aprovações pendentes e tarefas abertas (`approvals`/
`operational_tasks`), próximos prazos, bloqueios (com motivo, derivado do
status canônico) e responsáveis envolvidos. Cada card linca para o módulo
real (Produção, Aprovações, Calendário) — nenhum dado é duplicado na
tela, só resumido e linkado.

## Isolamento — o que foi realmente feito

A página reaproveita **exatamente** os mesmos primitivos já auditados e
usados por Produção/Aprovações: `requireAdminContentOSContext()` (gate de
staff admin/super_admin) + `resolveClientContext()` (valida o `clientId`
da URL contra `clients` reais — um id inválido/adulterado vira o mesmo
estado de erro já usado no resto do REC OS, nunca um crash). Nenhuma
segunda camada de autorização foi inventada.

Para o preview do Super Admin (`getWorkspacePreviewContext()`): quando o
preview é de um workspace `agency_client`/`direct_business`, o
`workspaceId` do preview **sempre vence** sobre qualquer `?client=`
diferente na URL — e a página mostra um badge "Modo de visualização —
somente leitura" (trivialmente verdadeiro, já que a página não tem
nenhuma mutação, para nenhum visitante).

## Limitação honesta

Isolamento diferenciado por **login real** de agência/cliente-da-
agência/empresa-direta (fora do preview do Super Admin) ainda não existe
na plataforma como um todo — é a mesma lacuna já registrada para a bottom
navigation na Sprint REC OS 3.0.1
(`docs/mobile/mobile-app-shell.md`). `/admin/contentos/*` continua sendo
uma área de staff (admin/agência), com o mesmo controle de acesso que já
protege Produção/Aprovações/Roadmap — não um controle novo e mais fraco.
