import { NextResponse } from "next/server";
import { createServerSupabaseClient, createSupabaseAdminClient, hasSupabaseServiceRoleKey } from "@/lib/supabase/server";

const ALLOWED_ROLES = new Set(["admin", "super_admin", "agency", "operacional"]);

// GET /api/olaclick/connections
// Retorna todas as conexões OlaClick do banco, com nome do cliente.
// Nunca retorna access_token.
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (!ALLOWED_ROLES.has(profile?.role ?? "")) {
      return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
    }

    // Tenta session client primeiro (SQL 59/60 incluem super_admin nas policies)
    // Fallback para service role se sessão for bloqueada por RLS
    let result = await supabase
      .from("olaclick_connections")
      .select("id, client_id, provider, connection_name, token_last_four, status, scopes, last_sync_at, created_at, notes, clients(company_name, email)")
      .eq("status", "connected")
      .order("created_at", { ascending: false });

    if (result.error?.code === "42P01") {
      return NextResponse.json({
        ok: false, reason: "sql_pending",
        message: "Tabela olaclick_connections não existe. Rode o SQL 39 no Supabase.",
      });
    }

    if (result.error && hasSupabaseServiceRoleKey()) {
      try {
        const adminDb = createSupabaseAdminClient();
        const r = await adminDb
          .from("olaclick_connections")
          .select("id, client_id, provider, connection_name, token_last_four, status, scopes, last_sync_at, created_at, notes, clients(company_name, email)")
          .eq("status", "connected")
          .order("created_at", { ascending: false });
        if (!r.error) result = r as unknown as typeof result;
      } catch { /* mantém resultado da sessão */ }
    }

    if (result.error) {
      console.error("[api/olaclick/connections] erro ao listar", {
        supabaseErrorCode: result.error.code,
        supabaseErrorMessage: result.error.message,
      });
      return NextResponse.json({ ok: false, reason: "db_error", message: result.error.message }, { status: 500 });
    }

    const connections = (result.data ?? []).map((row) => {
      const clientRaw = row.clients as { company_name: string | null; email: string | null } | { company_name: string | null; email: string | null }[] | null;
      const client = Array.isArray(clientRaw) ? clientRaw[0] : clientRaw;
      return {
        id:              row.id as string,
        client_id:       row.client_id as string,
        provider:        (row.provider as string | null) ?? "olaclick",
        client_name:     client?.company_name ?? null,
        client_email:    client?.email ?? null,
        connection_name: row.connection_name as string,
        token_last_four: row.token_last_four as string | null,
        status:          row.status as string,
        scopes:          row.scopes as string[] | null,
        last_sync_at:    row.last_sync_at as string | null,
        created_at:      row.created_at as string | null,
        notes:           row.notes as string | null,
      };
    });

    return NextResponse.json({ ok: true, connections });
  } catch {
    return NextResponse.json({ ok: false, reason: "internal_error" }, { status: 500 });
  }
}
