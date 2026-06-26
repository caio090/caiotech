import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/meta/accounts
// Busca ativos Meta do usuário logado: páginas, Instagram Business accounts e BM.
// Usa o token salvo em meta_connections — nunca expõe o token ao front-end.
export async function GET() {
  const apiVersion = process.env.META_API_VERSION?.trim() ?? "v21.0";

  // 1. Sessão
  let userId: string | null = null;
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch { userId = null; }

  if (!userId) {
    return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });
  }

  // 2. Busca token ativo
  let accessToken: string | null = null;
  let connectionId: string | null = null;
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("meta_connections")
      .select("id, access_token, status, is_active")
      .eq("connected_by", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error?.code === "42P01") {
      return NextResponse.json({ ok: false, reason: "sql_pending", message: "Rode o SQL 35 no Supabase." });
    }
    if (error) throw error;
    if (!data) {
      return NextResponse.json({ ok: false, reason: "not_connected", message: "Nenhuma conexão Meta ativa." });
    }
    accessToken = data.access_token as string | null;
    connectionId = data.id as string;
  } catch {
    return NextResponse.json({ ok: false, reason: "db_error", message: "Erro ao consultar conexões." });
  }

  if (!accessToken) {
    return NextResponse.json({ ok: false, reason: "no_token", message: "Token não encontrado. Reconecte a conta Meta." });
  }

  // 3. Busca páginas e contas Instagram via Graph API (server-side)
  try {
    const pagesRes = await fetch(
      `https://graph.facebook.com/${apiVersion}/me/accounts?fields=id,name,picture{url},instagram_business_account{id,name,username,profile_picture_url}&access_token=${accessToken}`
    );
    const pagesData = await pagesRes.json() as {
      data?: Array<{
        id: string;
        name: string;
        picture?: { data?: { url?: string } };
        instagram_business_account?: {
          id: string;
          name?: string;
          username?: string;
          profile_picture_url?: string;
        };
      }>;
      error?: { message: string; code: number };
    };

    if (pagesData.error) {
      return NextResponse.json({
        ok: false,
        reason: "graph_error",
        message: pagesData.error.message,
        connection_id: connectionId,
      });
    }

    const pages = (pagesData.data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      picture_url: p.picture?.data?.url ?? null,
      instagram: p.instagram_business_account
        ? {
            id: p.instagram_business_account.id,
            name: p.instagram_business_account.name ?? null,
            username: p.instagram_business_account.username ?? null,
            picture_url: p.instagram_business_account.profile_picture_url ?? null,
          }
        : null,
    }));

    const instagramAccounts = pages
      .filter((p) => p.instagram !== null)
      .map((p) => p.instagram!);

    return NextResponse.json({
      ok: true,
      connection_id: connectionId,
      pages,
      instagram_accounts: instagramAccounts,
      total_pages: pages.length,
      total_instagram: instagramAccounts.length,
    });
  } catch {
    return NextResponse.json({
      ok: false,
      reason: "fetch_error",
      message: "Erro ao consultar Graph API da Meta.",
    });
  }
}
