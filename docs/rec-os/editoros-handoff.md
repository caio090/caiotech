# Handoff para o EditorOS — Sprint REC OS 3.0.1

## O que já funcionava antes desta sprint (confirmado por leitura)

`handleOpenEditor()` em `_guided-create-flow.tsx` já: garante que o
rascunho está salvo (`persistDraft`) antes de navegar, preserva
`client`/`content_id` na URL, monta `return_to` apontando de volta para o
próprio conteúdo (`/admin/contentos/criar?client=...&content_id=...&step=visual`),
e é restrito a `super_admin`. `EditorOSLandingState`
(`editor-os/page.tsx`) já tem sua própria landing com seletor de cliente —
**nunca abre um canvas genuinamente vazio sem contexto**: sem `client` na
URL, mostra o seletor; com `client`+`content_id`, abre o workspace direto.

## Contrato estruturado (novo, `EditorAssetHandoff`)

`src/lib/rec-os-workflow/types.ts` registra o contrato completo para uso
futuro (workspaceId, clientId, contentId, campaignId, assetId,
assetSource, fileUrl, mimeType, width, height, format, destination,
briefingId, conceptId, copy, restrictions, returnRoute, createdAt) e
`isEditorAssetHandoffReady()` — só considera o handoff pronto quando existe
`assetId` OU `fileUrl` real, nunca abre com os dois vazios.

## Diferença entre o que existe e o contrato

Hoje o handoff real usa parâmetros de URL simples (`client`, `content_id`,
`return_to`) — não o objeto estruturado completo do contrato (que inclui
`campaignId`, `briefingId`, `conceptId`, `restrictions` etc.). Migrar para
o contrato estruturado é o próximo passo, não fabricado nesta sprint como
já implementado.

## Scanner de camadas

Ver `docs/editor-os/layer-scanner-integration-audit.md` — estado
`experimental`, não integrado, nenhuma simulação de camadas ou OCR na
interface atual.
