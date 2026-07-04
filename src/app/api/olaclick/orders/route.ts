import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveOlaClickBaseUrl } from "@/lib/olaclick";
import { getActiveDigitalMenuConnection } from "@/lib/digital-menu/server";

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
  used:          boolean;
  pagesFetched:  number;
  totalReturned: number;
  providerTotal: number | null;
  limitDetected: number | null;
  hasMore:       boolean;
}

interface OrderMetrics {
  faturamento_total:      number;
  total_pedidos:          number;
  ticket_medio:           number | null;
  pedidos_por_status:     Record<string, number> | null;
  produtos_mais_vendidos: { name: string; qty: number }[] | null;
  topItemsUnavailable:    boolean;
  topItemsReason:         string | null;
  melhores_dias:          { date: string; revenue: number; orders: number }[] | null;
  pedidos_recentes:       { id: string; date: string | null; status: string; total: number }[];
}

// ── Utilitários ────────────────────────────────────────────────────────────────

function resolveDateRange(period: PeriodKey): { start: string; end: string } {
  const now    = new Date();
  const toYMD  = (d: Date) => d.toISOString().split("T")[0];
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
    for (const key of ["orders", "data", "results", "items"]) {
      if (Array.isArray(r[key])) return r[key] as Record<string, unknown>[];
    }
  }
  return null;
}

function detectNextPage(
  raw: unknown,
  currentPage: number,
): { nextPage: number | null; providerTotal: number | null; perPage: number | null } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { nextPage: null, providerTotal: null, perPage: null };
  const r = raw as Record<string, unknown>;

  // Laravel-style: { meta: { current_page, last_page, per_page, total } }
  const meta = r["meta"] as Record<string, unknown> | undefined;
  if (meta && typeof meta === "object") {
    const lastPage = typeof meta["last_page"] === "number" ? meta["last_page"] : null;
    const total    = typeof meta["total"]     === "number" ? meta["total"]     : null;
    const perPage  = typeof meta["per_page"]  === "number" ? meta["per_page"]  : null;
    const next     = lastPage !== null && currentPage < lastPage ? currentPage + 1 : null;
    return { nextPage: next, providerTotal: total, perPage };
  }

  // { pagination: { page, total_pages | last_page, per_page, total } }
  const pag = r["pagination"] as Record<string, unknown> | undefined;
  if (pag && typeof pag === "object") {
    const totalPages = (typeof pag["total_pages"] === "number" ? pag["total_pages"]
                      : typeof pag["last_page"]   === "number" ? pag["last_page"] : null);
    const total    = typeof pag["total"]    === "number" ? pag["total"]    : null;
    const perPage  = typeof pag["per_page"] === "number" ? pag["per_page"] : null;
    const next     = totalPages !== null && currentPage < totalPages ? currentPage + 1 : null;
    return { nextPage: next, providerTotal: total, perPage };
  }

  // { links: { next } } or { next_page } or { next: "url" }
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
    for (const key of ["orders", "data", "results", "items"]) {
      if (Array.isArray(r[key])) { listKeyUsed = key; break; }
    }
  }

  const firstOrder    = pageOrders[0] ?? null;
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

// ── Busca paginada ─────────────────────────────────────────────────────────────

const MAX_PAGES  = 10;
const MAX_ORDERS = 500;

async function fetchAllOrders(
  baseUrl: string,
  endpoint: string,
  token: string,
  start: string,
  end: string,
): Promise<
  | { ok: true;  orders: Record<string, unknown>[]; pagination: PaginationInfo; debugShape: DebugShape }
  | { ok: false; code: string; reason: string; message: string; httpStatus: number | null; providerErrorMessage: string | null }
> {
  const allOrders: Record<string, unknown>[] = [];
  let pagesFetched  = 0;
  let currentPage   = 1;
  let providerTotal: number | null = null;
  let limitDetected: number | null = null;
  let hasMore       = false;
  let usedPagination = false;
  let debugShape: DebugShape | null = null;

  while (currentPage <= MAX_PAGES && allOrders.length < MAX_ORDERS) {
    const url = new URL(`${baseUrl}${endpoint}`);
    url.searchParams.set("filter[start_date]", start);
    url.searchParams.set("filter[end_date]",   end);
    if (currentPage > 1) url.searchParams.set("page", String(currentPage));

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        headers: { "x-api-key": token, "accept": "application/json" },
        signal: AbortSignal.timeout(10000),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      return { ok: false,
        code: "provider_network_error", reason: "network_error",
        httpStatus: null,
        providerErrorMessage: msg.slice(0, 200).replace(/[A-Za-z0-9_\-]{31,}/g, "[REDACTED]"),
        message: "Não foi possível conectar à API OlaClick a partir do servidor.",
      };
    }

    if (!response.ok) {
      const cls  = classifyProviderError(response.status);
      const body = await safeProviderBody(response);
      return { ok: false, ...cls, httpStatus: response.status, providerErrorMessage: body };
    }

    let rawJson: unknown;
    try { rawJson = await response.json(); }
    catch {
      return { ok: false,
        code: "provider_unexpected_response", reason: "unexpected_response",
        httpStatus: response.status, providerErrorMessage: null,
        message: "A API respondeu, mas em formato diferente do esperado.",
      };
    }

    const pageOrders = extractOrders(rawJson) ?? [];

    // Coleta chaves de paginação para debugShape
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
    if (pt !== null) providerTotal = pt;
    if (pp !== null) limitDetected = pp;

    if (pagesFetched === 0) {
      debugShape = buildDebugShape(rawJson, pageOrders, nextPage, pp, paginationKeys);
    }

    allOrders.push(...pageOrders);
    pagesFetched++;

    if (nextPage === null || pageOrders.length === 0) {
      hasMore = false;
      break;
    }
    usedPagination = true;
    hasMore = allOrders.length < (providerTotal ?? Infinity);
    currentPage = nextPage;
  }

  if (allOrders.length >= MAX_ORDERS || currentPage > MAX_PAGES) hasMore = true;

  return {
    ok: true,
    orders: allOrders,
    pagination: {
      used:          usedPagination,
      pagesFetched,
      totalReturned: allOrders.length,
      providerTotal,
      limitDetected,
      hasMore,
    },
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
                 : typeof item["qty"]      === "number" ? item["qty"]
                 : 1;
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
    id:     String(order["id"] ?? order["order_id"] ?? order["uuid"] ?? order["code"] ?? order["number"] ?? ""),
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
    topItemsUnavailable: !hasAnyItems,
    topItemsReason: !hasAnyItems ? "Os itens/produtos não vieram na resposta do endpoint /v1/orders." : null,
    melhores_dias,
    pedidos_recentes,
  };
}

// ── Busca detalhes de pedidos individuais ─────────────────────────────────────

const MAX_ORDER_DETAILS = 50;

async function fetchOrderDetails(
  baseUrl: string,
  token:   string,
  orderIds: string[],
): Promise<Record<string, unknown>[]> {
  const results: Record<string, unknown>[] = [];
  const ids = orderIds.slice(0, MAX_ORDER_DETAILS);
  for (const id of ids) {
    if (!id) continue;
    try {
      const url = `${baseUrl}/v1/orders/${encodeURIComponent(id)}`;
      const r = await fetch(url, {
        headers: { "x-api-key": token, "accept": "application/json" },
        signal: AbortSignal.timeout(6000),
      });
      if (!r.ok) {
        // 404 confirma que endpoint de detalhe não existe — aborta
        if (r.status === 404) break;
        continue;
      }
      const detail = await r.json() as unknown;
      if (detail && typeof detail === "object" && !Array.isArray(detail)) {
        results.push(detail as Record<string, unknown>);
      }
    } catch { continue; }
  }
  return results;
}

// ── Handler ────────────────────────────────────────────────────────────────────

const ENDPOINT = "/v1/orders";

export async function GET(request: NextRequest) {
  const params   = new URL(request.url).searchParams;
  const clientId = params.get("client_id");
  if (!clientId) return NextResponse.json({ ok: false, reason: "missing_client_id" }, { status: 400 });

  // Período personalizado: start_date + end_date têm prioridade sobre period
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

    const { orders, pagination, debugShape } = fetchResult;
    let metrics = computeMetrics(orders);

    // Se itens não vieram no listing, tenta detalhe individual (até 50 pedidos)
    if (metrics.topItemsUnavailable && orders.length > 0) {
      const ids = orders.slice(0, MAX_ORDER_DETAILS).map((o) =>
        String(o["id"] ?? o["order_id"] ?? o["uuid"] ?? o["code"] ?? o["number"] ?? ""),
      ).filter(Boolean);

      if (ids.length > 0) {
        const safeToken = sanitizeHeaderValue(conn.access_token);
        const details = await fetchOrderDetails(baseUrl, safeToken, ids);
        if (details.length > 0) {
          // Mescla itens dos detalhes nos pedidos originais
          const enriched = orders.map((o, idx) => {
            const det = details[idx];
            if (!det) return o;
            const detItems = extractItems(det);
            if (detItems.length > 0) return { ...o, items: detItems };
            return o;
          });
          metrics = computeMetrics(enriched);
          if (!metrics.topItemsUnavailable) {
            metrics.topItemsReason = null;
          } else {
            metrics.topItemsReason = "Endpoint de detalhe de pedido retornou dados, mas sem itens identificáveis.";
          }
        } else {
          metrics.topItemsReason = "Produtos mais vendidos indisponíveis: a API de listagem não retornou itens e o endpoint de detalhe de pedido não está disponível ou retornou 404.";
        }
      }
    }

    // Snapshot — falha silenciosamente se tabela não existir
    let snapshotWarning: string | null = null;
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
      if (snapErr && snapErr.code !== "42P01") {
        snapshotWarning = `Snapshot não salvo: ${snapErr.message}`;
      } else if (snapErr?.code === "42P01") {
        snapshotWarning = "Snapshot não salvo porque tabela ainda não existe.";
      }
    } catch { /* silencioso */ }

    return NextResponse.json({
      ok:           true,
      period:       periodLabel,
      date_range:   { start, end },
      provider:     conn.provider,
      baseUrlResolved: true,
      endpoint:     ENDPOINT,
      message:      metrics.total_pedidos === 0 ? "Nenhum pedido encontrado no período." : undefined,
      snapshotWarning,
      pagination,
      debugShape,
      data: {
        faturamento_total:      metrics.faturamento_total,
        total_pedidos:          metrics.total_pedidos,
        ticket_medio:           metrics.ticket_medio,
        pedidos_por_status:     metrics.pedidos_por_status,
        produtos_mais_vendidos: metrics.produtos_mais_vendidos,
        topItemsUnavailable:    metrics.topItemsUnavailable,
        topItemsReason:         metrics.topItemsReason,
        melhores_dias:          metrics.melhores_dias,
        pedidos_recentes:       metrics.pedidos_recentes,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "error", stage: "unexpected" }, { status: 500 });
  }
}
