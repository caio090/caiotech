import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// GET /api/meta/callback
// Recebe o callback OAuth do Meta após o usuário autorizar o app.
// Fluxo: Meta redireciona aqui com ?code=...&state=...
// O code é trocado por access_token via Graph API e salvo em meta_connections.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorReason = searchParams.get("error_reason");

  // Usuário negou o acesso
  if (error) {
    const msg = errorReason === "user_denied"
      ? "Autorização cancelada pelo usuário."
      : "Não foi possível conectar. Tente novamente.";
    return NextResponse.redirect(`${APP_URL}/admin/conexoes?meta_error=${encodeURIComponent(msg)}`);
  }

  // Code não veio
  if (!code) {
    return NextResponse.redirect(`${APP_URL}/admin/conexoes?meta_error=${encodeURIComponent("Parâmetro code ausente no callback.")}`);
  }

  // Valida sessão do usuário via state (base64url do userId)
  let userId: string | null = null;
  if (state) {
    try {
      userId = Buffer.from(state, "base64url").toString("utf8");
    } catch {
      userId = null;
    }
  }

  // Se não conseguiu extrair userId do state, valida pela sessão ativa
  if (!userId) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    } catch {
      userId = null;
    }
  }

  if (!userId) {
    return NextResponse.redirect(`${APP_URL}/login?redirect=/admin/conexoes`);
  }

  // Variáveis necessárias para troca do code por token
  const appId      = process.env.META_APP_ID?.trim();
  const appSecret  = process.env.META_APP_SECRET?.trim();
  const redirectUri = process.env.META_REDIRECT_URI?.trim();

  if (!appId || !appSecret || !redirectUri) {
    return NextResponse.redirect(
      `${APP_URL}/admin/conexoes?meta_error=${encodeURIComponent("Variáveis Meta não configuradas. Adicione no painel da Vercel.")}`
    );
  }

  // Troca o code por access_token
  let accessToken: string | null = null;
  try {
    const tokenUrl = new URL("https://graph.facebook.com/oauth/access_token");
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret); // server-side only — nunca exposto
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = await tokenRes.json() as { access_token?: string; error?: { message: string } };

    if (tokenData.error || !tokenData.access_token) {
      const msg = tokenData.error?.message ?? "Falha ao obter token da Meta.";
      return NextResponse.redirect(`${APP_URL}/admin/conexoes?meta_error=${encodeURIComponent(msg)}`);
    }

    accessToken = tokenData.access_token;
  } catch {
    return NextResponse.redirect(
      `${APP_URL}/admin/conexoes?meta_error=${encodeURIComponent("Erro ao comunicar com a API da Meta.")}`
    );
  }

  // Busca dados básicos da conta Meta autorizada
  let metaUserId: string | null = null;
  let metaUserName: string | null = null;
  try {
    const meRes = await fetch(`https://graph.facebook.com/me?fields=id,name&access_token=${accessToken}`);
    const meData = await meRes.json() as { id?: string; name?: string };
    metaUserId = meData.id ?? null;
    metaUserName = meData.name ?? null;
  } catch {
    // não crítico — prossegue sem nome
  }

  // Tenta salvar em meta_connections (só funciona após rodar SQL 35 no Supabase)
  try {
    const supabase = await createServerSupabaseClient();

    const { error: insertError } = await supabase.from("meta_connections").insert({
      connected_by:  userId,
      provider:      "meta",
      meta_app_id:   appId,
      meta_user_id:  metaUserId,
      access_token:  accessToken,
      status:        "active",
      is_active:     true,
    });

    if (insertError) {
      // Tabela ainda não existe ou outro erro de DB
      if (insertError.code === "42P01") {
        // relation does not exist — SQL 35 não foi rodado
        return NextResponse.redirect(
          `${APP_URL}/admin/conexoes?meta_warn=${encodeURIComponent("OAuth recebido com sucesso, mas a tabela meta_connections ainda não existe. Rode o SQL 35 no Supabase para salvar a conexão.")}`
        );
      }
      throw insertError;
    }

    const successMsg = metaUserName
      ? `Conta Meta conectada: ${metaUserName}`
      : "Conta Meta conectada com sucesso.";
    return NextResponse.redirect(`${APP_URL}/admin/conexoes?meta_ok=${encodeURIComponent(successMsg)}`);
  } catch {
    return NextResponse.redirect(
      `${APP_URL}/admin/conexoes?meta_warn=${encodeURIComponent("OAuth recebido. Rode o SQL 35 no Supabase para ativar o salvamento da conexão.")}`
    );
  }
}
