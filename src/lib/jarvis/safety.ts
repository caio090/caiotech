/**
 * Sprint MVP Experience Completion V0.1 (Parte D2 / Missão 7) — Jarvis
 * safety. Padrão herdado da implementação histórica do Motor LOKAT 1.2
 * (src/lib/motor-lokat/ai/safety.ts, nunca merged): redação simples de
 * chaves estilo `sk-...`, e um log allowlist explícito -- nunca prompt
 * completo, nunca áudio, nunca arquivo, nunca resposta completa.
 */

const SECRET_PATTERN = /sk-[a-zA-Z0-9_-]{10,}/g;

export function redactSecrets(text: string): string {
  return text.replace(SECRET_PATTERN, "sk-[redacted]");
}

export function sanitizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const redacted = redactSecrets(message);
  return redacted.length > 200 ? `${redacted.slice(0, 200)}...` : redacted;
}

export type JarvisLogStatus = "ok" | "error" | "unavailable" | "blocked";

export interface JarvisLogEntry {
  requestId: string;
  mode: "chat" | "transcribe" | "speech";
  durationMs: number;
  status: JarvisLogStatus;
  outputTokens?: number;
  error?: string;
}

/** Único shape de log permitido -- nunca prompt/áudio/arquivo/resposta completa. */
export function logJarvisRequest(entry: JarvisLogEntry): void {
  console.log("[jarvis]", JSON.stringify(entry));
}
