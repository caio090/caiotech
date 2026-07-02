import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getActiveDigitalMenuConnection } from "@/lib/digital-menu/server";

// GET /api/olaclick/status?client_id=...
// Retorna se existe conexão Cardápio Digital ativa para o cliente.
// Nunca retorna access_token.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("client_id");

  if (!clientId) {
    return NextResponse.json({ ok: false, reason: "missing_client_id" }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });

    const lookup = await getActiveDigitalMenuConnection(supabase, clientId);

    if (lookup.error?.code === "42P01") {
      return NextResponse.json({
        ok: false, reason: "sql_pending",
        message: "Rode o SQL 39 no Supabase.",
      });
    }

    if (lookup.error) {
      return NextResponse.json({ ok: false, reason: "db_error" }, { status: 500 });
    }

    if (!lookup.found) {
      return NextResponse.json({ ok: false, connected: false, connection: null });
    }

    const conn = lookup.connection;

    // Retorna dados seguros — sem access_token
    return NextResponse.json({
      ok:        true,
      connected: true,
      connection: {
        id:              conn.id,
        provider:        conn.provider,
        connection_name: conn.connection_name,
        token_last_four: conn.token_last_four,
        status:          conn.status,
        last_sync_at:    conn.last_sync_at,
        created_at:      conn.created_at,
        // api_base_url exposta como flag booleana para a UI saber se está configurada
        has_api_base_url: !!conn.api_base_url,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "db_error" }, { status: 500 });
  }
}
