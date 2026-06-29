import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createSupabaseAdminClient, hasSupabaseServiceRoleKey } from "@/lib/supabase/server";

interface ConnectPayload {
  client_id: string;
  connection_name: string;
  access_token: string;
  notes?: string;
}

const OLA_MANAGER_ROLES = new Set(["admin", "super_admin", "agency"]);

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

    if (!OLA_MANAGER_ROLES.has(profile?.role ?? "")) {
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
    const serviceRolePresent = hasSupabaseServiceRoleKey();
    const admin = createSupabaseAdminClient();
    const db = admin ?? supabase;
    const { data: client, error: clientErr } = await db
      .from("clients")
      .select("id")
      .eq("id", client_id)
      .maybeSingle();

    if (clientErr?.code === "42P01") {
      return NextResponse.json({ ok: false, reason: "sql_pending", message: "Tabela clients indisponivel. Rode os SQLs base no Supabase." });
    }
    if (!client) {
      return NextResponse.json({ ok: false, reason: "client_not_found", message: "Selecione um cliente real antes de conectar o OlaClick." }, { status: 404 });
    }

    const token_last_four = access_token.length >= 4 ? access_token.slice(-4) : "****";

    const { data, error } = await db
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
    if (error) {
      console.error("[api/olaclick/connect] erro ao salvar conexao", {
        role: profile?.role ?? null,
        client_id,
        serviceRolePresent,
        supabaseError: error,
      });
      return NextResponse.json({
        ok: false,
        reason: "db_error",
        message: "Nao foi possivel conectar o Cardapio Digital. Verifique permissoes do banco ou SUPABASE_SERVICE_ROLE_KEY na Vercel.",
      }, { status: 500 });
    }

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
    if (!OLA_MANAGER_ROLES.has(profile?.role ?? "")) {
      return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
    }

    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, reason: "missing_id" }, { status: 400 });

    const serviceRolePresent = hasSupabaseServiceRoleKey();
    const admin = createSupabaseAdminClient();
    const db = admin ?? supabase;
    const { error } = await db.from("olaclick_connections").delete().eq("id", id);
    if (error) {
      console.error("[api/olaclick/connect DELETE] erro ao remover conexao", {
        role: profile?.role ?? null,
        serviceRolePresent,
        supabaseError: error,
      });
      return NextResponse.json({
        ok: false,
        reason: "db_error",
        message: "Nao foi possivel remover a conexao. Verifique permissoes do banco ou SUPABASE_SERVICE_ROLE_KEY na Vercel.",
      }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, reason: "db_error" }, { status: 500 });
  }
}
