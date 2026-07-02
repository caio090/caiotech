import type { DigitalMenuAdapter, DigitalMenuProviderCapabilities } from "../types";

// Adapter para o provedor OlaClick.
// OLACLICK_API_BASE_URL é fallback global opcional — não é requisito por cliente.
// Prioridade: api_base_url da conexão (salva no banco) → env global → null
export const OlaClickAdapter: DigitalMenuAdapter = {
  provider_slug: "olaclick",
  provider_name: "OlaClick",

  resolveBaseUrl(conn) {
    const fromConn = conn.api_base_url?.trim();
    if (fromConn) return fromConn;
    const fromEnv = process.env.OLACLICK_API_BASE_URL?.trim();
    if (fromEnv) return fromEnv;
    return null;
  },

  missingBaseUrlMessage:
    "URL da API do provedor não configurada para este cliente. " +
    "Edite a conexão em /admin/conexoes → Cardápio Digital e preencha o campo 'URL da API do provedor'.",
};

export const OlaClickCapabilities: DigitalMenuProviderCapabilities = {
  orders:        true,
  menu:          true,
  webhooks:      false,
  revenue:       "derived_from_orders",
  topItems:      "derived_from_order_items",
  averageTicket: "derived_from_orders",
};
