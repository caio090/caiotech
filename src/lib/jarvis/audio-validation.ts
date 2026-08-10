/**
 * Sprint MVP Experience Completion V0.1 (Missão 3, Fase 30/E5) — validação
 * pura de áudio, extraída da rota para ser testável sem rede/browser.
 *
 * Sprint MVP Dogfood Security + Voice Closure V0.1 (P1 #2, Fase 24-31) —
 * `validateAudioFile()` sozinha só checava `File.size`/`File.type`
 * (metadata declarada pelo cliente, nunca prova do payload real).
 * `validateAudioBuffer()` valida o ArrayBuffer/Buffer efetivamente
 * recebido: tamanho real, e assinatura (magic bytes) quando o formato tem
 * um checador confiável -- nunca finge validar o que não sabe validar
 * (Fase 28). Duração: só WAV pode ser calculada com segurança sem parser
 * pesado (Fase 29-31); ver DURATION_SERVER_NOT_DERIVABLE_WITH_CURRENT_STACK
 * no relatório da sprint para webm/mp4/ogg/mp3 (o que a captura real do
 * MediaRecorder produz).
 */
import { ALLOWED_AUDIO_MIME_TYPES, MAX_AUDIO_SIZE_BYTES, MAX_AUDIO_SECONDS } from "./cost-controls";
import { checkAudioSignature, tryGetWavDurationSeconds } from "./file-signature";

export interface AudioValidationInput {
  size: number;
  type: string;
}

export type AudioValidationReason =
  | "empty_audio" | "oversized_audio" | "invalid_mime" | "invalid_signature" | "duration_exceeded";

export interface AudioValidationResult {
  valid: boolean;
  reason?: AudioValidationReason;
}

/** Checagem barata de metadata declarada -- só para rejeitar cedo antes de ler o payload inteiro. Nunca é a única checagem (ver validateAudioBuffer). */
export function validateAudioFile(input: AudioValidationInput): AudioValidationResult {
  if (input.size <= 0) return { valid: false, reason: "empty_audio" };
  if (input.size > MAX_AUDIO_SIZE_BYTES) return { valid: false, reason: "oversized_audio" };
  if (!ALLOWED_AUDIO_MIME_TYPES.some((mime) => input.type.startsWith(mime))) return { valid: false, reason: "invalid_mime" };
  return { valid: true };
}

/**
 * Fase 25-27 — autoridade real: valida o Buffer efetivamente recebido no
 * servidor (nunca só o que o browser declarou). Tamanho real, MIME contra
 * allowlist, assinatura (magic bytes) quando disponível, e duração real
 * quando o formato permitir calculá-la com segurança (WAV).
 */
export function validateAudioBuffer(buffer: Buffer, declaredType: string): AudioValidationResult {
  if (buffer.length <= 0) return { valid: false, reason: "empty_audio" };
  if (buffer.length > MAX_AUDIO_SIZE_BYTES) return { valid: false, reason: "oversized_audio" };
  if (!ALLOWED_AUDIO_MIME_TYPES.some((mime) => declaredType.startsWith(mime))) return { valid: false, reason: "invalid_mime" };

  const signatureValid = checkAudioSignature(buffer, declaredType);
  if (signatureValid === false) return { valid: false, reason: "invalid_signature" };
  // signatureValid === null -- nenhum checador confiável para este tipo; aceito com a lacuna documentada, nunca fingida.

  const wavDuration = tryGetWavDurationSeconds(buffer);
  if (wavDuration !== null && wavDuration > MAX_AUDIO_SECONDS + 1) {
    return { valid: false, reason: "duration_exceeded" };
  }

  return { valid: true };
}
