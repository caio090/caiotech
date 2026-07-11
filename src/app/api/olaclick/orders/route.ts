import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveOlaClickBaseUrl } from "@/lib/olaclick";
import { getActiveDigitalMenuConnection } from "@/lib/digital-menu/server";

import type { OrderFetchCompleteness, SnapshotPersistence } from "@/lib/digital-menu/analytics-types";
export type { OrderFetchCompleteness };

// ── Tipos ──────────────────────────────────────────────────────────────────────

type PeriodKey = "hoje" | "7dias" | "15dias" | "30dias" | "mes_atual";

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
  used:           boolean;
  paginationMode: "envelope" | "page_size_fallback" | "single_page" | "operational_only";
  pagesFetched:   number;
  totalReturned:  number;
  providerTotal:  number | null;
  limitDetected:  number | null;
  hasMore:        boolean;
  dedup: {
    rawCount:       number;
    uniqueCount:    number;
    duplicateCount: number;
    missingIdCount: number;
  };
  dateFilterRespected: boolean | null;
}

interface DetailFetchStats {
  detailRequestsAttempted: number;
  detailRequestsSucceeded: number;
  detailRequestsFailed:    number;
  abortedDueTo:            "rate_limited" | "not_found" | null;
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
}

// ── Utilitários ────────────────────────────────────────────────────────────────

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
  if (httpStatus === 422 || httpStatus === 400) return { code: "provider_bad_request", reason: "bad_params", message: "A API recusou os filtros do período. Ajustamos o formato para filter[start_date] e filter[end_date]. Tente novamente." };
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

// ── Extração de dados da resposta ──────────────────────────────────────────────

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
  return String(order["id"] ?? order["order_id"] ?? order["uuid"] ?? order["code"] ?? order["number"] ?? "");
}

function detectNextPage(
  raw: unknown,
  currentPage: number,
): { nextPage: number | null; providerTotal: number | null; perPage: number | null } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { nextPage: null, providerTotal: null, perPage: null };
  const r = raw as Record<string, unknown>;

  // OlaClick native: { pagination: { current_page, per_page, total, has_more } }
  const pag = r["pagination"] as Record<string, unknown> | undefined;
  if (pag && typeof pag === "object") {
    const hasMore = pag["has_more"] === true;
    const total   = typeof pag["total"]    === "number" ? pag["total"]    : null;
    const perPage = typeof pag["per_page"] === "number" ? pag["per_page"] : null;
    // Derive last_page from total/per_page when not explicit
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
    return { nextPage: next, providerTotal: total, perPage };
  }

  // Laravel meta: { meta: { current_page, last_page, per_page, total } }
  const meta = r["meta"] as Record<string, unknown> | undefined;
  if (meta && typeof meta === "object") {
    const lastPage = typeof meta["last_page"] === "number" ? meta["last_page"] : null;
    const total    = typeof meta["total"]     === "number" ? meta["total"]     : null;
    const perPage  = typeof meta["per_page"]  === "number" ? meta["per_page"]  : null;
    const next     = lastPage !== null && currentPage < lastPage ? currentPage + 1 : null;
    return { nextPage: next, providerTotal: total, perPage };
  }

  // Link-based: { links: { next } } | { next_page } | { next: "url" }
  const links = r["links"] as Record<string, unknown> | undefined;
  if (links?.["next"] != null) return { nextPage: currentPage + 1, providerTotal: null, perPage: null };
  if (r["next_page"]  != null) return { nextPage: currentPage + 1, providerTotal: null, perPage: null };
  if (r["next"] != null && typeof r["next"] === "string") return { nextPage: currentPage + 1, providerTotal: null, perPage: null };

  return { nextPage: null, providerTotal: null, perPage: null };
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
    topLevelType,
    topLevelKeys,
    listKeyUsed,
    totalReturned:  pageOrders.length,
    firstOrderKeys,
    firstItemKeys,
    paginationKeys,
    hasPagination:  paginationKeys.length > 0,
    detectedLimit:  pp,
    hasNextPage:    np !== null,
  };
}

// ── Completude da coleta ───────────────────────────────────────────────────────

// Tamanhos de página comuns que, sem envelope, sugerem que pode haver mais pedidos.
const SUSPICIOUS_LIMITS = new Set([10, 15, 20, 25, 30, 50, 100, 200]);

function classifyCompleteness(pagination: PaginationInfo): OrderFetchCompleteness {
  if (pagination.paginationMode === "operational_only") return "operational_only";

  // Provider confirmou total e carregamos tudo
  if (pagination.providerTotal !== null && pagination.dedup.uniqueCount >= pagination.providerTotal) return "complete";

  // Paginamos e não há mais páginas → completo
  if (pagination.used && !pagination.hasMore) return "complete";

  // Truncamento comprovado: safety limits ou provider confirmou que há mais
  if (pagination.hasMore) return "partial";
  if (pagination.providerTotal !== null && pagination.dedup.uniqueCount < pagination.providerTotal) return "partial";

  // Número redondo sem envelope: não é possível afirmar truncamento
  return "unknown";
}

// ── Detecção de filtro de data ─────────────────────────────────────────────────

function detectDateFilterRespected(
  orders: Record<string, unknown>[],
  start: string,
  end: string,
): boolean | null {
  let checked = 0;
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

// ── Busca paginada com deduplicação ───────────────────────────────────────────

const MAX_PAGES  = 20;
const MAX_ORDERS = 1000;

async function fetchAllOrders(
  baseUrl: string,
  endpoint: string,
  token: string,
  start: string,
  end: string,
): Promise<
  | { ok: true;  orders: Record<string, unknown>[]; pagination: PaginationInfo; debugShape: DebugShape; rateLimitInfo: RateLimitInfo }
  | { ok: false; code: string; reason: string; message: string; httpStatus: number | null; providerErrorMessage: string | null }
> {
  // Deduplicação: key = order ID (ou sintético para pedidos sem ID)
  const orderMap     = new Map<string, Record<string, unknown>>();
  let rawCount       = 0;
  let duplicateCount = 0;
  let missingIdCount = 0;

  let pagesFetched      = 0;
  let currentPage       = 1;
  let providerTotal:    number | null = null;
  let limitDetected:    number | null = null;
  let hasMore           = false;
  let paginationMode:   PaginationInfo["paginationMode"] = "single_page";
  let envelopeDetected  = false;
  let gotNewBeyondPage1 = false;
  let page1Count        = 0;
  let debugShape: DebugShape | null = null;
  let rateLimitInfo: RateLimitInfo = { limit: null, remaining: null, reset: null, guard: false };

  while (currentPage <= MAX_PAGES && orderMap.size < MAX_ORDERS) {
    const url = new URL(`${baseUrl}${endpoint}`);
    url.searchParams.set("filter[start_date]", start);
    url.searchParams.set("filter[end_date]",   end);
    // OlaClick documentado: page[number] — também envia page= para retrocompatibilidade
    if (currentPage > 1) {
      url.searchParams.set("page[number]", String(currentPage));
      url.searchParams.set("page",         String(currentPage));
    }

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        headers: { "x-api-key": token, "accept": "application/json" },
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

    // Ler rate limit antes de verificar sucesso (headers estão em qualquer status)
    const rl = parseRateLimitHeaders(response);
    rateLimitInfo = { ...rl, guard: false };

    if (!response.ok) {
      const cls  = classifyProviderError(response.status);
      const body = await safeProviderBody(response);
      return { ok: false, ...cls, httpStatus: response.status, providerErrorMessage: body };
    }

    // Proteção proativa: parar se restam menos de 5 requisições na cota
    if (rateLimitInfo.remaining !== null && rateLimitInfo.remaining < 5 && pagesFetched > 0) {
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

    // Chaves de paginação para debugShape
    const paginationKeys: string[] = [];
    if (rawJson && typeof rawJson === "object" && !Array.isArray(rawJson)) {
      const r = rawJson as Record<string, unknown>;
      if (r["meta"])       paginationKeys.push("meta");
      if (r["pagination"]) paginationKeys.push("pagination");
      if (r["links"])      paginationKeys.push("links");
      if (r["next_page"])  paginationKeys.push("next_page");
      if (r["next"])       paginationKeys.push("next");
    }

    const { nextPage, providerTotal: pt, perPage: pp } = detectNextPage(rawJson, currentPage);
    if (pt !== null) { providerTotal = pt; envelopeDetected = true; }
    if (pp !== null) { limitDetected = pp; envelopeDetected = true; }
    if (nextPage !== null) envelopeDetected = true;

    if (pagesFetched === 0) {
      page1Count = pageOrders.length;
      debugShape = buildDebugShape(rawJson, pageOrders, nextPage, pp, paginationKeys);
      if (envelopeDetected) paginationMode = "envelope";
    }

    // Deduplicação desta página
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

    // Detectar page param ignorado: página 2+ devolveu só duplicatas com conteúdo
    if (currentPage > 1 && newFromThisPage === 0 && pageOrders.length > 0) {
      paginationMode = "operational_only";
      hasMore = false;
      break;
    }
    if (currentPage > 1 && newFromThisPage > 0) gotNewBeyondPage1 = true;

    // Decidir próxima iteração
    if (nextPage !== null) {
      paginationMode = "envelope";
      hasMore = orderMap.size < (providerTotal ?? Infinity);
      currentPage = nextPage;
    } else if (pageOrders.length === 0) {
      hasMore = false;
      break;
    } else if (!envelopeDetected && paginationMode === "single_page" && SUSPICIOUS_LIMITS.has(pageOrders.length)) {
      // Tentar page 2 por tamanho suspeito (fallback)
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

  // Safety limits atingidos
  if (orderMap.size >= MAX_ORDERS || pagesFetched >= MAX_PAGES) hasMore = true;

  const allOrders = Array.from(orderMap.values());
  const dedup = { rawCount, uniqueCount: orderMap.size, duplicateCount, missingIdCount };
  const dateFilterRespected = allOrders.length > 0 ? detectDateFilterRespected(allOrders, start, end) : null;

  return {
    ok: true,
    orders: allOrders,
    pagination: {
      used:           pagesFetched > 1 && paginationMode !== "operational_only",
      paginationMode,
      pagesFetched,
      totalReturned:  orderMap.size,
      providerTotal,
      limitDetected,
      hasMore,
      dedup,
      dateFilterRespected,
    },
    rateLimitInfo,
    debugShape: debugShape ?? {
      topLevelType: "unknown", topLevelKeys: [], listKeyUsed: "unknown",
      totalReturned: 0, firstOrderKeys: [], firstItemKeys: [], paginationKeys: [],
      hasPagination: false, detectedLimit: null, hasNextPage: null,
    },
  };
}

// ── Cálculo de métricas ────────────────────────────────────────────────────────

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
  try { return new Date(String(raw)).toISOString().split("T")[0]; }
  catch { return null; }
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

function computeMetrics(orders: Record<string, unknown>[]): OrderMetrics {
  let faturamento_total = 0;
  const statusMap:  Record<string, number> = {};
  const itemCounts: Record<string, number> = {};
  const dayMap:     Record<string, { revenue: number; orders: number }> = {};
  let hasAnyItems = false;

  for (const order of orders) {
    const total  = extractTotal(order);
    const status = extractStatus(order);
    const date   = extractDate(order);

    faturamento_total += total;
    statusMap[status] = (statusMap[status] ?? 0) + 1;

    if (date) {
      if (!dayMap[date]) dayMap[date] = { revenue: 0, orders: 0 };
      dayMap[date].revenue += total;
      dayMap[date].orders  += 1;
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

  const pedidos_recentes = orders.slice(0, 10).map((order) => ({
    id:     extractOrderId(order),
    date:   extractDate(order),
    status: extractStatus(order),
    total:  extractTotal(order),
  }));

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
  };
}

// ── Rate limit ────────────────────────────────────────────────────────────────

interface RateLimitInfo {
  limit:     number | null;
  remaining: number | null;
  reset:     number | null;
  guard:     boolean; // paginação interrompida para proteger cota
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

// ── Top Produtos via endpoint oficial ─────────────────────────────────────────

interface TopProduct {
  productId: string | null;
  name:      string;
  quantity:  number;
  revenue:   number | null;
  modifiers: unknown[] | null;
  category:  string | null;
}

interface TopProductsResult {
  ok:               boolean;
  products:         TopProduct[] | null;
  providerEndpoint: string;
  reason:           "scope_missing" | "not_found" | "error" | null;
  message:          string | null;
}

async function fetchProductsSold(
  baseUrl: string,
  token:   string,
  start:   string,
  end:     string,
): Promise<TopProductsResult> {
  const endpoint = "/v1/orders/products-sold";
  const url = new URL(`${baseUrl}${endpoint}`);
  url.searchParams.set("filter[start_date]", start);
  url.searchParams.set("filter[end_date]",   end);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: { "x-api-key": token, "accept": "application/json" },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    return { ok: false, products: null, providerEndpoint: endpoint, reason: "error", message: "Erro de rede ao buscar produtos vendidos." };
  }

  if (response.status === 404) {
    return { ok: false, products: null, providerEndpoint: endpoint, reason: "not_found",
      message: "Endpoint /v1/orders/products-sold não disponível nesta conta." };
  }
  if (response.status === 401 || response.status === 403) {
    return { ok: false, products: null, providerEndpoint: endpoint, reason: "scope_missing",
      message: "Permissão insuficiente para acessar produtos vendidos. Verifique o scope do token." };
  }
  if (!response.ok) {
    return { ok: false, products: null, providerEndpoint: endpoint, reason: "error",
      message: `Erro ${response.status} ao buscar produtos vendidos.` };
  }

  let rawJson: unknown;
  try { rawJson = await response.json(); }
  catch {
    return { ok: false, products: null, providerEndpoint: endpoint, reason: "error", message: "Resposta inválida do endpoint de produtos vendidos." };
  }

  const items: unknown[] = Array.isArray(rawJson) ? rawJson
    : (rawJson && typeof rawJson === "object")
      ? ((rawJson as Record<string, unknown>)["data"] as unknown[] | undefined ?? [])
      : [];

  const products: TopProduct[] = (items as Record<string, unknown>[])
    .map((i) => ({
      productId: i["product_id"] != null ? String(i["product_id"]) : i["id"] != null ? String(i["id"]) : null,
      name:      String(i["name"] ?? i["product_name"] ?? i["title"] ?? i["description"] ?? "Produto desconhecido"),
      quantity:  typeof i["quantity"] === "number" ? i["quantity"] : typeof i["qty"] === "number" ? i["qty"] : 0,
      revenue:   typeof i["revenue"]       === "number" ? i["revenue"]
               : typeof i["total_revenue"] === "number" ? i["total_revenue"]
               : typeof i["amount"]        === "number" ? i["amount"] : null,
      modifiers: Array.isArray(i["modifiers"]) ? i["modifiers"] : null,
      category:  typeof i["category"]      === "string" ? i["category"]
               : typeof i["category_name"] === "string" ? i["category_name"] : null,
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  return { ok: true, products, providerEndpoint: endpoint, reason: null, message: null };
}

// ── Busca detalhes concorrente ─────────────────────────────────────────────────

const MAX_ORDER_DETAILS  = 20;
const DETAIL_CONCURRENCY = 3;

async function fetchOrderDetailsBatched(
  baseUrl: string,
  token:   string,
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
          headers: { "x-api-key": token, "accept": "application/json" },
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
        if (result.reason?.name === "RateLimitError") { stats.abortedDueTo = "rate_limited"; }
        if (result.reason?.name === "NotFoundError")  { stats.abortedDueTo = "not_found";    }
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

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });

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

    const fetchResult = await fetchAllOrders(baseUrl, ENDPOINT, safeToken, start, end);

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

    const { orders, pagination, debugShape, rateLimitInfo } = fetchResult;
    const completeness = classifyCompleteness(pagination);
    let metrics = computeMetrics(orders);
    let detailStats: DetailFetchStats | null = null;
    let topProductsResult: TopProductsResult | null = null;

    // ── Top Produtos: tentar endpoint oficial primeiro ──────────────────────
    if (!fetchResult.rateLimitInfo.guard) {
      const safeTokenProd = sanitizeHeaderValue(conn.access_token);
      topProductsResult = await fetchProductsSold(baseUrl, safeTokenProd, start, end);

      if (topProductsResult.ok && (topProductsResult.products?.length ?? 0) > 0) {
        // Usar dados do endpoint dedicado
        metrics.produtos_mais_vendidos = (topProductsResult.products ?? []).map((p) => ({
          name: p.name,
          qty:  p.quantity,
        }));
        metrics.topItemsUnavailable     = false;
        metrics.topItemsReason          = null;
        metrics.topProductsCompleteness = "complete";
      }
    }

    // ── Fallback: enriquecimento por detalhe individual (máx 20, concorrente) ─
    if (metrics.topItemsUnavailable && orders.length > 0 && !fetchResult.rateLimitInfo.guard) {
      const ids = orders
        .slice(0, MAX_ORDER_DETAILS)
        .map(extractOrderId)
        .filter(Boolean);

      if (ids.length > 0) {
        const safeTokenDetail = sanitizeHeaderValue(conn.access_token);
        const { details, stats } = await fetchOrderDetailsBatched(baseUrl, safeTokenDetail, ids);
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
          metrics.topItemsReason = "Endpoint /v1/orders/{id} retornou 404. Use /v1/orders/products-sold como fonte principal.";
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

    // Snapshot — falha explícita e categorizada, sem bloquear o relatório
    let snapshotPersistence: SnapshotPersistence = "skipped";
    if (metrics.total_pedidos > 0) {
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
          confidence_score:   metrics.total_pedidos > 0 ? 0.8 : 0.1,
        });
        if (!snapErr) {
          snapshotPersistence = "saved";
        } else if (snapErr.code === "42P01") {
          snapshotPersistence = "not_configured";
          console.warn("[olaclick/orders] snapshot skipped — table client_business_snapshots not found");
        } else {
          snapshotPersistence = "error";
          console.warn("[olaclick/orders] snapshot error:", snapErr.code);
        }
      } catch {
        snapshotPersistence = "error";
        console.warn("[olaclick/orders] snapshot exception");
      }
    }

    return NextResponse.json({
      ok:           true,
      period:       periodLabel,
      date_range:   { start, end },
      provider:     conn.provider,
      baseUrlResolved: true,
      endpoint:     ENDPOINT,
      completeness,
      snapshotPersistence,
      message:      metrics.total_pedidos === 0 ? "Nenhum pedido encontrado no período." : undefined,
      pagination,
      rateLimitInfo,
      debugShape,
      detailStats,
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
      },
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "error", stage: "unexpected" }, { status: 500 });
  }
}
