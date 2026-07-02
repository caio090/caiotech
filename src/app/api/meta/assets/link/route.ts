import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createSupabaseAdminClient } from "@/lib/supabase/server";

interface LinkPayload {
  client_id: string;
  meta_connection_id: string;
  asset_type: "facebook_page" | "instagram_business";
  asset_id: string;
  asset_name?: string;
  username?: string;
  picture_url?: string;
  is_primary?: boolean;
}

const META_MANAGER_ROLES = new Set(["admin", "super_admin", "agency"]);

// POST /api/meta/assets/link
// Vincula um ativo Meta (Página ou Instagram Business) a um cliente da LOKAT OS.
// Usa upsert em client_meta_assets — nunca expõe token.
// Usa session client por padrão (RLS SQL 59 inclui super_admin).
export async function POST(request: NextRequest) {
  let userId: string | null = null;
  let userRole: string | null = null;
  let supabase: Awaited<ReturnType<typeof createServerSupabaseClient>> | null = null;

  try {
    supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;

    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();
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
  try {
    body = await request.json() as LinkPayload;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 });
  }

  const { client_id, meta_connection_id, asset_type, asset_id, asset_name, username, picture_url, is_primary } = body;

  if (!client_id || !meta_connection_id || !asset_type || !asset_id) {
    return NextResponse.json({ ok: false, reason: "missing_fields", message: "client_id, meta_connection_id, asset_type e asset_id são obrigatórios." }, { status: 400 });
  }

  const validTypes = ["facebook_page", "instagram_business"];
  if (!validTypes.includes(asset_type)) {
    return NextResponse.json({ ok: false, reason: "invalid_asset_type" }, { status: 400 });
  }

  // Tenta criar admin client (service role); cai para session se indisponível.
  // Após SQL 59, session client de super_admin/admin tem acesso direto via RLS.
  let adminDb: ReturnType<typeof createSupabaseAdminClient> | null = null;
  try { adminDb = createSupabaseAdminClient(); } catch { adminDb = null; }

  const db = adminDb ?? supabase;

  // Confirma que a conexão Meta existe (super_admin pode ver qualquer conexão)
  let connQuery = db.from("meta_connections").select("id").eq("id", meta_connection_id);
  if (userRole !== "super_admin") connQuery = connQuery.eq("connected_by", userId);

  const { data: conn, error: connError } = await connQuery.maybeSingle();

  if (connError?.code === "42P01") {
    return NextResponse.json({ ok: false, reason: "sql_pending", message: "Rode o SQL 35 no Supabase." });
  }
  if (!conn) {
    // super_admin: pode ter conexão de outro usuário — tenta sem filtro connected_by
    if (userRole === "super_admin" && adminDb) {
      const { data: connAny } = await adminDb.from("meta_connections").select("id").eq("id", meta_connection_id).maybeSingle();
      if (!connAny) {
        return NextResponse.json({ ok: false, reason: "connection_not_found", message: "Conexão Meta não encontrada." }, { status: 404 });
      }
    } else {
      return NextResponse.json({ ok: false, reason: "connection_not_found", message: "Conexão Meta não encontrada ou não pertence a você." }, { status: 404 });
    }
  }

  // Upsert na client_meta_assets
  // Tenta session client primeiro (RLS do SQL 59 permite super_admin/admin/agency).
  // Se falhar por RLS, tenta admin client.
  const upsertPayload = {
    client_id,
    meta_connection_id,
    asset_type,
    asset_id,
    asset_name:   asset_name   ?? null,
    username:     username     ?? null,
    picture_url:  picture_url  ?? null,
    is_primary:   is_primary   ?? false,
    connected_by: userId,
  };

  let { data, error } = await supabase
    .from("client_meta_assets")
    .upsert(upsertPayload, { onConflict: "client_id,asset_type,asset_id" })
    .select("id")
    .single();

  // Se session client falhou por RLS (policy não atualizada), tenta admin client
  if (error && adminDb) {
    const adminResult = await adminDb
      .from("client_meta_assets")
      .upsert(upsertPayload, { onConflict: "client_id,asset_type,asset_id" })
      .select("id")
      .single();
    data  = adminResult.data;
    error = adminResult.error;
  }

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json({ ok: false, reason: "sql_pending", message: "Rode o SQL 37 no Supabase para ativar vínculos de ativos Meta com clientes. Depois rode o SQL 59 para incluir super_admin." });
    }
    return NextResponse.json({ ok: false, reason: "db_error", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data?.id });
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

  const { searchParams } = new URL(request.url);
  const assetRecordId = searchParams.get("id");
  if (!assetRecordId) {
    return NextResponse.json({ ok: false, reason: "missing_id" }, { status: 400 });
  }

  let { error } = await supabase.from("client_meta_assets").delete().eq("id", assetRecordId);

  if (error) {
    try {
      const adminDb = createSupabaseAdminClient();
      error = (await adminDb.from("client_meta_assets").delete().eq("id", assetRecordId)).error;
    } catch { /* mantém erro original */ }
  }

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
