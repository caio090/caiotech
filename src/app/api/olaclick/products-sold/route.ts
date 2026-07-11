import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveOlaClickBaseUrl } from "@/lib/olaclick";
import { getActiveDigitalMenuConnection } from "@/lib/digital-menu/server";

export const dynamic    = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

// ── Cache (10 min TTL) ─────────────────────────────────────────────────────────

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_VERSION = "v1";

interface CacheEntry { data: unknown; timestamp: number }

function cacheKey(connectionId: string, clientId: string, start: string, end: string): string {
  return `products:${connectionId}:${clientId}:${start}:${end}:${CACHE_VERSION}`;
}

function getFromCache(key: string): unknown | null {
  const store = (globalThis as Record<string, unknown>)["__olaclick_products_cache"] as Map<string, CacheEntry> | undefined;
  if (!store) return null;
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) { store.delete(key); return null; }
  return entry.data;
}

function setInCache(key: string, data: unknown): void {
  let store = (globalThis as Record<string, unknown>)["__olaclick_products_cache"] as Map<string, CacheEntry> | undefined;
  if (!store) {
    store = new Map<string, CacheEntry>();
    (globalThis as Record<string, unknown>)["__olaclick_products_cache"] = store;
  }
  store.set(key, { data, timestamp: Date.now() });
  for (const [k, v] of store.entries()) {
    if (Date.now() - v.timestamp > CACHE_TTL_MS) store.delete(k);
  }
}

// ── Auth headers ───────────────────────────────────────────────────────────────

type AuthMode = "bearer" | "x_api_key";

function buildHeaders(token: string, mode: AuthMode): Record<string, string> {
  if (mode === "bearer") return { "Authorization": `Bearer ${token}`, "accept": "application/json" };
  return { "x-api-key": token, "accept": "application/json" };
}

async function probeAuth(baseUrl: string, token: string): Promise<AuthMode> {
  try {
    const url = new URL(`${baseUrl}/v1/orders`);
    url.searchParams.set("page", "1");
    url.searchParams.set("limit", "1");
    const r = await fetch(url.toString(), {
      headers: buildHeaders(token, "bearer"),
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (r.status !== 401 && r.status !== 403) return "bearer";
  } catch { /* fall through */ }
  return "x_api_key";
}

// ── Quantity resolver ──────────────────────────────────────────────────────────

function resolveQty(i: Record<string, unknown>): number {
  const fields = ["quantity","qty","sold","sold_quantity","total_sold","total_quantity","orders_count","items_count","count","amount"];
  for (const f of fields) {
    const v = i[f];
    if (typeof v === "number" && v > 0) return v;
    if (typeof v === "string") { const n = parseFloat(v); if (!isNaN(n) && n > 0) return n; }
  }
  return 0;
}

function resolveRevenue(i: Record<string, unknown>): number | null {
  const fields = ["revenue","total_revenue","gross_revenue","sales_amount","total","total_amount","amount"];
  for (const f of fields) {
    const v = i[f];
    if (typeof v === "number") return v;
    if (typeof v === "string") { const n = parseFloat(v); if (!isNaN(n)) return n; }
  }
  return null;
}

function resolveName(i: Record<string, unknown>): string {
  const v = i["name"] ?? i["product_name"] ?? i["title"] ?? i["description"]
    ?? (i["product"] as Record<string, unknown> | undefined)?.["name"]
    ?? (i["item"]    as Record<string, unknown> | undefined)?.["name"];
  return v ? String(v) : "Produto desconhecido";
}

// ── Fetch products-sold ────────────────────────────────────────────────────────

interface ProductEntry {
  id:       string | null;
  name:     string;
  quantity: number;
  revenue:  number | null;
  category: string | null;
  share:    number;
}

interface ProductsPayload {
  ok:           boolean;
  completeness: "complete" | "partial" | "unavailable";
  products:     ProductEntry[];
  totalQuantity: number;
  diagnostics: {
    cacheHit:     boolean;
    endpoint:     string;
    errorCode:    string | null;
    errorMessage: string | null;
    rawItemCount: number | null;
    firstItemKeys: string[] | null;
  };
}

async function fetchProductsSold(
  baseUrl:  string,
  token:    string,
  authMode: AuthMode,
  start:    string,
  end:      string,
): Promise<ProductsPayload> {
  const endpoint = "/v1/orders/products-sold";
  const diag = { cacheHit: false, endpoint, errorCode: null as string | null, errorMessage: null as string | null, rawItemCount: null as number | null, firstItemKeys: null as string[] | null };

  const url = new URL(`${baseUrl}${endpoint}`);
  url.searchParams.set("filter[start_date]", start);
  url.searchParams.set("filter[end_date]",   end);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: buildHeaders(token, authMode),
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    diag.errorCode    = "network_error";
    diag.errorMessage = "Erro de rede ao buscar ranking de produtos.";
    return { ok: false, completeness: "unavailable", products: [], totalQuantity: 0, diagnostics: diag };
  }

  if (response.status === 401 || response.status === 403) {
    diag.errorCode    = "auth_error";
    diag.errorMessage = "Ranking de produtos indisponível — verifique o scope do token OlaClick.";
    return { ok: false, completeness: "unavailable", products: [], totalQuantity: 0, diagnostics: diag };
  }
  if (response.status === 404) {
    diag.errorCode    = "not_found";
    diag.errorMessage = "Relatório de produtos não disponível nesta conta OlaClick.";
    return { ok: false, completeness: "unavailable", products: [], totalQuantity: 0, diagnostics: diag };
  }
  if (response.status === 429) {
    diag.errorCode    = "rate_limited";
    diag.errorMessage = "A OlaClick limitou temporariamente as requisições. Tente novamente em alguns instantes.";
    return { ok: false, completeness: "partial", products: [], totalQuantity: 0, diagnostics: diag };
  }
  if (!response.ok) {
    diag.errorCode    = `http_${response.status}`;
    diag.errorMessage = "Não foi possível carregar os produtos agora. Tente novamente.";
    return { ok: false, completeness: "unavailable", products: [], totalQuantity: 0, diagnostics: diag };
  }

  let rawJson: unknown;
  try { rawJson = await response.json(); }
  catch {
    diag.errorCode    = "parse_error";
    diag.errorMessage = "Resposta inesperada do servidor de produtos.";
    return { ok: false, completeness: "unavailable", products: [], totalQuantity: 0, diagnostics: diag };
  }

  const items: unknown[] = Array.isArray(rawJson) ? rawJson
    : (rawJson && typeof rawJson === "object")
      ? ((rawJson as Record<string, unknown>)["data"] as unknown[] ?? [])
      : [];

  diag.rawItemCount  = items.length;
  diag.firstItemKeys = items.length > 0 && typeof items[0] === "object" && items[0] !== null
    ? Object.keys(items[0] as object)
    : null;

  if (items.length === 0) {
    return { ok: true, completeness: "complete", products: [], totalQuantity: 0, diagnostics: diag };
  }

  const parsed = (items as Record<string, unknown>[]).map((i) => ({
    id:       i["product_id"] != null ? String(i["product_id"]) : i["id"] != null ? String(i["id"]) : null,
    name:     resolveName(i),
    quantity: resolveQty(i),
    revenue:  resolveRevenue(i),
    category: typeof i["category"] === "string" ? i["category"] : typeof i["category_name"] === "string" ? i["category_name"] : null,
  }));

  const withQty   = parsed.filter((p) => p.quantity > 0);
  const totalQty  = withQty.reduce((s, p) => s + p.quantity, 0);
  const top10     = withQty.sort((a, b) => b.quantity - a.quantity).slice(0, 10);

  const products: ProductEntry[] = top10.map((p) => ({
    ...p,
    share: totalQty > 0 ? Math.round((p.quantity / totalQty) * 1000) / 10 : 0,
  }));

  return {
    ok:           true,
    completeness: "complete",
    products,
    totalQuantity: totalQty,
    diagnostics:  diag,
  };
}

// ── GET handler ────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const params   = new URL(request.url).searchParams;
  const clientId = params.get("client_id");
  if (!clientId) {
    return NextResponse.json({ ok: false, reason: "missing_client_id" }, { status: 400 });
  }

  const rawStart = params.get("start_date");
  const rawEnd   = params.get("end_date");
  const YMD_RE   = /^\d{4}-\d{2}-\d{2}$/;
  if (!rawStart || !rawEnd || !YMD_RE.test(rawStart) || !YMD_RE.test(rawEnd) || rawStart > rawEnd) {
    return NextResponse.json({ ok: false, reason: "invalid_date_range" }, { status: 400 });
  }
  const start = rawStart;
  const end   = rawEnd;

  const forceRefresh = params.get("force_refresh") === "1";

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });

    const lookup = await getActiveDigitalMenuConnection(supabase, clientId);
    if (lookup.error?.code === "42P01") return NextResponse.json({ ok: false, reason: "sql_pending" });
    if (!lookup.found) {
      return NextResponse.json({
        ok: false, reason: "not_connected",
        message: "Cliente sem conexão Cardápio Digital ativa.",
      });
    }

    const conn    = lookup.connection;
    const baseUrl = resolveOlaClickBaseUrl({ api_base_url: conn.api_base_url });
    if (!baseUrl) {
      return NextResponse.json({ ok: false, reason: "base_url_missing", message: "URL da API do provider não configurada." });
    }

    const key = cacheKey(conn.id, clientId, start, end);
    if (!forceRefresh) {
      const cached = getFromCache(key);
      if (cached) {
        return NextResponse.json(
          { ...(cached as Record<string, unknown>), cacheHit: true },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
    }

    const token    = conn.access_token?.trim() ?? "";
    const authMode = await probeAuth(baseUrl, token);
    const result   = await fetchProductsSold(baseUrl, token, authMode, start, end);

    const responseBody = { ...result, cacheHit: false };
    if (result.ok && result.products.length > 0) {
      setInCache(key, responseBody);
    }

    return NextResponse.json(responseBody, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "error" }, { status: 500 });
  }
}
