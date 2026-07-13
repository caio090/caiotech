import { NextResponse } from "next/server";
import { createServerSupabaseClient, createSupabaseAdminClient, hasSupabaseServiceRoleKey } from "@/lib/supabase/server";

// GET /api/meta/connections
// Retorna conexões Meta que o usuário atual pode utilizar.
// Nunca retorna access_token ou qualquer secret.
//
// Regras de acesso:
//   super_admin / admin → todas as conexões ativas
//   agency              → conexões do próprio usuário (connected_by = userId)
//   demais              → 401/403
export async function GET() {
  let userId: string | null = null;
  let userRole: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", userId).maybeSingle();
      userRole = profile?.role ?? null;
    }
  } catch { userId = null; }

  if (!userId) {
    return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });
  }

  const ALLOWED_ROLES = new Set(["admin", "super_admin", "agency", "operacional", "team"]);
  if (!userRole || !ALLOWED_ROLES.has(userRole)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  // Admin client para leitura (sem service role = cai no session client)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any;
  if (hasSupabaseServiceRoleKey()) {
    try { db = createSupabaseAdminClient(); } catch { db = await createServerSupabaseClient(); }
  } else {
    db = await createServerSupabaseClient();
  }

  // Regra de acesso à query
  // super_admin e admin: todas as conexões ativas
  // agency, operacional, team: apenas as próprias
  const isBroadAccess = userRole === "super_admin" || userRole === "admin";

  let query = db
    .from("meta_connections")
    .select(`
      id,
      status,
      is_active,
      created_at,
      connected_by,
      meta_user_id,
      profiles:connected_by ( full_name, email )
    `)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (!isBroadAccess) {
    query = query.eq("connected_by", userId);
  }

  const { data: rows, error } = await query;

  if (error?.code === "42P01") {
    return NextResponse.json({
      ok: false, reason: "sql_pending",
      message: "Rode o SQL 35 no Supabase para ativar conexões Meta.",
    });
  }
  if (error) {
    return NextResponse.json({ ok: false, reason: "db_error" }, { status: 500 });
  }

  // Contar clientes vinculados por conexão (de client_meta_assets)
  let linkedCounts: Record<string, number> = {};
  try {
    const { data: linkRows } = await db
      .from("client_meta_assets")
      .select("meta_connection_id, client_id");

    if (linkRows) {
      for (const row of linkRows as Array<{ meta_connection_id: string | null; client_id: string }>) {
        if (!row.meta_connection_id) continue;
        linkedCounts[row.meta_connection_id] = (linkedCounts[row.meta_connection_id] ?? 0) + 1;
      }
    }
  } catch { /* não crítico */ }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const connections = (rows ?? []).map((r: any) => {
    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    const displayName = profile?.full_name ?? profile?.email ?? `Conexão ${(r.id as string).slice(0, 8)}`;
    return {
      id:                  r.id            as string,
      display_name:        displayName     as string,
      status:              r.status        as string,
      created_at:          r.created_at    as string,
      linked_clients_count: linkedCounts[r.id as string] ?? 0,
      // pages_count / instagram_count: não calculado aqui (exige Graph API)
      // O modal deve buscar /api/meta/accounts?connection_id=X para detalhes
    };
  });

  return NextResponse.json({ ok: true, connections });
}
