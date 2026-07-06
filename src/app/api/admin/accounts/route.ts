import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  createRequiredSupabaseAdminClient,
  hasSupabaseServiceRoleKey,
} from "@/lib/supabase/server";

const ALLOWED_ROLES = new Set(["super_admin", "admin"]);

export async function GET() {
  // ── 1. Auth via session client (padrão /api/admin/clients) ────────────────
  const supabase = await createServerSupabaseClient().catch(() => null);
  if (!supabase) {
    return NextResponse.json({ ok: false, code: "supabase_not_configured" }, { status: 503 });
  }

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({
      ok: false, code: "unauthenticated",
      debug: { authError: authErr?.message ?? "no user" },
    }, { status: 401 });
  }

  // ── 2. Role check via session + triple fallback (igual proxy.ts) ───────────
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
      ok: false, code: "forbidden",
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

  if (!hasSupabaseServiceRoleKey()) {
    return NextResponse.json({
      ok: false, code: "service_role_missing",
      message: "SUPABASE_SERVICE_ROLE_KEY não configurada.",
    }, { status: 503 });
  }

  let admin: ReturnType<typeof createRequiredSupabaseAdminClient>;
  try {
    admin = createRequiredSupabaseAdminClient();
  } catch (e) {
    return NextResponse.json({
      ok: false, code: "admin_client_error",
      debug: { error: e instanceof Error ? e.message : String(e) },
    }, { status: 500 });
  }

  // ── 3. Profiles, clients, agencies (sempre buscados com service role) ──────
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email, name, role, account_type, account_status, created_at")
    .limit(1000);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id as string, p as Record<string, unknown>])
  );

  const { data: clients } = await admin
    .from("clients")
    .select("owner_id, id, company_name")
    .is("deleted_at", null)
    .limit(1000);

  const clientMap = new Map(
    (clients ?? []).map((c) => [c.owner_id as string, {
      id: c.id as string, company_name: c.company_name as string | null,
    }])
  );

  let agencyMap = new Map<string, { id: string; name: string }>();
  try {
    const { data: agencies } = await admin
      .from("agency_workspaces")
      .select("owner_user_id, id, name")
      .limit(500);
    agencyMap = new Map(
      (agencies ?? []).map((a) => [a.owner_user_id as string, {
        id: a.id as string, name: a.name as string,
      }])
    );
  } catch { /* tabela pode não existir */ }

  // ── 4. Tenta auth.admin.listUsers() — com fallback para profiles ───────────
  let authUsers: {
    id: string;
    email?: string;
    created_at: string;
    last_sign_in_at?: string;
    user_metadata: Record<string, unknown>;
    app_metadata: Record<string, unknown>;
  }[] = [];

  let degraded = false;
  let degradedWarning: string | null = null;
  let authAdminError: { code?: string; message?: string } | null = null;

  try {
    const { data: authData, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (listErr || !authData) {
      authAdminError = { code: listErr?.status?.toString(), message: listErr?.message ?? "no data" };
      degraded = true;
    } else {
      authUsers = authData.users as typeof authUsers;
    }
  } catch (e) {
    authAdminError = { message: e instanceof Error ? e.message : String(e) };
    degraded = true;
  }

  // ── 5. Fallback: construir lista a partir de profiles ──────────────────────
  if (degraded) {
    degradedWarning = "Não foi possível listar auth.users; exibindo perfis do banco de dados.";

    if (!profiles || profiles.length === 0) {
      // Último recurso: pelo menos o usuário logado
      const currentAccount = {
        id:                  user.id,
        email:               user.email ?? null,
        name:                (user.user_metadata?.name as string | undefined) ?? null,
        role,
        account_type:        (profileRow as { account_type?: string } | null)?.account_type ?? null,
        account_status:      "active",
        created_at:          null as string | null,
        last_sign_in_at:     null as string | null,
        company_name:        null as string | null,
        client_id:           null as string | null,
        agency_name:         null as string | null,
        agency_id:           null as string | null,
        plan_slug:           null as string | null,
        coupon_code:         null as string | null,
        subscription_status: null as string | null,
        source:              "current_session",
        has_profile:         !!profileRow,
      };

      return NextResponse.json({
        ok: true,
        total: 1,
        accounts: [currentAccount],
        summary: {
          total: 1, authOnly: 0, withProfile: 1, withoutLink: 1,
          agencies: 0, businesses: 0, invitedClients: 0, blocked: 0, suspended: 0, trial: 0,
        },
        degraded: true,
        warning: "Não foi possível listar usuários nem perfis. Exibindo apenas conta atual.",
        debug: {
          source: "current_session_only",
          authUsersCount: 0, profilesCount: 0, clientsCount: 0, agenciesCount: 0,
          authAdminFailed: true, authAdminError,
        },
      });
    }

    // Construir a partir de profiles
    const accounts = (profiles ?? []).map((p) => {
      const client = clientMap.get(p.id as string);
      const agency = agencyMap.get(p.id as string);
      return {
        id:                  p.id as string,
        email:               (p.email as string | null) ?? null,
        name:                (p.name as string | null) ?? null,
        role:                (p.role as string | null) ?? null,
        account_type:        (p.account_type as string | null) ?? null,
        account_status:      (p.account_status as string | null) ?? "pending_setup",
        created_at:          (p.created_at as string | null) ?? null,
        last_sign_in_at:     null as string | null,
        company_name:        client?.company_name ?? null,
        client_id:           client?.id ?? null,
        agency_name:         agency?.name ?? null,
        agency_id:           agency?.id ?? null,
        plan_slug:           null as string | null,
        coupon_code:         null as string | null,
        subscription_status: null as string | null,
        source:              "profiles_fallback",
        has_profile:         true,
      };
    });

    accounts.sort((a, b) => {
      if (!a.created_at) return 1;
      if (!b.created_at) return -1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const withProfile = accounts.length;

    return NextResponse.json({
      ok: true,
      total: accounts.length,
      accounts,
      summary: {
        total:          accounts.length,
        authOnly:       0,
        withProfile,
        withoutLink:    accounts.filter((a) => !a.company_name && !a.agency_name).length,
        agencies:       accounts.filter((a) => a.account_type === "agencia").length,
        businesses:     accounts.filter((a) => a.account_type === "empresa").length,
        invitedClients: accounts.filter((a) => a.account_type === "invited_client").length,
        blocked:        accounts.filter((a) => a.account_status === "blocked").length,
        suspended:      accounts.filter((a) => a.account_status === "suspended").length,
        trial:          0,
      },
      degraded: true,
      warning:  degradedWarning,
      debug: {
        source:          "profiles_fallback",
        authUsersCount:  0,
        profilesCount:   profiles?.length ?? 0,
        clientsCount:    clients?.length ?? 0,
        agenciesCount:   agencyMap.size,
        authAdminFailed: true,
        authAdminError,
      },
    });
  }

  // ── 6. Merge: auth users + profiles + clients + agencies (caminho normal) ──
  const accounts = authUsers.map((u) => {
    const profile = profileMap.get(u.id);
    const client  = clientMap.get(u.id);
    const agency  = agencyMap.get(u.id);

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
      name:                (profile?.name as string | null) ?? (u.user_metadata?.name as string | undefined) ?? (u.user_metadata?.full_name as string | undefined) ?? null,
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

  accounts.sort((a, b) => {
    if (!a.created_at) return 1;
    if (!b.created_at) return -1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const withProfile = accounts.filter((a) => a.has_profile).length;

  return NextResponse.json({
    ok:      true,
    total:   accounts.length,
    accounts,
    summary: {
      total:          accounts.length,
      authOnly:       accounts.length - withProfile,
      withProfile,
      withoutLink:    accounts.filter((a) => !a.company_name && !a.agency_name).length,
      agencies:       accounts.filter((a) => a.account_type === "agencia").length,
      businesses:     accounts.filter((a) => a.account_type === "empresa").length,
      invitedClients: accounts.filter((a) => a.account_type === "invited_client").length,
      blocked:        accounts.filter((a) => a.account_status === "blocked").length,
      suspended:      accounts.filter((a) => a.account_status === "suspended").length,
      trial:          accounts.filter((a) => a.subscription_status === "trialing").length,
    },
    degraded: false,
    warning:  null,
    debug: {
      source:         "auth.admin.listUsers",
      authUsersCount: authUsers.length,
      profilesCount:  profiles?.length ?? 0,
      clientsCount:   clients?.length ?? 0,
      agenciesCount:  agencyMap.size,
    },
  });
}
