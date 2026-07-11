// Tipos normalizados para análise de Cardápio Digital e atribuição de campanhas.
// Independentes do provider — OlaClick é apenas um dos possíveis.

export type OrderFetchCompleteness =
  | "complete"          // todos os pedidos do período foram carregados e confirmados
  | "partial"           // truncamento comprovado (safety limits, provider total > retornado)
  | "operational_only"  // page param ignorado ou filtros não respeitados; entrega apenas recentes
  | "unknown"           // número redondo sem envelope; não é possível confirmar
  | "error";            // erro durante coleta

export type SnapshotPersistence =
  | "saved"             // snapshot salvo com sucesso
  | "not_configured"    // tabela não existe ainda
  | "skipped"           // zerou ou condição não atendida
  | "error";            // erro diferente de 42P01

export interface OrderFetchDiagnostics {
  requestedStart:       string;
  requestedEnd:         string;
  fetchedCount:         number;
  uniqueCount:          number;
  duplicateCount:       number;
  missingIdCount:       number;
  pagesFetched:         number;
  paginationMode:       "envelope" | "page_size_fallback" | "single_page" | "operational_only";
  paginationDetected:   boolean;
  dateFilterRespected:  boolean | null;
  itemsAvailable:       boolean;
  completeness:         OrderFetchCompleteness;
  warning:              string | null;
  provider:             string;
}

export interface MenuAnalyticsSnapshot {
  clientId:      string;
  provider:      string;
  period:        { start: string; end: string; label: string };
  completeness:  OrderFetchCompleteness;
  revenue:       number;
  orderCount:    number;
  averageTicket: number | null;
  ordersByStatus: Record<string, number> | null;
  revenueByDay:  Array<{ date: string; revenue: number; orders: number }> | null;
  ordersByHour:  Record<string, number> | null;
  topProducts:   Array<{ name: string; qty: number }> | null;
  lastSync:      string;
  warnings:      string[];
}

// ── Atribuição campanha → pedido ──────────────────────────────────────────────

export type AttributionMethod =
  | "utm"                  // parâmetro UTM rastreado na URL de destino
  | "coupon"               // cupom de desconto vinculado à campanha
  | "tracked_link"         // link com parâmetro próprio (ex: bitly com tag)
  | "whatsapp_parameter"   // parâmetro rastreado no link de WhatsApp
  | "direct_order_source"  // campo source do pedido preenchido pelo provider
  | "temporal_correlation" // correlação temporal apenas — sem atribuição direta
  | "none";                // nenhuma atribuição configurada

export interface CampaignCommerceInsight {
  campaignId:         string;
  campaignName:       string;
  period:             { start: string; end: string };
  spend:              number | null;
  reach:              number | null;
  clicks:             number | null;
  attributedOrders:   number | null;
  attributedRevenue:  number | null;
  correlationOrders:  number | null;
  correlationRevenue: number | null;
  attributionMethod:  AttributionMethod;
  confidence:         "high" | "medium" | "low" | "none";
}

// Regra de copy para atribuição:
// - attributionMethod !== "temporal_correlation" && attributionMethod !== "none":
//   "A campanha X gerou Y pedidos e R$ Z em faturamento atribuído."
// - attributionMethod === "temporal_correlation":
//   "Durante a campanha X, foram registrados Y pedidos e R$ Z em faturamento."
// - attributionMethod === "none":
//   "Atribuição campanha → pedido ainda não configurada."
