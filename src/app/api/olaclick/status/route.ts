import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/olaclick/status?client_id=...
// Retorna se existe conexão OlaClick ativa para o cliente — nunca retorna access_token.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("client_id");

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });

    if (!clientId) {
      return NextResponse.json({ ok: false, reason: "missing_client_id" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("olaclick_connections")
      .select("id, connection_name, provider, token_last_four, scopes, status, last_sync_at, last_error, created_at")
      .eq("client_id", clientId)
      .eq("status", "connected")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error?.code === "42P01") {
      return NextResponse.json({ ok: false, reason: "sql_pending", message: "Rode o SQL 39 no Supabase." });
    }
    if (error) throw error;

    return NextResponse.json({
      ok:        !!data,
      connected: !!data,
      connection: data ?? null,
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "db_error" }, { status: 500 });
  }
}
