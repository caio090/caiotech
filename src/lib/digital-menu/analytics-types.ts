// Tipos normalizados para análise de Cardápio Digital e atribuição de campanhas.
// Independentes do provider — OlaClick é apenas um dos possíveis.

export type OrderFetchCompleteness =
  | "complete"          // todos os pedidos do período foram carregados e confirmados
  | "partial"           // truncamento comprovado (safety limits, provider total > retornado)
  | "operational_only"  // page param ignorado ou filtros não respeitados; entrega apenas recentes
  | "unknown"           // número redondo sem envelope; não é possível confirmar
  | "error";            // erro durante coleta

export type SnapshotPersistence =
  | "saved"               // snapshot salvo com sucesso
  | "not_configured"      // tabela não existe ainda
  | "skipped"             // zerou ou condição não atendida
  | "skipped_incomplete"  // coleta incompleta — snapshot não alimentaria comparação válida
  | "error";              // erro diferente de 42P01

// Escopo do total reportado pelo provider na paginação
export type ProviderTotalScope =
  | "filtered_period"   // confirmado: representa o total do período solicitado
  | "account_history"   // total de todos os pedidos da conta (ignora filtro de data)
  | "current_page"      // total da página atual, não do período
  | "monetary"          // valor monetário, não contagem de pedidos
  | "unknown";          // não foi possível determinar o escopo

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
  returnedOrdersWithinRequestedRange: boolean | null;
  dateFilterCompletenessConfirmed:    false;
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

// ── Pedido normalizado (Fase 4 do brief "Data Reality") ──────────────────────
//
// Contrato-alvo para substituir a extração ad-hoc/heurística que hoje vive
// inline em src/app/api/olaclick/orders/route.ts (extractTotal/extractDate/
// extractStatus/extractItems/extractPaymentEntries, ~linhas 97-814) e é
// parcialmente duplicada em products-sold/route.ts e
// payment-methods/diagnostics/route.ts. Definido aqui, mas ainda NÃO
// consumido pelo motor de pedidos existente: essa engine tem ~2300 linhas,
// zero cobertura de teste, e reescrevê-la às cegas (sem uma conta OlaClick
// real para validar contra) é um risco maior do que o benefício nesta
// sprint. Migrar a extração para produzir/consumir estes tipos é trabalho
// futuro, separadamente escopado.

export type NormalizedOrderStatus = "pending" | "confirmed" | "completed" | "cancelled" | "refunded" | "unknown";
export type NormalizedPaymentStatus = "paid" | "pending" | "partially_paid" | "refunded" | "unknown";
export type OrderItemMappingStatus = "linked" | "suggested" | "unlinked";

export interface NormalizedOrderItem {
  externalItemId: string | null;
  externalProductId: string | null;
  externalProductName: string;
  quantity: number;
  /** Integer cents, before item-level discounts. */
  unitGrossAmount: number | null;
  discountsAmount: number | null;
  /** Integer cents actually attributed to this item after discounts. */
  finalAmount: number | null;
  additions: string[];
  /** Set once a human confirms the link to our own product catalog (Fase 12 -- never automatic). */
  internalProductId: string | null;
  mappingStatus: OrderItemMappingStatus;
}

export interface NormalizedOrder {
  externalOrderId: string;
  source: string;
  workspaceId: string;
  storeId: string | null;
  /** Business/operational day this order belongs to, after applying the company's virada (Fase 5) -- not necessarily createdAt's calendar date. */
  operationalDate: string;
  createdAt: string;
  completedAt: string | null;
  status: NormalizedOrderStatus;
  paymentStatus: NormalizedPaymentStatus;
  /** All monetary fields are integer cents. */
  grossItemsAmount: number | null;
  discountsAmount: number | null;
  deliveryFeeAmount: number | null;
  serviceFeeAmount: number | null;
  platformFeeAmount: number | null;
  refundedAmount: number | null;
  finalPaidAmount: number | null;
  paymentMethod: string | null;
  channel: string | null;
  items: NormalizedOrderItem[] | null;
  /** Hash, never the raw customer identity -- financial calculations must never key off name/phone/address. */
  customerReferenceHash: string | null;
  /** Opaque pointer back to the original provider payload/id, for troubleshooting only -- never rendered to end users. */
  rawSourceReference: string;
}

// Regra de copy para atribuição:
// - attributionMethod !== "temporal_correlation" && attributionMethod !== "none":
//   "A campanha X gerou Y pedidos e R$ Z em faturamento atribuído."
// - attributionMethod === "temporal_correlation":
//   "Durante a campanha X, foram registrados Y pedidos e R$ Z em faturamento."
// - attributionMethod === "none":
//   "Atribuição campanha → pedido ainda não configurada."
