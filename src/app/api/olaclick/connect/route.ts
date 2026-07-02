import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createSupabaseAdminClient, hasSupabaseServiceRoleKey } from "@/lib/supabase/server";
import { CLIENT_VISIBLE_STATUSES, isMissingClientVisibilityColumn, isVisibleClientRecord } from "@/lib/client-visibility";

interface ConnectPayload {
  client_id: string;
  connection_name: string;
  access_token: string;
  notes?: string;
}

const OLA_MANAGER_ROLES = new Set(["admin", "super_admin", "agency"]);

// POST /api/olaclick/connect
// Salva token OlaClick no banco — nunca retorna token no response.
// Usa session client por padrão (RLS do SQL 39 inclui super_admin/admin/agency).
// Admin client só é usado como fallback se sessão falhar.
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
      return NextResponse.json({
        ok: false,
        reason: "missing_fields",
        message: "client_id, connection_name e access_token são obrigatórios.",
      }, { status: 400 });
    }

    // ── Valida client_id ─────────────────────────────────────
    // Usa session client primeiro (RLS permite super_admin/admin/agency).
    // Fallback para admin client somente se session client retornar erro de permissão.
    const serviceRolePresent = hasSupabaseServiceRoleKey();

    const runClientQuery = async (db: Awaited<ReturnType<typeof createServerSupabaseClient>>) => {
      let r = await db
        .from("clients")
        .select("id, status, deleted_at, archived_at")
        .eq("id", client_id)
        .in("status", CLIENT_VISIBLE_STATUSES)
        .is("deleted_at", null)
        .is("archived_at", null)
        .maybeSingle();
      if (r.error && isMissingClientVisibilityColumn(r.error)) {
        // Coluna deleted_at/archived_at não existe ainda — usa query sem essas colunas
        r = await db
          .from("clients")
          .select("id, status")
          .eq("id", client_id)
          .in("status", CLIENT_VISIBLE_STATUSES)
          .maybeSingle() as typeof r;
      }
      return r;
    };

    let clientResult = await runClientQuery(supabase);

    // Se session client falhou (não é "nenhum resultado"), tenta admin client
    if (clientResult.error && serviceRolePresent) {
      try {
        const adminDb = createSupabaseAdminClient();
        const adminResult = await runClientQuery(adminDb as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);
        if (!adminResult.error) clientResult = adminResult;
      } catch { /* usa resultado da session */ }
    }

    const { data: client, error: clientErr } = clientResult;

    if (clientErr?.code === "42P01") {
      return NextResponse.json({
        ok: false,
        reason: "sql_pending",
        message: "Tabela clients indisponível. Rode os SQLs base no Supabase.",
      });
    }
    if (clientErr) {
      console.error("[api/olaclick/connect] erro ao buscar cliente", { client_id, supabaseError: clientErr });
      return NextResponse.json({
        ok: false,
        reason: "db_error",
        message: `Erro ao verificar cliente: ${clientErr.message}`,
      }, { status: 500 });
    }
    if (!client || !isVisibleClientRecord(client)) {
      return NextResponse.json({
        ok: false,
        reason: "client_not_found",
        message: "Cliente não encontrado no banco. Confirme se o cliente tem status ativo e não está arquivado.",
      }, { status: 404 });
    }

    // ── Salva conexão OlaClick ───────────────────────────────
    const token_last_four = access_token.length >= 4 ? access_token.slice(-4) : "****";

    // Usa session client para o insert (RLS admin_all_olaclick permite super_admin/admin/agency).
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
      return NextResponse.json({
        ok: false,
        reason: "sql_pending",
        message: "Rode o SQL 39 no Supabase para criar a tabela olaclick_connections.",
      });
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
        message: "Não foi possível salvar a conexão. Verifique permissões do banco (SQL 39) ou SUPABASE_SERVICE_ROLE_KEY na Vercel.",
      }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data?.id, token_last_four });
  } catch {
    return NextResponse.json({ ok: false, reason: "internal_error" }, { status: 500 });
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

    // Usa session client (RLS permite); admin client como fallback
    let error = (await supabase.from("olaclick_connections").delete().eq("id", id)).error;

    if (error && hasSupabaseServiceRoleKey()) {
      try {
        const adminDb = createSupabaseAdminClient();
        error = (await adminDb.from("olaclick_connections").delete().eq("id", id)).error;
      } catch { /* mantém erro original */ }
    }

    if (error) {
      console.error("[api/olaclick/connect DELETE] erro ao remover conexao", {
        role: profile?.role ?? null,
        supabaseError: error,
      });
      return NextResponse.json({
        ok: false,
        reason: "db_error",
        message: "Não foi possível remover a conexão.",
      }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, reason: "internal_error" }, { status: 500 });
  }
}
