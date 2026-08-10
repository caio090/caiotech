import { NextRequest, NextResponse } from "next/server";
import { withMutationProtection } from "@/lib/workspaces/assert-not-preview";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isJarvisConfigured, synthesizeSpeech } from "@/lib/jarvis/client";
import { logJarvisRequest, sanitizeError } from "@/lib/jarvis/safety";
import { MAX_SPEECH_INPUT_CHARS } from "@/lib/jarvis/cost-controls";

/**
 * Sprint MVP Experience Completion V0.1 (Parte E8) — fala autenticada.
 * Áudio de saída nunca é persistido -- gerado e devolvido direto ao
 * browser dentro da mesma request.
 */
export const POST = withMutationProtection(async function POST(request: NextRequest) {
  const authClient = await createServerSupabaseClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  if (!isJarvisConfigured()) {
    return NextResponse.json({ ok: false, reason: "ai_not_configured" }, { status: 503 });
  }

  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "empty_text" }, { status: 400 });
  const truncated = text.length > MAX_SPEECH_INPUT_CHARS ? text.slice(0, MAX_SPEECH_INPUT_CHARS) : text;

  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  try {
    const audioBuffer = await synthesizeSpeech(truncated);
    logJarvisRequest({ requestId, mode: "speech", durationMs: Date.now() - startedAt, status: "ok" });
    return new NextResponse(new Blob([new Uint8Array(audioBuffer)]), {
      status: 200,
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (error) {
    const sanitized = sanitizeError(error);
    logJarvisRequest({ requestId, mode: "speech", durationMs: Date.now() - startedAt, status: "error", error: sanitized });
    return NextResponse.json({ error: "speech_failed" }, { status: 500 });
  }
});
