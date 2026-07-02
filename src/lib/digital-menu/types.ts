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
   * URL base padrão do provider, usada quando conn.api_base_url está vazio
   * e não há variável de ambiente de fallback.
   * Se definida, o provider sempre terá URL disponível.
   */
  defaultBaseUrl?: string;
  /**
   * Resolve a URL base da API para esta conexão.
   * Prioridade: conn.api_base_url → env global → defaultBaseUrl → null
   */
  resolveBaseUrl(conn: Pick<DigitalMenuConnection, "api_base_url">): string | null;
  /** Mensagem quando URL ausente — aponta para /admin/conexoes, não Vercel */
  missingBaseUrlMessage: string;
}

export interface DigitalMenuOrdersRaw {
  /** Dados brutos retornados pela API do provedor — cada adapter parseia conforme necessário */
  raw: unknown;
}

export interface DigitalMenuProviderCapabilities {
  /** O provedor expõe endpoint de pedidos */
  orders: boolean;
  /** O provedor expõe endpoint de cardápio */
  menu: boolean;
  /** O provedor suporta webhooks de eventos */
  webhooks: boolean;
  /** Faturamento total calculado a partir dos pedidos (derivado) */
  revenue: "derived_from_orders" | false;
  /** Produtos mais vendidos derivados de itens dos pedidos */
  topItems: "derived_from_order_items" | false;
  /** Ticket médio derivado de faturamento / total de pedidos */
  averageTicket: "derived_from_orders" | false;
}

export const BASE_URL_MISSING_REASON = "base_url_missing" as const;
