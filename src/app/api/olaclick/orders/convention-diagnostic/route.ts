import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveOlaClickBaseUrl } from "@/lib/olaclick";
import { getActiveDigitalMenuConnection } from "@/lib/digital-menu/server";
import { buildOrdersPaginationParams, DEFAULT_PAGE_SIZE } from "../route";
import type { PaginationConvention } from "../route";

// Somente admin e super_admin podem chamar este endpoint.
// Nunca retorna pedidos completos — apenas metadados estruturais + hashes de IDs.
// Máximo 6 chamadas: (json_api p1+p2) + (classic p1+p2) + (offset p1+p2 com ?test_offset=1).
export const dynamic = "force-dynamic";

const ALLOWED_ROLES = new Set(["admin", "super_admin"]);

interface ConventionResult {
  convention:          PaginationConvention;
  requestedPage:       number;
  requestedPageSize:   number;
  httpStatus:          number | null;
  returnedCount:       number | null;
  newUniqueIds:        number | null;   // IDs desta página não vistos na página 1 da mesma convenção
  firstIdHash:         string | null;   // SHA-256 truncado a 8 chars — nunca ID original
  lastIdHash:          string | null;
  firstCreatedAt:      string | null;
  lastCreatedAt:       string | null;
  rootKeys:            string[] | null;
  paginationKeys:      string[] | null;
  rateLimitRemaining:  number | null;
  reportedTotals:      Record<string, number> | null;  // campos numéricos do envelope (pagination/meta)
  paginates:           boolean | null;   // página 2 tem pelo menos 1 ID novo?
  error:               string | null;
}

async function sha8(s: string): Promise<string> {
  try {
    const buf = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 8);
  } catch {
    // djb2 fallback
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) & 0xFFFFFFFF;
    return Math.abs(h).toString(16).padStart(8, "0");
  }
}

function extractDate(o: Record<string, unknown>): string | null {
  const raw = o["created_at"] ?? o["createdAt"] ?? o["date"] ?? o["order_date"] ?? o["created"] ?? o["timestamp"];
  if (!raw) return null;
  try { return new Date(String(raw)).toISOString(); } catch { return null; }
}

function extractId(o: Record<string, unknown>): string {
  return String(o["id"] ?? o["order_id"] ?? o["uuid"] ?? o["code"] ?? o["number"] ?? "");
}

// Extrai apenas campos numéricos do envelope de paginação (não dos pedidos)
function extractPaginationNumbers(raw: Record<string, unknown>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const envelope of ["pagination", "meta"]) {
    const obj = raw[envelope];
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        if (typeof v === "number") result[`${envelope}.${k}`] = v;
      }
    }
  }
  // Campos numéricos da raiz (exceto data/orders arrays)
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "number") result[k] = v;
  }
  return result;
}

async function probeConvention(
  baseUrl:    string,
  token:      string,
  start:      string,
  end:        string,
  convention: PaginationConvention,
): Promise<[ConventionResult, ConventionResult]> {
  const page1Ids = new Set<string>();

  async function fetchPage(page: number): Promise<ConventionResult> {
    const url = new URL(`${baseUrl}/v1/orders`);
    url.searchParams.set("filter[start_date]", start);
    url.searchParams.set("filter[end_date]",   end);
    buildOrdersPaginationParams(convention, page, DEFAULT_PAGE_SIZE, url.searchParams);

    let resp: Response;
    try {
      resp = await fetch(url.toString(), {
        headers: { "x-api-key": token, "accept": "application/json" },
        signal: AbortSignal.timeout(12000),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message.slice(0, 100) : "network error";
      return makeError(convention, page, msg.replace(/[A-Za-z0-9_\-]{31,}/g, "[REDACTED]"), null);
    }

    const rlRaw = resp.headers.get("RateLimit-Remaining") ?? resp.headers.get("X-RateLimit-Remaining");
    const rateLimitRemaining = rlRaw ? parseInt(rlRaw, 10) : null;

    if (!resp.ok) {
      return makeError(convention, page, `HTTP ${resp.status}`, rateLimitRemaining, resp.status);
    }

    let raw: unknown;
    try { raw = await resp.json(); }
    catch { return makeError(convention, page, "invalid JSON", rateLimitRemaining, resp.status); }

    const rootKeys: string[] = [];
    const paginationKeys: string[] = [];
    let reportedTotals: Record<string, number> | null = null;

    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const r = raw as Record<string, unknown>;
      rootKeys.push(...Object.keys(r).slice(0, 20));
      for (const k of ["pagination", "meta", "links", "next_page", "total", "total_pages", "last_page", "has_more", "current_page"]) {
        if (k in r) paginationKeys.push(k);
      }
      reportedTotals = extractPaginationNumbers(r);
    }

    // Extrai pedidos sem retornar conteúdo
    let orders: Record<string, unknown>[] = [];
    if (Array.isArray(raw)) orders = raw as Record<string, unknown>[];
    else if (raw && typeof raw === "object") {
      const r = raw as Record<string, unknown>;
      for (const key of ["data", "orders", "results", "items"]) {
        if (Array.isArray(r[key])) { orders = r[key] as Record<string, unknown>[]; break; }
      }
    }

    const ids   = orders.map(extractId).filter(Boolean);
    const dates = orders.map(extractDate).filter(Boolean) as string[];

    if (page === 1) {
      for (const id of ids) page1Ids.add(id);
    }

    const newIds = page === 2 ? ids.filter(id => !page1Ids.has(id)) : ids;

    const [firstHash, lastHash] = await Promise.all([
      ids[0]              ? sha8(ids[0])              : Promise.resolve(null),
      ids[ids.length - 1] ? sha8(ids[ids.length - 1]) : Promise.resolve(null),
    ]);

    return {
      convention,
      requestedPage:     page,
      requestedPageSize: DEFAULT_PAGE_SIZE,
      httpStatus:        resp.status,
      returnedCount:     orders.length,
      newUniqueIds:      page === 2 ? newIds.length : ids.length,
      firstIdHash:       firstHash,
      lastIdHash:        lastHash,
      firstCreatedAt:    dates[0]              ?? null,
      lastCreatedAt:     dates[dates.length-1] ?? null,
      rootKeys,
      paginationKeys,
      rateLimitRemaining: isNaN(rateLimitRemaining!) ? null : rateLimitRemaining,
      reportedTotals,
      paginates: page === 2 ? newIds.length > 0 : null,
      error: null,
    };
  }

  function makeError(
    conv: PaginationConvention,
    page: number,
    msg:  string,
    rl:   number | null,
    status?: number,
  ): ConventionResult {
    return {
      convention: conv, requestedPage: page, requestedPageSize: DEFAULT_PAGE_SIZE,
      httpStatus: status ?? null, returnedCount: null, newUniqueIds: null,
      firstIdHash: null, lastIdHash: null, firstCreatedAt: null, lastCreatedAt: null,
      rootKeys: null, paginationKeys: null,
      rateLimitRemaining: rl,
      reportedTotals: null, paginates: null, error: msg,
    };
  }

  const p1 = await fetchPage(1);

  // Não fazer página 2 se página 1 retornou 429 ou erro de rede
  if (p1.httpStatus === 429 || p1.error !== null) {
    const p2skip = makeError(convention, 2, "skipped: page 1 failed", p1.rateLimitRemaining, p1.httpStatus ?? undefined);
    return [p1, p2skip];
  }

  const p2 = await fetchPage(2);
  return [p1, p2];
}

export async function GET(request: NextRequest) {
  // ── Autenticação + autorização ──────────────────────────────────────────────
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, reason: "unauthenticated" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (profile as { role?: string | null } | null)?.role ?? null;

  if (!role || !ALLOWED_ROLES.has(role)) {
    return NextResponse.json(
      { ok: false, reason: "forbidden" },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  const params   = new URL(request.url).searchParams;
  const clientId = params.get("client_id");
  if (!clientId) {
    return NextResponse.json(
      { ok: false, reason: "missing_client_id" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  // ── Validar conexão do cliente ──────────────────────────────────────────────
  const lookup = await getActiveDigitalMenuConnection(supabase, clientId);
  if (!lookup.found) {
    return NextResponse.json(
      { ok: false, reason: "not_connected" },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const conn    = lookup.connection;
  const baseUrl = resolveOlaClickBaseUrl({ api_base_url: conn.api_base_url });
  if (!baseUrl) {
    return NextResponse.json(
      { ok: false, reason: "base_url_missing" },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  // Token sanitizado — nunca aparece na resposta
  const token = conn.access_token.trim()
    .replace(/[""''«»]/g, "")
    .replace(/[^\x20-\x7E\x80-\xFF]/g, "");

  // Período de teste: últimos 7 dias
  const now   = new Date();
  const toYMD = (d: Date) => d.toISOString().split("T")[0];
  const end   = toYMD(now);
  const sD    = new Date(now); sD.setDate(sD.getDate() - 6);
  const start = toYMD(sD);

  const results: ConventionResult[] = [];

  // json_api — 2 chamadas
  const [ja1, ja2] = await probeConvention(baseUrl, token, start, end, "json_api");
  results.push(ja1, ja2);

  // classic — somente se tiver crédito de rate limit após json_api
  const rlAfterJa = ja2.rateLimitRemaining ?? ja1.rateLimitRemaining;
  if (rlAfterJa === null || rlAfterJa >= 4) {
    const [cl1, cl2] = await probeConvention(baseUrl, token, start, end, "classic");
    results.push(cl1, cl2);

    // offset — somente com ?test_offset=1 E crédito suficiente
    const rlAfterCl = cl2.rateLimitRemaining ?? cl1.rateLimitRemaining;
    if (params.get("test_offset") === "1" && (rlAfterCl === null || rlAfterCl >= 4)) {
      const [of1, of2] = await probeConvention(baseUrl, token, start, end, "offset");
      results.push(of1, of2);
    }
  }

  // Resumo por convenção
  const summary: Record<PaginationConvention, boolean | null> = {
    json_api: null,
    classic:  null,
    offset:   null,
  };
  for (const r of results) {
    if (r.requestedPage === 2 && r.paginates !== null) {
      summary[r.convention] = r.paginates;
    }
  }

  const workingConvention = (Object.entries(summary) as [PaginationConvention, boolean | null][])
    .find(([, works]) => works === true)?.[0] ?? null;

  return NextResponse.json(
    {
      ok:               true,
      testedPeriod:     { start, end },
      callsMade:        results.length,
      results,
      summary,
      workingConvention,
      recommendation: workingConvention
        ? `Use somente a convenção "${workingConvention}" na produção.`
        : "Nenhuma convenção produziu página 2 diferente. A API ignora o parâmetro de página — manter operational_only.",
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
