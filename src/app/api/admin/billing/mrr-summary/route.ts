// GET /api/admin/billing/mrr-summary — super_admin only.
//
// Sprint Legacy Security Hardening V2 (Fase 8-11): v_billing_mrr_summary
// não pode mais ser lida diretamente do browser (a policy da view não
// distingue super_admin de qualquer outro authenticated). A autorização
// acontece ANTES de qualquer client privilegiado ser criado -- nunca o
// padrão "service-role query, depois checa usuário".
import { NextResponse, type NextRequest } from "next/server";
import {
  createServerSupabaseClient,
  createRequiredSupabaseAdminClient,
  hasSupabaseServiceRoleKey,
} from "@/lib/supabase/server";

export async function GET(_req: NextRequest) {
  const supabase = await createServerSupabaseClient().catch(() => null);
  if (!supabase) return NextResponse.json({ ok: false, reason: "supabase_not_configured" }, { status: 503 });

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  if ((profile as { role?: string } | null)?.role !== "super_admin") {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  if (!hasSupabaseServiceRoleKey()) {
    return NextResponse.json({ ok: false, reason: "service_role_missing" }, { status: 503 });
  }

  const admin = createRequiredSupabaseAdminClient();
  const { data, error } = await admin.from("v_billing_mrr_summary").select("*").maybeSingle();
  if (error) {
    if (error.code === "42P01") return NextResponse.json({ ok: false, reason: "sql_pending" }, { status: 200 });
    return NextResponse.json({ ok: false, reason: "internal_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, mrr: data ?? null });
}
