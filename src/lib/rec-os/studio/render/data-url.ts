/**
 * Sprint REC OS Studio Visual Engine (Prompt 01) — decodifica uma
 * `data:` URL de imagem para bytes reais. Nunca lança -- URL
 * malformada vira `null` (chamador decide o warning/fallback).
 */
const DATA_URL_PATTERN = /^data:image\/(png|jpe?g|webp|gif);base64,(.+)$/i;

export function decodeImageDataUrl(dataUrl: string): Buffer | null {
  const match = DATA_URL_PATTERN.exec(dataUrl);
  if (!match) return null;
  try {
    return Buffer.from(match[2], "base64");
  } catch {
    return null;
  }
}
