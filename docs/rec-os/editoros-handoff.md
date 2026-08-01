# Handoff para o EditorOS — Sprint REC OS 3.0.1 → 3.0.1.1

## Atualização da Sprint REC OS 3.0.1.1 — adaptador central implementado

`src/lib/rec-os-workflow/editor-handoff.ts` adiciona
`buildEditorAssetHandoff()` / `validateEditorAssetHandoff()` /
`serializeEditorAssetHandoff()` / `parseEditorAssetHandoff()`, e
`handleOpenEditor()` (`_guided-create-flow.tsx`) passou a usá-los de
verdade, em vez de concatenar a URL manualmente.

**Mecanismo escolhido** (dos quatro aceitos pelo brief): **parâmetros
mínimos validados**. `serializeEditorAssetHandoff()` só coloca na URL
`client`, `content_id`, `campaign_id` (quando presente), `format`,
`has_asset` (derivado de `isEditorAssetHandoffReady()`), `handoff_at`
(carimbo ISO) e `return_to` — **nunca** `copy`, `restrictions` ou o
objeto inteiro. Nenhum `localStorage`/`sessionStorage`/banco novo foi
criado para o handoff em si (o mecanismo pré-existente de
`sessionStorage` para a imagem local, de uma sprint anterior, foi
mantido intacto e é independente deste adaptador).

**Expiração** (Fase 16): computada só pelo carimbo `handoff_at` — mais de
2h e o `EditorOSPage` marca `handoffExpired`; `EditorOSWorkspace` mostra
um aviso ("Este link de edição expirou...") com link de retorno seguro,
sem quebrar a página nem exigir nenhum armazenamento adicional.

**"Não abrir canvas vazio"**: interpretado nesta sprint como preservar a
capacidade real e já existente do EditorOS de iniciar um design do zero
(ele não é só um visualizador de imagem existente) — quando não há
`hasAsset`, o workspace mostra uma nota discreta ("Nenhum ativo importado
ainda — este editor abrirá para criação"), nunca bloqueia a abertura.
Bloquear a criação do zero seria uma regressão de produto não pedida
pelo texto do restante do brief.

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
