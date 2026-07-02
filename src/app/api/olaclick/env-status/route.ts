import { NextResponse } from "next/server";
import { createServerSupabaseClient, hasSupabaseServiceRoleKey } from "@/lib/supabase/server";

// GET /api/olaclick/env-status
// Retorna presença das envs necessárias para sincronização OlaClick.
// Nunca retorna o valor das variáveis — apenas booleanos.
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });

    const hasBaseUrl         = Boolean(process.env.OLACLICK_API_BASE_URL?.trim());
    const hasServiceRole     = hasSupabaseServiceRoleKey();
    const hasAnyConnection   = false; // será calculado abaixo

    // Conta conexões sem expor tokens
    let connectionCount = 0;
    try {
      const { count } = await supabase
        .from("olaclick_connections")
        .select("id", { count: "exact", head: true })
        .eq("status", "connected");
      connectionCount = count ?? 0;
    } catch { /* sql 39 não rodado — fica 0 */ }

    return NextResponse.json({
      ok:                true,
      hasBaseUrl,
      hasServiceRole,
      hasAnyConnection:  connectionCount > 0,
      connectionCount,
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "internal_error" }, { status: 500 });
  }
}
