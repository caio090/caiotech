import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveOlaClickBaseUrl, OLACLICK_BASE_URL_MISSING_RESPONSE } from "@/lib/olaclick";

// POST /api/olaclick/test
// Testa conexão OlaClick para um client_id. Nunca retorna access_token.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });

    const { client_id } = await request.json() as { client_id: string };
    if (!client_id) return NextResponse.json({ ok: false, reason: "missing_client_id" }, { status: 400 });

    const { data: conn, error } = await supabase
      .from("olaclick_connections")
      .select("id, access_token, connection_name, api_base_url")
      .eq("client_id", client_id)
      .eq("status", "connected")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error?.code === "42P01") {
      return NextResponse.json({ ok: false, reason: "sql_pending" });
    }
    if (!conn) {
      return NextResponse.json({ ok: false, reason: "not_connected", message: "Nenhuma conexão OlaClick ativa para este cliente." });
    }

    const baseUrl = resolveOlaClickBaseUrl(conn);
    if (!baseUrl) return NextResponse.json(OLACLICK_BASE_URL_MISSING_RESPONSE);

    try {
      const r = await fetch(`${baseUrl}/companies`, {
        headers: { Authorization: `Bearer ${conn.access_token}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      if (r.ok) {
        await supabase.from("olaclick_connections")
          .update({ last_sync_at: new Date().toISOString(), last_error: null, status: "connected" })
          .eq("id", conn.id);
        return NextResponse.json({ ok: true, message: "Conexão OlaClick funcionando.", connection_name: conn.connection_name });
      }
      const errText = await r.text().catch(() => "");
      await supabase.from("olaclick_connections")
        .update({ status: "error", last_error: `HTTP ${r.status}: ${errText.slice(0, 200)}` })
        .eq("id", conn.id);
      return NextResponse.json({ ok: false, reason: "api_error", message: `OlaClick retornou ${r.status}.` });
    } catch {
      await supabase.from("olaclick_connections")
        .update({ status: "error", last_error: "Timeout ou erro de rede" })
        .eq("id", conn.id);
      return NextResponse.json({ ok: false, reason: "network_error", message: "Não foi possível alcançar a API OlaClick." });
    }
  } catch {
    return NextResponse.json({ ok: false, reason: "db_error" }, { status: 500 });
  }
}
