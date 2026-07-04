import { NextRequest, NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  createSupabaseAdminClient,
  hasSupabaseServiceRoleKey,
} from "@/lib/supabase/server";

const ALLOWED_ROLES = new Set(["admin", "super_admin", "operacional", "agency", "team"]);

// GET /api/meta/insights/status?client_id=<uuid>
// Diagnóstico seguro da integração Meta para um cliente específico.
// Nunca retorna access_token nem refresh_token.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("client_id");

  if (!clientId) {
    return NextResponse.json(
      { ok: false, reason: "missing_client_id", message: "Parâmetro client_id obrigatório." },
      { status: 400 }
    );
  }

  // Autenticação
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
  } catch {
    userId = null;
  }

  if (!userId || !supabase) {
    return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });
  }
  if (!userRole || !ALLOWED_ROLES.has(userRole)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  // Usa adminDb para bypassar RLS quando disponível
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any = supabase;
  if (hasSupabaseServiceRoleKey()) {
    try { db = createSupabaseAdminClient(); } catch { /* usa session */ }
  }

  // Busca ativos Meta vinculados ao cliente
  const { data: assets, error: assetsErr } = await db
    .from("client_meta_assets")
    .select("id, asset_type, asset_id, username, asset_name, meta_connection_id, connected_at")
    .eq("client_id", clientId)
    .order("connected_at", { ascending: false });

  if (assetsErr?.code === "42P01") {
    return NextResponse.json({
      ok: false,
      reason: "sql_pending",
      message: "Tabela client_meta_assets não existe. Rode o SQL 37 e o SQL 62 no Supabase.",
      missing: ["sql_37", "sql_62"],
    });
  }

  const assetRows = (assets ?? []) as Array<{
    id: string;
    asset_type: string;
    asset_id: string;
    username: string | null;
    asset_name: string | null;
    meta_connection_id: string | null;
    connected_at: string | null;
  }>;

  const hasLinkedAsset = assetRows.length > 0;

  if (!hasLinkedAsset) {
    return NextResponse.json({
      ok: false,
      client_id: clientId,
      hasLinkedAsset: false,
      hasMetaConnection: false,
      hasAccessToken: false,
      canAttemptInsights: false,
      missing: ["linked_asset"],
      diagnostics: { assetSource: "client_meta_assets" },
      safeMessage: "Nenhum ativo Meta vinculado a este cliente. Acesse Conexões para vincular uma Página ou Instagram.",
    });
  }

  // Prefere instagram_business, senão pega facebook_page
  const primaryAsset =
    assetRows.find((a) => a.asset_type === "instagram_business") ??
    assetRows.find((a) => a.asset_type === "facebook_page") ??
    assetRows[0];

  const connectionId = primaryAsset.meta_connection_id;

  if (!connectionId) {
    return NextResponse.json({
      ok: false,
      client_id: clientId,
      hasLinkedAsset: true,
      assetType: primaryAsset.asset_type,
      assetId: primaryAsset.asset_id,
      username: primaryAsset.username,
      hasMetaConnection: false,
      hasAccessToken: false,
      canAttemptInsights: false,
      missing: ["meta_connection_id"],
      diagnostics: { assetSource: "client_meta_assets", connectionSource: null },
      safeMessage: "Ativo vinculado sem conexão Meta associada. Reconecte a Meta em /admin/conexoes e re-vincule o ativo.",
    });
  }

  // Busca meta_connection
  const { data: conn, error: connErr } = await db
    .from("meta_connections")
    .select("id, status, token_expires_at, scopes, meta_user_id, page_id, instagram_business_account_id")
    .eq("id", connectionId)
    .maybeSingle();

  if (connErr?.code === "42P01") {
    return NextResponse.json({
      ok: false,
      reason: "sql_pending",
      message: "Tabela meta_connections não existe. Rode o SQL 35.",
      missing: ["sql_35"],
    });
  }

  const hasMetaConnection = !!conn;

  if (!hasMetaConnection) {
    return NextResponse.json({
      ok: false,
      client_id: clientId,
      hasLinkedAsset: true,
      assetType: primaryAsset.asset_type,
      assetId: primaryAsset.asset_id,
      username: primaryAsset.username,
      hasMetaConnection: false,
      hasAccessToken: false,
      canAttemptInsights: false,
      missing: ["meta_connection_record"],
      diagnostics: { connectionSource: "meta_connections", connectionId },
      safeMessage: "Registro de conexão Meta não encontrado. A conexão pode ter sido removida.",
    });
  }

  // Verifica token sem expô-lo
  // Buscamos access_token só para checar presença — nunca incluído na resposta
  const { data: tokenCheck } = await db
    .from("meta_connections")
    .select("access_token")
    .eq("id", connectionId)
    .maybeSingle();

  const hasAccessToken = !!(tokenCheck?.access_token);

  const tokenExpired =
    conn.token_expires_at
      ? new Date(conn.token_expires_at) < new Date()
      : false;

  const missing: string[] = [];
  if (!hasAccessToken) missing.push("access_token");
  if (tokenExpired)    missing.push("token_expired");
  if (conn.status !== "active") missing.push("connection_not_active");

  const canAttemptInsights =
    hasAccessToken && !tokenExpired && conn.status === "active";

  const scopes = (conn.scopes ?? "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);

  return NextResponse.json({
    ok: canAttemptInsights,
    client_id: clientId,
    hasLinkedAsset: true,
    assetType: primaryAsset.asset_type,
    assetId: primaryAsset.asset_id,
    username: primaryAsset.username ?? primaryAsset.asset_name,
    allAssets: assetRows.map((a) => ({
      id: a.id,
      assetType: a.asset_type,
      assetId: a.asset_id,
      username: a.username,
      assetName: a.asset_name,
    })),
    hasMetaConnection: true,
    connectionId,
    connectionStatus: conn.status,
    hasAccessToken,
    tokenExpired,
    canAttemptInsights,
    scopes,
    missing,
    diagnostics: {
      connectionSource: "meta_connections",
      assetSource: "client_meta_assets",
      metaUserId: conn.meta_user_id,
      pageId: conn.page_id,
      igAccountId: conn.instagram_business_account_id,
    },
    safeMessage: canAttemptInsights
      ? "Conexão ativa. Pronto para buscar insights."
      : tokenExpired
        ? "Token Meta expirado. Reconecte a conta em /admin/conexoes."
        : !hasAccessToken
          ? "Token Meta ausente. Reconecte a conta em /admin/conexoes."
          : `Conexão com status '${conn.status}'. Reconecte em /admin/conexoes.`,
  });
}
