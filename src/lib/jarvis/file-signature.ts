/**
 * Sprint MVP Dogfood Security + Voice Closure V0.1 (P1 #2, Fase 24-28/33-36)
 * — verificação mínima de assinatura (magic bytes), sem parser multimídia
 * pesado e sem dependência nova. Cobre exatamente os formatos aceitos por
 * Jarvis (áudio de voz e anexo de relatório) -- nunca confia sozinho em
 * `File.type`/extensão, que são metadata declarada pelo cliente.
 */

function bytesStartWith(buffer: Buffer, offset: number, signature: number[]): boolean {
  if (buffer.length < offset + signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (buffer[offset + i] !== signature[i]) return false;
  }
  return true;
}

function asciiAt(buffer: Buffer, offset: number, text: string): boolean {
  if (buffer.length < offset + text.length) return false;
  return buffer.toString("ascii", offset, offset + text.length) === text;
}

// ── Relatórios (Fase 33-36) ──────────────────────────────────────────────

export function isValidPdfSignature(buffer: Buffer): boolean {
  return asciiAt(buffer, 0, "%PDF-");
}

export function isValidPngSignature(buffer: Buffer): boolean {
  return bytesStartWith(buffer, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

export function isValidJpegSignature(buffer: Buffer): boolean {
  return bytesStartWith(buffer, 0, [0xff, 0xd8, 0xff]);
}

/** CSV/TXT não têm magic bytes -- validados como texto decodificável, com limite (Fase 34). */
export function isDecodableAsBoundedText(buffer: Buffer, maxChars: number): boolean {
  if (buffer.length === 0) return false;
  const text = buffer.toString("utf8", 0, Math.min(buffer.length, maxChars * 4));
  // eslint-disable-next-line no-control-regex
  const controlCharRatio = (text.match(/[\x00-\x08\x0e-\x1f]/g)?.length ?? 0) / Math.max(text.length, 1);
  return controlCharRatio < 0.05; // texto real tem pouquíssimos bytes de controle; binário disfarçado de .csv não passa
}

// ── Áudio de voz (Fase 27-28) ─────────────────────────────────────────────

export function isValidWebmSignature(buffer: Buffer): boolean {
  return bytesStartWith(buffer, 0, [0x1a, 0x45, 0xdf, 0xa3]); // EBML header (WebM/Matroska)
}

export function isValidOggSignature(buffer: Buffer): boolean {
  return asciiAt(buffer, 0, "OggS");
}

export function isValidWavSignature(buffer: Buffer): boolean {
  return asciiAt(buffer, 0, "RIFF") && asciiAt(buffer, 8, "WAVE");
}

export function isValidMp3Signature(buffer: Buffer): boolean {
  if (asciiAt(buffer, 0, "ID3")) return true;
  // Frame sync: 11 bits em 1 -- 0xFF seguido de 0xE0-0xFF no segundo byte.
  return buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0;
}

/** MP4/M4A: o box "ftyp" normalmente aparece no offset 4 (após os 4 bytes de tamanho do box). Heurística padrão, não uma prova formal de MP4 válido. */
export function isValidMp4Signature(buffer: Buffer): boolean {
  return asciiAt(buffer, 4, "ftyp");
}

const AUDIO_SIGNATURE_CHECKS: Record<string, (buffer: Buffer) => boolean> = {
  "audio/webm": isValidWebmSignature,
  "audio/ogg": isValidOggSignature,
  "audio/wav": isValidWavSignature,
  "audio/mpeg": isValidMp3Signature,
  "audio/mp4": isValidMp4Signature,
};

/**
 * Fase 28 — retorna null quando o mime declarado não tem um checador de
 * assinatura confiável aqui (nunca finge validar o que não sabe validar).
 * Retorna true/false quando existe verificação real.
 */
export function checkAudioSignature(buffer: Buffer, declaredMimeType: string): boolean | null {
  const normalizedType = declaredMimeType.split(";")[0]?.trim().toLowerCase();
  const checker = normalizedType ? AUDIO_SIGNATURE_CHECKS[normalizedType] : undefined;
  if (!checker) return null;
  return checker(buffer);
}

/**
 * Fase 29-31 — WAV é o ÚNICO formato aceito cuja duração pode ser calculada
 * com segurança a partir do próprio header, sem parser pesado (RIFF/WAVE é
 * um formato fixo e simples). webm/mp4/ogg/mp3 exigiriam um demuxer real
 * (EBML/MP4 boxes/OGG pages) -- não implementado nesta sprint (Fase 31:
 * "não instalar ffmpeg/dependência pesada sem autorização"). Retorna null
 * quando a duração não pode ser derivada com confiança.
 */
export function tryGetWavDurationSeconds(buffer: Buffer): number | null {
  if (!isValidWavSignature(buffer) || buffer.length < 44) return null;
  try {
    const byteRate = buffer.readUInt32LE(28);
    const dataSize = buffer.readUInt32LE(40);
    if (byteRate <= 0) return null;
    return dataSize / byteRate;
  } catch {
    return null;
  }
}
