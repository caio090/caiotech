import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient, hasSupabaseServiceRoleKey } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/app-url";
import { verifyOAuthState } from "@/lib/meta/state";
import { META_OAUTH_SCOPES } from "@/lib/meta/publishing";

// GET /api/meta/callback
// Recebe o retorno OAuth do Meta, valida state assinado, troca code por token
// e persiste em meta_connections via admin client (não depende de sessão ativa).
export async function GET(request: NextRequest) {
  const appUrl = getAppUrl();
  const { searchParams } = new URL(request.url);
  const code        = searchParams.get("code");
  const rawState    = searchParams.get("state");
  const errorParam  = searchParams.get("error");
  const errorReason = searchParams.get("error_reason");

  // ── 1. Usuário cancelou o OAuth ───────────────────────────────────────
  if (errorParam) {
    const msg = errorReason === "user_denied"
      ? "Autorização cancelada pelo usuário."
      : "Não foi possível conectar a conta Meta. Tente novamente.";
    return NextResponse.redirect(
      `${appUrl}/admin/conexoes?meta_error=${encodeURIComponent(msg)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${appUrl}/admin/conexoes?meta_error=${encodeURIComponent("Parâmetro code ausente no callback OAuth.")}`
    );
  }

  // ── 2. Valida state HMAC assinado ─────────────────────────────────────
  if (!rawState) {
    return NextResponse.redirect(
      `${appUrl}/admin/conexoes?meta_error=${encodeURIComponent("State OAuth ausente. Tente reconectar.")}`
    );
  }

  const stateResult = verifyOAuthState(rawState);
  if (!stateResult.ok) {
    const msgs: Record<string, string> = {
      invalid_format:    "State OAuth inválido. Tente reconectar.",
      invalid_signature: "State OAuth adulterado. Por segurança, a conexão foi bloqueada.",
      expired:           "A sessão OAuth expirou (limite: 10 minutos). Tente reconectar.",
      replay:            "State OAuth já utilizado. Por segurança, a conexão foi bloqueada.",
    };
    return NextResponse.redirect(
      `${appUrl}/admin/conexoes?meta_error=${encodeURIComponent(msgs[stateResult.reason] ?? "Erro de validação OAuth.")}`
    );
  }

  const { uid: userId, cid: clientId, rt: returnTo } = stateResult.payload;

  // ── 3. Troca code por access_token ────────────────────────────────────
  const appId      = process.env.META_APP_ID?.trim();
  const appSecret  = process.env.META_APP_SECRET?.trim();
  const redirectUri = process.env.META_REDIRECT_URI?.trim();

  if (!appId || !appSecret || !redirectUri) {
    return NextResponse.redirect(
      `${appUrl}/admin/conexoes?meta_error=${encodeURIComponent("Variáveis Meta não configuradas no servidor.")}`
    );
  }

  let accessToken: string | null = null;
  try {
    const tokenUrl = new URL("https://graph.facebook.com/oauth/access_token");
    tokenUrl.searchParams.set("client_id",     appId);
    tokenUrl.searchParams.set("client_secret", appSecret); // server-side only
    tokenUrl.searchParams.set("redirect_uri",  redirectUri);
    tokenUrl.searchParams.set("code",          code);

    const tokenRes  = await fetch(tokenUrl.toString());
    const tokenData = await tokenRes.json() as { access_token?: string; error?: { message: string } };

    if (tokenData.error || !tokenData.access_token) {
      const msg = tokenData.error?.message
        ? "Falha ao obter token da Meta. Verifique as credenciais do app."
        : "Resposta inesperada da Meta ao trocar o code.";
      return NextResponse.redirect(
        `${appUrl}/admin/conexoes?meta_error=${encodeURIComponent(msg)}`
      );
    }

    accessToken = tokenData.access_token;
  } catch {
    return NextResponse.redirect(
      `${appUrl}/admin/conexoes?meta_error=${encodeURIComponent("Erro de rede ao comunicar com a API da Meta.")}`
    );
  }

  // ── 4. Busca metadados da conta Meta (não-crítico) ────────────────────
  let metaUserId:   string | null = null;
  let metaUserName: string | null = null;
  let grantedScopes = "";
  try {
    const [meRes, permissionsRes] = await Promise.all([
      fetch(`https://graph.facebook.com/me?fields=id,name&access_token=${accessToken}`),
      fetch(`https://graph.facebook.com/me/permissions?access_token=${accessToken}`),
    ]);
    const meData = await meRes.json() as { id?: string; name?: string };
    const permissionsData = await permissionsRes.json() as {
      data?: Array<{ permission?: string; status?: string }>;
    };
    metaUserId   = meData.id   ?? null;
    metaUserName = meData.name ?? null;
    grantedScopes = (permissionsData.data ?? [])
      .filter((permission) => permission.status === "granted" && permission.permission)
      .map((permission) => permission.permission!)
      .filter((permission) => META_OAUTH_SCOPES.includes(permission as typeof META_OAUTH_SCOPES[number]))
      .join(",");
  } catch { /* não crítico */ }

  // ── 5. Persiste em meta_connections via admin client (bypassa RLS) ────
  //    connected_by vem exclusivamente do state validado, não de query param.
  if (!hasSupabaseServiceRoleKey()) {
    // Sem service role, não consegue persistir sem depender de sessão.
    // Avisa sem registrar o token no log.
    return NextResponse.redirect(
      `${appUrl}/admin/conexoes?meta_warn=${encodeURIComponent(
        "OAuth autorizado, mas SUPABASE_SERVICE_ROLE_KEY não está configurada. Configure-a na Vercel para salvar a conexão."
      )}`
    );
  }

  const adminDb = createSupabaseAdminClient();
  let newConnectionId: string | null = null;

  // No unique constraint exists on (connected_by, meta_user_id) in
  // meta_connections (see docs/supabase/35-meta-connections.sql) — adding
  // one is a schema change out of scope for this fix. Instead, look up the
  // existing row for this exact user+Meta-account combination and update it
  // in place; only insert when it's genuinely a new connection. This closes
  // the insert-only gap that produced a fresh duplicate row on every
  // reconnection, without inventing a constraint the table doesn't have.
  try {
    const existingQuery = adminDb
      .from("meta_connections")
      .select("id")
      .eq("connected_by", userId)
      .eq("provider", "meta");
    const { data: existing } = metaUserId
      ? await existingQuery.eq("meta_user_id", metaUserId).maybeSingle()
      : await existingQuery.is("meta_user_id", null).maybeSingle();

    const connectionFields = {
      connected_by: userId,
      provider:     "meta",
      meta_app_id:  appId,
      meta_user_id: metaUserId,
      access_token: accessToken, // armazenado server-side, nunca enviado ao front
      scopes:       grantedScopes,
      status:       "active",
      is_active:    true,
    };

    const { data: saved, error: saveError } = existing?.id
      ? await adminDb.from("meta_connections").update(connectionFields).eq("id", existing.id).select("id").single()
      : await adminDb.from("meta_connections").insert(connectionFields).select("id").single();

    if (saveError) {
      if (saveError.code === "42P01") {
        return NextResponse.redirect(
          `${appUrl}/admin/conexoes?meta_warn=${encodeURIComponent(
            "OAuth autorizado com sucesso, mas a tabela meta_connections ainda não existe. Rode o SQL 35 no Supabase."
          )}`
        );
      }
      // Erro real de DB — não redireciona como sucesso
      console.error("[meta/callback] falha ao salvar conexão", {
        code:    saveError.code,
        message: saveError.message,
        // Nunca loga token
      });
      return NextResponse.redirect(
        `${appUrl}/admin/conexoes?meta_error=${encodeURIComponent(
          "Falha ao salvar a conexão Meta. Tente reconectar ou contate o suporte."
        )}`
      );
    }

    newConnectionId = saved?.id ?? existing?.id ?? null;
  } catch {
    return NextResponse.redirect(
      `${appUrl}/admin/conexoes?meta_error=${encodeURIComponent("Erro inesperado ao salvar a conexão Meta.")}`
    );
  }

  // ── 6. Retorno contextual ─────────────────────────────────────────────
  const successMsg = metaUserName
    ? `Conta Meta conectada: ${metaUserName}`
    : "Conta Meta conectada com sucesso.";

  // Se o OAuth foi iniciado a partir de um cliente, retorna ao contexto do cliente
  if (returnTo === "/admin/clientes" && clientId) {
    const params = new URLSearchParams({
      provider:    "meta",
      client:      clientId,
      meta_ok:     encodeURIComponent(successMsg),
    });
    if (newConnectionId) params.set("connection", newConnectionId);
    return NextResponse.redirect(`${appUrl}/admin/clientes?${params.toString()}`);
  }

  return NextResponse.redirect(
    `${appUrl}/admin/conexoes?meta_ok=${encodeURIComponent(successMsg)}`
  );
}
