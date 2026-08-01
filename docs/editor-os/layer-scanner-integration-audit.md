# Auditoria de integração — EditorOS Layer Scanner (Sprint REC OS 3.0.1)

**Estado: `experimental`.** Não mergeado. Não integrado. Nenhuma simulação
de camadas/OCR executa na interface atual do EditorOS.

## Branch e commits auditados

`feat/editor-os-layer-scanner-v1` (local e `remotes/origin`), fork em
`075b0234` — um ponto bem anterior na história do repositório (o branch
nunca recebeu gsap, recharts, motion 3D nem os scripts de QA local
adicionados depois na main).

- `3d4f092` `feat(editor-os): add layer scanner architecture and OCR-based detection`
- `f998634` `docs(status): register EditorOS layer scanner areas` (7 áreas em `project-status.ts`)
- `097bf25` `fix(editor-os): isolate demo drafts and local imports`
- `2085110` `docs(status): record EditorOS runtime hotfix`
- `00b8e6f` `docs(status): record EditorOS runtime environment correction`

`git merge-base --is-ancestor 3d4f092 origin/main` e `... HEAD` confirmam:
**não mergeado em nenhum dos dois.**

## Arquitetura

10 arquivos sob `src/lib/editor-os/layer-scanner/`: `scanner.ts`,
`ocr-provider.ts`, `region-grouper.ts`, `coordinate-mapper.ts`,
`layer-converter.ts`, `style-estimator.ts`, `background-cleanup.ts`,
`confidence.ts`, `serialization.ts`, `types.ts`.

## Dependência

Adiciona **`tesseract.js@^7.0.0`** (OCR client-side, WASM) — a única
dependência nova do branch. Não está instalada na branch atual.

## Compatibilidade com a main atual

- **Não compatível sem revalidação.** O branch forkou antes de mudanças
  significativas que já chegaram à main (gsap/motion 3D, recharts, Data
  Hub, Core 2.1, Meu Negócio 2.1.2, os scripts de QA local desta sprint) —
  um merge direto exigiria resolver conflitos estruturais em
  `package.json` e reconferir que nada no scanner depende de código que
  mudou desde então no próprio EditorOS.
- Nenhum teste de suporte mobile foi encontrado no branch — OCR client-side
  via WASM tende a ser pesado para dispositivos móveis; não avaliado.
- `tesseract.js` aumenta o bundle client-side de forma não trivial (WASM +
  worker) — impacto de performance não medido nesta auditoria.

## Persistência

Nenhuma tabela nova encontrada nos commits do branch — a serialização
(`serialization.ts`) parece operar em memória/local, mas isso não foi
confirmado por leitura linha a linha nesta auditoria (fora do escopo desta
sprint, que é reorganizar o REC OS existente, não integrar o scanner).

## Estado na interface atual

Confirmado por leitura de `EditorOSWorkspace.tsx`: nenhuma referência ao
scanner, nenhum botão ativo, nenhuma simulação de camadas ou de OCR.
Qualquer badge futuro deve dizer **"Experimental"** ou **"Indisponível"** —
nunca simular funcionamento.

## Recomendação

Não integrar nesta sprint nem nas próximas até:

1. Revalidar compatibilidade de `package.json`/dependências contra a main
   atual (não só o merge-base antigo).
2. Medir impacto real de bundle/performance de `tesseract.js` em mobile.
3. Confirmar que a serialização não persiste nada sem RLS/schema aprovado.
4. Planejar uma sprint dedicada de integração controlada (P1, registrado
   em `project-status.ts` como `editor_os_layer_scanner_integration`).

Estado final desta auditoria: **`experimental`** — nem `blocked` (não há
impedimento técnico absoluto conhecido) nem `compatible` (não revalidado)
nem `ready_for_controlled_merge` (falta o trabalho acima).
