/**
 * Sprint MVP Experience Completion V0.1 (Missão 3, Fase 30/E5) — validação
 * pura de áudio, extraída da rota para ser testável sem rede/browser.
 */
import { ALLOWED_AUDIO_MIME_TYPES, MAX_AUDIO_SIZE_BYTES } from "./cost-controls";

export interface AudioValidationInput {
  size: number;
  type: string;
}

export interface AudioValidationResult {
  valid: boolean;
  reason?: "empty_audio" | "oversized_audio" | "invalid_mime";
}

export function validateAudioFile(input: AudioValidationInput): AudioValidationResult {
  if (input.size <= 0) return { valid: false, reason: "empty_audio" };
  if (input.size > MAX_AUDIO_SIZE_BYTES) return { valid: false, reason: "oversized_audio" };
  if (!ALLOWED_AUDIO_MIME_TYPES.some((mime) => input.type.startsWith(mime))) return { valid: false, reason: "invalid_mime" };
  return { valid: true };
}
