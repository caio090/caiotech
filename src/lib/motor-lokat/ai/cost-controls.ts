/**
 * Fase 17 — hard limits for the Motor LOKAT assistant. All limits are
 * enforced server-side; the client mirrors them only to fail fast.
 */

export const MAX_MESSAGE_CHARS = 2000;
export const MAX_CONTEXT_CHARS = 6000;
export const MAX_HISTORY_MESSAGES = 12;
export const MAX_OUTPUT_TOKENS = 900;
export const REQUEST_TIMEOUT_MS = 20_000;

export const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB
export const MAX_ATTACHMENTS = 1;
export const ALLOWED_REPORT_TYPES = ["application/pdf", "image/png", "image/jpeg", "text/csv", "text/plain"];
export const ALLOWED_REPORT_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".csv", ".txt"];

export const MAX_AUDIO_SECONDS = 60;
export const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * One in-flight request per panel session — never a queue, never a retry
 * loop. Keyed by a random client-generated session id (never a user id or
 * anything persisted); cleared as soon as the request settles.
 */
const activeRequests = new Set<string>();

export function tryAcquireRequestSlot(sessionId: string): boolean {
  if (activeRequests.has(sessionId)) return false;
  activeRequests.add(sessionId);
  return true;
}

export function releaseRequestSlot(sessionId: string): void {
  activeRequests.delete(sessionId);
}

export function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n[...truncado]`;
}
