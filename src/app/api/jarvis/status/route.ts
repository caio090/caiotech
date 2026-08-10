import { NextResponse } from "next/server";
import { isJarvisConfigured } from "@/lib/jarvis/client";

/** Fase I1 — só presença, nunca o valor. Mesma convenção de /api/ai/status. */
export async function GET() {
  return NextResponse.json({ configured: isJarvisConfigured() });
}
