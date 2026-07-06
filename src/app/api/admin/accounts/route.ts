import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  createRequiredSupabaseAdminClient,
  hasSupabaseServiceRoleKey,
} from "@/lib/supabase/server";

// Central de Contas — lista TODOS os usuários usando auth.admin.listUsers()
// como fonte de verdade, independente de profiles, plan ou RLS.
export async function GET() {
  // ── 1. Verificar sessão sem depender de profile/plan ─────────────────
  let currentUserId: string | null = null;
  try {
    const sessionClient = await createServerSupabaseClient();
    const { data: { user } } = await sessionClient.auth.getUser();
    currentUserId = user?.id ?? null;
  } catch {
    return NextResponse.json({ ok: false, code: "unauthenticated" }, { status: 401 });
  }

  if (!currentUserId) {
    return NextResponse.json({ ok: false, code: "unauthenticated" }, { status: 401 });
  }

  if (!hasSupabaseServiceRoleKey()) {
    return NextResponse.json({ ok: false, code: "service_role_missing",
      message: "SUPABASE_SERVICE_ROLE_KEY não configurada no ambiente." }, { status: 503 });
  }

  const admin = createRequiredSupabaseAdminClient();

  // ── 2. Verificar role via service role (não depende de plan/account_type) ──
  const { data: myProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", currentUserId)
    .maybeSingle();

  if (!myProfile || (myProfile as { role?: string }).role !== "super_admin") {
    return NextResponse.json({ ok: false, code: "forbidden",
      debug: { role: (myProfile as { role?: string } | null)?.role ?? "no_profile" } }, { status: 403 });
  }

  // ── 3. Fonte de verdade: auth.admin.listUsers() ───────────────────────
  let authUsers: { id: string; email?: string; created_at: string; last_sign_in_at?: string; user_metadata: Record<string, unknown> }[] = [];
  try {
    const { data: authData, error: authErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (authErr || !authData) {
      return NextResponse.json({
        ok: false,
        code: "auth_users_error",
        message: "Não foi possível listar usuários.",
        debug: { errorMessage: authErr?.message ?? "unknown" },
      }, { status: 500 });
    }
    authUsers = authData.users as typeof authUsers;
  } catch (e) {
    return NextResponse.json({
      ok: false,
      code: "auth_admin_unavailable",
      message: "auth.admin não disponível neste ambiente.",
      debug: { error: e instanceof Error ? e.message : String(e) },
    }, { status: 500 });
  }

  // ── 4. Buscar profiles (sem plan — defensivo) ─────────────────────────
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email, name, role, account_type, account_status, created_at")
    .limit(1000);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id as string, p as Record<string, unknown>])
  );

  // ── 5. Buscar clients não deletados ───────────────────────────────────
  const { data: clients } = await admin
    .from("clients")
    .select("owner_id, id, company_name")
    .is("deleted_at", null)
    .limit(1000);

  const clientMap = new Map(
    (clients ?? []).map((c) => [c.owner_id as string, { id: c.id as string, company_name: c.company_name as string | null }])
  );

  // ── 6. Buscar agency_workspaces ───────────────────────────────────────
  let agencyMap = new Map<string, { id: string; name: string }>();
  try {
    const { data: agencies } = await admin
      .from("agency_workspaces")
      .select("owner_user_id, id, name")
      .limit(500);
    agencyMap = new Map(
      (agencies ?? []).map((a) => [a.owner_user_id as string, { id: a.id as string, name: a.name as string }])
    );
  } catch { /* tabela pode não existir */ }

  // ── 7. Merge: auth users + profiles + clients + agencies ─────────────
  const accounts = authUsers.map((u) => {
    const profile = profileMap.get(u.id);
    const client  = clientMap.get(u.id);
    const agency  = agencyMap.get(u.id);

    const name =
      (profile?.name as string | undefined) ??
      (u.user_metadata?.name as string | undefined) ??
      (u.user_metadata?.full_name as string | undefined) ??
      null;

    const source = profile
      ? (client ? "auth+profile+client" : agency ? "auth+profile+agency" : "auth+profile")
      : "auth_only";

    return {
      id:                  u.id,
      email:               u.email ?? null,
      name,
      role:                (profile?.role as string | null) ?? null,
      account_type:        (profile?.account_type as string | null) ?? null,
      account_status:      (profile?.account_status as string | null) ?? "pending_setup",
      created_at:          u.created_at ?? null,
      last_sign_in_at:     u.last_sign_in_at ?? null,
      company_name:        client?.company_name ?? null,
      client_id:           client?.id ?? null,
      agency_name:         agency?.name ?? null,
      agency_id:           agency?.id ?? null,
      plan_slug:           null as string | null,
      coupon_code:         null as string | null,
      subscription_status: null as string | null,
      source,
      has_profile:         !!profile,
    };
  });

  // Ordenar por created_at desc
  accounts.sort((a, b) => {
    if (!a.created_at) return 1;
    if (!b.created_at) return -1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return NextResponse.json({
    ok:      true,
    total:   accounts.length,
    accounts,
    debug: {
      authUserCount:    authUsers.length,
      profileCount:     profiles?.length ?? 0,
      clientCount:      clients?.length ?? 0,
      agencyCount:      agencyMap.size,
    },
  });
}
