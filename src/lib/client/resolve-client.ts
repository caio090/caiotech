import { createServerSupabaseClient, createSupabaseAdminClient, hasSupabaseServiceRoleKey } from "@/lib/supabase/server";

export interface ResolvedClient {
  userId:    string;
  userEmail: string | undefined;
  profile:   Record<string, unknown> | null;
  client:    Record<string, unknown> | null;
  clientId:  string | null;
  source:    "profile_client_id" | "client_user_access" | "invite_accepted_by" | "invite_email" | "client_email" | null;
}

/**
 * Resolve o cliente vinculado ao usuário autenticado.
 *
 * Usa service role (admin client) para queries de banco — bypassa RLS.
 * Isso é necessário porque a policy de clients só permite admin/equipe,
 * não 'client'. O service role NUNCA é exposto ao browser.
 *
 * Ordem de fallback:
 *   1. profiles.client_id
 *   2. client_user_access.user_id  (tabela opcional)
 *   3. client_invites.accepted_by = user.id
 *   4. client_invites.email = user.email
 *   5. clients.email = user.email
 *
 * Ao encontrar via caminhos 2-5, repara profiles.client_id e role
 * para que visitas futuras usem o caminho 1.
 */
export async function resolveCurrentClient(): Promise<ResolvedClient | null> {
  // Valida sessão com o client de cookie (não expõe service role ao browser)
  const sessionClient = await createServerSupabaseClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) return null;

  const userId    = user.id;
  const userEmail = user.email;

  // Queries de banco com service role — bypassa RLS completamente
  const useAdmin  = hasSupabaseServiceRoleKey();
  const db        = useAdmin ? createSupabaseAdminClient() : sessionClient;

  // ── 1. profiles.client_id ────────────────────────────────────
  const { data: profile } = await db
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  const profileClientId = (profile as Record<string, unknown> | null)?.client_id as string | null ?? null;

  if (profileClientId) {
    const { data: client } = await db
      .from("clients")
      .select("*")
      .eq("id", profileClientId)
      .is("deleted_at", null)
      .is("archived_at", null)
      .maybeSingle();

    if (client) {
      return { userId, userEmail, profile, client, clientId: profileClientId, source: "profile_client_id" };
    }
  }

  // ── 2. client_user_access ─────────────────────────────────────
  try {
    const { data: accessRow } = await db
      .from("client_user_access")
      .select("client_id")
      .eq("user_id", userId)
      .maybeSingle();

    const accessClientId = (accessRow as { client_id: string } | null)?.client_id ?? null;
    if (accessClientId) {
      const { data: client } = await db
        .from("clients")
        .select("*")
        .eq("id", accessClientId)
        .is("deleted_at", null)
        .is("archived_at", null)
        .maybeSingle();

      if (client) {
        await repairProfile(db, userId, accessClientId);
        return { userId, userEmail, profile, client, clientId: accessClientId, source: "client_user_access" };
      }
    }
  } catch {
    // client_user_access não existe — segue próximo caminho
  }

  // ── 3. client_invites.accepted_by ─────────────────────────────
  const { data: inviteByUid } = await db
    .from("client_invites")
    .select("client_id")
    .eq("accepted_by", userId)
    .eq("status", "accepted")
    .order("accepted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const uidClientId = (inviteByUid as { client_id: string } | null)?.client_id ?? null;
  if (uidClientId) {
    const { data: client } = await db
      .from("clients")
      .select("*")
      .eq("id", uidClientId)
      .is("deleted_at", null)
      .is("archived_at", null)
      .maybeSingle();

    if (client) {
      await repairProfile(db, userId, uidClientId);
      return { userId, userEmail, profile, client, clientId: uidClientId, source: "invite_accepted_by" };
    }
  }

  if (!userEmail) {
    return { userId, userEmail, profile: profile ?? null, client: null, clientId: null, source: null };
  }

  // ── 4. client_invites.email ───────────────────────────────────
  const { data: inviteByEmail } = await db
    .from("client_invites")
    .select("client_id")
    .eq("email", userEmail)
    .in("status", ["accepted", "pending"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const emailInviteClientId = (inviteByEmail as { client_id: string } | null)?.client_id ?? null;
  if (emailInviteClientId) {
    const { data: client } = await db
      .from("clients")
      .select("*")
      .eq("id", emailInviteClientId)
      .is("deleted_at", null)
      .is("archived_at", null)
      .maybeSingle();

    if (client) {
      // Repara accepted_by no invite se estava nulo
      await db.from("client_invites")
        .update({ accepted_by: userId, status: "accepted", accepted_at: new Date().toISOString() })
        .eq("email", userEmail)
        .eq("client_id", emailInviteClientId)
        .is("accepted_by", null);

      await repairProfile(db, userId, emailInviteClientId);
      return { userId, userEmail, profile, client, clientId: emailInviteClientId, source: "invite_email" };
    }
  }

  // ── 5. clients.email ─────────────────────────────────────────
  const { data: clientByEmail } = await db
    .from("clients")
    .select("*")
    .ilike("email", userEmail)
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (clientByEmail) {
    const found = clientByEmail as Record<string, unknown>;
    const foundId = found.id as string;
    await repairProfile(db, userId, foundId);
    return { userId, userEmail, profile, client: found, clientId: foundId, source: "client_email" };
  }

  return { userId, userEmail, profile: profile ?? null, client: null, clientId: null, source: null };
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
    // falha silenciosa — reparo é melhor esforço
  }
}
