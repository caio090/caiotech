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
export async function POST(request: NextRequest) {
  let userId: string | null = null;
  let userRole: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
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

  if (!userId) {
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

  const supabase = await createServerSupabaseClient();
  const admin = createSupabaseAdminClient() ?? supabase;

  // Confirma que a conexão Meta pertence ao usuário autenticado
  let connQuery = admin
    .from("meta_connections")
    .select("id")
    .eq("id", meta_connection_id);

  if (userRole !== "super_admin") connQuery = connQuery.eq("connected_by", userId);

  const { data: conn, error: connError } = await connQuery.maybeSingle();

  if (connError?.code === "42P01") {
    return NextResponse.json({ ok: false, reason: "sql_pending", message: "Rode o SQL 35." });
  }
  if (!conn) {
    return NextResponse.json({ ok: false, reason: "connection_not_found", message: "Conexão Meta não encontrada ou não pertence a você." }, { status: 404 });
  }

  // Upsert na client_meta_assets
  const { data, error } = await admin
    .from("client_meta_assets")
    .upsert(
      {
        client_id,
        meta_connection_id,
        asset_type,
        asset_id,
        asset_name:   asset_name   ?? null,
        username:     username     ?? null,
        picture_url:  picture_url  ?? null,
        is_primary:   is_primary   ?? false,
        connected_by: userId,
      },
      { onConflict: "client_id,asset_type,asset_id" }
    )
    .select("id")
    .single();

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json({ ok: false, reason: "sql_pending", message: "Rode o SQL 37 no Supabase para ativar vínculos de ativos Meta com clientes." });
    }
    return NextResponse.json({ ok: false, reason: "db_error", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data?.id });
}

// DELETE /api/meta/assets/link — remove vínculo
export async function DELETE(request: NextRequest) {
  let userId: string | null = null;
  let userRole: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
    if (userId) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
      userRole = profile?.role ?? null;
    }
  } catch { userId = null; }

  if (!userId || !userRole || !META_MANAGER_ROLES.has(userRole)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const assetRecordId = searchParams.get("id");

  if (!assetRecordId) {
    return NextResponse.json({ ok: false, reason: "missing_id" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const admin = createSupabaseAdminClient() ?? supabase;
  const { error } = await admin.from("client_meta_assets").delete().eq("id", assetRecordId);

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
