import { NextResponse } from "next/server";
import { createServerSupabaseClient, createSupabaseAdminClient, hasSupabaseServiceRoleKey } from "@/lib/supabase/server";
import { listAuthorizedCompanies } from "@/lib/office-global/authorized-companies";

/**
 * Sprint Command Center + Jarvis Context V1 — wrapper fino client-callable
 * sobre listAuthorizedCompanies() (já usado por /admin/escritorio no modo
 * Global). Reaproveitado aqui para o Company Picker inline do Command
 * Center e para o seletor de contexto do Jarvis -- nenhum segundo
 * resolvedor de autorização, mesmo modelo canônico (profiles.client_id /
 * client_user_access / agency_workspaces+agency_clients).
 */
export async function GET() {
  const supabase = await createServerSupabaseClient().catch(() => null);
  if (!supabase) return NextResponse.json({ ok: false, companies: [] }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, companies: [] }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role ?? "";

  if (!hasSupabaseServiceRoleKey()) {
    return NextResponse.json({ ok: true, companies: [] });
  }

  const adminDb = createSupabaseAdminClient();
  const companies = await listAuthorizedCompanies(adminDb, user.id, role);
  return NextResponse.json({ ok: true, companies: companies.map((c) => ({ id: c.id, name: c.companyName })) });
}
