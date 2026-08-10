import { NextRequest, NextResponse } from "next/server";
import { withMutationProtection } from "@/lib/workspaces/assert-not-preview";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isJarvisConfigured, transcribeAudio } from "@/lib/jarvis/client";
import { logJarvisRequest, sanitizeError } from "@/lib/jarvis/safety";
import { validateAudioFile } from "@/lib/jarvis/audio-validation";

/**
 * Sprint MVP Experience Completion V0.1 (Parte E7) — transcrição
 * autenticada. Áudio processado inteiramente em memória (arrayBuffer -> Buffer
 * -> transcribeAudio -> descartado); nunca gravado em disco, nunca
 * Supabase Storage, nunca banco.
 */
export const POST = withMutationProtection(async function POST(request: NextRequest) {
  const authClient = await createServerSupabaseClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  if (!isJarvisConfigured()) {
    return NextResponse.json({ ok: false, reason: "ai_not_configured" }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const audio = formData.get("audio");
  if (!(audio instanceof File)) return NextResponse.json({ error: "missing_audio" }, { status: 400 });
  const validation = validateAudioFile({ size: audio.size, type: audio.type });
  if (!validation.valid) return NextResponse.json({ error: validation.reason }, { status: 400 });

  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  try {
    const arrayBuffer = await audio.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const text = await transcribeAudio(buffer, audio.type);
    logJarvisRequest({ requestId, mode: "transcribe", durationMs: Date.now() - startedAt, status: "ok" });
    return NextResponse.json({ ok: true, text, requestId });
  } catch (error) {
    const sanitized = sanitizeError(error);
    logJarvisRequest({ requestId, mode: "transcribe", durationMs: Date.now() - startedAt, status: "error", error: sanitized });
    return NextResponse.json({ error: "transcription_failed" }, { status: 500 });
  }
});
