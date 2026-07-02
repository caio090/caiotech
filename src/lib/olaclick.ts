/**
 * Resolve a URL base da API OlaClick para uma conexão específica.
 *
 * Prioridade:
 *   1. api_base_url salvo no banco (por cliente, via /admin/conexoes)
 *   2. OLACLICK_API_BASE_URL (env global — fallback opcional, não obrigatório)
 *   3. null → chamador deve retornar erro orientando /admin/conexoes
 */
export function resolveOlaClickBaseUrl(conn: {
  api_base_url?: string | null;
}): string | null {
  const fromConn = conn.api_base_url?.trim();
  if (fromConn) return fromConn;

  const fromEnv = process.env.OLACLICK_API_BASE_URL?.trim();
  if (fromEnv) return fromEnv;

  return null;
}

export const OLACLICK_BASE_URL_MISSING_RESPONSE = {
  ok:      false as const,
  reason:  "base_url_missing" as const,
  message: "URL da API do provedor não configurada para este cliente. " +
           "Edite a conexão em /admin/conexoes e preencha o campo 'URL da API do provedor'.",
} as const;
