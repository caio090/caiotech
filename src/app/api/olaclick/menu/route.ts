import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveOlaClickBaseUrl, OLACLICK_BASE_URL_MISSING_RESPONSE } from "@/lib/olaclick";

// GET /api/olaclick/menu?client_id=...
// Preparada para leitura de cardápio/produtos.
export async function GET(request: NextRequest) {
  const clientId = new URL(request.url).searchParams.get("client_id");
  if (!clientId) return NextResponse.json({ ok: false, reason: "missing_client_id" }, { status: 400 });

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });

    const { data: conn, error } = await supabase
      .from("olaclick_connections")
      .select("access_token, api_base_url")
      .eq("client_id", clientId)
      .eq("status", "connected")
      .maybeSingle();

    if (error?.code === "42P01") return NextResponse.json({ ok: false, reason: "sql_pending" });
    if (!conn) return NextResponse.json({ ok: false, reason: "not_connected" });

    const baseUrl = resolveOlaClickBaseUrl(conn);
    if (!baseUrl) return NextResponse.json(OLACLICK_BASE_URL_MISSING_RESPONSE);

    // TODO: confirmar endpoint real da API OlaClick para cardápio
    const r = await fetch(`${baseUrl}/menu`, {
      headers: { Authorization: `Bearer ${conn.access_token}` },
      signal:  AbortSignal.timeout(8000),
    });
    if (!r.ok) return NextResponse.json({ ok: false, reason: "api_error", status: r.status });

    const json = await r.json() as unknown;
    return NextResponse.json({ ok: true, data: json });
  } catch {
    return NextResponse.json({ ok: false, reason: "error" }, { status: 500 });
  }
}
