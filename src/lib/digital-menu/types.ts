// Tipos centrais do módulo Cardápio Digital.
// OlaClick é apenas um dos providers possíveis.

export interface DigitalMenuConnection {
  id: string;
  client_id: string;
  provider_slug: string;      // 'olaclick' | 'anotaai' | 'deliverydireto' | ...
  connection_name: string;
  access_token: string;       // nunca exposto no frontend
  token_last_four: string | null;
  api_base_url?: string | null;
  status: string;
  last_sync_at: string | null;
}

export interface DigitalMenuAdapter {
  /** slug único do provedor, usado como chave no registro */
  provider_slug: string;
  /** nome exibido ao usuário */
  provider_name: string;
  /**
   * Resolve a URL base da API para esta conexão.
   * Prioridade: api_base_url da conexão → preset interno → null
   */
  resolveBaseUrl(conn: Pick<DigitalMenuConnection, "api_base_url">): string | null;
  /** Mensagem quando URL ausente — aponta para /admin/conexoes, não Vercel */
  missingBaseUrlMessage: string;
}

export interface DigitalMenuOrdersRaw {
  /** Dados brutos retornados pela API do provedor — cada adapter parseia conforme necessário */
  raw: unknown;
}

export const BASE_URL_MISSING_REASON = "base_url_missing" as const;
