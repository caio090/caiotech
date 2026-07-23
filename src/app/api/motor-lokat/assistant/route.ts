import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isAssistantConfigured, streamAssistantText, getStructuredAssistantResponse } from "@/lib/motor-lokat/ai/client";
import { buildSystemInstructions } from "@/lib/motor-lokat/ai/instructions";
import { ASSISTANT_RESPONSE_JSON_SCHEMA, REPORT_INTERPRETATION_JSON_SCHEMA } from "@/lib/motor-lokat/ai/schemas";
import { validateReportFile, buildReportInput, unavailableReportInterpretation, type ReportAttachment } from "@/lib/motor-lokat/ai/report-parser";
import {
  MAX_MESSAGE_CHARS, MAX_HISTORY_MESSAGES, tryAcquireRequestSlot, releaseRequestSlot, truncate, MAX_CONTEXT_CHARS,
} from "@/lib/motor-lokat/ai/cost-controls";
import { generateRequestId, logAssistantRequest, sanitizeError } from "@/lib/motor-lokat/ai/safety";
import { STREAMING_MODES, AssistantUnavailableError, type AssistantMode, type AssistantContextSnapshot } from "@/lib/motor-lokat/ai/types";

interface AssistantRequestPayload {
  mode?: unknown;
  message?: unknown;
  context?: unknown;
  history?: unknown;
  sessionId?: unknown;
  attachment?: unknown;
}

const VALID_MODES: AssistantMode[] = ["interpret", "explain", "fill", "campaign", "product", "diagnosis", "report"];

function buildPromptInput(context: AssistantContextSnapshot, message: string, history: Array<{ role: string; content: string }>): string {
  const historyText = history
    .slice(-MAX_HISTORY_MESSAGES)
    .map((h) => `${h.role === "user" ? "Usuário" : "Assistente"}: ${h.content}`)
    .join("\n");
  const contextText = truncate(JSON.stringify(context), MAX_CONTEXT_CHARS);
  return `Contexto do painel (JSON, já com origem de cada dado):\n${contextText}\n\nHistórico recente:\n${historyText || "(sem histórico)"}\n\nMensagem do usuário:\n${message}`;
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const startedAt = Date.now();

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });
  }

  let body: AssistantRequestPayload;
  try {
    body = (await request.json()) as AssistantRequestPayload;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 });
  }

  const mode = typeof body.mode === "string" && VALID_MODES.includes(body.mode as AssistantMode) ? (body.mode as AssistantMode) : null;
  const message = typeof body.message === "string" ? body.message : "";
  const sessionId = typeof body.sessionId === "string" && body.sessionId.length > 0 ? body.sessionId : null;

  if (!mode) return NextResponse.json({ ok: false, reason: "invalid_mode" }, { status: 400 });
  if (!sessionId) return NextResponse.json({ ok: false, reason: "missing_session_id" }, { status: 400 });
  if (message.length > MAX_MESSAGE_CHARS) return NextResponse.json({ ok: false, reason: "message_too_long" }, { status: 400 });
  if (!body.context || typeof body.context !== "object") return NextResponse.json({ ok: false, reason: "missing_context" }, { status: 400 });

  const context = body.context as AssistantContextSnapshot;
  const history = Array.isArray(body.history) ? (body.history as Array<{ role: string; content: string }>) : [];

  let attachment: ReportAttachment | null = null;
  if (mode === "report" && body.attachment && typeof body.attachment === "object") {
    const raw = body.attachment as Partial<ReportAttachment>;
    if (typeof raw.name !== "string" || typeof raw.type !== "string" || typeof raw.size !== "number" || typeof raw.dataBase64 !== "string") {
      return NextResponse.json({ ok: false, reason: "invalid_attachment" }, { status: 400 });
    }
    const validation = validateReportFile({ name: raw.name, type: raw.type, size: raw.size });
    if (!validation.valid) {
      return NextResponse.json({ ok: false, reason: "invalid_attachment", message: validation.reason }, { status: 400 });
    }
    attachment = { name: raw.name, type: raw.type, size: raw.size, dataBase64: raw.dataBase64 };
  }

  if (!tryAcquireRequestSlot(sessionId)) {
    return NextResponse.json({ ok: false, reason: "request_in_progress", message: "Já existe uma solicitação em andamento neste painel." }, { status: 429 });
  }

  if (!isAssistantConfigured()) {
    releaseRequestSlot(sessionId);
    logAssistantRequest({ requestId, mode, durationMs: Date.now() - startedAt, status: "unavailable" });
    if (mode === "report") {
      return NextResponse.json({ ok: false, reason: "ai_not_configured", message: "Assistente temporariamente indisponível.", data: unavailableReportInterpretation() }, { status: 503 });
    }
    return NextResponse.json({ ok: false, reason: "ai_not_configured", message: "Assistente temporariamente indisponível." }, { status: 503 });
  }

  const instructions = buildSystemInstructions(mode);

  try {
    if (STREAMING_MODES.includes(mode)) {
      const input = buildPromptInput(context, message, history);
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const delta of streamAssistantText(instructions, input)) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            logAssistantRequest({ requestId, mode, durationMs: Date.now() - startedAt, status: "ok" });
          } catch (error) {
            const safeMessage = sanitizeError(error);
            controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: safeMessage })}\n\n`));
            logAssistantRequest({ requestId, mode, durationMs: Date.now() - startedAt, status: "error", error: safeMessage });
          } finally {
            releaseRequestSlot(sessionId);
            controller.close();
          }
        },
        cancel() {
          releaseRequestSlot(sessionId);
        },
      });
      return new Response(stream, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
      });
    }

    const schema = mode === "report" ? REPORT_INTERPRETATION_JSON_SCHEMA : ASSISTANT_RESPONSE_JSON_SCHEMA;
    const input = attachment ? buildReportInput(attachment, buildPromptInput(context, message, history)) : buildPromptInput(context, message, history);
    const { data, outputTokens } = await getStructuredAssistantResponse(instructions, input, schema);

    logAssistantRequest({ requestId, mode, durationMs: Date.now() - startedAt, status: "ok", outputTokens });
    return NextResponse.json({ ok: true, data, requestId });
  } catch (error) {
    const safeMessage = sanitizeError(error);
    const status = error instanceof AssistantUnavailableError ? 503 : 500;
    logAssistantRequest({ requestId, mode, durationMs: Date.now() - startedAt, status: status === 503 ? "unavailable" : "error", error: safeMessage });
    return NextResponse.json({ ok: false, reason: status === 503 ? "ai_not_configured" : "internal_error", message: "Assistente temporariamente indisponível." }, { status });
  } finally {
    // The streaming branch returns before this point (it releases the slot
    // itself in the ReadableStream's start/cancel handlers, once the stream
    // actually finishes) — releasing it here too would be a harmless no-op
    // for that path, but only the non-streaming branches actually rely on
    // this to free the slot.
    if (!STREAMING_MODES.includes(mode)) releaseRequestSlot(sessionId);
  }
}
