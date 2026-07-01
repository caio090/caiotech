import {
  createServerSupabaseClient,
  createSupabaseAdminClient,
  hasSupabaseServiceRoleKey,
} from "@/lib/supabase/server";

export type ResolveSource =
  | "profile_client_id"
  | "client_user_access"
  | "invite_accepted_by"
  | "invite_email"
  | "client_email"
  | "not_found";

export interface ResolvedClient {
  userId:    string;
  userEmail: string | undefined;
  profile:   Record<string, unknown> | null;
  client:    Record<string, unknown> | null;
  clientId:  string | null;
  source:    ResolveSource;
  debug:     ResolveDebug;
}

export interface ResolveDebug {
  hasUser:           boolean;
  hasAdminKey:       boolean;
  userEmail:         string | undefined;
  profileFound:      boolean;
  profileClientId:   string | null;
  triedSources:      string[];
  selectedSource:    string;
  selectedClientId:  string | null;
  selectedClientName: string | null;
  errors:            string[];
}

/**
 * Resolve o cliente vinculado ao usuário autenticado.
 *
 * FLUXO:
 * 1. Autentica usuário com createServerSupabaseClient (cookies) — NÃO usa admin para auth
 * 2. Usa createSupabaseAdminClient (service role) para TODAS as queries de banco
 *    → bypassa RLS completamente (policy de clients só permite admin/equipe, não 'client')
 *
 * FALLBACKS EM ORDEM:
 *   A. profiles.client_id
 *   B. client_user_access.user_id
 *   C. client_invites.accepted_by = user.id
 *   D. client_invites.email = user.email
 *   E. clients.email ilike user.email (sem filtro archived para garantir match)
 *
 * Ao encontrar via B-E, repara profiles.client_id para aceleração futura.
 */
export async function resolveCurrentClient(): Promise<ResolvedClient | null> {
  const debug: ResolveDebug = {
    hasUser: false,
    hasAdminKey: false,
    userEmail: undefined,
    profileFound: false,
    profileClientId: null,
    triedSources: [],
    selectedSource: "not_found",
    selectedClientId: null,
    selectedClientName: null,
    errors: [],
  };

  // ── Auth: usa cookie client apenas para validar sessão ────────
  let user: { id: string; email?: string } | null = null;
  try {
    const sessionClient = await createServerSupabaseClient();
    const { data, error } = await sessionClient.auth.getUser();
    if (error) debug.errors.push(`auth.getUser: ${error.message}`);
    user = data?.user ?? null;
  } catch (e) {
    debug.errors.push(`auth init: ${String(e)}`);
    console.error("[resolve-client] auth error:", e);
    return null;
  }

  if (!user) {
    console.log("[resolve-client] no user");
    return null;
  }

  debug.hasUser    = true;
  debug.hasAdminKey = hasSupabaseServiceRoleKey();
  debug.userEmail  = user.email;

  const userId    = user.id;
  const userEmail = user.email?.trim().toLowerCase() ?? null;

  console.log("[resolve-client] user:", userId, "email:", userEmail, "adminKey:", debug.hasAdminKey);

  // ── Admin client: service role bypassa RLS ────────────────────
  // Se não houver service role, as queries de clients falharão por RLS.
  // Logamos o aviso mas continuamos (pode funcionar se RLS for permissiva).
  let db: ReturnType<typeof createSupabaseAdminClient>;
  try {
    db = createSupabaseAdminClient();
  } catch (e) {
    debug.errors.push(`admin client: ${String(e)}`);
    console.error("[resolve-client] admin client failed:", e);
    // Fallback para session client — pode falhar em RLS
    const sessionClient = await createServerSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db = sessionClient as any;
  }

  // ── A. profiles.client_id ─────────────────────────────────────
  debug.triedSources.push("profile_client_id");
  let profile: Record<string, unknown> | null = null;
  try {
    const { data: p, error: pErr } = await db
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (pErr) debug.errors.push(`profiles: ${pErr.message}`);
    profile = (p as Record<string, unknown>) ?? null;
    debug.profileFound = !!profile;
    debug.profileClientId = (profile?.client_id as string) ?? null;
  } catch (e) {
    debug.errors.push(`profiles: ${String(e)}`);
  }

  if (debug.profileClientId) {
    try {
      const { data: c } = await db
        .from("clients").select("*")
        .eq("id", debug.profileClientId)
        .maybeSingle();
      if (c) {
        const cl = c as Record<string, unknown>;
        debug.selectedSource   = "profile_client_id";
        debug.selectedClientId = cl.id as string;
        debug.selectedClientName = cl.company_name as string ?? null;
        console.log("[resolve-client] source=profile_client_id client:", cl.company_name);
        return build(userId, user.email, profile, cl, debug.profileClientId, "profile_client_id", debug);
      }
    } catch (e) {
      debug.errors.push(`clients by profile_client_id: ${String(e)}`);
    }
  }

  // ── B. client_user_access ─────────────────────────────────────
  debug.triedSources.push("client_user_access");
  try {
    const { data: acc } = await db
      .from("client_user_access")
      .select("client_id")
      .eq("user_id", userId)
      .maybeSingle();
    const accId = (acc as { client_id: string } | null)?.client_id ?? null;
    if (accId) {
      const { data: c } = await db
        .from("clients").select("*").eq("id", accId).maybeSingle();
      if (c) {
        await repairProfile(db, userId, accId);
        const cl = c as Record<string, unknown>;
        console.log("[resolve-client] source=client_user_access client:", cl.company_name);
        return build(userId, user.email, profile, cl, accId, "client_user_access", debug);
      }
    }
  } catch {
    // tabela não existe — normal
  }

  // ── C. client_invites.accepted_by ────────────────────────────
  debug.triedSources.push("invite_accepted_by");
  try {
    const { data: inv, error: invErr } = await db
      .from("client_invites")
      .select("client_id")
      .eq("accepted_by", userId)
      .eq("status", "accepted")
      .order("accepted_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (invErr) debug.errors.push(`invite_accepted_by: ${invErr.message}`);
    const invId = (inv as { client_id: string } | null)?.client_id ?? null;
    if (invId) {
      const { data: c } = await db
        .from("clients").select("*").eq("id", invId).maybeSingle();
      if (c) {
        await repairProfile(db, userId, invId);
        const cl = c as Record<string, unknown>;
        console.log("[resolve-client] source=invite_accepted_by client:", cl.company_name);
        return build(userId, user.email, profile, cl, invId, "invite_accepted_by", debug);
      }
    }
  } catch (e) {
    debug.errors.push(`invite_accepted_by: ${String(e)}`);
  }

  if (!userEmail) {
    console.log("[resolve-client] no email — cannot try email-based paths");
    return build(userId, user.email, profile, null, null, "not_found", debug);
  }

  // ── D. client_invites.email ───────────────────────────────────
  debug.triedSources.push("invite_email");
  try {
    const { data: inv, error: invErr } = await db
      .from("client_invites")
      .select("client_id")
      .eq("email", user.email!)          // usa email original (sem lowercase)
      .in("status", ["accepted", "pending"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (invErr) debug.errors.push(`invite_email: ${invErr.message}`);
    const invId = (inv as { client_id: string } | null)?.client_id ?? null;
    if (invId) {
      // Não filtra deleted/archived: se o convite existe, o cliente existe
      const { data: c } = await db
        .from("clients").select("*").eq("id", invId).maybeSingle();
      if (c) {
        await repairProfile(db, userId, invId);
        const cl = c as Record<string, unknown>;
        console.log("[resolve-client] source=invite_email client:", cl.company_name);
        return build(userId, user.email, profile, cl, invId, "invite_email", debug);
      }
    }
  } catch (e) {
    debug.errors.push(`invite_email: ${String(e)}`);
  }

  // ── E. clients.email ─────────────────────────────────────────
  // Tenta com email original e, se falhar, com lowercase.
  // Não filtra archived/deleted: usuário convidado deve ver seu cliente mesmo arquivado.
  debug.triedSources.push("client_email");
  const emailsToTry = Array.from(new Set([user.email, userEmail].filter(Boolean))) as string[];
  for (const tryEmail of emailsToTry) {
    try {
      const { data: rows, error: rowErr } = await db
        .from("clients")
        .select("*")
        .ilike("email", tryEmail)
        .order("created_at", { ascending: false });

      if (rowErr) {
        debug.errors.push(`client_email(${tryEmail}): ${rowErr.message}`);
        continue;
      }

      const list = (rows ?? []) as Record<string, unknown>[];
      console.log("[resolve-client] client_email matches:", list.length, "for", tryEmail);

      if (list.length === 0) continue;

      // Prioriza: not archived/deleted → onboarding → active → mais recente
      const active = list.filter(c => !c.deleted_at && !c.archived_at);
      const preferred = [
        ...active.filter(c => c.status === "onboarding"),
        ...active.filter(c => c.status === "active"),
        ...active,
        ...list,  // fallback: incluindo arquivados
      ][0];

      if (preferred) {
        const foundId = preferred.id as string;
        await repairProfile(db, userId, foundId);
        console.log("[resolve-client] source=client_email client:", preferred.company_name, "email:", tryEmail);
        return build(userId, user.email, profile, preferred, foundId, "client_email", debug);
      }
    } catch (e) {
      debug.errors.push(`client_email(${tryEmail}): ${String(e)}`);
    }
  }

  console.log("[resolve-client] not_found. errors:", debug.errors);
  return build(userId, user.email, profile, null, null, "not_found", debug);
}

function build(
  userId: string,
  userEmail: string | undefined,
  profile: Record<string, unknown> | null,
  client: Record<string, unknown> | null,
  clientId: string | null,
  source: ResolveSource,
  debug: ResolveDebug,
): ResolvedClient {
  debug.selectedSource    = source;
  debug.selectedClientId  = clientId;
  debug.selectedClientName = client ? (client.company_name as string ?? null) : null;
  return { userId, userEmail, profile, client, clientId, source, debug };
}

async function repairProfile(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  userId: string,
  clientId: string,
) {
  try {
    await db
      .from("profiles")
      .update({ client_id: clientId, role: "client" })
      .eq("id", userId)
      .is("client_id", null);
  } catch {
    // melhor esforço
  }
}
