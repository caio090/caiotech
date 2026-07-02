// Helpers server-side para o módulo Cardápio Digital.
// Importar somente em rotas API e server components — nunca no cliente.

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resultado de busca de conexão ativa por cliente.
 * access_token está presente para uso interno de rotas server-side.
 * NUNCA retornar access_token em JSON de API pública.
 */
export interface ActiveDigitalMenuConnection {
  id:              string;
  client_id:       string;
  provider:        string;
  connection_name: string;
  status:          string;
  token_last_four: string | null;
  api_base_url:    string | null;
  last_sync_at:    string | null;
  created_at:      string | null;
  /** Disponível server-side para chamar a API do provedor. Nunca expor. */
  access_token:    string;
}

export type ConnectionLookupResult =
  | { found: true;  connection: ActiveDigitalMenuConnection; error: null }
  | { found: false; connection: null; error: { code: string; message: string } | null };

/**
 * Busca a conexão ativa de Cardápio Digital para um cliente.
 *
 * Usa `.order("created_at").limit(1)` antes de `.maybeSingle()` para
 * evitar erro PGRST116 ("multiple rows") quando o cliente tem mais de
 * uma entrada na tabela olaclick_connections.
 *
 * Aceita tanto status = "connected" quanto status = "active" (resiliência).
 */
export async function getActiveDigitalMenuConnection(
  supabase: SupabaseClient,
  clientId: string
): Promise<ConnectionLookupResult> {
  const { data: raw, error } = await supabase
    .from("olaclick_connections")
    .select(
      "id, client_id, provider, connection_name, status, " +
      "token_last_four, api_base_url, last_sync_at, created_at, access_token"
    )
    .eq("client_id", clientId)
    .in("status", ["connected", "active"])   // resiliente a variações de valor
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      found:      false,
      connection: null,
      error: { code: error.code ?? "db_error", message: error.message },
    };
  }

  if (!raw) {
    return { found: false, connection: null, error: null };
  }

  // Cast necessário: select() com string literal não é inferido pelo gerador de tipos do Supabase
  const row = raw as unknown as Record<string, unknown>;

  return {
    found: true,
    connection: {
      id:              row["id"]              as string,
      client_id:       row["client_id"]       as string,
      provider:        (row["provider"]       as string | null) ?? "olaclick",
      connection_name: row["connection_name"] as string,
      status:          row["status"]          as string,
      token_last_four: row["token_last_four"] as string | null,
      api_base_url:    row["api_base_url"]    as string | null,
      last_sync_at:    row["last_sync_at"]    as string | null,
      created_at:      row["created_at"]      as string | null,
      access_token:    row["access_token"]    as string,
    },
    error: null,
  };
}
