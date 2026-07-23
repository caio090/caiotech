/**
 * Fase 16 — logging and error redaction for the Motor LOKAT assistant.
 *
 * Never log: full report content, audio bytes, full prompt, full model
 * response, financial values, or any API key. Only the fields in
 * `AssistantLogEntry` may reach the server console.
 */

export interface AssistantLogEntry {
  requestId: string;
  mode: string;
  durationMs: number;
  status: "ok" | "error" | "unavailable" | "blocked";
  outputTokens?: number;
  error?: string;
}

const SECRET_PATTERN = /sk-[a-zA-Z0-9_-]{10,}/g;

/** Strips anything that looks like an API key before it ever reaches a log line or an error surfaced to the client. */
export function redactSecrets(text: string): string {
  return text.replace(SECRET_PATTERN, "sk-[redacted]");
}

/** Converts any thrown error into a short, secret-free message safe to log or return to the client. */
export function sanitizeError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const redacted = redactSecrets(raw);
  return redacted.length > 200 ? `${redacted.slice(0, 200)}...` : redacted;
}

export function logAssistantRequest(entry: AssistantLogEntry): void {
  // Structured, single-line, no secrets, no user content — safe for any log aggregator.
  console.log("[motor-lokat-ai]", JSON.stringify(entry));
}

export function generateRequestId(): string {
  return `mla-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
