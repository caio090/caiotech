/**
 * Fase 1/16 — thin wrapper around the `openai` SDK (already a project
 * dependency, v6.45.0 — see docs/16-ai-integration-openai.md for the
 * existing fetch-based convention used by src/app/api/ai/**). This module
 * is the only place in the assistant feature allowed to read
 * OPENAI_API_KEY or construct an OpenAI client.
 *
 * Server-only. Never import this from a "use client" file.
 */

import OpenAI, { toFile } from "openai";
import type { ResponseInput } from "openai/resources/responses/responses";
import { AssistantUnavailableError } from "./types";
import { MAX_OUTPUT_TOKENS, REQUEST_TIMEOUT_MS } from "./cost-controls";

const MODEL = "gpt-4o-mini";
const TRANSCRIPTION_MODEL = "whisper-1";

let cachedClient: OpenAI | null | undefined;

/** Never logs, never exposes, never moves the key to a NEXT_PUBLIC_* var. */
export function isAssistantConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function getClient(): OpenAI {
  if (cachedClient === undefined) {
    cachedClient = isAssistantConfigured() ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: REQUEST_TIMEOUT_MS }) : null;
  }
  if (!cachedClient) throw new AssistantUnavailableError();
  return cachedClient;
}

/** Plain-text streaming reply for chat-like modes (interpret/explain/diagnosis). Yields text deltas as they arrive. */
export async function* streamAssistantText(instructions: string, input: string): AsyncGenerator<string> {
  const client = getClient();
  const stream = await client.responses.create({
    model: MODEL,
    instructions,
    input,
    max_output_tokens: MAX_OUTPUT_TOKENS,
    store: false,
    stream: true,
  });
  for await (const event of stream) {
    if (event.type === "response.output_text.delta") {
      yield event.delta;
    }
  }
}

/** Non-streamed, schema-constrained reply for structured modes (fill/campaign/product/report). `input` may be a plain string or a multi-part input (used when a report attachment is included). */
export async function getStructuredAssistantResponse<T>(
  instructions: string,
  input: string | ResponseInput,
  jsonSchema: { type: "json_schema"; name: string; strict: boolean; schema: Record<string, unknown> }
): Promise<{ data: T; outputTokens?: number }> {
  const client = getClient();
  const response = await client.responses.create({
    model: MODEL,
    instructions,
    input,
    max_output_tokens: MAX_OUTPUT_TOKENS,
    store: false,
    stream: false,
    text: { format: jsonSchema },
  });
  const text = response.output_text;
  if (!text) throw new AssistantUnavailableError("Resposta vazia do assistente.");
  return { data: JSON.parse(text) as T, outputTokens: response.usage?.output_tokens };
}

/** Transcribes a short audio buffer (push-to-talk). Never persists the audio — the buffer is discarded after the call returns. */
export async function transcribeAudio(buffer: Buffer, filename: string, mimeType: string): Promise<string> {
  const client = getClient();
  const file = await toFile(buffer, filename, { type: mimeType });
  const transcription = await client.audio.transcriptions.create({
    file,
    model: TRANSCRIPTION_MODEL,
    language: "pt",
  });
  return transcription.text;
}
