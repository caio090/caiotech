/**
 * Canonical, provider-agnostic data model for the Relatórios module.
 *
 * Every visual component reads only these shapes — never a raw OlaClick/
 * import-file shape directly — so the UI can render the same way regardless
 * of whether the data came from a live connector or an imported file.
 */

// ── Availability ─────────────────────────────────────────────────────────
// Fase "Estados de disponibilidade" — zero real and "no data" must never be
// visually indistinguishable, and a missing capability must never render an
// empty chart that looks like a real zero.
export type ReportAvailability =
  | "available"
  | "partial"
  | "missing"
  | "import_required"
  | "connector_blocked"
  | "processing"
  | "error";

export interface ReportAvailabilityState {
  status: ReportAvailability;
  /** Human-readable reason, shown next to the empty/blocked state. */
  reason?: string;
}

// ── Provenance — every canonical record/value carries where it came from ──
export type ReportSourceKind = "connector" | "import" | "manual";

export interface ReportProvenance {
  source: ReportSourceKind;
  /** Connector slug ("olaclick") or import batch id — never a raw guess. */
  sourceId: string;
  sourceRecordId?: string;
  clientId: string;
  occurredAt: string; // ISO — when the underlying event happened
  importedAt?: string; // ISO — when it entered LOKAT, only for source: "import"
  /** 0–1. Connector data defaults to 1 (provider is authoritative); imported
   * data reflects parse/mapping certainty (e.g. an ambiguous column guess). */
  confidence: number;
  rawReference?: string;
}

// ── Indicators ───────────────────────────────────────────────────────────
// Every indicator on screen must be able to answer: value, period,
// comparison, origin, availability, last update — never just a bare number.
export interface ReportIndicator {
  id: string;
  label: string;
  value: number | null;
  previousValue?: number | null;
  unit: "currency_cents" | "count" | "percentage";
  periodStart: string; // ISO date
  periodEnd: string; // ISO date
  source: ReportSourceKind;
  availability: ReportAvailabilityState;
  lastUpdatedAt: string | null; // ISO
}

export interface ReportSummary {
  clientId: string;
  periodStart: string;
  periodEnd: string;
  orders: ReportIndicator;
  grossRevenueCents: ReportIndicator;
  netRevenueCents: ReportIndicator;
  averageTicketCents: ReportIndicator;
  discountsCents: ReportIndicator;
  feesCents: ReportIndicator;
  cancellations: ReportIndicator;
  refunds: ReportIndicator;
  completedOrders: ReportIndicator;
  cancelledOrders: ReportIndicator;
}

// ── Dimensional records ──────────────────────────────────────────────────

export interface ReportOrder {
  id: string;
  provenance: ReportProvenance;
  occurredAt: string;
  totalCents: number;
  discountCents: number;
  feeCents: number;
  status: "completed" | "cancelled" | "refunded" | "pending" | "unknown";
  serviceType: string | null; // normalized via SERVICE_TYPE_MAP, see service-types.ts
  orderSource: string | null; // web/pdv/totem/chatbot/app/link/qrcode/balcao/integration/other
  channel: string | null;
  paymentMethod: string | null; // raw label as reported by the source
  customerId: string | null;
  productIds: string[];
}

export interface ReportPaymentMethod {
  key: string; // normalized key, e.g. "pix", "credit_card"
  label: string;
  groupKey: string | null; // e.g. "cartao" groups "credit_card"/"debit_card"
  orders: number;
  totalCents: number;
  shareOfTotal: number | null; // 0–1, null when total is 0/unavailable
  averageTicketCents: number | null;
  availability: ReportAvailabilityState;
}

export interface ReportServiceType {
  key: string;
  label: string;
  orders: number;
  totalCents: number;
  shareOfTotal: number | null;
}

export interface ReportChannel {
  key: string;
  label: string;
  orders: number;
  totalCents: number;
  shareOfTotal: number | null;
}

export interface ReportProduct {
  id: string;
  name: string;
  category: string | null;
  quantity: number;
  totalCents: number;
  shareOfTotal: number | null;
}

export interface ReportCustomer {
  id: string;
  name: string | null;
  orders: number;
  totalCents: number;
  firstOrderAt: string | null;
  lastOrderAt: string | null;
}

export interface ReportTimeBucket {
  /** 0–23, or a 2-hour bucket start (0,2,4,...22) depending on granularity. */
  hourStart: number;
  granularityHours: 1 | 2;
  orders: number;
  totalCents: number;
}

export interface ReportWeekday {
  /** 0 = domingo … 6 = sábado, matching JS Date#getDay(). */
  weekday: number;
  orders: number;
  totalCents: number;
}

// ── Data sources / connectors ────────────────────────────────────────────

export type ReportCapability =
  | "orders"
  | "grossRevenue"
  | "netRevenue"
  | "averageTicket"
  | "serviceTypes"
  | "paymentMethods"
  | "orderSources"
  | "products"
  | "customers"
  | "discounts"
  | "fees"
  | "cancellations"
  | "timeDistribution"
  | "weekdayDistribution"
  | "margins";

export interface ReportDataSource {
  id: string;
  provider: string; // "olaclick", "import:csv", "import:xlsx", "import:json", "manual"
  clientId: string;
  sourceName: string;
  sourceType: ReportSourceKind;
  connected: boolean;
  lastSyncAt: string | null;
  capabilities: ReportCapability[];
}

export interface ReportFetchResult<T> {
  availability: ReportAvailabilityState;
  data: T | null;
}

/**
 * Every provider (a live connector or a completed import batch) implements
 * this contract. UI components call these and render purely from the
 * returned availability + canonical shape — never branch on `provider`.
 */
export interface ReportDataConnector {
  id: string;
  provider: string;
  clientId: string;
  sourceName: string;
  sourceType: ReportSourceKind;
  connected: boolean;
  lastSyncAt: string | null;
  capabilities: ReportCapability[];

  fetchSummary(periodStart: string, periodEnd: string): Promise<ReportFetchResult<ReportSummary>>;
  fetchOrders(periodStart: string, periodEnd: string): Promise<ReportFetchResult<ReportOrder[]>>;
  fetchProducts(periodStart: string, periodEnd: string): Promise<ReportFetchResult<ReportProduct[]>>;
  fetchPayments(periodStart: string, periodEnd: string): Promise<ReportFetchResult<ReportPaymentMethod[]>>;
  fetchChannels(periodStart: string, periodEnd: string): Promise<ReportFetchResult<ReportChannel[]>>;
  fetchTimeDistribution(periodStart: string, periodEnd: string): Promise<ReportFetchResult<ReportTimeBucket[]>>;
  fetchCustomers(periodStart: string, periodEnd: string): Promise<ReportFetchResult<ReportCustomer[]>>;
  /** Raw rows for the "Exportar dados > JSON técnico" advanced option. */
  fetchRawExport(periodStart: string, periodEnd: string): Promise<ReportFetchResult<unknown>>;
}

// ── Deterministic insights ────────────────────────────────────────────────

export interface ReportInsight {
  id: string;
  whatHappened: string;
  whyItMatters: string;
  estimatedImpact: string | null;
  nextAction: string;
  severity: "info" | "attention" | "opportunity";
}
