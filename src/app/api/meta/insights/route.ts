import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/meta/insights
// Verifica se existe conexão Meta ativa e retorna estrutura preparada para métricas.
// Não inventa dados — se não houver conexão real, retorna motivo claro.
export async function GET() {
  // 1. Verifica vars de ambiente
  const appId      = process.env.META_APP_ID?.trim();
  const appSecret  = process.env.META_APP_SECRET?.trim();
  const apiVersion = process.env.META_API_VERSION?.trim() ?? "v21.0";

  if (!appId || !appSecret) {
    return NextResponse.json({
      ok:      false,
      reason:  "env_missing",
      message: "Variáveis Meta não configuradas. Adicione META_APP_ID e META_APP_SECRET na Vercel.",
    });
  }

  // 2. Verifica sessão do usuário
  let userId: string | null = null;
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }

  if (!userId) {
    return NextResponse.json(
      { ok: false, reason: "unauthenticated", message: "Usuário não autenticado." },
      { status: 401 }
    );
  }

  // 3. Busca conexão ativa na tabela meta_connections
  let connection: {
    id: string;
    page_id: string | null;
    page_name: string | null;
    instagram_business_account_id: string | null;
    instagram_username: string | null;
    token_expires_at: string | null;
    scopes: string | null;
    status: string;
    is_active: boolean | null;
  } | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("meta_connections")
      .select("id, page_id, page_name, instagram_business_account_id, instagram_username, token_expires_at, scopes, status, is_active")
      .eq("connected_by", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json({
          ok:      false,
          reason:  "sql_pending",
          message: "Tabela meta_connections não existe. Rode o SQL 35 no Supabase Editor para ativar conexões.",
        });
      }
      throw error;
    }

    connection = data;
  } catch {
    return NextResponse.json({
      ok:      false,
      reason:  "db_error",
      message: "Erro ao consultar conexões Meta no banco de dados.",
    });
  }

  if (!connection) {
    return NextResponse.json({
      ok:      false,
      reason:  "not_connected",
      message: "Conecte a Meta para visualizar insights reais.",
    });
  }

  // 4. Verifica se o token expirou
  if (connection.token_expires_at) {
    if (new Date(connection.token_expires_at) < new Date()) {
      return NextResponse.json({
        ok:            false,
        reason:        "token_expired",
        message:       "Token da Meta expirado. Reconecte a conta para renovar o acesso.",
        connection_id: connection.id,
      });
    }
  }

  // 5. Verifica se tem page_id ou instagram_business_account_id
  if (!connection.page_id && !connection.instagram_business_account_id) {
    return NextResponse.json({
      ok:            false,
      reason:        "no_accounts",
      message:       "Conta Meta conectada, mas nenhuma Página ou conta Instagram Business encontrada. Verifique as permissões no Meta Developers.",
      connection_id: connection.id,
    });
  }

  // 6. Verifica permissão de insights
  const scopes = connection.scopes?.split(",").map((s) => s.trim()) ?? [];
  const hasInsightsScope = scopes.includes("instagram_manage_insights") || scopes.length === 0;

  if (!hasInsightsScope) {
    return NextResponse.json({
      ok:            false,
      reason:        "insufficient_permissions",
      message:       "Permissões insuficientes para insights. Reconecte e aceite o escopo instagram_manage_insights.",
      connection_id: connection.id,
    });
  }

  // 7. Conexão ativa — retorna estrutura preparada (dados reais virão via Graph API futuramente)
  return NextResponse.json({
    ok:      true,
    reason:  "ready",
    message: "Conexão ativa. Insights disponíveis.",
    connection: {
      id:                            connection.id,
      page_id:                       connection.page_id,
      page_name:                     connection.page_name,
      instagram_business_account_id: connection.instagram_business_account_id,
      instagram_username:            connection.instagram_username,
      api_version:                   apiVersion,
    },
    metrics_available: [
      "alcance",
      "impressoes",
      "engajamento",
      "seguidores",
      "posts_recentes",
      "performance_por_midia",
    ],
    publish_available: false,
    publish_note:      "Publicação automática: em breve. Requer aprovação do Meta App Review.",
  });
}
