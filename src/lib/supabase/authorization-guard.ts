/**
 * Sprint Legacy Security Hardening V2 (Fase 8-11, PROMPT 04A): uma negação
 * de autorização de uma RPC canônica (can_access_client / admin_*) é FINAL
 * -- nunca um motivo para tentar um fallback privilegiado (service_role).
 * Só RPC_UNAVAILABLE (função ausente / schema cache desatualizado) pode
 * justificar um fallback técnico, e mesmo assim só depois de uma
 * revalidação independente de autorização (ver assertCanAccessClientOrDeny).
 */
type SupabaseLikeError = { code?: string; message?: string } | null | undefined;

const DENIAL_MARKERS = ["permission_denied", "forbidden", "unauthorized"];

export function isAuthorizationDeniedError(error: SupabaseLikeError): boolean {
  const text = error?.message?.toLowerCase() ?? "";
  return DENIAL_MARKERS.some((marker) => text.includes(marker));
}

export function isRpcUnavailableError(error: SupabaseLikeError): boolean {
  const text = error?.message?.toLowerCase() ?? "";
  return error?.code === "PGRST202" || text.includes("could not find the function") || text.includes("schema cache");
}

/**
 * Revalida autorização de Company de forma independente, usando o client
 * de sessão (nunca service_role) via a RPC canônica can_access_client.
 * Só depois de um `true` explícito aqui é seguro considerar um fallback
 * técnico com service_role -- service_role disponível NUNCA significa
 * autorização concedida.
 */
export async function canAccessClientIndependently(
  sessionSupabase: { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> },
  clientId: string,
): Promise<boolean> {
  const { data, error } = await sessionSupabase.rpc("can_access_client", { target_client_id: clientId });
  if (error) return false;
  return data === true;
}
