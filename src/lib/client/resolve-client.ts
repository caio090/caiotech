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
  | "invite_email_pending_claimed"
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
  hasUser:              boolean;
  hasAdminKey:          boolean;
  userEmail:            string | undefined;
  profileFound:         boolean;
  profileCreated:       boolean;
  profileClientId:      string | null;
  triedSources:         string[];
  selectedSource:       string;
  selectedClientId:     string | null;
  selectedClientName:   string | null;
  inviteClaimedId:      string | null;
  profileRepairedWith:  string | null;
  errors:               string[];
}

/**
 * Resolve o cliente vinculado ao usuário autenticado.
 *
 * FLUXO:
 * 1. Autentica usuário com createServerSupabaseClient (cookies)
 * 2. Usa createSupabaseAdminClient (service role) para TODAS as queries de banco
 *    → bypassa RLS completamente
 *
 * FALLBACKS EM ORDEM:
 *   A. profiles.client_id
 *   B. client_user_access.user_id
 *   C. client_invites.accepted_by = user.id
 *   D. client_invites.email ilike user.email  (aceita pending e accepted)
 *      → auto-claim do invite se pending
 *      → upsert profile com client_id
 *   E. clients.email ilike user.email
 */
export async function resolveCurrentClient(): Promise<ResolvedClient | null> {
  const debug: ResolveDebug = {
    hasUser: false,
    hasAdminKey: false,
    userEmail: undefined,
    profileFound: false,
    profileCreated: false,
    profileClientId: null,
    triedSources: [],
    selectedSource: "not_found",
    selectedClientId: null,
    selectedClientName: null,
    inviteClaimedId: null,
    profileRepairedWith: null,
    errors: [],
  };

  // ── Auth: usa cookie client apenas para validar sessão ────────
  let user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null = null;
  try {
    const sessionClient = await createServerSupabaseClient();
    const { data, error } = await sessionClient.auth.getUser();
    if (error) debug.errors.push(`auth.getUser: ${error.message}`);
    user = data?.user ?? null;
  } catch (e) {
    debug.errors.push(`auth init: ${String(e)}`);
    return null;
  }

  if (!user) return null;

  debug.hasUser    = true;
  debug.hasAdminKey = hasSupabaseServiceRoleKey();
  debug.userEmail  = user.email;

  const userId    = user.id;
  const userEmail = user.email?.trim().toLowerCase() ?? null;

  console.log("[resolve-client] user:", userId, "email:", userEmail, "adminKey:", debug.hasAdminKey);

  // ── Admin client ──────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any;
  try {
    db = createSupabaseAdminClient();
  } catch (e) {
    debug.errors.push(`admin client init: ${String(e)}`);
    console.error("[resolve-client] admin client failed — falling back to session client:", e);
    const sessionClient = await createServerSupabaseClient();
    db = sessionClient;
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
    const { data: accRows } = await db
      .from("client_user_access")
      .select("client_id")
      .eq("user_id", userId)
      .limit(1);
    const accId = (accRows as { client_id: string }[] | null)?.[0]?.client_id ?? null;
    if (accId) {
      const { data: c } = await db.from("clients").select("*").eq("id", accId).maybeSingle();
      if (c) {
        await upsertProfile(db, userId, user, accId, debug);
        const cl = c as Record<string, unknown>;
        console.log("[resolve-client] source=client_user_access client:", cl.company_name);
        return build(userId, user.email, profile, cl, accId, "client_user_access", debug);
      }
    }
  } catch {
    // tabela pode não existir — normal
  }

  // ── C. client_invites.accepted_by ────────────────────────────
  debug.triedSources.push("invite_accepted_by");
  try {
    const { data: invRows, error: invErr } = await db
      .from("client_invites")
      .select("id, client_id")
      .eq("accepted_by", userId)
      .eq("status", "accepted")
      .order("created_at", { ascending: false })
      .limit(1);
    if (invErr) debug.errors.push(`invite_accepted_by: ${invErr.message}`);
    const inv = (invRows as { id: string; client_id: string }[] | null)?.[0] ?? null;
    if (inv?.client_id) {
      const { data: c } = await db.from("clients").select("*").eq("id", inv.client_id).maybeSingle();
      if (c) {
        await upsertProfile(db, userId, user, inv.client_id, debug);
        const cl = c as Record<string, unknown>;
        console.log("[resolve-client] source=invite_accepted_by client:", cl.company_name);
        return build(userId, user.email, profile, cl, inv.client_id, "invite_accepted_by", debug);
      }
    }
  } catch (e) {
    debug.errors.push(`invite_accepted_by: ${String(e)}`);
  }

  if (!userEmail) {
    console.log("[resolve-client] no email — cannot try email-based paths");
    return build(userId, user.email, profile, null, null, "not_found", debug);
  }

  // ── D. client_invites.email ilike user.email ──────────────────
  // Aceita status 'accepted' e 'pending'.
  // Se pending: auto-claim (marca como aceito + upsert profile + upsert access).
  debug.triedSources.push("invite_email");
  try {
    const emailsToTry = Array.from(new Set([user.email, userEmail].filter(Boolean))) as string[];
    let bestInvite: { id: string; client_id: string; status: string } | null = null;

    for (const tryEmail of emailsToTry) {
      const { data: invRows, error: invErr } = await db
        .from("client_invites")
        .select("id, client_id, status")
        .ilike("email", tryEmail)
        .in("status", ["accepted", "pending"])
        .order("status")          // 'accepted' antes de 'pending' alfabeticamente
        .order("created_at", { ascending: false })
        .limit(5);

      if (invErr) {
        debug.errors.push(`invite_email(${tryEmail}): ${invErr.message}`);
        continue;
      }

      const rows = (invRows ?? []) as { id: string; client_id: string; status: string }[];
      const accepted = rows.find(r => r.status === "accepted");
      const pending  = rows.find(r => r.status === "pending");
      bestInvite = accepted ?? pending ?? null;

      if (bestInvite) break;
    }

    if (bestInvite?.client_id) {
      const invId = bestInvite.client_id;
      // Busca cliente sem filtro de status — apenas não apagado e não arquivado
      const { data: c } = await db
        .from("clients")
        .select("*")
        .eq("id", invId)
        .is("deleted_at", null)
        .is("archived_at", null)
        .maybeSingle();

      if (c) {
        const cl = c as Record<string, unknown>;
        const isPending = bestInvite.status === "pending";

        // Auto-claim invite pendente
        if (isPending) {
          try {
            await db
              .from("client_invites")
              .update({ status: "accepted", accepted_by: userId, accepted_at: new Date().toISOString() })
              .eq("id", bestInvite.id);
            debug.inviteClaimedId = bestInvite.id;
            console.log("[resolve-client] auto-claimed pending invite:", bestInvite.id);
          } catch (e) {
            debug.errors.push(`auto-claim invite: ${String(e)}`);
          }
        }

        // Upsert profile com client_id e role=client
        await upsertProfile(db, userId, user, invId, debug);

        // Upsert client_user_access (best-effort)
        try {
          await db.from("client_user_access").upsert(
            { user_id: userId, client_id: invId, status: "active" },
            { onConflict: "user_id,client_id", ignoreDuplicates: true }
          );
        } catch { /* tabela pode não existir */ }

        const source: ResolveSource = isPending ? "invite_email_pending_claimed" : "invite_email";
        console.log(`[resolve-client] source=${source} client:`, cl.company_name);
        return build(userId, user.email, profile, cl, invId, source, debug);
      } else {
        debug.errors.push(`client not found for invite client_id: ${invId}`);
      }
    }
  } catch (e) {
    debug.errors.push(`invite_email: ${String(e)}`);
  }

  // ── E. clients.email ilike user.email ────────────────────────
  debug.triedSources.push("client_email");
  const emailsToTryE = Array.from(new Set([user.email, userEmail].filter(Boolean))) as string[];
  for (const tryEmail of emailsToTryE) {
    try {
      const { data: rows, error: rowErr } = await db
        .from("clients")
        .select("*")
        .ilike("email", tryEmail)
        .order("created_at", { ascending: false });

      if (rowErr) { debug.errors.push(`client_email(${tryEmail}): ${rowErr.message}`); continue; }

      const list = (rows ?? []) as Record<string, unknown>[];
      console.log("[resolve-client] client_email matches:", list.length, "for", tryEmail);
      if (list.length === 0) continue;

      const active = list.filter(c => !c.deleted_at && !c.archived_at);
      const preferred = [
        ...active.filter(c => c.status === "onboarding"),
        ...active.filter(c => c.status === "active"),
        ...active,
        ...list,
      ][0];

      if (preferred) {
        const foundId = preferred.id as string;
        await upsertProfile(db, userId, user, foundId, debug);
        console.log("[resolve-client] source=client_email client:", preferred.company_name);
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

/**
 * Upsert profile com client_id e role='client'.
 * Se profile não existe, cria um mínimo com name derivado do email.
 */
async function upsertProfile(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  userId: string,
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> },
  clientId: string,
  debug: ResolveDebug,
) {
  try {
    const emailStr = user.email ?? "";
    const nameFallback = (user.user_metadata?.["name"] as string)
      ?? (user.user_metadata?.["full_name"] as string)
      ?? (emailStr.split("@")[0] ?? "");

    await db.from("profiles").upsert(
      {
        id:        userId,
        email:     emailStr,
        name:      nameFallback || emailStr,
        role:      "client",
        client_id: clientId,
      },
      { onConflict: "id" }
    );

    debug.profileRepairedWith = clientId;
    console.log("[resolve-client] upsert profile client_id:", clientId);
  } catch (e) {
    debug.errors.push(`upsert profile: ${String(e)}`);
  }
}
