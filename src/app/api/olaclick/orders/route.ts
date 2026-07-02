import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveOlaClickBaseUrl } from "@/lib/olaclick";
import { getActiveDigitalMenuConnection } from "@/lib/digital-menu/server";

type PeriodKey = "hoje" | "7dias" | "15dias" | "30dias" | "mes_atual";

function resolveDateRange(period: PeriodKey): { start: string; end: string } {
  const now   = new Date();
  const toISO = (d: Date) => d.toISOString().split("T")[0];

  if (period === "hoje") {
    return { start: toISO(now), end: toISO(now) };
  }
  if (period === "7dias") {
    const s = new Date(now); s.setDate(s.getDate() - 6);
    return { start: toISO(s), end: toISO(now) };
  }
  if (period === "15dias") {
    const s = new Date(now); s.setDate(s.getDate() - 14);
    return { start: toISO(s), end: toISO(now) };
  }
  if (period === "30dias") {
    const s = new Date(now); s.setDate(s.getDate() - 29);
    return { start: toISO(s), end: toISO(now) };
  }
  // mes_atual
  const s = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start: toISO(s), end: toISO(now) };
}

/**
 * Classifica erros HTTP da API do provedor para mensagens amigáveis.
 * Nunca expõe token ou segredo.
 */
function classifyProviderError(httpStatus: number): { code: string; message: string } {
  if (httpStatus === 401) return { code: "invalid_token",   message: "Token inválido ou expirado. Reconecte o cliente em Conexões → Cardápio Digital." };
  if (httpStatus === 403) return { code: "permission_denied", message: "Token sem permissão para leitura de pedidos. Verifique as permissões no painel OlaClick." };
  if (httpStatus === 404) return { code: "endpoint_not_found", message: "Endpoint de pedidos não encontrado na API do provedor." };
  if (httpStatus === 429) return { code: "rate_limited",    message: "Limite de requisições atingido. Tente novamente em alguns minutos." };
  if (httpStatus >= 500)  return { code: "provider_error",  message: `Erro interno do provedor (HTTP ${httpStatus}). Tente novamente em instantes.` };
  return { code: "api_error", message: `Erro ao consultar API do provedor (HTTP ${httpStatus}).` };
}

// GET /api/olaclick/orders?client_id=...&period=7dias
export async function GET(request: NextRequest) {
  const params   = new URL(request.url).searchParams;
  const clientId = params.get("client_id");

  if (!clientId) {
    return NextResponse.json({ ok: false, reason: "missing_client_id" }, { status: 400 });
  }

  const period       = (params.get("period") ?? "7dias") as PeriodKey;
  const validPeriods: PeriodKey[] = ["hoje", "7dias", "15dias", "30dias", "mes_atual"];
  const safePeriod: PeriodKey    = validPeriods.includes(period) ? period : "7dias";
  const { start, end }           = resolveDateRange(safePeriod);

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });

    // ── Busca conexão com a mesma lógica de /api/olaclick/status ──
    const lookup = await getActiveDigitalMenuConnection(supabase, clientId);

    if (lookup.error?.code === "42P01") {
      return NextResponse.json({ ok: false, reason: "sql_pending" });
    }

    if (!lookup.found) {
      return NextResponse.json({
        ok:              false,
        reason:          "not_connected",
        code:            "no_digital_menu_connection",
        connectionFound: false,
        message:         "Cliente sem conexão Cardápio Digital ativa.",
        stage:           "lookup",
        supabaseErrorCode:    lookup.error?.code ?? null,
        supabaseErrorMessage: lookup.error?.message ?? null,
      });
    }

    const conn = lookup.connection;

    // ── Resolve URL base do provedor ─────────────────────────────
    // Prioridade: conn.api_base_url → env global → preset OlaClick
    // Para OlaClick, sempre retorna URL (nunca null).
    const baseUrl = resolveOlaClickBaseUrl({ api_base_url: conn.api_base_url });

    if (!baseUrl) {
      return NextResponse.json({
        ok:              false,
        reason:          "base_url_missing",
        code:            "missing_provider_base_url",
        connectionFound: true,
        provider:        conn.provider,
        message:
          "Conexão Cardápio Digital encontrada. " +
          "Falta configurar a URL da API do provedor em Conexões → Cardápio Digital.",
        stage:       "resolve_base_url",
        hasApiBaseUrl: false,
      });
    }

    // ── Chama API pública OlaClick: GET /v1/orders ────────────────
    // Auth: x-api-key (conforme documentação OlaClick Public API)
    // Nunca loga nem retorna conn.access_token.
    const url = new URL(`${baseUrl}/v1/orders`);
    url.searchParams.set("start_date", start);
    url.searchParams.set("end_date",   end);

    let providerResponse: Response;
    try {
      providerResponse = await fetch(url.toString(), {
        headers: {
          "x-api-key": conn.access_token,
          "Accept":    "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      return NextResponse.json({
        ok:              false,
        reason:          "network_error",
        code:            "provider_network_error",
        connectionFound: true,
        provider:        conn.provider,
        message:         "Não foi possível conectar à API do provedor. Verifique conexão e tente novamente.",
        stage:           "provider_api_call",
      });
    }

    if (!providerResponse.ok) {
      const { code, message } = classifyProviderError(providerResponse.status);
      return NextResponse.json({
        ok:              false,
        reason:          "api_error",
        code,
        connectionFound: true,
        provider:        conn.provider,
        httpStatus:      providerResponse.status,
        message,
        stage:           "provider_api_call",
      });
    }

    let rawJson: unknown;
    try {
      rawJson = await providerResponse.json();
    } catch {
      return NextResponse.json({
        ok:              false,
        reason:          "parse_error",
        code:            "provider_response_parse_error",
        connectionFound: true,
        provider:        conn.provider,
        message:         "A API do provedor retornou formato inesperado.",
        stage:           "parse_response",
      });
    }

    // ── Parseia métricas de forma resiliente ─────────────────────
    // A estrutura exata da resposta OlaClick /v1/orders pode variar.
    // Extrai o que estiver disponível; não inventa dados ausentes.
    const raw = rawJson as Record<string, unknown> | null;
    const items = Array.isArray(raw?.orders)  ? (raw!.orders as Record<string, unknown>[])
                : Array.isArray(raw?.data)    ? (raw!.data   as Record<string, unknown>[])
                : Array.isArray(rawJson)      ? (rawJson     as Record<string, unknown>[])
                : null;

    let faturamento_total: number | null    = null;
    let total_pedidos:     number | null    = null;
    let ticket_medio:      number | null    = null;
    let pedidos_por_status: Record<string, number> | null = null;
    let produtos_mais_vendidos: { name: string; qty: number }[] | null = null;

    if (items) {
      total_pedidos = items.length;

      // Faturamento: soma total_price / total_amount / total / price de cada pedido
      const totalRevenue = items.reduce((sum, order) => {
        const v = order["total_price"] ?? order["total_amount"] ?? order["total"] ?? order["price"];
        return sum + (typeof v === "number" ? v : 0);
      }, 0);
      faturamento_total = totalRevenue > 0 ? totalRevenue : null;

      if (faturamento_total !== null && total_pedidos > 0) {
        ticket_medio = faturamento_total / total_pedidos;
      }

      // Pedidos por status
      const statusMap: Record<string, number> = {};
      for (const order of items) {
        const s = String(order["status"] ?? order["order_status"] ?? "desconhecido");
        statusMap[s] = (statusMap[s] ?? 0) + 1;
      }
      if (Object.keys(statusMap).length > 0) pedidos_por_status = statusMap;

      // Produtos mais vendidos — via order_items / items / products
      const itemCounts: Record<string, number> = {};
      for (const order of items) {
        const lines = Array.isArray(order["order_items"]) ? order["order_items"]
                    : Array.isArray(order["items"])       ? order["items"]
                    : Array.isArray(order["products"])    ? order["products"]
                    : [];
        for (const line of lines as Record<string, unknown>[]) {
          const name = String(line["name"] ?? line["product_name"] ?? line["title"] ?? "Produto desconhecido");
          const qty  = typeof line["quantity"] === "number" ? line["quantity"] : 1;
          itemCounts[name] = (itemCounts[name] ?? 0) + qty;
        }
      }
      if (Object.keys(itemCounts).length > 0) {
        produtos_mais_vendidos = Object.entries(itemCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, qty]) => ({ name, qty }));
      }
    } else if (raw && typeof raw === "object") {
      // Formato alternativo: resposta já agregada
      if (typeof raw["total_amount"]  === "number") faturamento_total = raw["total_amount"];
      if (typeof raw["total_revenue"] === "number") faturamento_total = raw["total_revenue"];
      if (typeof raw["total_orders"]  === "number") total_pedidos    = raw["total_orders"];
      if (faturamento_total !== null && total_pedidos && total_pedidos > 0) {
        ticket_medio = faturamento_total / total_pedidos;
      }
    }

    return NextResponse.json({
      ok:         true,
      period:     safePeriod,
      date_range: { start, end },
      provider:   conn.provider,
      data: {
        faturamento_total,
        total_pedidos,
        ticket_medio,
        pedidos_por_status,
        produtos_mais_vendidos,
        // Resposta bruta disponível para debug — sem tokens
        raw: rawJson,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "error", stage: "unexpected" }, { status: 500 });
  }
}
