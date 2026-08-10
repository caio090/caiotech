/**
 * Sprint MVP Experience Completion V0.1 (Parte D1/D2, Fase 18-19) — Jarvis
 * OpenAI client. Auditoria prévia confirmou: `openai` v6.45.0 já é
 * dependência (nenhuma nova instalada); as rotas pré-existentes em
 * src/app/api/ai/** usam fetch cru contra Chat Completions; a implementação
 * histórica (Motor LOKAT 1.2, nunca merged) usava a Responses API via SDK
 * para chat/streaming e `openai.audio.transcriptions` para voz -- esse é o
 * único precedente real de transcrição no repositório. `openai.audio.speech`
 * nunca foi usado antes (nem lá, nem aqui); implementado aqui pela primeira
 * vez, com a mesma disciplina de client server-side-only.
 */
import OpenAI, { toFile } from "openai";
import {
  JARVIS_CHAT_MODEL, JARVIS_TRANSCRIPTION_MODEL, JARVIS_SPEECH_MODEL, JARVIS_SPEECH_VOICE,
  MAX_OUTPUT_TOKENS, REQUEST_TIMEOUT_MS,
} from "./cost-controls";
import type { JarvisChatMessage } from "./types";

let cachedClient: OpenAI | null = null;

/** Fase 19 — só presença, nunca o valor. */
export function isJarvisConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function getClient(): OpenAI {
  if (!cachedClient) cachedClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: REQUEST_TIMEOUT_MS });
  return cachedClient;
}

type ResponseInputContentPart =
  | { type: "input_text"; text: string }
  | { type: "input_file"; filename: string; file_data: string }
  | { type: "input_image"; image_url: string; detail: "auto" };

export interface StreamJarvisChatInput {
  systemInstructions: string;
  history: JarvisChatMessage[];
  message: string;
  attachmentParts?: ResponseInputContentPart[];
  signal?: AbortSignal;
}

/**
 * Fase D3/I3 — store:false (Fase 51 da Foundation: nenhuma conversa
 * persistida do lado da OpenAI nesta versão), streaming real via Responses
 * API. Retorna um async generator de deltas de texto -- a rota decide como
 * empacotar em SSE.
 */
export async function* streamJarvisChat(input: StreamJarvisChatInput): AsyncGenerator<string> {
  const client = getClient();
  const messageContent: ResponseInputContentPart[] = [{ type: "input_text", text: input.message }, ...(input.attachmentParts ?? [])];

  const stream = await client.responses.create({
    model: JARVIS_CHAT_MODEL,
    instructions: input.systemInstructions,
    input: [
      ...input.history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: messageContent },
    ],
    max_output_tokens: MAX_OUTPUT_TOKENS,
    store: false,
    stream: true,
  }, { signal: input.signal });

  for await (const event of stream) {
    if (event.type === "response.output_text.delta") yield event.delta;
    if (event.type === "response.failed" || event.type === "response.incomplete") {
      throw new Error("jarvis_stream_incomplete");
    }
  }
}

/** Fase E7 — áudio processado em memória, nunca gravado em disco/storage/DB. */
export async function transcribeAudio(buffer: Buffer, mimeType: string): Promise<string> {
  const client = getClient();
  const extension = mimeType.split("/")[1]?.split(";")[0] || "webm";
  const file = await toFile(buffer, `audio.${extension}`, { type: mimeType });
  const result = await client.audio.transcriptions.create({
    file,
    model: JARVIS_TRANSCRIPTION_MODEL,
    language: "pt",
  });
  return result.text;
}

/** Fase E8/E10 — voz built-in do SDK, nunca clonada/customizada; áudio nunca persistido. */
export async function synthesizeSpeech(text: string): Promise<Buffer> {
  const client = getClient();
  const response = await client.audio.speech.create({
    model: JARVIS_SPEECH_MODEL,
    voice: JARVIS_SPEECH_VOICE,
    input: text,
    response_format: "mp3",
  });
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
