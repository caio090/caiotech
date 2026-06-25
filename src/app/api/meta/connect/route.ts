import { NextResponse } from "next/server";

// GET /api/meta/connect
// Monta a URL de autorização OAuth do Meta/Facebook e redireciona o usuário.
//
// Escopos solicitados:
//   - pages_show_list           → listar páginas do Facebook
//   - pages_read_engagement     → ler engajamento das páginas
//   - instagram_basic           → acesso básico ao Instagram Business
//   - instagram_manage_insights → acessar métricas/insights do Instagram
//   - business_management       → acesso ao Meta Business Manager
//
// NOTA: instagram_manage_insights e business_management exigem
// revisão e aprovação pelo Meta App Review antes de funcionar
// em produção para usuários fora do time de desenvolvimento.
export async function GET() {
  const appId      = process.env.META_APP_ID?.trim();
  const redirectUri = process.env.META_REDIRECT_URI?.trim();
  const apiVersion = process.env.META_API_VERSION?.trim() ?? "v21.0";

  if (!appId || !redirectUri) {
    return NextResponse.json(
      { ok: false, error: "META_APP_ID ou META_REDIRECT_URI não configurados." },
      { status: 500 }
    );
  }

  const scopes = [
    "pages_show_list",
    "pages_read_engagement",
    "instagram_basic",
    "instagram_manage_insights",
    "business_management",
  ].join(",");

  const authUrl = new URL(`https://www.facebook.com/${apiVersion}/dialog/oauth`);
  authUrl.searchParams.set("client_id", appId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("response_type", "code");

  return NextResponse.redirect(authUrl.toString());
}
