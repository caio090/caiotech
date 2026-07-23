import type { EditorElement } from "@/app/admin/contentos/editor-os/CanvasEditor";

/**
 * Fase 18 — CanvasEditor's saveDraft()/loadDraft() already serialize the
 * whole `elements` array verbatim via JSON.stringify/JSON.parse into
 * localStorage; every scan-related field added to EditorElement (see
 * CanvasEditor.tsx) is a plain string/number/boolean, so it round-trips
 * through that mechanism with zero changes needed there. This module only
 * documents/enforces the boundary: what must never end up on a persisted
 * EditorElement (worker handles, blob URLs, File/ImageData, review-only
 * temporary boxes, scan progress) and how to recognize a scanner-made
 * element when reopening a draft.
 */

export function isScannerCreatedElement(el: EditorElement): boolean {
  return el.editorOsSource === "layer_scan" || el.editorOsSource === "background_cleanup";
}

export function layerSourceLabel(el: EditorElement): string {
  if (el.editorOsSource === "layer_scan") return "Texto detectado";
  if (el.editorOsSource === "background_cleanup") return "Limpeza de fundo (experimental)";
  if (el.type === "image") return "Imagem";
  if (el.type === "text") return "Texto";
  return "Forma";
}
