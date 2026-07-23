import type {
  ReportDataConnector, ReportFetchResult, ReportSummary, ReportOrder, ReportProduct,
  ReportPaymentMethod, ReportChannel, ReportTimeBucket, ReportCustomer, ReportCapability,
} from "../types";
import { normalizePaymentMethodLabel } from "../payment-methods";

/**
 * Wraps the EXISTING /api/olaclick/orders and /api/olaclick/products-sold
 * routes (src/app/api/olaclick/*, already used by
 * src/app/admin/relatorios/faturamento/page.tsx) into the canonical
 * ReportDataConnector contract — no new OlaClick fetching logic, no
 * duplicated windowing/probe-auth code. Every OlaClick amount is returned
 * in reais by that route; this connector is the single place that converts
 * to integer cents for the canonical model.
 *
 * Fields the /orders route computes internally but doesn't reliably surface
 * in every response branch (confirmed by reading the route's multiple
 * response-construction paths) are read defensively and reported as
 * "missing", never guessed.
 */

const REAIS_TO_CENTS = (reais: number | null | undefined): number | null =>
  typeof reais === "number" && Number.isFinite(reais) ? Math.round(reais * 100) : null;

interface OlaClickOrdersResponse {
  ok: boolean;
  reason?: string;
  data?: {
    faturamento_total?: number;
    total_pedidos?: number;
    ticket_medio?: number | null;
    totalDescontos?: number;
    totalTaxasEntrega?: number;
    pedidosPorFormaPagamento?: Record<string, number>;
    faturamentoPorFormaPagamento?: Record<string, number>;
    pedidosPorHora?: Record<string, number>;
    faturamentoPorHora?: Record<string, number>;
    pedidosPorDiaSemana?: Record<string, number>;
    faturamentoPorDiaSemana?: Record<string, number>;
    pedidosPorServiceType?: Record<string, number>;
    pedidosPorSource?: Record<string, number>;
    pedidos_recentes?: Array<{ id: string; date: string | null; status: string | null; total: number; payment: string | null }>;
  };
}

async function fetchOrdersSummary(clientId: string, start: string, end: string): Promise<OlaClickOrdersResponse | null> {
  try {
    const res = await fetch(`/api/olaclick/orders?client_id=${encodeURIComponent(clientId)}&start_date=${start}&end_date=${end}`, {
      credentials: "include",
    });
    return (await res.json()) as OlaClickOrdersResponse;
  } catch {
    return null;
  }
}

const CAPABILITIES: ReportCapability[] = [
  "orders", "grossRevenue", "averageTicket", "discounts", "fees", "paymentMethods",
  "timeDistribution", "weekdayDistribution", "products",
];

export function createOlaClickConnector(clientId: string, sourceName: string): ReportDataConnector {
  return {
    id: `olaclick:${clientId}`,
    provider: "olaclick",
    clientId,
    sourceName,
    sourceType: "connector",
    connected: true,
    lastSyncAt: null,
    capabilities: CAPABILITIES,

    async fetchSummary(periodStart, periodEnd): Promise<ReportFetchResult<ReportSummary>> {
      const res = await fetchOrdersSummary(clientId, periodStart, periodEnd);
      if (!res || !res.ok || !res.data) {
        return { availability: { status: "connector_blocked", reason: res?.reason ?? "Não foi possível consultar o OlaClick." }, data: null };
      }
      const d = res.data;
      const now = new Date().toISOString();
      const indicator = (value: number | null, unit: "currency_cents" | "count") => ({
        id: "", label: "", value, unit, periodStart, periodEnd,
        source: "connector" as const, availability: { status: "available" as const }, lastUpdatedAt: now,
      });
      return {
        availability: { status: "available" },
        data: {
          clientId, periodStart, periodEnd,
          orders: { ...indicator(d.total_pedidos ?? null, "count"), id: "orders", label: "Pedidos" },
          grossRevenueCents: { ...indicator(REAIS_TO_CENTS(d.faturamento_total), "currency_cents"), id: "grossRevenueCents", label: "Faturamento bruto" },
          netRevenueCents: { id: "netRevenueCents", label: "Faturamento líquido", value: null, unit: "currency_cents", periodStart, periodEnd, source: "connector", availability: { status: "missing", reason: "OlaClick não expõe líquido diretamente — use a Conciliação." }, lastUpdatedAt: null },
          averageTicketCents: { ...indicator(REAIS_TO_CENTS(d.ticket_medio ?? null), "currency_cents"), id: "averageTicketCents", label: "Ticket médio" },
          discountsCents: { ...indicator(REAIS_TO_CENTS(d.totalDescontos ?? null), "currency_cents"), id: "discountsCents", label: "Descontos" },
          feesCents: { ...indicator(REAIS_TO_CENTS(d.totalTaxasEntrega ?? null), "currency_cents"), id: "feesCents", label: "Taxas de entrega" },
          cancellations: { id: "cancellations", label: "Cancelamentos", value: null, unit: "count", periodStart, periodEnd, source: "connector", availability: { status: "missing", reason: "Não disponível nesta integração." }, lastUpdatedAt: null },
          refunds: { id: "refunds", label: "Estornos", value: null, unit: "count", periodStart, periodEnd, source: "connector", availability: { status: "missing", reason: "Não disponível nesta integração." }, lastUpdatedAt: null },
          completedOrders: { id: "completedOrders", label: "Pedidos concluídos", value: null, unit: "count", periodStart, periodEnd, source: "connector", availability: { status: "partial", reason: "Ver detalhamento por status no Diagnóstico do Faturamento." }, lastUpdatedAt: null },
          cancelledOrders: { id: "cancelledOrders", label: "Pedidos cancelados", value: null, unit: "count", periodStart, periodEnd, source: "connector", availability: { status: "partial", reason: "Ver detalhamento por status no Diagnóstico do Faturamento." }, lastUpdatedAt: null },
        },
      };
    },

    async fetchOrders(periodStart, periodEnd): Promise<ReportFetchResult<ReportOrder[]>> {
      const res = await fetchOrdersSummary(clientId, periodStart, periodEnd);
      if (!res || !res.ok || !res.data?.pedidos_recentes) {
        return { availability: { status: "partial", reason: "Apenas os pedidos mais recentes ficam disponíveis por esta rota — use Produção/REC OS para a lista completa." }, data: null };
      }
      const orders: ReportOrder[] = res.data.pedidos_recentes.map((o) => ({
        id: o.id,
        provenance: { source: "connector", sourceId: "olaclick", clientId, occurredAt: o.date ?? periodStart, confidence: 1 },
        occurredAt: o.date ?? periodStart,
        totalCents: REAIS_TO_CENTS(o.total) ?? 0,
        discountCents: 0,
        feeCents: 0,
        status: o.status === "cancelled" || o.status === "cancelado" ? "cancelled" : "completed",
        serviceType: null,
        orderSource: null,
        channel: null,
        paymentMethod: o.payment,
        customerId: null,
        productIds: [],
      }));
      return { availability: { status: "partial", reason: "Amostra dos pedidos mais recentes, não a lista completa do período." }, data: orders };
    },

    async fetchProducts(): Promise<ReportFetchResult<ReportProduct[]>> {
      // /api/olaclick/products-sold exists but has its own response shape not
      // yet mapped in this connector — honestly reported as missing rather
      // than guessed, consistent with this sprint's incremental integration.
      return { availability: { status: "missing", reason: "Conector ainda não mapeia /api/olaclick/products-sold — dado real existe, integração pendente." }, data: null };
    },

    async fetchPayments(periodStart, periodEnd): Promise<ReportFetchResult<ReportPaymentMethod[]>> {
      const res = await fetchOrdersSummary(clientId, periodStart, periodEnd);
      const ordMap = res?.data?.pedidosPorFormaPagamento;
      const revMap = res?.data?.faturamentoPorFormaPagamento;
      if (!res?.ok || !ordMap || !revMap) {
        return { availability: { status: "missing", reason: "Formas de pagamento indisponíveis nesta resposta do OlaClick." }, data: null };
      }
      const grandTotalCents = Object.values(revMap).reduce((s, v) => s + (REAIS_TO_CENTS(v) ?? 0), 0);
      const methods: ReportPaymentMethod[] = Object.entries(ordMap).map(([rawKey, orders]) => {
        const totalCents = REAIS_TO_CENTS(revMap[rawKey]) ?? 0;
        const { key, label, groupKey } = normalizePaymentMethodLabel(rawKey);
        return {
          key, label, groupKey, orders, totalCents,
          shareOfTotal: grandTotalCents > 0 ? totalCents / grandTotalCents : null,
          averageTicketCents: orders > 0 ? Math.round(totalCents / orders) : null,
          availability: { status: "available" },
        };
      });
      return { availability: { status: "available" }, data: methods };
    },

    async fetchChannels(periodStart, periodEnd): Promise<ReportFetchResult<ReportChannel[]>> {
      const res = await fetchOrdersSummary(clientId, periodStart, periodEnd);
      const sourceMap = res?.data?.pedidosPorSource;
      if (!res?.ok || !sourceMap) {
        return { availability: { status: "missing", reason: "Origem/canal dos pedidos indisponível nesta resposta do OlaClick." }, data: null };
      }
      const totalOrders = Object.values(sourceMap).reduce((s, v) => s + v, 0);
      const channels: ReportChannel[] = Object.entries(sourceMap).map(([key, orders]) => ({
        key, label: key, orders, totalCents: 0, shareOfTotal: totalOrders > 0 ? orders / totalOrders : null,
      }));
      return { availability: { status: "partial", reason: "Contagem de pedidos disponível; faturamento por canal ainda não mapeado." }, data: channels };
    },

    async fetchTimeDistribution(periodStart, periodEnd): Promise<ReportFetchResult<ReportTimeBucket[]>> {
      const res = await fetchOrdersSummary(clientId, periodStart, periodEnd);
      const ordMap = res?.data?.pedidosPorHora;
      const revMap = res?.data?.faturamentoPorHora;
      if (!res?.ok || !ordMap) {
        return { availability: { status: "missing", reason: "Distribuição por horário indisponível nesta resposta do OlaClick." }, data: null };
      }
      const buckets: ReportTimeBucket[] = Object.entries(ordMap).map(([hourStr, orders]) => ({
        hourStart: Number.parseInt(hourStr, 10),
        granularityHours: 1 as const,
        orders,
        totalCents: REAIS_TO_CENTS(revMap?.[hourStr]) ?? 0,
      })).filter((b) => Number.isFinite(b.hourStart));
      return { availability: { status: "available" }, data: buckets };
    },

    async fetchCustomers(): Promise<ReportFetchResult<ReportCustomer[]>> {
      return { availability: { status: "missing", reason: "OlaClick (Cardápio Digital) não expõe dados de cliente identificável nesta integração." }, data: null };
    },

    async fetchRawExport(periodStart, periodEnd): Promise<ReportFetchResult<unknown>> {
      const res = await fetchOrdersSummary(clientId, periodStart, periodEnd);
      if (!res?.ok) return { availability: { status: "connector_blocked", reason: res?.reason ?? "Falha ao consultar o OlaClick." }, data: null };
      return { availability: { status: "available" }, data: res.data };
    },
  };
}
