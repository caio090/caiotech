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

/**
 * Sprint Legacy Security Hardening V2 (Fase 2-4, PROMPT 04E): classificação
 * explícita de um erro de RPC em exatamente uma categoria -- nunca "qualquer
 * erro pode virar fallback". `rpc_unavailable` é a ÚNICA categoria que pode
 * seguir adiante para um fallback técnico; `authorization_denied` e
 * `unknown_error` são sempre finais (fail closed).
 */
export type RpcOutcome = "success" | "authorization_denied" | "rpc_unavailable" | "unknown_error";

export function classifyRpcError(error: SupabaseLikeError): RpcOutcome {
  if (!error) return "success";
  if (isAuthorizationDeniedError(error)) return "authorization_denied";
  if (isRpcUnavailableError(error)) return "rpc_unavailable";
  return "unknown_error";
}

/**
 * Gate único que decide se um fallback privilegiado (service_role) pode
 * rodar. Exige as DUAS condições ao mesmo tempo (Fase 3): o erro precisa
 * ser comprovadamente rpc_unavailable E a autorização independente precisa
 * ter retornado true -- nunca uma sozinha. "service_role disponível" nunca
 * entra nesta decisão.
 */
export function shouldAttemptPrivilegedFallback(error: SupabaseLikeError, independentlyAuthorized: boolean): boolean {
  return classifyRpcError(error) === "rpc_unavailable" && independentlyAuthorized === true;
}
