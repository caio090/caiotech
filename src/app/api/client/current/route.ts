import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { resolveCurrentClient } from "@/lib/client/resolve-client";

export const dynamic = "force-dynamic";

/**
 * GET /api/client/current
 * Retorna o cliente vinculado ao usuário autenticado.
 * Usa service role server-side — sem expor tokens ao browser.
 *
 * ?debug=1 — retorna diagnóstico sem secrets (sem tokens, cookies ou keys).
 */
export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ client: null, clientId: null, source: "no_supabase" });
  }

  const showDebug = req.nextUrl.searchParams.get("debug") === "1"
    || req.nextUrl.searchParams.get("debugResolve") === "1";

  try {
    const resolved = await resolveCurrentClient();

    if (!resolved) {
      if (showDebug) {
        return NextResponse.json({ client: null, clientId: null, source: "no_session", debug: { hasUser: false } }, { status: 401 });
      }
      return NextResponse.json({ client: null, clientId: null, source: "no_session" }, { status: 401 });
    }

    // Retorno público — sem dados de sessão/token
    const response = {
      client:   resolved.client,
      clientId: resolved.clientId,
      source:   resolved.source,
      ...(showDebug ? { debug: resolved.debug } : {}),
    };

    return NextResponse.json(response);
  } catch (e) {
    console.error("[api/client/current]", e);
    const errMsg = e instanceof Error ? e.message : String(e);
    if (showDebug) {
      return NextResponse.json({ client: null, clientId: null, source: "error", debug: { error: errMsg } }, { status: 500 });
    }
    return NextResponse.json({ client: null, clientId: null, source: "error" }, { status: 500 });
  }
}
