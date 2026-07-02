import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createSupabaseAdminClient, hasSupabaseServiceRoleKey } from "@/lib/supabase/server";

interface LinkPayload {
  client_id: string;
  meta_connection_id?: string;  // opcional: RPC resolve automaticamente se omitido
  asset_type: "facebook_page" | "instagram_business";
  asset_id: string;
  asset_name?: string;
  username?: string;
  picture_url?: string;
  is_primary?: boolean;
}

const META_MANAGER_ROLES = new Set(["admin", "super_admin", "agency"]);

function isRpcUnavailable(err: { code?: string; message?: string } | null) {
  if (!err) return false;
  const msg = err.message?.toLowerCase() ?? "";
  return (
    err.code === "PGRST202" ||
    msg.includes("could not find the function") ||
    msg.includes("function public.admin_link_meta_asset")
  );
}

// POST /api/meta/assets/link
// Vincula ativo Meta (Página ou Instagram) a um cliente.
// Ordem: 1) RPC SECURITY DEFINER  2) service role  3) session client
// meta_connection_id é opcional — RPC resolve automaticamente.
export async function POST(request: NextRequest) {
  let userId: string | null = null;
  let userRole: string | null = null;
  let supabase: Awaited<ReturnType<typeof createServerSupabaseClient>> | null = null;

  try {
    supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
    if (userId) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
      userRole = profile?.role ?? null;
    }
  } catch { userId = null; }

  if (!userId || !supabase) {
    return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });
  }
  if (!userRole || !META_MANAGER_ROLES.has(userRole)) {
    return NextResponse.json({ ok: false, reason: "forbidden", message: "Apenas admin, super_admin e agency podem vincular ativos." }, { status: 403 });
  }

  let body: LinkPayload;
  try { body = await request.json() as LinkPayload; }
  catch { return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 }); }

  const { client_id, meta_connection_id, asset_type, asset_id, asset_name, username, picture_url, is_primary } = body;

  if (!client_id || !asset_type || !asset_id) {
    return NextResponse.json({ ok: false, reason: "missing_fields", message: "client_id, asset_type e asset_id são obrigatórios." }, { status: 400 });
  }

  const validTypes = ["facebook_page", "instagram_business"];
  if (!validTypes.includes(asset_type)) {
    return NextResponse.json({ ok: false, reason: "invalid_asset_type" }, { status: 400 });
  }

  // ── Etapa 1: RPC SECURITY DEFINER ──────────────────────────────
  {
    const { data: rpcData, error: rpcError } = await supabase.rpc("admin_link_meta_asset", {
      p_client_id:          client_id,
      p_asset_type:         asset_type,
      p_asset_id:           asset_id,
      p_asset_name:         asset_name  ?? null,
      p_username:           username    ?? null,
      p_picture_url:        picture_url ?? null,
      p_meta_connection_id: meta_connection_id ?? null,
      p_is_primary:         is_primary  ?? false,
    });

    if (!rpcError) {
      const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      return NextResponse.json({ ok: true, id: row?.asset_record_id, via: "rpc" });
    }

    if (isRpcUnavailable(rpcError)) {
      console.warn("[api/meta/assets/link] RPC indisponivel, usando fallback direto");
    } else if (rpcError.code === "P0001") {
      return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });
    } else if (rpcError.code === "P0002") {
      return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
    } else if (rpcError.code === "P0003") {
      return NextResponse.json({ ok: false, reason: "client_not_found", message: "Cliente não encontrado." }, { status: 404 });
    } else if (rpcError.code === "P0005") {
      return NextResponse.json({ ok: false, reason: "invalid_asset_type" }, { status: 400 });
    } else {
      console.error("[api/meta/assets/link] erro na RPC", {
        stage: "rpc_admin_link_meta_asset",
        client_id,
        asset_type,
        supabaseErrorCode: rpcError.code,
        supabaseErrorMessage: rpcError.message,
      });
      // Continua para fallback direto
    }
  }

  // ── Etapa 2: Fallback direto ────────────────────────────────────
  // Resolve meta_connection_id — usa o que veio no body, ou busca no banco
  let resolvedConnectionId: string | null = meta_connection_id ?? null;

  if (!resolvedConnectionId) {
    // Tenta encontrar conexão ativa pelo session client (SQL 60 corrige a policy)
    let adminDb: ReturnType<typeof createSupabaseAdminClient> | null = null;
    if (hasSupabaseServiceRoleKey()) {
      try { adminDb = createSupabaseAdminClient(); } catch { /* sem service role */ }
    }
    const connDb = adminDb ?? supabase;

    const { data: connRow, error: connLookupErr } = await (connDb as typeof supabase)
      .from("meta_connections")
      .select("id")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (connLookupErr?.code === "42P01") {
      return NextResponse.json({ ok: false, reason: "sql_pending", message: "Rode o SQL 35 no Supabase." });
    }
    // Mesmo sem conexão encontrada, continuamos — meta_connection_id é nullable
    resolvedConnectionId = connRow?.id ?? null;

    // Se mandou meta_connection_id no body, verifica se existe
  } else if (meta_connection_id) {
    let adminDb: ReturnType<typeof createSupabaseAdminClient> | null = null;
    if (hasSupabaseServiceRoleKey()) {
      try { adminDb = createSupabaseAdminClient(); } catch { /* sem service role */ }
    }

    // Tenta verificar com service role (não depende de RLS)
    if (adminDb) {
      const { data: connRow, error: connErr } = await adminDb
        .from("meta_connections")
        .select("id")
        .eq("id", meta_connection_id)
        .maybeSingle();

      if (connErr?.code === "42P01") {
        return NextResponse.json({ ok: false, reason: "sql_pending", message: "Rode o SQL 35 no Supabase." });
      }
      // Se há erro de DB (não-42P01): não bloqueia — o upsert tentará com adminDb
      // Se não há erro e não há linha: conexão realmente não existe
      if (!connErr && !connRow) {
        return NextResponse.json({
          ok: false, reason: "connection_not_found",
          message: "Conexão Meta não encontrada.",
          debug: {
            stage: "verify_meta_connection",
            meta_connection_id_received: !!meta_connection_id,
            hasAdminDb: true,
          },
        }, { status: 404 });
      }
    }
    // Se sem service role, não bloqueia — policy do SQL 60 já inclui super_admin via session
  }

  // Upsert em client_meta_assets — session client primeiro (SQL 59/60)
  const upsertPayload = {
    client_id,
    meta_connection_id: resolvedConnectionId ?? null,
    asset_type,
    asset_id,
    asset_name:   asset_name  ?? null,
    username:     username    ?? null,
    picture_url:  picture_url ?? null,
    is_primary:   is_primary  ?? false,
    connected_by: userId,
  };

  let { data, error } = await supabase
    .from("client_meta_assets")
    .upsert(upsertPayload, { onConflict: "client_id,asset_type,asset_id" })
    .select("id")
    .single();

  if (error && hasSupabaseServiceRoleKey()) {
    try {
      const adminDb = createSupabaseAdminClient();
      const r = await adminDb
        .from("client_meta_assets")
        .upsert(upsertPayload, { onConflict: "client_id,asset_type,asset_id" })
        .select("id")
        .single();
      data  = r.data;
      error = r.error;
    } catch { /* mantém erro original */ }
  }

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json({
        ok: false, reason: "sql_pending",
        message: "Rode o SQL 37 no Supabase para ativar vínculos de ativos Meta. Depois rode SQL 59/60 para incluir super_admin.",
      });
    }
    console.error("[api/meta/assets/link] erro no upsert direto", {
      stage: "upsert_client_meta_assets",
      table: "client_meta_assets",
      client_id,
      asset_type,
      supabaseErrorCode: error.code,
      supabaseErrorMessage: error.message,
    });
    return NextResponse.json({ ok: false, reason: "db_error", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data?.id, via: "direct" });
}

// DELETE /api/meta/assets/link — remove vínculo
export async function DELETE(request: NextRequest) {
  let userId: string | null = null;
  let userRole: string | null = null;
  let supabase: Awaited<ReturnType<typeof createServerSupabaseClient>> | null = null;

  try {
    supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
    if (userId) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
      userRole = profile?.role ?? null;
    }
  } catch { userId = null; }

  if (!userId || !supabase || !userRole || !META_MANAGER_ROLES.has(userRole)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  const assetRecordId = new URL(request.url).searchParams.get("id");
  if (!assetRecordId) return NextResponse.json({ ok: false, reason: "missing_id" }, { status: 400 });

  let { error } = await supabase.from("client_meta_assets").delete().eq("id", assetRecordId);
  if (error) {
    try {
      const adminDb = createSupabaseAdminClient();
      error = (await adminDb.from("client_meta_assets").delete().eq("id", assetRecordId)).error;
    } catch { /* mantém erro original */ }
  }

  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
