import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  createRequiredSupabaseAdminClient,
  hasSupabaseServiceRoleKey,
} from "@/lib/supabase/server";

const ALLOWED_ROLES = new Set(["super_admin", "admin"]);

// Central de Contas — usa session client para auth (igual ao /api/admin/clients que funciona)
// e admin.auth.admin.listUsers() como fonte de verdade.
export async function GET() {
  // ── 1. Auth via session client (mesmo padrão do /api/admin/clients) ───────
  const supabase = await createServerSupabaseClient().catch(() => null);
  if (!supabase) {
    return NextResponse.json({ ok: false, code: "supabase_not_configured" }, { status: 503 });
  }

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, code: "unauthenticated",
      debug: { authError: authErr?.message ?? "no user" } }, { status: 401 });
  }

  // ── 2. Role check via session client + fallbacks (igual ao middleware) ─────
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("role, account_type")
    .eq("id", user.id)
    .maybeSingle();

  const role: string =
    (profileRow as { role?: string } | null)?.role ??
    (user.user_metadata?.role as string | undefined) ??
    (user.app_metadata?.role as string | undefined) ??
    "";

  if (!ALLOWED_ROLES.has(role)) {
    return NextResponse.json({
      ok: false,
      code: "forbidden",
      message: "Usuário sem permissão para acessar a Central de Contas.",
      debug: {
        stage:            "role_check",
        currentUserId:    user.id,
        currentUserEmail: user.email ?? null,
        profileFound:     !!profileRow,
        profileRole:      (profileRow as { role?: string } | null)?.role ?? null,
        metadataRole:     (user.user_metadata?.role as string | undefined) ?? null,
        appMetaRole:      (user.app_metadata?.role as string | undefined) ?? null,
        resolvedRole:     role || null,
        allowedRoles:     Array.from(ALLOWED_ROLES),
      },
    }, { status: 403 });
  }

  // ── 3. Service role obrigatório para listUsers ─────────────────────────────
  if (!hasSupabaseServiceRoleKey()) {
    return NextResponse.json({
      ok: false,
      code: "service_role_missing",
      message: "SUPABASE_SERVICE_ROLE_KEY não configurada. Configure na Vercel e faça redeploy.",
    }, { status: 503 });
  }

  let admin: ReturnType<typeof createRequiredSupabaseAdminClient>;
  try {
    admin = createRequiredSupabaseAdminClient();
  } catch (e) {
    return NextResponse.json({
      ok: false,
      code: "admin_client_error",
      message: "Não foi possível criar o cliente admin.",
      debug: { error: e instanceof Error ? e.message : String(e) },
    }, { status: 500 });
  }

  // ── 4. Fonte de verdade: auth.admin.listUsers() ────────────────────────────
  let authUsers: {
    id: string;
    email?: string;
    created_at: string;
    last_sign_in_at?: string;
    user_metadata: Record<string, unknown>;
    app_metadata: Record<string, unknown>;
  }[] = [];

  try {
    const { data: authData, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (listErr || !authData) {
      return NextResponse.json({
        ok: false,
        code: "auth_admin_list_users_failed",
        message: "Não foi possível listar usuários do auth.",
        debug: { errorMessage: listErr?.message ?? "no data" },
      }, { status: 500 });
    }
    authUsers = authData.users as typeof authUsers;
  } catch (e) {
    return NextResponse.json({
      ok: false,
      code: "auth_admin_list_users_exception",
      message: "Exceção ao chamar auth.admin.listUsers().",
      debug: { error: e instanceof Error ? e.message : String(e) },
    }, { status: 500 });
  }

  // ── 5. Profiles (defensivo — sem plan para evitar falha por coluna ausente) ─
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email, name, role, account_type, account_status, created_at")
    .limit(1000);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id as string, p as Record<string, unknown>])
  );

  // ── 6. Clients não deletados ───────────────────────────────────────────────
  const { data: clients } = await admin
    .from("clients")
    .select("owner_id, id, company_name")
    .is("deleted_at", null)
    .limit(1000);

  const clientMap = new Map(
    (clients ?? []).map((c) => [c.owner_id as string, {
      id: c.id as string,
      company_name: c.company_name as string | null,
    }])
  );

  // ── 7. Agency workspaces ───────────────────────────────────────────────────
  let agencyMap = new Map<string, { id: string; name: string }>();
  try {
    const { data: agencies } = await admin
      .from("agency_workspaces")
      .select("owner_user_id, id, name")
      .limit(500);
    agencyMap = new Map(
      (agencies ?? []).map((a) => [a.owner_user_id as string, {
        id: a.id as string,
        name: a.name as string,
      }])
    );
  } catch { /* tabela pode não existir ainda */ }

  // ── 8. Merge: auth users + profiles + clients + agencies ──────────────────
  const accounts = authUsers.map((u) => {
    const profile = profileMap.get(u.id);
    const client  = clientMap.get(u.id);
    const agency  = agencyMap.get(u.id);

    const name =
      (profile?.name as string | undefined) ??
      (u.user_metadata?.name as string | undefined) ??
      (u.user_metadata?.full_name as string | undefined) ??
      null;

    const resolvedRole =
      (profile?.role as string | undefined) ??
      (u.user_metadata?.role as string | undefined) ??
      (u.app_metadata?.role as string | undefined) ??
      null;

    const source = profile
      ? (client  ? "auth+profile+client"
        : agency ? "auth+profile+agency"
        :          "auth+profile")
      : "auth_only";

    return {
      id:                  u.id,
      email:               u.email ?? null,
      name,
      role:                resolvedRole,
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

  const withProfile  = accounts.filter((a) => a.has_profile).length;
  const withoutLink  = accounts.filter((a) => !a.company_name && !a.agency_name).length;

  return NextResponse.json({
    ok:      true,
    total:   accounts.length,
    accounts,
    summary: {
      total:          accounts.length,
      authOnly:       accounts.length - withProfile,
      withProfile,
      withoutLink,
      agencies:       accounts.filter((a) => a.account_type === "agencia").length,
      businesses:     accounts.filter((a) => a.account_type === "empresa").length,
      invitedClients: accounts.filter((a) => a.account_type === "invited_client").length,
      blocked:        accounts.filter((a) => a.account_status === "blocked").length,
      suspended:      accounts.filter((a) => a.account_status === "suspended").length,
      trial:          accounts.filter((a) => a.subscription_status === "trialing").length,
    },
    debug: {
      source:          "auth.admin.listUsers",
      authUsersCount:  authUsers.length,
      profilesCount:   profiles?.length ?? 0,
      clientsCount:    clients?.length ?? 0,
      agenciesCount:   agencyMap.size,
    },
  });
}
