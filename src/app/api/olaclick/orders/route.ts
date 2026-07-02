import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveOlaClickBaseUrl, OLACLICK_BASE_URL_MISSING_RESPONSE } from "@/lib/olaclick";

type PeriodKey = "hoje" | "7dias" | "15dias" | "30dias" | "mes_atual";

function resolveDateRange(period: PeriodKey): { start: string; end: string } {
  const now = new Date();
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
  const params = new URL(request.url).searchParams;
  const clientId = params.get("client_id");
  if (!clientId) return NextResponse.json({ ok: false, reason: "missing_client_id" }, { status: 400 });

  const period = (params.get("period") ?? "7dias") as PeriodKey;
  const validPeriods: PeriodKey[] = ["hoje", "7dias", "15dias", "30dias", "mes_atual"];
  const safePeriod: PeriodKey = validPeriods.includes(period) ? period : "7dias";
  const { start, end } = resolveDateRange(safePeriod);

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });

    const { data: conn, error } = await supabase
      .from("olaclick_connections")
      .select("access_token, api_base_url")
      .eq("client_id", clientId)
      .eq("status", "connected")
      .maybeSingle();

    if (error?.code === "42P01") return NextResponse.json({ ok: false, reason: "sql_pending" });
    if (!conn) return NextResponse.json({ ok: false, reason: "not_connected" });

    const baseUrl = resolveOlaClickBaseUrl(conn);
    if (!baseUrl) return NextResponse.json(OLACLICK_BASE_URL_MISSING_RESPONSE);

    // TODO: confirmar endpoint real da API OlaClick para pedidos com filtro de data
    const url = new URL(`${baseUrl}/orders`);
    url.searchParams.set("start_date", start);
    url.searchParams.set("end_date", end);

    const r = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${conn.access_token}` },
      signal:  AbortSignal.timeout(8000),
    });
    if (!r.ok) return NextResponse.json({ ok: false, reason: "api_error", status: r.status });

    const json = await r.json() as unknown;
    return NextResponse.json({ ok: true, period: safePeriod, date_range: { start, end }, data: json });
  } catch {
    return NextResponse.json({ ok: false, reason: "error" }, { status: 500 });
  }
}
