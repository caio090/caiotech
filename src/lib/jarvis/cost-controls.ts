/**
 * Sprint MVP Experience Completion V0.1 (Parte D20 / Missão 7-8) — limites
 * explícitos e configuração de modelo centralizada. Números herdados como
 * ponto de partida da implementação histórica (Motor LOKAT 1.2
 * cost-controls.ts), ajustados para o formato de chat (mensagem única, não
 * formulário inteiro).
 */

export const MAX_MESSAGE_CHARS = 2000;
export const MAX_CONTEXT_CHARS = 6000;
export const MAX_HISTORY_MESSAGES = 12;
export const MAX_OUTPUT_TOKENS = 900;
export const REQUEST_TIMEOUT_MS = 20_000;

export const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB
export const MAX_ATTACHMENTS = 1;
export const ALLOWED_REPORT_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg", "text/csv", "text/plain"];

export const MAX_AUDIO_SECONDS = 60;
export const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const ALLOWED_AUDIO_MIME_TYPES = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "audio/ogg"];

export const MAX_SPEECH_INPUT_CHARS = 4000; // limite real da API de speech

/**
 * Fase 20 — não copiar cegamente modelos antigos; um único default
 * configurável server-side, nunca espalhado em componentes/UI.
 */
export const JARVIS_CHAT_MODEL = process.env.JARVIS_CHAT_MODEL?.trim() || "gpt-4o-mini";
export const JARVIS_TRANSCRIPTION_MODEL = process.env.JARVIS_TRANSCRIPTION_MODEL?.trim() || "whisper-1";
export const JARVIS_SPEECH_MODEL = process.env.JARVIS_SPEECH_MODEL?.trim() || "tts-1";
/** Voz built-in do SDK -- nunca clonagem, nunca imitação de pessoa real (Fase E10). */
export const JARVIS_SPEECH_VOICE = process.env.JARVIS_SPEECH_VOICE?.trim() || "alloy";

/**
 * Fase 53 — no mínimo uma requisição ativa por sessão/usuário. Guard em
 * memória do processo, sem fila, sem retry automático -- um duplo clique
 * gera 429, nunca um segundo custo simultâneo. Reiniciar o processo limpa
 * o estado (aceitável para esta versão: nenhuma persistência de conversa).
 */
const activeRequests = new Set<string>();

export function tryAcquireJarvisSlot(userId: string): boolean {
  if (activeRequests.has(userId)) return false;
  activeRequests.add(userId);
  return true;
}

export function releaseJarvisSlot(userId: string): void {
  activeRequests.delete(userId);
}

export function isJarvisSlotBusy(userId: string): boolean {
  return activeRequests.has(userId);
}
