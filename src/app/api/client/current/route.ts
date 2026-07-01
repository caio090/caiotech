import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { resolveCurrentClient } from "@/lib/client/resolve-client";

export const dynamic = "force-dynamic";

/**
 * GET /api/client/current
 * Retorna o cliente vinculado ao usuário autenticado.
 * Usa service role server-side — sem expor tokens ao browser.
 */
export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ client: null, clientId: null, source: null });
  }

  try {
    const resolved = await resolveCurrentClient();

    if (!resolved) {
      return NextResponse.json({ client: null, clientId: null, source: null }, { status: 401 });
    }

    return NextResponse.json({
      client:   resolved.client,
      clientId: resolved.clientId,
      source:   resolved.source,
    });
  } catch (e) {
    console.error("[api/client/current]", e);
    return NextResponse.json({ client: null, clientId: null, source: null }, { status: 500 });
  }
}
