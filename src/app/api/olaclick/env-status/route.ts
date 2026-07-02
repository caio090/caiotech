import { NextResponse } from "next/server";
import { createServerSupabaseClient, hasSupabaseServiceRoleKey } from "@/lib/supabase/server";

// GET /api/olaclick/env-status
// Retorna presença das configurações necessárias para sincronização OlaClick.
// Nunca retorna o valor das variáveis — apenas booleanos.
//
// hasBaseUrl: true se QUALQUER conexão ativa tiver api_base_url salva
//             OU se a env OLACLICK_API_BASE_URL estiver configurada.
//             Não é requisito por cliente — pode variar por conexão.
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });

    const hasGlobalEnv    = Boolean(process.env.OLACLICK_API_BASE_URL?.trim());
    const hasServiceRole  = hasSupabaseServiceRoleKey();

    let connectionCount = 0;
    let connectionsWithUrl = 0;

    try {
      const { data: conns } = await supabase
        .from("olaclick_connections")
        .select("id, api_base_url")
        .eq("status", "connected");

      connectionCount = conns?.length ?? 0;
      connectionsWithUrl = conns?.filter((c) => c.api_base_url?.trim()).length ?? 0;
    } catch { /* sql 39 não rodado — fica 0 */ }

    return NextResponse.json({
      ok:                   true,
      hasGlobalEnv,
      hasServiceRole,
      hasAnyConnection:     connectionCount > 0,
      connectionCount,
      connectionsWithUrl,
      // hasBaseUrl = true se env global presente OU se alguma conexão tem url própria
      // Mantido para compatibilidade com faturamento/page.tsx
      hasBaseUrl:           hasGlobalEnv || connectionsWithUrl > 0,
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "internal_error" }, { status: 500 });
  }
}
