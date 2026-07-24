import { NextRequest, NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  createSupabaseAdminClient,
  hasSupabaseServiceRoleKey,
} from "@/lib/supabase/server";
import {
  CLIENT_VISIBLE_STATUSES,
  isMissingClientVisibilityColumn,
  isVisibleClientRecord,
} from "@/lib/client-visibility";
import { withMutationProtection } from "@/lib/workspaces/assert-not-preview";

interface ConnectPayload {
  client_id: string;
  connection_name: string;
  access_token: string;
  api_base_url?: string;
  notes?: string;
}

const OLA_MANAGER_ROLES = new Set(["admin", "super_admin", "agency"]);

function isRpcUnavailable(err: { code?: string; message?: string } | null) {
  if (!err) return false;
  const msg = err.message?.toLowerCase() ?? "";
  return (
    err.code === "PGRST202" ||
    msg.includes("could not find the function") ||
    msg.includes("function public.admin_upsert_olaclick_connection")
  );
}

// POST /api/olaclick/connect
// Salva token OlaClick — nunca retorna token no response.
// Ordem: 1) RPC SECURITY DEFINER  2) service role  3) session client
export const POST = withMutationProtection(async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });
    }

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
    catch {
      return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 });
    }

    const { client_id, connection_name, access_token, api_base_url, notes } = body;

    if (!client_id || !connection_name || !access_token) {
      return NextResponse.json({
        ok: false, reason: "missing_fields",
        message: "client_id, connection_name e access_token são obrigatórios.",
      }, { status: 400 });
    }

    const cleanBaseUrl = api_base_url?.trim() || null;

    // ── Etapa 1: RPC SECURITY DEFINER ──
    {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "admin_upsert_olaclick_connection",
        {
          p_client_id:       client_id,
          p_connection_name: connection_name,
          p_access_token:    access_token,
          p_notes:           notes ?? null,
          p_api_base_url:    cleanBaseUrl,
        }
      );

      if (!rpcError) {
        const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
        return NextResponse.json({
          ok: true,
          id:              row?.id,
          token_last_four: row?.token_last_four,
          via:             "rpc",
        });
      }

      if (isRpcUnavailable(rpcError)) {
        console.warn("[api/olaclick/connect] RPC indisponivel, usando fallback direto");
      } else if (rpcError.code === "P0001") {
        return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });
      } else if (rpcError.code === "P0002") {
        return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
      } else if (rpcError.code === "P0003") {
        return NextResponse.json({
          ok: false, reason: "client_not_found",
          message: "Cliente não encontrado no banco.",
        }, { status: 404 });
      } else if (rpcError.code === "P0004") {
        return NextResponse.json({
          ok: false, reason: "client_not_active",
          message: "Cliente encontrado mas não está ativo ou em onboarding.",
        }, { status: 404 });
      } else {
        console.error("[api/olaclick/connect] erro na RPC", {
          stage: "rpc_admin_upsert_olaclick_connection",
          client_id,
          supabaseErrorCode: rpcError.code,
          supabaseErrorMessage: rpcError.message,
        });
      }
    }

    // ── Etapa 2: Fallback direto ──
    const serviceRolePresent = hasSupabaseServiceRoleKey();

    const runClientQuery = async (db: typeof supabase) => {
      let r = await db
        .from("clients")
        .select("id, status, deleted_at, archived_at")
        .eq("id", client_id)
        .in("status", CLIENT_VISIBLE_STATUSES)
        .is("deleted_at", null)
        .is("archived_at", null)
        .maybeSingle();
      if (r.error && isMissingClientVisibilityColumn(r.error)) {
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
    if (clientResult.error && serviceRolePresent) {
      try {
        const adminDb = createSupabaseAdminClient();
        const r = await runClientQuery(adminDb as unknown as typeof supabase);
        if (!r.error) clientResult = r;
      } catch { /* mantém resultado da sessão */ }
    }

    const { data: client, error: clientErr } = clientResult;
    if (clientErr?.code === "42P01") {
      return NextResponse.json({
        ok: false, reason: "sql_pending",
        message: "Tabela clients indisponível. Rode os SQLs base no Supabase.",
      });
    }
    if (clientErr) {
      console.error("[api/olaclick/connect] erro ao buscar cliente", {
        stage: "client_lookup",
        client_id,
        supabaseErrorCode: clientErr.code,
        supabaseErrorMessage: clientErr.message,
      });
      return NextResponse.json({
        ok: false, reason: "db_error",
        message: `Erro ao verificar cliente (${clientErr.code}): ${clientErr.message}`,
      }, { status: 500 });
    }
    if (!client || !isVisibleClientRecord(client)) {
      return NextResponse.json({
        ok: false, reason: "client_not_found",
        message: "Cliente não encontrado ou inativo. Confirme status ativo/onboarding.",
      }, { status: 404 });
    }

    const token_last_four = access_token.length >= 4 ? access_token.slice(-4) : "****";

    const insertPayload = {
      client_id,
      connection_name,
      access_token,
      token_last_four,
      api_base_url:  cleanBaseUrl,
      notes:         notes ?? null,
      created_by:    user.id,
      status:        "connected",
      scopes:        ["menu:read", "orders:read", "clients:read", "companies:read"],
    } as const;

    let insertResult = await supabase
      .from("olaclick_connections")
      .insert(insertPayload)
      .select("id, connection_name, token_last_four, status")
      .single();

    if (insertResult.error && serviceRolePresent) {
      try {
        const adminDb = createSupabaseAdminClient();
        insertResult = await adminDb
          .from("olaclick_connections")
          .insert(insertPayload)
          .select("id, connection_name, token_last_four, status")
          .single() as typeof insertResult;
      } catch { /* mantém erro original */ }
    }

    const { data: insertData, error: insertError } = insertResult;

    if (insertError?.code === "42P01") {
      return NextResponse.json({
        ok: false, reason: "sql_pending",
        message: "Tabela olaclick_connections não existe. Rode o SQL 39 no Supabase.",
      });
    }
    if (insertError) {
      console.error("[api/olaclick/connect] erro ao salvar conexao", {
        stage: "insert_olaclick_connections",
        table: "olaclick_connections",
        client_id,
        role: profile?.role ?? null,
        serviceRolePresent,
        supabaseErrorCode: insertError.code,
        supabaseErrorMessage: insertError.message,
      });
      return NextResponse.json({
        ok: false,
        reason: "db_error",
        stage: "insert_olaclick_connections",
        table: "olaclick_connections",
        supabaseErrorCode:    insertError.code,
        supabaseErrorMessage: insertError.message,
        message:
          "Não foi possível salvar a conexão. " +
          "Rode o SQL 60 no Supabase para corrigir permissões e criar as RPCs.",
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      id:              insertData?.id,
      token_last_four: insertData?.token_last_four,
      via:             "direct",
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "internal_error" }, { status: 500 });
  }
});

// DELETE /api/olaclick/connect?id=...
export const DELETE = withMutationProtection(async function DELETE(request: NextRequest) {
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

    let { error } = await supabase.from("olaclick_connections").delete().eq("id", id);
    if (error && hasSupabaseServiceRoleKey()) {
      try {
        const adminDb = createSupabaseAdminClient();
        error = (await adminDb.from("olaclick_connections").delete().eq("id", id)).error;
      } catch { /* mantém erro original */ }
    }

    if (error) {
      return NextResponse.json({ ok: false, reason: "db_error", message: "Não foi possível remover a conexão." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, reason: "internal_error" }, { status: 500 });
  }
});
