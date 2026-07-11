import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveOlaClickBaseUrl } from "@/lib/olaclick";
import { getActiveDigitalMenuConnection } from "@/lib/digital-menu/server";

import type { OrderFetchCompleteness, SnapshotPersistence, ProviderTotalScope } from "@/lib/digital-menu/analytics-types";
export type { OrderFetchCompleteness };

export const dynamic     = "force-dynamic";
export const revalidate  = 0;
export const maxDuration = 60;

// ── Constants ──────────────────────────────────────────────────────────────────

const MAX_REQUESTS             = 200;
const MAX_UNIQUE_ORDERS        = 10_000;
const MIN_RATE_LIMIT_REMAINING = 5;
const MAX_WINDOW_DEPTH         = 12;
const MIN_WINDOW_MINUTES       = 15;
const CACHE_TTL_MS             = 5 * 60 * 1000;
const MAX_EXECUTION_MS         = 55_000;
const RETRY_TRANSIENT          = new Set([408, 429, 500, 502, 503, 504]);
export const DEFAULT_PAGE_SIZE = 50;

// ── Types ──────────────────────────────────────────────────────────────────────

type PeriodKey = "hoje" | "7dias" | "15dias" | "30dias" | "mes_atual";
type AuthMode  = "bearer" | "x_api_key";

export type PaginationConvention = "json_api" | "classic" | "offset" | "page_limit";

interface DebugShape {
  topLevelType:   "array" | "object" | "unknown";
  topLevelKeys:   string[];
  listKeyUsed:    string;
  totalReturned:  number;
  firstOrderKeys: string[];
  firstItemKeys:  string[];
  paginationKeys: string[];
  hasPagination:  boolean;
  detectedLimit:  number | null;
  hasNextPage:    boolean | null;
}

interface PaginationInfo {
  used:              boolean;
  paginationMode:    "envelope" | "page_size_fallback" | "single_page" | "operational_only" | "windowing";
  conventionUsed:    PaginationConvention;
  conventionVerified: false;
  pagesFetched:      number;
  totalReturned:     number;
  providerReportedTotalRaw: number | null;
  providerTotalScope:       ProviderTotalScope | null;
  limitDetected:     number | null;
  hasMore:           boolean;
  dedup: {
    rawCount:       number;
    uniqueCount:    number;
    duplicateCount: number;
    missingIdCount: number;
  };
  returnedOrdersWithinRequestedRange: boolean | null;
  dateFilterCompletenessConfirmed:    false;
  lastRequestedPage:   number;
  providerCurrentPage: number | null;
}

interface DetailFetchStats {
  detailRequestsAttempted: number;
  detailRequestsSucceeded: number;
  detailRequestsFailed:    number;
  abortedDueTo:            "rate_limited" | "not_found" | null;
}

interface HeatmapCell {
  weekday: number; // 0=Sun … 6=Sat (Fortaleza)
  hour:    number; // 0–23
  orders:  number;
  revenue: number;
}

interface DailyCollectionResult {
  date:                 string;
  providerTotal:        number | null;
  expectedPages:        number;
  pagesFetched:         number;
  uniqueOrders:         number;
  duplicateOrders:      number;
  failedPages:          number;
  repeatedPageDetected: boolean;
  endedNaturally:       boolean;
  complete:             boolean;
}

interface OrderMetrics {
  faturamento_total:       number;
  total_pedidos:           number;
  ticket_medio:            number | null;
  pedidos_por_status:      Record<string, number> | null;
  produtos_mais_vendidos:  { name: string; qty: number }[] | null;
  topItemsUnavailable:     boolean;
  topItemsReason:          string | null;
  topProductsCompleteness: "complete" | "partial" | "unavailable";
  melhores_dias:           { date: string; revenue: number; orders: number }[] | null;
  pedidos_recentes:        { id: string; date: string | null; status: string; total: number }[];
  heatmap:                 HeatmapCell[];
  pedidosPorServiceType:   Record<string, number>;
  pedidosPorSource:        Record<string, number>;
  totalDescontos:          number;
  totalTaxasEntrega:       number;
  totalGorjetas:           number;
  faturamentoPorDiaSemana: Record<string, number>;
  pedidosPorDiaSemana:     Record<string, number>;
  pedidosPorHora:          Record<string, number>;
  faturamentoPorHora:      Record<string, number>;
  concentracaoPorFaixa:    Record<string, { orders: number; revenue: number }>;
  faturamentoPorDia:       { date: string; revenue: number; orders: number }[];
}

interface RateLimitInfo {
  limit:     number | null;
  remaining: number | null;
  reset:     number | null;
  guard:     boolean;
}

export interface WindowFetchDiagnostics {
  totalWindows:             number;
  resolvedWindows:          number;
  partialWindows:           number;
  failedWindows:            number;
  datetimeFiltersSupported: boolean | null;
  dailyFallbackUsed:        boolean;
  requestsMade:             number;
  targetTotal:              number | null;
  rawCount:                 number;
  uniqueCount:              number;
  duplicateCount:           number;
  missingIdCount:           number;
  rateLimitStopped:         boolean;
  executionMs:              number;
  paginationFallbackReason: "repeated_page" | "requested_page_ignored" | "none";
  authMode:                 AuthMode;
  dailyDiagnostics:         DailyCollectionResult[];
  completeDays:             number;
  partialDays:              number;
}

interface PageFetchResult {
  ok:          boolean;
  orders:      Record<string, unknown>[];
  rawJson:     unknown;
  total:       number | null;
  hasMore:     boolean;
  perPage:     number | null;
  currentPage: number | null;
  httpStatus:  number | null;
  rateLimitInfo: RateLimitInfo;
  isAuth:      boolean;
}

interface CacheEntry {
  data:      unknown;
  timestamp: number;
}

// ── Utilities ──────────────────────────────────────────────────────────────────

function resolveDateRange(period: PeriodKey): { start: string; end: string } {
  const now   = new Date();
  const toYMD = (d: Date) => d.toISOString().split("T")[0];
  if (period === "hoje")   return { start: toYMD(now), end: toYMD(now) };
  if (period === "7dias")  { const s = new Date(now); s.setDate(s.getDate() - 6);  return { start: toYMD(s), end: toYMD(now) }; }
  if (period === "15dias") { const s = new Date(now); s.setDate(s.getDate() - 14); return { start: toYMD(s), end: toYMD(now) }; }
  if (period === "30dias") { const s = new Date(now); s.setDate(s.getDate() - 29); return { start: toYMD(s), end: toYMD(now) }; }
  const s = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start: toYMD(s), end: toYMD(now) };
}

function classifyProviderError(httpStatus: number): { code: string; reason: string; message: string } {
  if (httpStatus === 401) return { code: "provider_unauthorized",       reason: "token_invalid",      message: "A API recusou a chave do provider. Verifique o token/API Key da conexão." };
  if (httpStatus === 403) return { code: "provider_forbidden",          reason: "forbidden",          message: "A API respondeu sem permissão para consultar pedidos." };
  if (httpStatus === 404) return { code: "provider_endpoint_not_found", reason: "endpoint_not_found", message: "Endpoint de pedidos não encontrado. Verifique o adapter OlaClick." };
  if (httpStatus === 422 || httpStatus === 400) return { code: "provider_bad_request", reason: "bad_params", message: "A API recusou os filtros do período." };
  if (httpStatus === 429) return { code: "provider_rate_limited",       reason: "rate_limited",       message: "Limite de requisições atingido. Tente novamente em alguns minutos." };
  if (httpStatus >= 500)  return { code: "provider_server_error",       reason: "provider_error",     message: `Erro interno do provedor (HTTP ${httpStatus}). Tente novamente em instantes.` };
  return { code: "provider_api_error", reason: "unknown", message: `Erro ao consultar API do provedor (HTTP ${httpStatus}).` };
}

async function safeProviderBody(response: Response): Promise<string | null> {
  try {
    const text = await response.text();
    return text.slice(0, 300).replace(/[A-Za-z0-9_\-]{31,}/g, "[REDACTED]");
  } catch { return null; }
}

function sanitizeHeaderValue(value: string): string {
  return value.trim().replace(/[""''«»]/g, "").replace(/[^\x00-\xFF]/g, "");
}
function isValidHeaderValue(value: string): boolean {
  return value.length > 0 && /^[\x20-\x7E\x80-\xFF]+$/.test(value);
}

export function buildOrdersPaginationParams(
  convention: PaginationConvention,
  page:       number,
  pageSize:   number,
  params:     URLSearchParams,
): void {
  if (convention === "json_api") {
    params.set("page[number]", String(page));
    params.set("page[size]",   String(pageSize));
  } else if (convention === "page_limit") {
    params.set("page",  String(page));
    params.set("limit", String(pageSize));
  } else if (convention === "classic") {
    params.set("page",     String(page));
    params.set("per_page", String(pageSize));
  } else if (convention === "offset") {
    params.set("offset", String((page - 1) * pageSize));
    params.set("limit",  String(pageSize));
  }
}

function extractOrders(raw: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    for (const key of ["data", "orders", "results", "items"]) {
      if (Array.isArray(r[key])) return r[key] as Record<string, unknown>[];
    }
  }
  return null;
}

function extractOrderId(order: Record<string, unknown>): string {
  return String(order["id"] ?? order["public_id"] ?? order["order_id"] ?? order["uuid"] ?? order["code"] ?? order["number"] ?? "");
}

function detectNextPage(
  raw: unknown,
  currentPage: number,
): { nextPage: number | null; providerTotal: number | null; perPage: number | null; providerCurrentPage: number | null } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { nextPage: null, providerTotal: null, perPage: null, providerCurrentPage: null };
  const r = raw as Record<string, unknown>;

  const pag = r["pagination"] as Record<string, unknown> | undefined;
  if (pag && typeof pag === "object") {
    const hasMore             = pag["has_more"] === true;
    const total               = typeof pag["total"]        === "number" ? pag["total"]        : null;
    const perPage             = typeof pag["per_page"]     === "number" ? pag["per_page"]     : null;
    const currentPageReported = typeof pag["current_page"] === "number" ? pag["current_page"] : null;
    const lastPage =
      typeof pag["last_page"]   === "number" ? pag["last_page"]   :
      typeof pag["total_pages"] === "number" ? pag["total_pages"] :
      (total !== null && perPage !== null && perPage > 0) ? Math.ceil(total / perPage) : null;
    let next: number | null = null;
    if (hasMore) {
      next = currentPage + 1;
    } else if (lastPage !== null && currentPage < lastPage) {
      next = currentPage + 1;
    }
    return { nextPage: next, providerTotal: total, perPage, providerCurrentPage: currentPageReported };
  }

  const meta = r["meta"] as Record<string, unknown> | undefined;
  if (meta && typeof meta === "object") {
    const lastPage = typeof meta["last_page"] === "number" ? meta["last_page"] : null;
    const total    = typeof meta["total"]     === "number" ? meta["total"]     : null;
    const perPage  = typeof meta["per_page"]  === "number" ? meta["per_page"]  : null;
    const next     = lastPage !== null && currentPage < lastPage ? currentPage + 1 : null;
    return { nextPage: next, providerTotal: total, perPage, providerCurrentPage: null };
  }

  const links = r["links"] as Record<string, unknown> | undefined;
  if (links?.["next"] != null) return { nextPage: currentPage + 1, providerTotal: null, perPage: null, providerCurrentPage: null };
  if (r["next_page"]  != null) return { nextPage: currentPage + 1, providerTotal: null, perPage: null, providerCurrentPage: null };
  if (r["next"] != null && typeof r["next"] === "string") return { nextPage: currentPage + 1, providerTotal: null, perPage: null, providerCurrentPage: null };

  return { nextPage: null, providerTotal: null, perPage: null, providerCurrentPage: null };
}

function buildDebugShape(
  rawJson: unknown,
  pageOrders: Record<string, unknown>[],
  np: number | null,
  pp: number | null,
  paginationKeys: string[],
): DebugShape {
  const topLevelType: DebugShape["topLevelType"] = Array.isArray(rawJson) ? "array"
    : (rawJson && typeof rawJson === "object") ? "object" : "unknown";
  const topLevelKeys = (rawJson && typeof rawJson === "object" && !Array.isArray(rawJson))
    ? Object.keys(rawJson as object) : [];

  let listKeyUsed = "unknown";
  if (Array.isArray(rawJson)) listKeyUsed = "array";
  else if (rawJson && typeof rawJson === "object") {
    const r = rawJson as Record<string, unknown>;
    for (const key of ["data", "orders", "results", "items"]) {
      if (Array.isArray(r[key])) { listKeyUsed = key; break; }
    }
  }

  const firstOrder     = pageOrders[0] ?? null;
  const firstOrderKeys = firstOrder ? Object.keys(firstOrder) : [];
  const rawItems = firstOrder
    ? (firstOrder["items"] ?? firstOrder["order_items"] ?? firstOrder["products"] ?? firstOrder["cart"] ?? firstOrder["lines"])
    : undefined;
  const firstItemArr  = Array.isArray(rawItems) ? rawItems as Record<string, unknown>[] : [];
  const firstItemKeys = firstItemArr.length > 0 ? Object.keys(firstItemArr[0]) : [];

  return {
    topLevelType, topLevelKeys, listKeyUsed,
    totalReturned:  pageOrders.length,
    firstOrderKeys, firstItemKeys, paginationKeys,
    hasPagination:  paginationKeys.length > 0,
    detectedLimit:  pp,
    hasNextPage:    np !== null,
  };
}

const SUSPICIOUS_LIMITS = new Set([10, 15, 20, 25, 30, 50, 100, 200]);

function classifyCompleteness(pagination: PaginationInfo): OrderFetchCompleteness {
  if (pagination.paginationMode === "operational_only") return "operational_only";

  const blocksComplete =
    pagination.hasMore ||
    pagination.dedup.missingIdCount > 0;

  if (
    !blocksComplete &&
    pagination.providerTotalScope === "filtered_period" &&
    pagination.providerReportedTotalRaw !== null &&
    pagination.dedup.uniqueCount >= pagination.providerReportedTotalRaw
  ) return "complete";

  if (!blocksComplete && pagination.used && pagination.paginationMode === "envelope" && !pagination.hasMore) return "complete";

  if (pagination.paginationMode === "windowing") {
    if (
      !blocksComplete &&
      pagination.providerReportedTotalRaw !== null &&
      pagination.dedup.uniqueCount >= pagination.providerReportedTotalRaw
    ) return "complete";
    if (pagination.dedup.uniqueCount > DEFAULT_PAGE_SIZE) return "partial";
    return "operational_only";
  }

  if (pagination.hasMore) return "partial";

  if (
    pagination.providerTotalScope === "filtered_period" &&
    pagination.providerReportedTotalRaw !== null &&
    pagination.dedup.uniqueCount < pagination.providerReportedTotalRaw
  ) return "partial";

  return "unknown";
}

function checkReturnedOrdersWithinRange(
  orders: Record<string, unknown>[],
  start:  string,
  end:    string,
): boolean | null {
  let checked    = 0;
  let outOfRange = 0;
  for (const o of orders.slice(0, Math.min(orders.length, 10))) {
    const d = extractDate(o);
    if (d) {
      checked++;
      if (d < start || d > end) outOfRange++;
    }
  }
  if (checked === 0) return null;
  return outOfRange === 0;
}

function parseRateLimitHeaders(response: Response): RateLimitInfo {
  const h = (name: string) =>
    response.headers.get(name) ??
    response.headers.get(`X-${name}`) ??
    response.headers.get(name.toLowerCase()) ?? null;
  const toInt = (s: string | null) => (s ? parseInt(s, 10) : null);
  return {
    limit:     toInt(h("RateLimit-Limit")),
    remaining: toInt(h("RateLimit-Remaining")),
    reset:     toInt(h("RateLimit-Reset")),
    guard:     false,
  };
}

function extractTotal(order: Record<string, unknown>): number {
  const v = order["total_price"] ?? order["total_amount"] ?? order["total"]
          ?? order["price"]      ?? order["amount"]       ?? order["subtotal"] ?? order["value"];
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseFloat(v) || 0;
  return 0;
}

function extractDate(order: Record<string, unknown>): string | null {
  const raw = order["created_at"] ?? order["createdAt"] ?? order["date"]
            ?? order["order_date"] ?? order["created"]  ?? order["timestamp"];
  if (!raw) return null;
  const s = String(raw);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // already YYYY-MM-DD
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return null;
    return toFortalezaParts(d).localDateKey;
  } catch { return null; }
}

function extractStatus(order: Record<string, unknown>): string {
  return String(order["status"] ?? order["order_status"] ?? order["state"] ?? "desconhecido");
}

function extractItems(order: Record<string, unknown>): Record<string, unknown>[] {
  const raw = order["items"] ?? order["order_items"] ?? order["products"] ?? order["cart"] ?? order["lines"];
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  const details = order["details"] as Record<string, unknown> | undefined;
  if (details && Array.isArray(details["items"])) return details["items"] as Record<string, unknown>[];
  return [];
}

const WEEKDAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

// Module-level formatter — America/Fortaleza (UTC-3, no DST)
const _fortalezaFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Fortaleza",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

interface FortalezaParts {
  year: number; month: number; day: number;
  weekday: number; // 0=Sun…6=Sat
  hour: number; minute: number;
  localDateKey: string; // YYYY-MM-DD
}

function toFortalezaParts(ts: Date): FortalezaParts {
  const parts = _fortalezaFmt.formatToParts(ts);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? "0";
  const year   = parseInt(get("year"),   10);
  const month  = parseInt(get("month"),  10);
  const day    = parseInt(get("day"),    10);
  const hour   = parseInt(get("hour"),   10);
  const minute = parseInt(get("minute"), 10);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return {
    year, month, day, weekday, hour, minute,
    localDateKey: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
}

function extractCreatedAtFull(order: Record<string, unknown>): Date | null {
  const raw = order["created_at"] ?? order["createdAt"] ?? order["date"]
            ?? order["order_date"] ?? order["created"]  ?? order["timestamp"];
  if (!raw) return null;
  try { const d = new Date(String(raw)); return isNaN(d.getTime()) ? null : d; } catch { return null; }
}

function extractNumericField(order: Record<string, unknown>, ...keys: string[]): number {
  for (const k of keys) {
    const v = order[k];
    if (typeof v === "number" && isFinite(v)) return v;
    if (typeof v === "string") { const n = parseFloat(v); if (isFinite(n)) return n; }
  }
  return 0;
}

function normalizeServiceType(raw: unknown): string {
  const s = String(raw ?? "").toLowerCase().replace(/[-_\s]/g, "");
  if (!s || s === "undefined" || s === "null") return "desconhecido";
  if (s.includes("delivery") || s === "entrega") return "delivery";
  if (s.includes("pickup") || s.includes("retirada") || s.includes("balcao") || s.includes("balcão")) return "pickup";
  if (s.includes("dinein") || s.includes("local") || s.includes("mesa")) return "dine_in";
  return s;
}

function normalizeSource(raw: unknown): string {
  const s = String(raw ?? "").toLowerCase().trim();
  if (!s || s === "undefined" || s === "null") return "desconhecido";
  return s;
}

function getTimeFaixa(hour: number): "madrugada" | "manha" | "tarde" | "noite" {
  if (hour < 6)  return "madrugada";
  if (hour < 12) return "manha";
  if (hour < 18) return "tarde";
  return "noite";
}

function computeMetrics(orders: Record<string, unknown>[]): OrderMetrics {
  let faturamento_total = 0;
  let totalDescontos    = 0;
  let totalTaxasEntrega = 0;
  let totalGorjetas     = 0;
  const statusMap:      Record<string, number> = {};
  const itemCounts:     Record<string, number> = {};
  const dayMap:         Record<string, { revenue: number; orders: number }> = {};
  const serviceTypeMap: Record<string, number> = {};
  const sourceMap:      Record<string, number> = {};
  const heatmapMap:     Record<string, HeatmapCell> = {};
  const weekdayRevMap:  Record<string, number> = {};
  const weekdayOrdMap:  Record<string, number> = {};
  const hourOrdMap:     Record<string, number> = {};
  const hourRevMap:     Record<string, number> = {};
  const faixaMap: Record<string, { orders: number; revenue: number }> = {
    madrugada: { orders: 0, revenue: 0 },
    manha:     { orders: 0, revenue: 0 },
    tarde:     { orders: 0, revenue: 0 },
    noite:     { orders: 0, revenue: 0 },
  };
  let hasAnyItems = false;

  for (const order of orders) {
    const total  = extractTotal(order);
    const status = extractStatus(order);
    const date   = extractDate(order);

    faturamento_total += total;
    totalDescontos    += extractNumericField(order, "discount", "discount_amount", "total_discount", "coupon_discount");
    totalTaxasEntrega += extractNumericField(order, "delivery_fee", "shipping_fee", "delivery_price", "shipping", "freight");
    totalGorjetas     += extractNumericField(order, "tip", "gratuity", "tip_amount");

    statusMap[status] = (statusMap[status] ?? 0) + 1;

    const serviceType = normalizeServiceType(order["service_type"] ?? order["type"]);
    serviceTypeMap[serviceType] = (serviceTypeMap[serviceType] ?? 0) + 1;

    const source = normalizeSource(order["source"] ?? order["channel"] ?? order["origin"]);
    sourceMap[source] = (sourceMap[source] ?? 0) + 1;

    if (date) {
      if (!dayMap[date]) dayMap[date] = { revenue: 0, orders: 0 };
      dayMap[date].revenue += total;
      dayMap[date].orders  += 1;
    }

    const createdAt = extractCreatedAtFull(order);
    if (createdAt) {
      const { weekday, hour } = toFortalezaParts(createdAt);
      const cellKey = `${weekday}:${hour}`;
      if (!heatmapMap[cellKey]) heatmapMap[cellKey] = { weekday, hour, orders: 0, revenue: 0 };
      heatmapMap[cellKey].orders  += 1;
      heatmapMap[cellKey].revenue += total;

      const wName = WEEKDAY_NAMES[weekday];
      weekdayRevMap[wName] = (weekdayRevMap[wName] ?? 0) + total;
      weekdayOrdMap[wName] = (weekdayOrdMap[wName] ?? 0) + 1;

      const hKey = String(hour);
      hourOrdMap[hKey] = (hourOrdMap[hKey] ?? 0) + 1;
      hourRevMap[hKey] = (hourRevMap[hKey] ?? 0) + total;

      const faixa = getTimeFaixa(hour);
      faixaMap[faixa].orders  += 1;
      faixaMap[faixa].revenue += total;
    }

    const items = extractItems(order);
    if (items.length > 0) hasAnyItems = true;
    for (const item of items) {
      const name = String(item["name"] ?? item["product_name"] ?? item["title"] ?? item["description"] ?? "Produto desconhecido");
      const qty  = typeof item["quantity"] === "number" ? item["quantity"]
                 : typeof item["qty"]      === "number" ? item["qty"] : 1;
      itemCounts[name] = (itemCounts[name] ?? 0) + (qty as number);
    }
  }

  const total_pedidos = orders.length;
  const ticket_medio  = total_pedidos > 0 ? faturamento_total / total_pedidos : null;
  const pedidos_por_status = Object.keys(statusMap).length > 0 ? statusMap : null;

  const produtos_mais_vendidos = hasAnyItems
    ? Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, qty]) => ({ name, qty }))
    : null;

  const melhores_dias = Object.keys(dayMap).length > 0
    ? Object.entries(dayMap)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 5)
        .map(([date, v]) => ({ date, ...v }))
    : null;

  const faturamentoPorDia = Object.entries(dayMap)
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([date, v]) => ({ date, ...v }));

  const pedidos_recentes = orders.slice(0, 10).map((order) => ({
    id:     extractOrderId(order),
    date:   extractDate(order),
    status: extractStatus(order),
    total:  extractTotal(order),
  }));

  const heatmap = Object.values(heatmapMap).sort((a, b) =>
    a.weekday !== b.weekday ? a.weekday - b.weekday : a.hour - b.hour
  );

  return {
    faturamento_total,
    total_pedidos,
    ticket_medio,
    pedidos_por_status,
    produtos_mais_vendidos,
    topItemsUnavailable:     !hasAnyItems,
    topItemsReason:          !hasAnyItems ? "Os itens/produtos não vieram na resposta do endpoint /v1/orders." : null,
    topProductsCompleteness: hasAnyItems ? "complete" : "unavailable",
    melhores_dias,
    pedidos_recentes,
    heatmap,
    pedidosPorServiceType:   serviceTypeMap,
    pedidosPorSource:        sourceMap,
    totalDescontos,
    totalTaxasEntrega,
    totalGorjetas,
    faturamentoPorDiaSemana: weekdayRevMap,
    pedidosPorDiaSemana:     weekdayOrdMap,
    pedidosPorHora:          hourOrdMap,
    faturamentoPorHora:      hourRevMap,
    concentracaoPorFaixa:    faixaMap,
    faturamentoPorDia,
  };
}

// ── Auth helper ────────────────────────────────────────────────────────────────

function buildOlaClickHeaders(token: string, mode: AuthMode): Record<string, string> {
  if (mode === "bearer") {
    return { "Authorization": `Bearer ${token}`, "accept": "application/json" };
  }
  return { "x-api-key": token, "accept": "application/json" };
}

async function probeAuthMode(
  baseUrl: string,
  token:   string,
  start:   string,
  end:     string,
): Promise<AuthMode> {
  const url = new URL(`${baseUrl}/v1/orders`);
  url.searchParams.set("filter[start_date]", start);
  url.searchParams.set("filter[end_date]",   end);
  url.searchParams.set("page",  "1");
  url.searchParams.set("limit", "1");

  try {
    const r = await fetch(url.toString(), {
      headers: buildOlaClickHeaders(token, "bearer"),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (r.status !== 401 && r.status !== 403) return "bearer";
  } catch {
    // network error — fall through to x_api_key
  }

  return "x_api_key";
}

// ── Single-page fetch ──────────────────────────────────────────────────────────

async function fetchOnePage(
  baseUrl:  string,
  token:    string,
  authMode: AuthMode,
  start:    string,
  end:      string,
  page:     number,
  pageSize: number,
): Promise<PageFetchResult> {
  const empty: PageFetchResult = {
    ok: false, orders: [], rawJson: null, total: null,
    hasMore: false, perPage: null, currentPage: null,
    httpStatus: null, rateLimitInfo: { limit: null, remaining: null, reset: null, guard: false },
    isAuth: false,
  };

  const url = new URL(`${baseUrl}/v1/orders`);
  url.searchParams.set("filter[start_date]", start);
  url.searchParams.set("filter[end_date]",   end);
  url.searchParams.set("page",  String(page));
  url.searchParams.set("limit", String(pageSize));
  url.searchParams.set("sort",  "-created_at");

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: buildOlaClickHeaders(token, authMode),
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    return empty;
  }

  const rl = parseRateLimitHeaders(response);

  if (!response.ok) {
    return {
      ...empty,
      httpStatus: response.status,
      rateLimitInfo: rl,
      isAuth: response.status === 401 || response.status === 403,
    };
  }

  let rawJson: unknown;
  try { rawJson = await response.json(); }
  catch { return { ...empty, httpStatus: response.status, rateLimitInfo: rl }; }

  const orders = extractOrders(rawJson) ?? [];
  const { providerTotal, perPage, providerCurrentPage } = detectNextPage(rawJson, page);

  const pag = (rawJson && typeof rawJson === "object" && !Array.isArray(rawJson))
    ? (rawJson as Record<string, unknown>)["pagination"] as Record<string, unknown> | undefined
    : undefined;
  const hasMore = pag?.["has_more"] === true;

  return {
    ok: true, orders, rawJson,
    total:       providerTotal,
    hasMore,
    perPage,
    currentPage: providerCurrentPage,
    httpStatus:  response.status,
    rateLimitInfo: rl,
    isAuth: false,
  };
}

// ── Retry helper ──────────────────────────────────────────────────────────────

async function fetchOnePageWithRetry(
  baseUrl:      string,
  token:        string,
  authMode:     AuthMode,
  start:        string,
  end:          string,
  page:         number,
  pageSize:     number,
  execDeadline: number,
): Promise<PageFetchResult & { attemptCount: number }> {
  const r1 = await fetchOnePage(baseUrl, token, authMode, start, end, page, pageSize);

  if (r1.ok) return { ...r1, attemptCount: 1 };
  if (r1.httpStatus !== null && !RETRY_TRANSIENT.has(r1.httpStatus)) {
    return { ...r1, attemptCount: 1 };
  }
  // No retry if not enough time remains (need at least 3s for the retry round-trip)
  if (Date.now() + 3000 >= execDeadline) return { ...r1, attemptCount: 1 };

  let delayMs = 300 + Math.random() * 200;
  if (r1.httpStatus === 429) {
    const resetEpoch = r1.rateLimitInfo.reset;
    const waitMs = resetEpoch ? Math.max(0, resetEpoch * 1000 - Date.now()) : 1000;
    if (Date.now() + waitMs + 2000 >= execDeadline) return { ...r1, attemptCount: 1 };
    delayMs = waitMs + Math.random() * 100;
  }

  await new Promise((res) => setTimeout(res, delayMs));
  if (Date.now() >= execDeadline) return { ...r1, attemptCount: 1 };

  const r2 = await fetchOnePage(baseUrl, token, authMode, start, end, page, pageSize);
  return { ...r2, attemptCount: 2 };
}

// ── Cache ──────────────────────────────────────────────────────────────────────

function getCacheKey(clientId: string, start: string, end: string): string {
  return `olaclick:${clientId}:${start}:${end}`;
}

function getCache(key: string): CacheEntry | null {
  const store = (globalThis as Record<string, unknown>)["__olaclick_cache"] as Map<string, CacheEntry> | undefined;
  if (!store) return null;
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) { store.delete(key); return null; }
  return entry;
}

function setCache(key: string, data: unknown): void {
  let store = (globalThis as Record<string, unknown>)["__olaclick_cache"] as Map<string, CacheEntry> | undefined;
  if (!store) {
    store = new Map<string, CacheEntry>();
    (globalThis as Record<string, unknown>)["__olaclick_cache"] = store;
  }
  store.set(key, { data, timestamp: Date.now() });
  // Evict entries older than TTL to avoid unbounded growth
  for (const [k, v] of store.entries()) {
    if (Date.now() - v.timestamp > CACHE_TTL_MS) store.delete(k);
  }
}

// ── In-flight dedup (best-effort per warm instance) ───────────────────────────

type InflightMap = Map<string, Promise<Record<string, unknown>>>;

function getInflightMap(): InflightMap {
  const g = globalThis as Record<string, unknown>;
  if (!g["__olaclick_inflight"]) g["__olaclick_inflight"] = new Map<string, Promise<Record<string, unknown>>>();
  return g["__olaclick_inflight"] as InflightMap;
}

// ── Window helpers ─────────────────────────────────────────────────────────────

function ymdToStartISO(ymd: string): string {
  return `${ymd}T00:00:00.000Z`;
}
function ymdToEndISO(ymd: string): string {
  return `${ymd}T23:59:59.999Z`;
}
function isoToYMD(iso: string): string {
  return iso.split("T")[0];
}

function splitWindowDatetime(
  start: string,
  end:   string,
): [{ start: string; end: string }, { start: string; end: string }] | null {
  const startMs = new Date(start).getTime();
  const endMs   = new Date(end).getTime();
  const diffMs  = endMs - startMs;
  if (diffMs < MIN_WINDOW_MINUTES * 60 * 1000) return null;
  const midMs      = startMs + Math.floor(diffMs / 2);
  const midISO     = new Date(midMs).toISOString();
  const midMinus1  = new Date(midMs - 1).toISOString();
  return [
    { start, end: midMinus1 },
    { start: midISO, end },
  ];
}

function splitWindowDaily(
  start: string,
  end:   string,
): [{ start: string; end: string }, { start: string; end: string }] | null {
  const startD = new Date(start + "T12:00:00Z");
  const endD   = new Date(end   + "T12:00:00Z");
  const diffDays = Math.round((endD.getTime() - startD.getTime()) / 86_400_000);
  if (diffDays < 1) return null;
  const midDays  = Math.floor(diffDays / 2);
  const mid1YMD  = new Date(startD.getTime() + midDays * 86_400_000).toISOString().split("T")[0];
  const mid2D    = new Date(startD.getTime() + (midDays + 1) * 86_400_000);
  const mid2YMD  = mid2D.toISOString().split("T")[0];
  if (mid1YMD < start || mid2YMD > end) return null;
  return [
    { start, end: mid1YMD },
    { start: mid2YMD, end },
  ];
}

function generateDayList(start: string, end: string): string[] {
  const days: string[] = [];
  let cur = new Date(start + "T12:00:00Z");
  const last = new Date(end + "T12:00:00Z");
  while (cur <= last && days.length < 365) {
    days.push(cur.toISOString().split("T")[0]);
    cur = new Date(cur.getTime() + 86_400_000);
  }
  return days;
}

// ── Windowing collection ───────────────────────────────────────────────────────

interface WindowingResult {
  orderMap:       Map<string, Record<string, unknown>>;
  rawCount:       number;
  duplicateCount: number;
  missingIdCount: number;
  requestsMade:   number;
  rateLimitInfo:  RateLimitInfo;
  rateLimitStopped: boolean;
  timedOut:       boolean;
  totalWindows:   number;
  resolvedWindows: number;
  partialWindows: number;
  failedWindows:  number;
  datetimeFiltersSupported: boolean | null;
  dailyFallbackUsed:        boolean;
  providerTotalScope:       ProviderTotalScope;
  providerReportedTotal:    number | null;
  dailyDiagnostics:         DailyCollectionResult[];
  debugShape:               DebugShape | null;
}

function addOrdersToMap(
  orders:        Record<string, unknown>[],
  orderMap:      Map<string, Record<string, unknown>>,
  counters:      { raw: number; dup: number; missing: number },
) {
  for (const order of orders) {
    counters.raw++;
    const oid = extractOrderId(order);
    if (!oid) {
      counters.missing++;
      orderMap.set(`__noid_${counters.raw}`, order);
    } else if (orderMap.has(oid)) {
      counters.dup++;
    } else {
      orderMap.set(oid, order);
    }
  }
}

async function fetchOrdersByWindowing(
  baseUrl:      string,
  token:        string,
  authMode:     AuthMode,
  start:        string,
  end:          string,
  initialTotal: number | null,
  execDeadline: number,
): Promise<WindowingResult> {
  const orderMap = new Map<string, Record<string, unknown>>();
  const counters = { raw: 0, dup: 0, missing: 0 };
  let requestsMade = 0;
  let rateLimitInfo: RateLimitInfo = { limit: null, remaining: null, reset: null, guard: false };
  let rateLimitStopped  = false;
  let timedOut          = false;
  let totalWindows      = 0;
  let resolvedWindows   = 0;
  let partialWindows    = 0;
  let failedWindows     = 0;
  let datetimeSupported: boolean | null = null;
  let dailyFallbackUsed = false;
  let providerTotalScope: ProviderTotalScope = "unknown";
  let providerReportedTotal: number | null   = initialTotal;
  let debugShape: DebugShape | null          = null;
  const dailyDiagnostics: DailyCollectionResult[] = [];

  // ── Step 1: Probe datetime precision ──────────────────────────────────────
  // Split period in half and check if totals differ from the full period
  const probedTotal = initialTotal;
  let useDateTime   = false;

  if (probedTotal !== null && probedTotal > DEFAULT_PAGE_SIZE) {
    // Generate midpoint date
    const startD    = new Date(start + "T12:00:00Z");
    const endD      = new Date(end   + "T12:00:00Z");
    const diffDays  = Math.round((endD.getTime() - startD.getTime()) / 86_400_000);
    const midYMD    = diffDays >= 1
      ? new Date(startD.getTime() + Math.floor(diffDays / 2) * 86_400_000).toISOString().split("T")[0]
      : null;

    if (midYMD && midYMD >= start && midYMD < end && Date.now() < execDeadline && requestsMade < MAX_REQUESTS) {
      // Test with ISO timestamp precision
      const halfStart = ymdToStartISO(start);
      const halfEnd   = new Date(midYMD + "T11:59:59.999Z").toISOString();

      const probeR = await fetchOnePage(baseUrl, token, authMode, halfStart, halfEnd, 1, DEFAULT_PAGE_SIZE);
      requestsMade++;
      if (probeR.rateLimitInfo.remaining !== null) rateLimitInfo = probeR.rateLimitInfo;

      if (probeR.ok && probeR.total !== null && probeR.total < probedTotal) {
        useDateTime   = true;
        datetimeSupported = true;
        // If total varies by period, it's filtered_period scope
        if (probeR.total < probedTotal) providerTotalScope = "filtered_period";
      } else if (probeR.ok) {
        datetimeSupported = false;
        useDateTime = false;
      }
    }
  }

  // ── Step 2: Choose strategy ────────────────────────────────────────────────
  if (useDateTime) {
    // Recursive datetime windowing
    interface DTWindow { start: string; end: string; depth: number }
    const queue: DTWindow[] = [{ start: ymdToStartISO(start), end: ymdToEndISO(end), depth: 0 }];

    while (queue.length > 0 && !rateLimitStopped && !timedOut && requestsMade < MAX_REQUESTS && orderMap.size < MAX_UNIQUE_ORDERS) {
      if (Date.now() >= execDeadline) { timedOut = true; break; }

      const win = queue.shift()!;
      totalWindows++;

      const r = await fetchOnePage(baseUrl, token, authMode, win.start, win.end, 1, DEFAULT_PAGE_SIZE);
      requestsMade++;
      if (r.rateLimitInfo.remaining !== null) rateLimitInfo = r.rateLimitInfo;

      if (!r.ok) {
        if (r.httpStatus === 429) { rateLimitStopped = true; }
        failedWindows++;
        continue;
      }

      if (rateLimitInfo.remaining !== null && rateLimitInfo.remaining < MIN_RATE_LIMIT_REMAINING) {
        rateLimitStopped = true; addOrdersToMap(r.orders, orderMap, counters); resolvedWindows++; break;
      }

      if (!debugShape && r.rawJson) {
        const paginationKeys: string[] = [];
        if (r.rawJson && typeof r.rawJson === "object" && !Array.isArray(r.rawJson)) {
          const rj = r.rawJson as Record<string, unknown>;
          if (rj["pagination"]) paginationKeys.push("pagination");
          if (rj["meta"])       paginationKeys.push("meta");
          if (rj["links"])      paginationKeys.push("links");
        }
        debugShape = buildDebugShape(r.rawJson, r.orders, null, r.perPage, paginationKeys);
      }

      if (r.total !== null) {
        if (r.total < (providerReportedTotal ?? Infinity)) {
          providerTotalScope = "filtered_period";
        }
        if (providerReportedTotal === null || r.total > providerReportedTotal) {
          providerReportedTotal = r.total;
        }
      }

      const windowTotal = r.total ?? r.orders.length;
      const canResolve  = windowTotal <= DEFAULT_PAGE_SIZE || r.orders.length <= DEFAULT_PAGE_SIZE;

      if (canResolve || win.depth >= MAX_WINDOW_DEPTH) {
        addOrdersToMap(r.orders, orderMap, counters);
        if (windowTotal > DEFAULT_PAGE_SIZE && win.depth >= MAX_WINDOW_DEPTH) {
          partialWindows++;
        } else {
          resolvedWindows++;
        }
      } else {
        // Split and enqueue
        const halves = splitWindowDatetime(win.start, win.end);
        if (halves) {
          queue.unshift(
            { start: halves[0].start, end: halves[0].end, depth: win.depth + 1 },
            { start: halves[1].start, end: halves[1].end, depth: win.depth + 1 },
          );
          totalWindows--; // the parent window is replaced by children
        } else {
          // Can't split further
          addOrdersToMap(r.orders, orderMap, counters);
          partialWindows++;
        }
      }
    }
  } else {
    // Daily fallback
    dailyFallbackUsed  = true;
    datetimeSupported  = false;
    providerTotalScope = "filtered_period"; // daily totals vary → filtered_period
    const days = generateDayList(start, end);

    for (const day of days) {
      if (rateLimitStopped || timedOut || requestsMade >= MAX_REQUESTS || orderMap.size >= MAX_UNIQUE_ORDERS) break;
      if (Date.now() >= execDeadline) { timedOut = true; break; }

      totalWindows++;

      const dayDiag: DailyCollectionResult = {
        date: day, providerTotal: null,
        expectedPages: 1, pagesFetched: 0,
        uniqueOrders: 0, duplicateOrders: 0, failedPages: 0,
        repeatedPageDetected: false, endedNaturally: false, complete: false,
      };

      // page 1 with retry
      const r1 = await fetchOnePageWithRetry(baseUrl, token, authMode, day, day, 1, DEFAULT_PAGE_SIZE, execDeadline);
      requestsMade += r1.attemptCount;
      if (r1.rateLimitInfo.remaining !== null) rateLimitInfo = r1.rateLimitInfo;

      if (!r1.ok) {
        if (r1.httpStatus === 429) { rateLimitStopped = true; }
        failedWindows++;
        dayDiag.failedPages++;
        dailyDiagnostics.push(dayDiag);
        continue;
      }

      if (rateLimitInfo.remaining !== null && rateLimitInfo.remaining < MIN_RATE_LIMIT_REMAINING) {
        addOrdersToMap(r1.orders, orderMap, counters);
        resolvedWindows++;
        rateLimitStopped = true;
        dayDiag.pagesFetched = 1;
        dayDiag.uniqueOrders = r1.orders.length;
        dailyDiagnostics.push(dayDiag);
        break;
      }

      if (!debugShape && r1.rawJson) {
        const paginationKeys: string[] = [];
        if (r1.rawJson && typeof r1.rawJson === "object" && !Array.isArray(r1.rawJson)) {
          const rj = r1.rawJson as Record<string, unknown>;
          if (rj["pagination"]) paginationKeys.push("pagination");
        }
        debugShape = buildDebugShape(r1.rawJson, r1.orders, null, r1.perPage, paginationKeys);
      }

      const dayTotal = r1.total ?? r1.orders.length;
      dayDiag.providerTotal = r1.total;
      if (r1.total !== null && (providerReportedTotal === null || r1.total > providerReportedTotal)) {
        providerReportedTotal = r1.total;
      }

      const mapSizeBefore = orderMap.size;
      addOrdersToMap(r1.orders, orderMap, counters);
      dayDiag.pagesFetched   = 1;
      dayDiag.uniqueOrders   = orderMap.size - mapSizeBefore;
      dayDiag.duplicateOrders = r1.orders.length - dayDiag.uniqueOrders;

      const totalDayPages = dayTotal > DEFAULT_PAGE_SIZE ? Math.ceil(dayTotal / DEFAULT_PAGE_SIZE) : 1;
      dayDiag.expectedPages = totalDayPages;

      if (totalDayPages <= 1) {
        dayDiag.endedNaturally = true;
        dayDiag.complete = (dayDiag.failedPages === 0);
        resolvedWindows++;
        dailyDiagnostics.push(dayDiag);
        continue;
      }

      // pages 2..N within the same day
      let dayResolved = r1.orders.length >= dayTotal;
      const page1Ids = new Set(r1.orders.map((o: { id?: string | number }) => String(o.id ?? "")));

      for (let p = 2; p <= totalDayPages; p++) {
        if (rateLimitStopped || timedOut || requestsMade >= MAX_REQUESTS || orderMap.size >= MAX_UNIQUE_ORDERS) break;
        if (Date.now() >= execDeadline) { timedOut = true; break; }

        const rp = await fetchOnePageWithRetry(baseUrl, token, authMode, day, day, p, DEFAULT_PAGE_SIZE, execDeadline);
        requestsMade += rp.attemptCount;
        if (rp.rateLimitInfo.remaining !== null) rateLimitInfo = rp.rateLimitInfo;

        if (!rp.ok) {
          if (rp.httpStatus === 429) { rateLimitStopped = true; }
          dayDiag.failedPages++;
          break;
        }

        if (rateLimitInfo.remaining !== null && rateLimitInfo.remaining < MIN_RATE_LIMIT_REMAINING) {
          addOrdersToMap(rp.orders, orderMap, counters);
          dayDiag.pagesFetched++;
          rateLimitStopped = true;
          break;
        }

        if (rp.orders.length === 0) {
          dayDiag.endedNaturally = true;
          break;
        }

        // detect if page param is ignored
        if (p === 2) {
          const overlap = rp.orders.filter((o: { id?: string | number }) => page1Ids.has(String(o.id ?? ""))).length;
          if (overlap === rp.orders.length && rp.orders.length > 0) {
            dayDiag.repeatedPageDetected = true;
            break;
          }
        }

        const pSizeBefore = orderMap.size;
        addOrdersToMap(rp.orders, orderMap, counters);
        dayDiag.pagesFetched++;
        dayDiag.uniqueOrders   += orderMap.size - pSizeBefore;
        dayDiag.duplicateOrders += rp.orders.length - (orderMap.size - pSizeBefore);

        if (rp.orders.length < DEFAULT_PAGE_SIZE) {
          dayDiag.endedNaturally = true;
          dayResolved = true;
          break;
        }
        if (dayDiag.uniqueOrders >= dayTotal) {
          dayResolved = true;
          break;
        }
      }

      dayDiag.complete = (
        dayDiag.failedPages === 0 &&
        !dayDiag.repeatedPageDetected &&
        !rateLimitStopped &&
        !timedOut &&
        (dayDiag.endedNaturally || dayResolved || dayDiag.pagesFetched >= totalDayPages)
      );

      if (dayDiag.complete || dayResolved) {
        resolvedWindows++;
      } else {
        partialWindows++;
      }

      dailyDiagnostics.push(dayDiag);
    }
  }

  return {
    orderMap,
    rawCount:       counters.raw,
    duplicateCount: counters.dup,
    missingIdCount: counters.missing,
    requestsMade,
    rateLimitInfo,
    rateLimitStopped,
    timedOut,
    totalWindows,
    resolvedWindows,
    partialWindows,
    failedWindows,
    datetimeFiltersSupported: datetimeSupported,
    dailyFallbackUsed,
    providerTotalScope,
    providerReportedTotal,
    debugShape,
    dailyDiagnostics,
  };
}

// ── Standard pagination (when it works) ───────────────────────────────────────

const MAX_PAGES  = 150;
const MAX_ORDERS = 10_000;

async function fetchWithPagination(
  baseUrl:  string,
  token:    string,
  authMode: AuthMode,
  start:    string,
  end:      string,
): Promise<
  | { ok: true;  orders: Record<string, unknown>[]; pagination: PaginationInfo; debugShape: DebugShape; rateLimitInfo: RateLimitInfo }
  | { ok: false; code: string; reason: string; message: string; httpStatus: number | null; providerErrorMessage: string | null }
> {
  const orderMap     = new Map<string, Record<string, unknown>>();
  let rawCount       = 0;
  let duplicateCount = 0;
  let missingIdCount = 0;

  let pagesFetched              = 0;
  let currentPage               = 1;
  let providerReportedTotalRaw: number | null = null;
  let providerTotalScope:       ProviderTotalScope | null = null;
  let limitDetected:            number | null = null;
  let hasMore           = false;
  let paginationMode:   PaginationInfo["paginationMode"] = "single_page";
  let envelopeDetected  = false;
  let page1Count        = 0;
  let debugShape: DebugShape | null = null;
  let rateLimitInfo: RateLimitInfo = { limit: null, remaining: null, reset: null, guard: false };
  let lastRequestedPage        = 1;
  let lastProviderCurrentPage: number | null = null;

  while (currentPage <= MAX_PAGES && orderMap.size < MAX_ORDERS) {
    const url = new URL(`${baseUrl}/v1/orders`);
    url.searchParams.set("filter[start_date]", start);
    url.searchParams.set("filter[end_date]",   end);
    buildOrdersPaginationParams("page_limit", currentPage, DEFAULT_PAGE_SIZE, url.searchParams);
    url.searchParams.set("sort", "-created_at");
    lastRequestedPage = currentPage;

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        headers: buildOlaClickHeaders(token, authMode),
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      return {
        ok: false,
        code: "provider_network_error", reason: "network_error",
        httpStatus: null,
        providerErrorMessage: msg.slice(0, 200).replace(/[A-Za-z0-9_\-]{31,}/g, "[REDACTED]"),
        message: "Não foi possível conectar à API OlaClick a partir do servidor.",
      };
    }

    const rl = parseRateLimitHeaders(response);
    rateLimitInfo = { ...rl, guard: false };

    if (!response.ok) {
      const cls  = classifyProviderError(response.status);
      const body = await safeProviderBody(response);
      return { ok: false, ...cls, httpStatus: response.status, providerErrorMessage: body };
    }

    if (rateLimitInfo.remaining !== null && rateLimitInfo.remaining < MIN_RATE_LIMIT_REMAINING && pagesFetched > 0) {
      hasMore = true;
      rateLimitInfo.guard = true;
      break;
    }

    let rawJson: unknown;
    try { rawJson = await response.json(); }
    catch {
      return {
        ok: false,
        code: "provider_unexpected_response", reason: "unexpected_response",
        httpStatus: response.status, providerErrorMessage: null,
        message: "A API respondeu, mas em formato diferente do esperado.",
      };
    }

    const pageOrders = extractOrders(rawJson) ?? [];
    const paginationKeys: string[] = [];
    if (rawJson && typeof rawJson === "object" && !Array.isArray(rawJson)) {
      const r = rawJson as Record<string, unknown>;
      if (r["meta"])       paginationKeys.push("meta");
      if (r["pagination"]) paginationKeys.push("pagination");
      if (r["links"])      paginationKeys.push("links");
      if (r["next_page"])  paginationKeys.push("next_page");
      if (r["next"])       paginationKeys.push("next");
    }

    const { nextPage, providerTotal: pt, perPage: pp, providerCurrentPage: pcp } = detectNextPage(rawJson, currentPage);
    if (pcp !== null) lastProviderCurrentPage = pcp;
    if (pt !== null) {
      providerReportedTotalRaw = pt;
      if (providerTotalScope === null) providerTotalScope = "unknown";
      envelopeDetected = true;
    }
    if (pp !== null) { limitDetected = pp; envelopeDetected = true; }
    if (nextPage !== null) envelopeDetected = true;

    if (pagesFetched === 0) {
      page1Count = pageOrders.length;
      debugShape = buildDebugShape(rawJson, pageOrders, nextPage, pp, paginationKeys);
      if (envelopeDetected) paginationMode = "envelope";
    }

    const mapSizeBefore = orderMap.size;
    for (const order of pageOrders) {
      rawCount++;
      const oid = extractOrderId(order);
      if (!oid) {
        missingIdCount++;
        orderMap.set(`__noid_${rawCount}`, order);
      } else if (orderMap.has(oid)) {
        duplicateCount++;
      } else {
        orderMap.set(oid, order);
      }
    }
    const newFromThisPage = orderMap.size - mapSizeBefore;
    pagesFetched++;

    // Pagination not advancing: current_page < requested
    if (currentPage > 1 && pcp !== null && pcp < currentPage) {
      paginationMode = "operational_only";
      hasMore = false;
      break;
    }

    // Pagination not advancing: all duplicates
    if (currentPage > 1 && newFromThisPage === 0 && pageOrders.length > 0) {
      paginationMode = "operational_only";
      hasMore = false;
      break;
    }

    if (nextPage !== null) {
      paginationMode = "envelope";
      hasMore = orderMap.size < (providerReportedTotalRaw ?? Infinity);
      currentPage = nextPage;
    } else if (pageOrders.length === 0) {
      hasMore = false;
      break;
    } else if (!envelopeDetected && paginationMode === "single_page" && SUSPICIOUS_LIMITS.has(pageOrders.length)) {
      paginationMode = "page_size_fallback";
      hasMore = false;
      currentPage = 2;
    } else if (paginationMode === "page_size_fallback") {
      const expectedSize = limitDetected ?? page1Count;
      if (pageOrders.length >= expectedSize) {
        currentPage++;
      } else {
        hasMore = false;
        break;
      }
    } else {
      hasMore = false;
      break;
    }
  }

  if (orderMap.size >= MAX_ORDERS || pagesFetched >= MAX_PAGES) hasMore = true;

  const allOrders = Array.from(orderMap.values());
  const dedup = { rawCount, uniqueCount: orderMap.size, duplicateCount, missingIdCount };
  const returnedOrdersWithinRequestedRange = allOrders.length > 0
    ? checkReturnedOrdersWithinRange(allOrders, start, end)
    : null;

  return {
    ok: true,
    orders: allOrders,
    pagination: {
      used:               pagesFetched > 1 && paginationMode !== "operational_only",
      paginationMode,
      conventionUsed:     "page_limit",
      conventionVerified: false,
      pagesFetched,
      totalReturned:      orderMap.size,
      providerReportedTotalRaw,
      providerTotalScope,
      limitDetected,
      hasMore,
      dedup,
      returnedOrdersWithinRequestedRange,
      dateFilterCompletenessConfirmed: false,
      lastRequestedPage,
      providerCurrentPage: lastProviderCurrentPage,
    },
    rateLimitInfo,
    debugShape: debugShape ?? {
      topLevelType: "unknown", topLevelKeys: [], listKeyUsed: "unknown",
      totalReturned: 0, firstOrderKeys: [], firstItemKeys: [], paginationKeys: [],
      hasPagination: false, detectedLimit: null, hasNextPage: null,
    },
  };
}

// ── Main collection orchestrator ───────────────────────────────────────────────

async function fetchAllOrders(
  baseUrl: string,
  token:   string,
  start:   string,
  end:     string,
  execDeadline: number,
): Promise<
  | {
      ok: true;
      orders: Record<string, unknown>[];
      pagination: PaginationInfo;
      debugShape: DebugShape;
      rateLimitInfo: RateLimitInfo;
      windowDiag: WindowFetchDiagnostics | null;
    }
  | { ok: false; code: string; reason: string; message: string; httpStatus: number | null; providerErrorMessage: string | null }
> {
  // ── Phase 0: Detect working auth mode ────────────────────────────────────
  const authMode = await probeAuthMode(baseUrl, token, start, end);

  // ── Phase 1: Try standard pagination ──────────────────────────────────────
  const pagResult = await fetchWithPagination(baseUrl, token, authMode, start, end);

  if (!pagResult.ok) {
    return pagResult;
  }

  const { orders: pagOrders, pagination, debugShape, rateLimitInfo } = pagResult;
  const needsWindowing =
    pagination.paginationMode === "operational_only" &&
    pagination.providerReportedTotalRaw !== null &&
    pagination.providerReportedTotalRaw > DEFAULT_PAGE_SIZE &&
    !rateLimitInfo.guard;

  let paginationFallbackReason: WindowFetchDiagnostics["paginationFallbackReason"] = "none";
  if (pagination.paginationMode === "operational_only") {
    if (pagination.lastRequestedPage > 1 && pagination.providerCurrentPage !== null && pagination.providerCurrentPage < pagination.lastRequestedPage) {
      paginationFallbackReason = "requested_page_ignored";
    } else {
      paginationFallbackReason = "repeated_page";
    }
  }

  if (!needsWindowing) {
    return {
      ok: true,
      orders: pagOrders,
      pagination,
      debugShape,
      rateLimitInfo,
      windowDiag: null,
    };
  }

  // ── Phase 2: Windowing fallback ────────────────────────────────────────────
  const wResult = await fetchOrdersByWindowing(
    baseUrl,
    token,
    authMode,
    start,
    end,
    pagination.providerReportedTotalRaw,
    execDeadline,
  );

  const allOrders = Array.from(wResult.orderMap.values());
  const uniqueCount = wResult.orderMap.size;

  const windowingPaginationMode: PaginationInfo["paginationMode"] =
    uniqueCount > DEFAULT_PAGE_SIZE ? "windowing" : "operational_only";

  const dedup = {
    rawCount:       wResult.rawCount,
    uniqueCount,
    duplicateCount: wResult.duplicateCount,
    missingIdCount: wResult.missingIdCount,
  };

  const returnedOrdersWithinRequestedRange = allOrders.length > 0
    ? checkReturnedOrdersWithinRange(allOrders, start, end)
    : null;

  const windowPagination: PaginationInfo = {
    used:               uniqueCount > DEFAULT_PAGE_SIZE,
    paginationMode:     windowingPaginationMode,
    conventionUsed:     "page_limit",
    conventionVerified: false,
    pagesFetched:       wResult.requestsMade,
    totalReturned:      uniqueCount,
    providerReportedTotalRaw: wResult.providerReportedTotal,
    providerTotalScope:       wResult.providerTotalScope,
    limitDetected:      DEFAULT_PAGE_SIZE,
    hasMore:            wResult.rateLimitStopped || wResult.timedOut || wResult.partialWindows > 0,
    dedup,
    returnedOrdersWithinRequestedRange,
    dateFilterCompletenessConfirmed: false,
    lastRequestedPage:   wResult.requestsMade,
    providerCurrentPage: null,
  };

  const completeDays  = wResult.dailyDiagnostics.filter(d => d.complete).length;
  const partialDays   = wResult.dailyDiagnostics.filter(d => !d.complete).length;

  const windowDiag: WindowFetchDiagnostics = {
    totalWindows:             wResult.totalWindows,
    resolvedWindows:          wResult.resolvedWindows,
    partialWindows:           wResult.partialWindows,
    failedWindows:            wResult.failedWindows,
    datetimeFiltersSupported: wResult.datetimeFiltersSupported,
    dailyFallbackUsed:        wResult.dailyFallbackUsed,
    requestsMade:             wResult.requestsMade,
    targetTotal:              wResult.providerReportedTotal,
    rawCount:                 wResult.rawCount,
    uniqueCount,
    duplicateCount:           wResult.duplicateCount,
    missingIdCount:           wResult.missingIdCount,
    rateLimitStopped:         wResult.rateLimitStopped,
    executionMs:              Date.now() - (execDeadline - MAX_EXECUTION_MS),
    paginationFallbackReason,
    authMode,
    dailyDiagnostics:         wResult.dailyDiagnostics,
    completeDays,
    partialDays,
  };

  return {
    ok: true,
    orders: allOrders,
    pagination: windowPagination,
    debugShape: wResult.debugShape ?? debugShape,
    rateLimitInfo: wResult.rateLimitInfo,
    windowDiag,
  };
}

// ── Top Produtos via endpoint oficial ─────────────────────────────────────────

interface TopProduct {
  productId:       string | null;
  name:            string;
  quantity:        number;
  quantityField:   string | null;
  revenue:         number | null;
  modifiers:       unknown[] | null;
  category:        string | null;
}

interface TopProductsResult {
  ok:                  boolean;
  products:            TopProduct[] | null;
  providerEndpoint:    string;
  reason:              "scope_missing" | "not_found" | "error" | null;
  message:             string | null;
  rawFirstItemKeys:    string[] | null;
  allQuantitiesZero:   boolean;
}

async function fetchProductsSold(
  baseUrl:  string,
  token:    string,
  authMode: AuthMode,
  start:    string,
  end:      string,
): Promise<TopProductsResult> {
  const endpoint = "/v1/orders/products-sold";
  const url = new URL(`${baseUrl}${endpoint}`);
  url.searchParams.set("filter[start_date]", start);
  url.searchParams.set("filter[end_date]",   end);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: buildOlaClickHeaders(token, authMode),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    return { ok: false, products: null, providerEndpoint: endpoint, reason: "error", message: "Erro de rede ao buscar produtos vendidos.", rawFirstItemKeys: null, allQuantitiesZero: false };
  }

  if (response.status === 404) {
    return { ok: false, products: null, providerEndpoint: endpoint, reason: "not_found",
      message: "Endpoint /v1/orders/products-sold não disponível nesta conta.", rawFirstItemKeys: null, allQuantitiesZero: false };
  }
  if (response.status === 401 || response.status === 403) {
    return { ok: false, products: null, providerEndpoint: endpoint, reason: "scope_missing",
      message: "Permissão insuficiente para acessar produtos vendidos. Verifique o scope do token.", rawFirstItemKeys: null, allQuantitiesZero: false };
  }
  if (!response.ok) {
    return { ok: false, products: null, providerEndpoint: endpoint, reason: "error",
      message: `Erro ${response.status} ao buscar produtos vendidos.`, rawFirstItemKeys: null, allQuantitiesZero: false };
  }

  let rawJson: unknown;
  try { rawJson = await response.json(); }
  catch {
    return { ok: false, products: null, providerEndpoint: endpoint, reason: "error", message: "Resposta inválida do endpoint de produtos vendidos.", rawFirstItemKeys: null, allQuantitiesZero: false };
  }

  const items: unknown[] = Array.isArray(rawJson) ? rawJson
    : (rawJson && typeof rawJson === "object")
      ? ((rawJson as Record<string, unknown>)["data"] as unknown[] | undefined ?? [])
      : [];

  const rawFirstItemKeys = items.length > 0 && typeof items[0] === "object" && items[0] !== null
    ? Object.keys(items[0] as object)
    : null;

  function resolveQuantity(i: Record<string, unknown>): [number, string | null] {
    const candidates: [string, unknown][] = [
      ["quantity",       i["quantity"]],
      ["qty",            i["qty"]],
      ["sold",           i["sold"]],
      ["sold_quantity",  i["sold_quantity"]],
      ["total_sold",     i["total_sold"]],
      ["total_quantity", i["total_quantity"]],
      ["orders_count",   i["orders_count"]],
      ["items_count",    i["items_count"]],
      ["count",          i["count"]],
      ["amount",         i["amount"]],
    ];
    for (const [field, val] of candidates) {
      if (typeof val === "number" && val > 0) return [val, field];
      if (typeof val === "string") {
        const n = parseFloat(val);
        if (!isNaN(n) && n > 0) return [n, field];
      }
    }
    return [0, null];
  }

  const allProducts: TopProduct[] = (items as Record<string, unknown>[]).map((i) => {
    const [quantity, quantityField] = resolveQuantity(i);
    return {
      productId: i["product_id"] != null ? String(i["product_id"]) : i["id"] != null ? String(i["id"]) : null,
      name:      String(i["name"] ?? i["product_name"] ?? i["title"] ?? i["description"] ?? "Produto desconhecido"),
      quantity,
      quantityField,
      revenue:   typeof i["revenue"]       === "number" ? i["revenue"]
               : typeof i["total_revenue"] === "number" ? i["total_revenue"]
               : typeof i["amount"]        === "number" ? i["amount"] : null,
      modifiers: Array.isArray(i["modifiers"]) ? i["modifiers"] : null,
      category:  typeof i["category"]      === "string" ? i["category"]
               : typeof i["category_name"] === "string" ? i["category_name"] : null,
    };
  });

  const allQuantitiesZero = allProducts.length > 0 && allProducts.every((p) => p.quantity === 0);
  const products = allProducts
    .filter((p) => p.quantity > 0)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  return { ok: true, products, providerEndpoint: endpoint, reason: null, message: null, rawFirstItemKeys, allQuantitiesZero };
}

// ── Busca detalhes concorrente ─────────────────────────────────────────────────

const MAX_ORDER_DETAILS  = 20;
const DETAIL_CONCURRENCY = 3;

async function fetchOrderDetailsBatched(
  baseUrl:  string,
  token:    string,
  authMode: AuthMode,
  orderIds: string[],
): Promise<{ details: Record<string, unknown>[]; stats: DetailFetchStats }> {
  const stats: DetailFetchStats = {
    detailRequestsAttempted: 0,
    detailRequestsSucceeded: 0,
    detailRequestsFailed:    0,
    abortedDueTo:            null,
  };

  const ids = orderIds.filter(Boolean).slice(0, MAX_ORDER_DETAILS);
  const results: Record<string, unknown>[] = [];

  for (let i = 0; i < ids.length; i += DETAIL_CONCURRENCY) {
    if (stats.abortedDueTo) break;
    const batch = ids.slice(i, i + DETAIL_CONCURRENCY);
    stats.detailRequestsAttempted += batch.length;

    const batchResults = await Promise.allSettled(
      batch.map(async (id) => {
        const url = `${baseUrl}/v1/orders/${encodeURIComponent(id)}`;
        const r = await fetch(url, {
          headers: buildOlaClickHeaders(token, authMode),
          cache: "no-store",
          signal: AbortSignal.timeout(6000),
        });
        if (r.status === 429) { const e = new Error("rate_limited"); e.name = "RateLimitError"; throw e; }
        if (r.status === 404) { const e = new Error("not_found");    e.name = "NotFoundError";  throw e; }
        if (!r.ok) throw new Error(`http_${r.status}`);
        return await r.json() as unknown;
      })
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        stats.detailRequestsSucceeded++;
        const v = result.value;
        if (v && typeof v === "object" && !Array.isArray(v)) results.push(v as Record<string, unknown>);
      } else {
        stats.detailRequestsFailed++;
        if (result.reason?.name === "RateLimitError") stats.abortedDueTo = "rate_limited";
        if (result.reason?.name === "NotFoundError")  stats.abortedDueTo = "not_found";
      }
    }
  }

  return { details: results, stats };
}

// ── Handler ────────────────────────────────────────────────────────────────────

const ENDPOINT = "/v1/orders";

export async function GET(request: NextRequest) {
  const params   = new URL(request.url).searchParams;
  const clientId = params.get("client_id");
  if (!clientId) return NextResponse.json({ ok: false, reason: "missing_client_id" }, { status: 400 });

  const forceRefresh = params.get("force_refresh") === "1";

  const rawStart = params.get("start_date");
  const rawEnd   = params.get("end_date");
  const YMD_RE   = /^\d{4}-\d{2}-\d{2}$/;

  let start: string;
  let end:   string;
  let periodLabel: string;

  if (rawStart && rawEnd && YMD_RE.test(rawStart) && YMD_RE.test(rawEnd) && rawStart <= rawEnd) {
    start       = rawStart;
    end         = rawEnd;
    periodLabel = "personalizado";
  } else {
    const period      = (params.get("period") ?? "7dias") as PeriodKey;
    const validPeriods: PeriodKey[] = ["hoje", "7dias", "15dias", "30dias", "mes_atual"];
    const safePeriod  = validPeriods.includes(period) ? period : "7dias" as PeriodKey;
    const range       = resolveDateRange(safePeriod);
    start             = range.start;
    end               = range.end;
    periodLabel       = safePeriod;
  }

  // Hoisted so catch block can call inflightReject on unexpected errors
  let inflightResolve: ((v: Record<string, unknown>) => void) | null = null;
  let inflightReject:  ((e: unknown) => void)          | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });

    // ── Cache check ──────────────────────────────────────────────────────────
    const cacheKey = getCacheKey(clientId, start, end);

    if (!forceRefresh) {
      const cached = getCache(cacheKey);
      if (cached) {
        const cachedData = cached.data as Record<string, unknown>;
        return NextResponse.json(
          { ...cachedData, cacheHit: true },
          { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
        );
      }
    }

    // ── In-flight dedup ───────────────────────────────────────────────────────
    const inflight = getInflightMap();
    if (!forceRefresh && inflight.has(cacheKey)) {
      try {
        const body = await inflight.get(cacheKey)!;
        return NextResponse.json(
          { ...body, cacheHit: true },
          { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
        );
      } catch {
        inflight.delete(cacheKey);
      }
    }

    if (!forceRefresh) {
      const p = new Promise<Record<string, unknown>>((res, rej) => {
        inflightResolve = res;
        inflightReject  = rej;
      });
      inflight.set(cacheKey, p);
    }

    const lookup = await getActiveDigitalMenuConnection(supabase, clientId);
    if (lookup.error?.code === "42P01") return NextResponse.json({ ok: false, reason: "sql_pending" });
    if (!lookup.found) {
      return NextResponse.json({
        ok: false, reason: "not_connected", code: "no_digital_menu_connection",
        connectionFound: false, message: "Cliente sem conexão Cardápio Digital ativa.",
        stage: "lookup",
        supabaseErrorCode:    lookup.error?.code    ?? null,
        supabaseErrorMessage: lookup.error?.message ?? null,
      });
    }

    const conn    = lookup.connection;
    const baseUrl = resolveOlaClickBaseUrl({ api_base_url: conn.api_base_url });

    if (!baseUrl) {
      return NextResponse.json({
        ok: false, reason: "base_url_missing", code: "missing_provider_base_url",
        connectionFound: true, provider: conn.provider, baseUrlResolved: false, endpoint: ENDPOINT,
        message: "Conexão Cardápio Digital encontrada. Falta configurar a URL da API do provedor.",
        stage: "resolve_base_url",
      });
    }

    const safeToken = sanitizeHeaderValue(conn.access_token);
    if (!isValidHeaderValue(safeToken)) {
      return NextResponse.json({
        ok: false, reason: "token_has_invalid_characters", code: "invalid_header_value",
        connectionFound: true, provider: conn.provider, baseUrlResolved: true, endpoint: ENDPOINT, httpStatus: null,
        message: "A chave do provider contém caracteres inválidos para envio no header. Atualize o token/API Key da conexão em Gerenciar.",
        stage: "sanitize_token",
      });
    }

    const requestStart       = Date.now();
    const execDeadline       = requestStart + MAX_EXECUTION_MS;
    const providerFetchStart = requestStart;
    const fetchResult        = await fetchAllOrders(baseUrl, safeToken, start, end, execDeadline);
    const providerFetchMs    = Date.now() - providerFetchStart;

    if (!fetchResult.ok) {
      return NextResponse.json({
        ok: false,
        code:     fetchResult.code,
        reason:   fetchResult.reason,
        message:  fetchResult.message,
        connectionFound: true,
        provider:        conn.provider,
        baseUrlResolved: true,
        endpoint:        ENDPOINT,
        httpStatus:           fetchResult.httpStatus,
        providerErrorMessage: fetchResult.providerErrorMessage,
        stage: "provider_api_call",
      });
    }

    const { orders, pagination, debugShape, rateLimitInfo, windowDiag } = fetchResult;
    const completeness     = classifyCompleteness(pagination);
    const aggregationStart = Date.now();
    let metrics = computeMetrics(orders);
    const aggregationMs    = Date.now() - aggregationStart;
    let detailStats: DetailFetchStats | null = null;
    let topProductsResult: TopProductsResult | null = null;

    // Determine authMode from windowDiag or default
    const authMode: AuthMode = windowDiag?.authMode ?? "x_api_key";

    // ── Top Produtos: tentar endpoint oficial primeiro ──────────────────────
    if (!rateLimitInfo.guard && Date.now() < execDeadline) {
      topProductsResult = await fetchProductsSold(baseUrl, safeToken, authMode, start, end);

      if (topProductsResult.ok && (topProductsResult.products?.length ?? 0) > 0) {
        metrics.produtos_mais_vendidos = (topProductsResult.products ?? []).map((p) => ({
          name: p.name,
          qty:  p.quantity,
        }));
        metrics.topItemsUnavailable     = false;
        metrics.topItemsReason          = null;
        metrics.topProductsCompleteness = "complete";
      } else if (topProductsResult.ok && topProductsResult.allQuantitiesZero) {
        metrics.topItemsUnavailable     = true;
        metrics.topItemsReason          = `Endpoint /v1/orders/products-sold retornou itens mas quantidade=0 em todos. Campos disponíveis: ${topProductsResult.rawFirstItemKeys?.join(", ") ?? "desconhecido"}.`;
        metrics.topProductsCompleteness = "unavailable";
      }
    }

    // ── Fallback: enriquecimento por detalhe individual ──────────────────────
    if (metrics.topItemsUnavailable && orders.length > 0 && !rateLimitInfo.guard && Date.now() < execDeadline) {
      const ids = orders
        .slice(0, MAX_ORDER_DETAILS)
        .map(extractOrderId)
        .filter(Boolean);

      if (ids.length > 0) {
        const { details, stats } = await fetchOrderDetailsBatched(baseUrl, safeToken, authMode, ids);
        detailStats = stats;

        if (details.length > 0 && stats.abortedDueTo !== "not_found") {
          const enriched = orders.map((o, idx) => {
            const det = details[idx];
            if (!det) return o;
            const detItems = extractItems(det);
            return detItems.length > 0 ? { ...o, items: detItems } : o;
          });
          metrics = computeMetrics(enriched);

          if (!metrics.topItemsUnavailable) {
            metrics.topItemsReason = null;
            metrics.topProductsCompleteness =
              stats.detailRequestsSucceeded >= ids.length ? "complete" : "partial";
          } else {
            metrics.topItemsReason = "Endpoint de detalhe retornou dados, mas sem itens identificáveis.";
            metrics.topProductsCompleteness = "unavailable";
          }
        } else if (stats.abortedDueTo === "not_found") {
          metrics.topItemsReason = "Endpoint /v1/orders/{id} retornou 404.";
          metrics.topProductsCompleteness = "unavailable";
        } else if (stats.abortedDueTo === "rate_limited") {
          metrics.topItemsReason = "Rate limit atingido ao buscar detalhes.";
          metrics.topProductsCompleteness = "partial";
        } else {
          metrics.topItemsReason = "Itens não disponíveis na listagem nem nos detalhes.";
          metrics.topProductsCompleteness = "unavailable";
        }
      }
    }

    // ── Snapshot ─────────────────────────────────────────────────────────────
    let snapshotPersistence: SnapshotPersistence = "skipped";
    const canSaveSnapshot = completeness === "complete" && metrics.total_pedidos > 0;

    if (!canSaveSnapshot && metrics.total_pedidos > 0) {
      snapshotPersistence = "skipped_incomplete";
    } else if (canSaveSnapshot) {
      try {
        const { error: snapErr } = await supabase.from("client_business_snapshots").insert({
          client_id:          clientId,
          source_type:        "digital_menu",
          period_start:       start,
          period_end:         end,
          total_revenue:      metrics.faturamento_total,
          total_orders:       metrics.total_pedidos,
          average_ticket:     metrics.ticket_medio,
          best_selling_items: metrics.produtos_mais_vendidos ?? [],
          best_days:          metrics.melhores_dias ?? [],
          opportunities:      [],
          confidence_score:   1.0,
        });
        if (!snapErr) {
          snapshotPersistence = "saved";
        } else if (snapErr.code === "42P01") {
          snapshotPersistence = "not_configured";
        } else {
          snapshotPersistence = "error";
          console.warn("[olaclick/orders] snapshot error:", snapErr.code);
        }
      } catch {
        snapshotPersistence = "error";
        console.warn("[olaclick/orders] snapshot exception");
      }
    }

    const responseBody = {
      ok:           true,
      period:       periodLabel,
      date_range:   { start, end },
      requestedPagination: {
        pageNumber: 1,
        pageSize:   DEFAULT_PAGE_SIZE,
        sort:       "-created_at",
        startDate:  start,
        endDate:    end,
      },
      provider:        conn.provider,
      baseUrlResolved: true,
      endpoint:        ENDPOINT,
      completeness,
      snapshotPersistence,
      message: metrics.total_pedidos === 0 ? "Nenhum pedido encontrado no período." : undefined,
      pagination,
      rateLimitInfo,
      debugShape,
      detailStats,
      windowDiag,
      cacheHit: false,
      timings: {
        providerFetchMs,
        aggregationMs,
        totalDurationMs: Date.now() - requestStart,
        requestsMade:    windowDiag?.requestsMade ?? pagination?.pagesFetched ?? 1,
        daysFetched:     windowDiag?.dailyFallbackUsed ? windowDiag.totalWindows : null,
        cacheSource:     "none" as const,
        fallbackUsed:    windowDiag?.dailyFallbackUsed ?? false,
      },
      topProductsEndpoint: topProductsResult
        ? { used: topProductsResult.ok, providerEndpoint: topProductsResult.providerEndpoint, reason: topProductsResult.reason, message: topProductsResult.message }
        : null,
      data: {
        faturamento_total:       metrics.faturamento_total,
        total_pedidos:           metrics.total_pedidos,
        ticket_medio:            metrics.ticket_medio,
        pedidos_por_status:      metrics.pedidos_por_status,
        produtos_mais_vendidos:  metrics.produtos_mais_vendidos,
        topItemsUnavailable:     metrics.topItemsUnavailable,
        topItemsReason:          metrics.topItemsReason,
        topProductsCompleteness: metrics.topProductsCompleteness,
        melhores_dias:           metrics.melhores_dias,
        pedidos_recentes:        metrics.pedidos_recentes,
        heatmap:                 metrics.heatmap,
        pedidosPorServiceType:   metrics.pedidosPorServiceType,
        pedidosPorSource:        metrics.pedidosPorSource,
        totalDescontos:          metrics.totalDescontos,
        totalTaxasEntrega:       metrics.totalTaxasEntrega,
        totalGorjetas:           metrics.totalGorjetas,
        faturamentoPorDiaSemana: metrics.faturamentoPorDiaSemana,
        pedidosPorDiaSemana:     metrics.pedidosPorDiaSemana,
        pedidosPorHora:          metrics.pedidosPorHora,
        faturamentoPorHora:      metrics.faturamentoPorHora,
        concentracaoPorFaixa:    metrics.concentracaoPorFaixa,
        faturamentoPorDia:       metrics.faturamentoPorDia,
      },
    };

    // Store in cache (only non-empty results, and only partial/complete)
    if (metrics.total_pedidos > 0) {
      setCache(cacheKey, responseBody);
    }

    const resolveInflight = inflightResolve as ((v: Record<string, unknown>) => void) | null;
    if (resolveInflight) {
      resolveInflight(responseBody as Record<string, unknown>);
    }
    inflight.delete(cacheKey);

    const serverTiming = [
      `olaclick;dur=${providerFetchMs}`,
      `aggregation;dur=${aggregationMs}`,
      `total;dur=${Date.now() - requestStart}`,
    ].join(", ");

    return NextResponse.json(responseBody, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Server-Timing": serverTiming,
      },
    });
  } catch (err) {
    const rejectInflight = inflightReject as ((e: unknown) => void) | null;
    if (rejectInflight) rejectInflight(err);
    getInflightMap().delete(getCacheKey(clientId ?? "", start ?? "", end ?? ""));
    return NextResponse.json({ ok: false, reason: "error", stage: "unexpected" }, { status: 500 });
  }
}
