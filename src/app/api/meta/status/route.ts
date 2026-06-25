import { NextResponse } from "next/server";

// GET /api/meta/status
// Verifica se as variáveis de ambiente da Meta estão configuradas.
// NUNCA retorna os valores reais das variáveis sensíveis.
export async function GET() {
  const appId      = process.env.META_APP_ID?.trim();
  const appSecret  = process.env.META_APP_SECRET?.trim();
  const redirectUri = process.env.META_REDIRECT_URI?.trim();
  const apiVersion = process.env.META_API_VERSION?.trim();

  const missing: string[] = [];
  if (!appId)       missing.push("META_APP_ID");
  if (!appSecret)   missing.push("META_APP_SECRET");
  if (!redirectUri) missing.push("META_REDIRECT_URI");
  if (!apiVersion)  missing.push("META_API_VERSION");

  if (missing.length > 0) {
    return NextResponse.json({ ok: false, missing }, { status: 200 });
  }

  return NextResponse.json({
    ok: true,
    meta: {
      configured: true,
      appId: "configured",        // nunca expõe o valor real
      appSecret: "configured",    // nunca expõe o valor real
      redirectUri: redirectUri,   // redirect URI não é sensível
      apiVersion: apiVersion,     // versão da API não é sensível
    },
  });
}
