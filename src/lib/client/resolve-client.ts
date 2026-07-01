import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface ResolvedClient {
  userId:   string;
  userEmail: string | undefined;
  profile:  Record<string, unknown> | null;
  client:   Record<string, unknown> | null;
  clientId: string | null;
}

/**
 * Resolve o cliente vinculado ao usuário autenticado.
 *
 * Ordem de prioridade (delegada ao RPC get_my_client_id, SECURITY DEFINER):
 *   1. profiles.client_id
 *   2. client_user_access.user_id
 *   3. client_invites.accepted_by = auth.uid()
 *   4. client_invites.email = email do JWT
 *   5. clients.email = email do JWT
 *
 * O RPC também repara profiles.client_id quando encontra vínculo
 * por caminhos 2-5, garantindo que visitas futuras usem o caminho 1.
 */
export async function resolveCurrentClient(): Promise<ResolvedClient | null> {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [profileRes, rpcRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.rpc("get_my_client_id"),
  ]);

  const clientId = (rpcRes.data as string | null) ?? null;

  let client: Record<string, unknown> | null = null;
  if (clientId) {
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .is("deleted_at", null)
      .is("archived_at", null)
      .maybeSingle();
    client = (data as Record<string, unknown>) ?? null;
  }

  return {
    userId:    user.id,
    userEmail: user.email,
    profile:   (profileRes.data as Record<string, unknown>) ?? null,
    client,
    clientId,
  };
}
