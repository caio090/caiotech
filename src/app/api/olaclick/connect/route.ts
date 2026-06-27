import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface ConnectPayload {
  client_id: string;
  connection_name: string;
  access_token: string;
  notes?: string;
}

// POST /api/olaclick/connect
// Salva token OlaClick no banco — nunca retorna token no response.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!["admin", "agency"].includes(profile?.role ?? "")) {
      return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
    }

    let body: ConnectPayload;
    try { body = await request.json() as ConnectPayload; }
    catch { return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 }); }

    const { client_id, connection_name, access_token, notes } = body;

    if (!client_id || !connection_name || !access_token) {
      return NextResponse.json({ ok: false, reason: "missing_fields", message: "client_id, connection_name e access_token são obrigatórios." }, { status: 400 });
    }

    // Extrai apenas os últimos 4 caracteres para exibição
    const token_last_four = access_token.length >= 4 ? access_token.slice(-4) : "****";

    const { data, error } = await supabase
      .from("olaclick_connections")
      .insert({
        client_id,
        connection_name,
        access_token,
        token_last_four,
        notes:      notes ?? null,
        created_by: user.id,
        status:     "connected",
        scopes:     ["menu:read", "orders:read", "clients:read", "companies:read"],
      })
      .select("id, connection_name, token_last_four, status")
      .single();

    if (error?.code === "42P01") {
      return NextResponse.json({ ok: false, reason: "sql_pending", message: "Rode o SQL 39 no Supabase." });
    }
    if (error) throw error;

    return NextResponse.json({ ok: true, id: data?.id, token_last_four });
  } catch {
    return NextResponse.json({ ok: false, reason: "db_error" }, { status: 500 });
  }
}

// DELETE /api/olaclick/connect?id=...
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (!["admin", "agency"].includes(profile?.role ?? "")) {
      return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
    }

    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, reason: "missing_id" }, { status: 400 });

    const { error } = await supabase.from("olaclick_connections").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, reason: "db_error" }, { status: 500 });
  }
}
