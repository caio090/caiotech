/**
 * Prompt 13 (REC OS Core Experience) — Fase 04/05/52: contrato
 * compartilhado do handoff de imagem via sessionStorage entre Criar,
 * Studio e EditorOS.
 *
 * Este NÃO é um mecanismo novo -- é a extração do contrato que já
 * existia (duplicado inline) em:
 *   - src/app/admin/contentos/criar/_guided-create-flow.tsx (`imgSessionKey`,
 *     `handleVisualFile`)
 *   - src/app/admin/contentos/editor-os/CanvasEditor.tsx (leitura da mesma
 *     chave)
 * Chave e formato do payload precisam continuar EXATAMENTE iguais aos
 * dois arquivos acima (`rec_os_visual_import_v1_${clientId}_${contentId}`,
 * `{fileName, mimeType, size, dataUrl, createdAt}`) -- nunca diverdir.
 * Esses dois arquivos não foram refatorados para importar daqui (risco
 * desnecessário em código já funcionando); este módulo é o ponto de
 * ESCRITA novo, usado pelo Studio, que precisa gravar no MESMO formato
 * que os dois leitores já esperam.
 *
 * Nunca persiste no servidor -- mesma efemeridade já documentada no
 * mecanismo original (imagem grande demais pro sessionStorage falha
 * explicitamente, nunca trunca em silêncio).
 */

const SESSION_IMG_PREFIX = "rec_os_visual_import_v1_";

export function visualImportSessionKey(clientId: string, contentId: string): string {
  return `${SESSION_IMG_PREFIX}${clientId}_${contentId}`;
}

export interface VisualImportSessionPayload {
  fileName: string;
  mimeType: string;
  size: number;
  dataUrl: string;
  createdAt: string;
}

export type WriteVisualImportSessionResult = { ok: true } | { ok: false; error: string };

/**
 * Grava a peça gerada pelo Studio no MESMO formato que a Criar
 * flow/EditorOS já leem como se fosse um upload manual -- nunca lança
 * (sessionStorage indisponível/cheio vira erro explícito, nunca falha
 * silenciosa).
 */
export function writeVisualImportSession(
  clientId: string,
  contentId: string,
  input: { fileName: string; mimeType: string; dataUrl: string; size: number },
): WriteVisualImportSessionResult {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return { ok: false, error: "sessionStorage indisponível neste ambiente." };
  }
  try {
    const payload: VisualImportSessionPayload = {
      fileName: input.fileName,
      mimeType: input.mimeType,
      size: input.size,
      dataUrl: input.dataUrl,
      createdAt: new Date().toISOString(),
    };
    window.sessionStorage.setItem(visualImportSessionKey(clientId, contentId), JSON.stringify(payload));
    return { ok: true };
  } catch {
    return { ok: false, error: "Imagem maior do que o sessionStorage consegue guardar." };
  }
}
