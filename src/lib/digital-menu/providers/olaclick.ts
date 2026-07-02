import type { DigitalMenuAdapter, DigitalMenuProviderCapabilities } from "../types";

// URL base oficial da API pública OlaClick.
// Fonte: painel OlaClick → API Keys → View documentation → OlaClick Public API
const OLACLICK_DEFAULT_BASE_URL = "https://public-api.olaclick.app";

// Adapter para o provedor OlaClick.
// Ordem de resolução da URL:
//   1. conn.api_base_url — configurada por cliente na conexão
//   2. process.env.OLACLICK_API_BASE_URL — fallback global legado/opcional
//   3. OLACLICK_DEFAULT_BASE_URL — preset interno (https://public-api.olaclick.app)
//
// Como o preset existe, conexões OlaClick nunca ficam sem URL.
export const OlaClickAdapter: DigitalMenuAdapter = {
  provider_slug:  "olaclick",
  provider_name:  "OlaClick",
  defaultBaseUrl: OLACLICK_DEFAULT_BASE_URL,

  resolveBaseUrl(conn) {
    const fromConn = conn.api_base_url?.trim();
    if (fromConn) return fromConn;
    const fromEnv = process.env.OLACLICK_API_BASE_URL?.trim();
    if (fromEnv) return fromEnv;
    return OLACLICK_DEFAULT_BASE_URL;
  },

  missingBaseUrlMessage:
    "URL da API do provedor não configurada. " +
    "Edite a conexão em /admin/conexoes → Cardápio Digital.",
};

export const OlaClickCapabilities: DigitalMenuProviderCapabilities = {
  orders:        true,
  menu:          true,
  webhooks:      false,
  revenue:       "derived_from_orders",
  topItems:      "derived_from_order_items",
  averageTicket: "derived_from_orders",
};
