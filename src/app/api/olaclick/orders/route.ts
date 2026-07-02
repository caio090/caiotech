import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveOlaClickBaseUrl } from "@/lib/olaclick";
import { getActiveDigitalMenuConnection } from "@/lib/digital-menu/server";

type PeriodKey = "hoje" | "7dias" | "15dias" | "30dias" | "mes_atual";

function resolveDateRange(period: PeriodKey): { start: string; end: string } {
  const now  = new Date();
  const toISO = (d: Date) => d.toISOString().split("T")[0];

  if (period === "hoje") {
    const s = toISO(now);
    return { start: s, end: s };
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

// GET /api/olaclick/orders?client_id=...&period=7dias
export async function GET(request: NextRequest) {
  const params   = new URL(request.url).searchParams;
  const clientId = params.get("client_id");

  if (!clientId) {
    return NextResponse.json({ ok: false, reason: "missing_client_id" }, { status: 400 });
  }

  const period     = (params.get("period") ?? "7dias") as PeriodKey;
  const validPeriods: PeriodKey[] = ["hoje", "7dias", "15dias", "30dias", "mes_atual"];
  const safePeriod: PeriodKey     = validPeriods.includes(period) ? period : "7dias";
  const { start, end }            = resolveDateRange(safePeriod);

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });

    // ── Busca conexão com a MESMA lógica usada por /api/olaclick/status ──
    // Usa order + limit(1) para não falhar quando há múltiplas linhas (PGRST116).
    const lookup = await getActiveDigitalMenuConnection(supabase, clientId);

    if (lookup.error?.code === "42P01") {
      return NextResponse.json({ ok: false, reason: "sql_pending" });
    }

    if (!lookup.found) {
      return NextResponse.json({
        ok:             false,
        reason:         "not_connected",
        code:           "no_digital_menu_connection",
        connectionFound: false,
        message:        "Cliente sem conexão Cardápio Digital ativa.",
        stage:          "lookup",
        supabaseErrorCode:    lookup.error?.code ?? null,
        supabaseErrorMessage: lookup.error?.message ?? null,
      });
    }

    const conn = lookup.connection;

    // ── Resolve URL base do provedor ──────────────────────────────────────
    // Prioridade: api_base_url salva no banco → env global → null
    const baseUrl = resolveOlaClickBaseUrl({ api_base_url: conn.api_base_url });

    if (!baseUrl) {
      return NextResponse.json({
        ok:             false,
        reason:         "base_url_missing",
        code:           "missing_provider_base_url",
        connectionFound: true,
        provider:       conn.provider,
        message:
          "Conexão Cardápio Digital encontrada. " +
          "Falta configurar a URL da API do provedor em Conexões → Cardápio Digital.",
        stage:          "resolve_base_url",
        hasApiBaseUrl:  false,
      });
    }

    // ── Chama API do provedor ─────────────────────────────────────────────
    // TODO: confirmar endpoint real da API OlaClick para pedidos com filtro de data
    const url = new URL(`${baseUrl}/orders`);
    url.searchParams.set("start_date", start);
    url.searchParams.set("end_date",   end);

    const r = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${conn.access_token}` },
      signal:  AbortSignal.timeout(8000),
    });

    if (!r.ok) {
      return NextResponse.json({
        ok:             false,
        reason:         "api_error",
        code:           "provider_api_error",
        connectionFound: true,
        provider:       conn.provider,
        httpStatus:     r.status,
        stage:          "provider_api_call",
        message:        `Erro ao chamar a API do provedor (HTTP ${r.status}).`,
      });
    }

    const json = await r.json() as unknown;
    return NextResponse.json({
      ok:         true,
      period:     safePeriod,
      date_range: { start, end },
      provider:   conn.provider,
      data:       json,
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "error", stage: "unexpected" }, { status: 500 });
  }
}
