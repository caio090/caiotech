import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createSupabaseAdminClient, hasSupabaseServiceRoleKey } from "@/lib/supabase/server";

const ALLOWED_ROLES = new Set(["admin", "super_admin"]);

/**
 * GET /api/admin/debug-client-link?email=...
 *
 * Diagnóstico de vínculo de cliente para admin/super_admin.
 * Usa service role — nunca retorna tokens, cookies ou secrets.
 * Uso: checar por que um email não está resolvendo para um cliente.
 */
export async function GET(request: NextRequest) {
  // ── Auth: requer admin ou super_admin ─────────────────────────
  let callerRole: string | null = null;
  try {
    const session = await createServerSupabaseClient();
    const { data: { user } } = await session.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });
    }
    const { data: profile } = await session
      .from("profiles").select("role").eq("id", user.id).maybeSingle();
    callerRole = profile?.role ?? null;
  } catch {
    return NextResponse.json({ ok: false, reason: "auth_error" }, { status: 500 });
  }

  if (!callerRole || !ALLOWED_ROLES.has(callerRole)) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  const email = request.nextUrl.searchParams.get("email")?.trim();
  if (!email) {
    return NextResponse.json({ ok: false, reason: "missing_email", message: "Informe ?email=..." }, { status: 400 });
  }

  const hasAdmin = hasSupabaseServiceRoleKey();
  const errors: string[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any;
  try {
    db = createSupabaseAdminClient();
  } catch (e) {
    errors.push(`admin client: ${String(e)}`);
    db = await createServerSupabaseClient();
  }

  // ── 1. profiles com esse email ────────────────────────────────
  let profiles: Record<string, unknown>[] = [];
  try {
    const { data, error } = await db
      .from("profiles")
      .select("id, email, name, role, account_type, client_id, created_at")
      .ilike("email", email);
    if (error) errors.push(`profiles: ${error.message}`);
    profiles = (data ?? []) as Record<string, unknown>[];
  } catch (e) { errors.push(`profiles: ${String(e)}`); }

  // ── 2. clients com esse email ─────────────────────────────────
  let clients: Record<string, unknown>[] = [];
  try {
    const { data, error } = await db
      .from("clients")
      .select("id, company_name, email, status, deleted_at, archived_at, created_at")
      .ilike("email", email)
      .order("created_at", { ascending: false });
    if (error) errors.push(`clients: ${error.message}`);
    clients = (data ?? []) as Record<string, unknown>[];
  } catch (e) { errors.push(`clients: ${String(e)}`); }

  // ── 3. client_invites com esse email ─────────────────────────
  let invites: Record<string, unknown>[] = [];
  try {
    const { data, error } = await db
      .from("client_invites")
      .select("id, client_id, email, status, accepted_by, accepted_at, created_at")
      .ilike("email", email)
      .order("created_at", { ascending: false });
    if (error) errors.push(`invites: ${error.message}`);
    invites = (data ?? []) as Record<string, unknown>[];
  } catch (e) { errors.push(`invites: ${String(e)}`); }

  // ── 4. client_user_access para user com esse email ───────────
  let access: Record<string, unknown>[] = [];
  try {
    const userIds = profiles.map((p) => p.id as string).filter(Boolean);
    if (userIds.length > 0) {
      const { data, error } = await db
        .from("client_user_access")
        .select("id, user_id, client_id, status, created_at")
        .in("user_id", userIds);
      if (error && error.code !== "42P01") errors.push(`client_user_access: ${error.message}`);
      access = (data ?? []) as Record<string, unknown>[];
    }
  } catch (e) {
    const msg = String(e);
    if (!msg.includes("42P01")) errors.push(`client_user_access: ${msg}`);
  }

  // ── 5. cliente encontrado via convite (se existir) ───────────
  let clientFromInvite: Record<string, unknown> | null = null;
  const bestInvite = invites.find((i) => i.status === "accepted") ?? invites.find((i) => i.status === "pending") ?? null;
  if (bestInvite?.client_id) {
    try {
      const { data } = await db
        .from("clients")
        .select("id, company_name, email, status, deleted_at, archived_at")
        .eq("id", bestInvite.client_id as string)
        .maybeSingle();
      clientFromInvite = (data as Record<string, unknown>) ?? null;
    } catch (e) { errors.push(`client from invite: ${String(e)}`); }
  }

  return NextResponse.json({
    ok: true,
    emailQueried: email,
    hasAdminKey: hasAdmin,
    profiles,
    clients,
    invites,
    clientUserAccess: access,
    bestInvite: bestInvite ?? null,
    clientFromInvite,
    summary: {
      profileCount: profiles.length,
      clientDirectCount: clients.length,
      inviteCount: invites.length,
      inviteStatuses: invites.map((i) => i.status),
      bestInviteStatus: bestInvite?.status ?? null,
      clientFromInviteName: (clientFromInvite?.company_name as string) ?? null,
      recommendation: profiles.length > 0 && profiles[0].client_id
        ? "profile já tem client_id — resolver deve usar path A (profile_client_id)"
        : bestInvite
          ? `convite ${bestInvite.status} encontrado → resolver deve usar path D (invite_email)`
          : clients.length > 0
            ? "cliente encontrado por email → resolver deve usar path E (client_email)"
            : "nenhum vínculo encontrado — verificar se convite existe com email exato",
    },
    errors,
  });
}
