import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isAssistantConfigured, transcribeAudio } from "@/lib/motor-lokat/ai/client";
import { MAX_AUDIO_SIZE_BYTES, tryAcquireRequestSlot, releaseRequestSlot } from "@/lib/motor-lokat/ai/cost-controls";
import { generateRequestId, logAssistantRequest, sanitizeError } from "@/lib/motor-lokat/ai/safety";

const ALLOWED_AUDIO_TYPES = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "audio/ogg"];

// POST /api/motor-lokat/assistant/transcribe
// Push-to-talk (Fase 13). Accepts a short audio recording as multipart/form-data,
// transcribes it and discards the buffer — nothing is written to disk or storage.
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const startedAt = Date.now();

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 });
  }

  const sessionId = formData.get("sessionId");
  const audio = formData.get("audio");

  if (typeof sessionId !== "string" || !sessionId) {
    return NextResponse.json({ ok: false, reason: "missing_session_id" }, { status: 400 });
  }
  if (!(audio instanceof File)) {
    return NextResponse.json({ ok: false, reason: "missing_audio" }, { status: 400 });
  }
  if (audio.size <= 0) {
    return NextResponse.json({ ok: false, reason: "empty_audio" }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_SIZE_BYTES) {
    return NextResponse.json({ ok: false, reason: "audio_too_large" }, { status: 400 });
  }
  if (audio.type && !ALLOWED_AUDIO_TYPES.includes(audio.type)) {
    return NextResponse.json({ ok: false, reason: "unsupported_audio_type" }, { status: 400 });
  }

  if (!tryAcquireRequestSlot(sessionId)) {
    return NextResponse.json({ ok: false, reason: "request_in_progress" }, { status: 429 });
  }

  if (!isAssistantConfigured()) {
    releaseRequestSlot(sessionId);
    logAssistantRequest({ requestId, mode: "transcribe", durationMs: Date.now() - startedAt, status: "unavailable" });
    return NextResponse.json({ ok: false, reason: "ai_not_configured", message: "Assistente temporariamente indisponível." }, { status: 503 });
  }

  try {
    const buffer = Buffer.from(await audio.arrayBuffer());
    const text = await transcribeAudio(buffer, audio.name || "gravacao.webm", audio.type || "audio/webm");
    logAssistantRequest({ requestId, mode: "transcribe", durationMs: Date.now() - startedAt, status: "ok" });
    return NextResponse.json({ ok: true, text, requestId });
  } catch (error) {
    const safeMessage = sanitizeError(error);
    logAssistantRequest({ requestId, mode: "transcribe", durationMs: Date.now() - startedAt, status: "error", error: safeMessage });
    return NextResponse.json({ ok: false, reason: "transcription_failed", message: "Assistente temporariamente indisponível." }, { status: 503 });
  } finally {
    releaseRequestSlot(sessionId);
  }
}
