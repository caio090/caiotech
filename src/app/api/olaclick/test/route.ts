import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getActiveDigitalMenuConnection } from "@/lib/digital-menu/server";
import { resolveOlaClickBaseUrl } from "@/lib/olaclick";

const ENDPOINT = "/v1/orders";

/** Extrai trecho seguro do corpo — sem token, sem secrets. */
async function safeBody(response: Response): Promise<string | null> {
  try {
    const text = await response.text();
    return text.slice(0, 300).replace(/[A-Za-z0-9_\-]{31,}/g, "[REDACTED]");
  } catch { return null; }
}

// POST /api/olaclick/test
// Testa conexão OlaClick para um client_id usando o endpoint correto da API.
// Auth: x-api-key (OlaClick Public API). Nunca retorna access_token.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });

    let body: { client_id?: string };
    try { body = await request.json() as { client_id?: string }; }
    catch { return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 }); }

    const clientId = body.client_id?.trim();
    if (!clientId) return NextResponse.json({ ok: false, reason: "missing_client_id" }, { status: 400 });

    // ── Busca conexão ativa ─────────────────────────────────────
    const lookup = await getActiveDigitalMenuConnection(supabase, clientId);
    if (lookup.error?.code === "42P01") {
      return NextResponse.json({ ok: false, reason: "sql_pending" });
    }
    if (!lookup.found) {
      return NextResponse.json({
        ok: false,
        reason: "not_connected",
        code: "no_digital_menu_connection",
        message: "Nenhuma conexão Cardápio Digital ativa para este cliente.",
      });
    }

    const conn = lookup.connection;
    const baseUrl = resolveOlaClickBaseUrl({ api_base_url: conn.api_base_url });

    if (!baseUrl) {
      return NextResponse.json({
        ok: false,
        reason: "base_url_missing",
        code: "missing_provider_base_url",
        provider: conn.provider,
        baseUrlResolved: false,
        endpoint: ENDPOINT,
        message: "URL da API do provedor não configurada.",
      });
    }

    // ── Chama GET /v1/orders com período de hoje (mínimo) ───────
    // Auth: x-api-key conforme OlaClick Public API docs
    const today = new Date().toISOString().split("T")[0];
    const url = new URL(`${baseUrl}${ENDPOINT}`);
    url.searchParams.set("start_date", today);
    url.searchParams.set("end_date",   today);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        headers: { "x-api-key": conn.access_token, "Accept": "application/json" },
        signal: AbortSignal.timeout(8000),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      // Marca conexão com erro de rede
      await supabase.from("olaclick_connections")
        .update({ status: "error", last_error: "Erro de rede: " + msg.slice(0, 100) })
        .eq("id", conn.id);
      return NextResponse.json({
        ok: false,
        reason: "network_error",
        code: "provider_network_error",
        provider: conn.provider,
        baseUrlResolved: true,
        endpoint: ENDPOINT,
        httpStatus: null,
        providerErrorMessage: msg.slice(0, 200).replace(/[A-Za-z0-9_\-]{31,}/g, "[REDACTED]"),
        message: "Não foi possível conectar à API OlaClick a partir do servidor.",
      });
    }

    const httpStatus = response.status;

    if (response.ok) {
      // Sucesso — atualiza last_sync_at e limpa last_error
      await supabase.from("olaclick_connections")
        .update({ last_sync_at: new Date().toISOString(), last_error: null, status: "connected" })
        .eq("id", conn.id);
      return NextResponse.json({
        ok: true,
        provider: conn.provider,
        baseUrlResolved: true,
        endpoint: ENDPOINT,
        httpStatus,
        connection_name: conn.connection_name,
        message: "Conexão OlaClick funcionando.",
      });
    }

    // Erro HTTP — classifica
    const bodySnippet = await safeBody(response);
    const reasons: Record<number, { code: string; reason: string; message: string }> = {
      401: { code: "provider_unauthorized",       reason: "token_invalid",      message: "A API recusou a chave do provider. Verifique o token/API Key da conexão." },
      403: { code: "provider_forbidden",          reason: "forbidden",          message: "A API respondeu sem permissão para consultar pedidos." },
      404: { code: "provider_endpoint_not_found", reason: "endpoint_not_found", message: "Endpoint de pedidos não encontrado. Verifique o adapter OlaClick." },
      422: { code: "provider_bad_request",        reason: "bad_params",         message: "A API recusou os filtros do período." },
      429: { code: "provider_rate_limited",       reason: "rate_limited",       message: "Limite de requisições atingido. Tente novamente em alguns minutos." },
    };
    const cls = reasons[httpStatus] ?? (httpStatus >= 500
      ? { code: "provider_server_error", reason: "provider_error", message: `Erro interno do provedor (HTTP ${httpStatus}).` }
      : { code: "provider_api_error",    reason: "unknown",        message: `Erro ao consultar API do provedor (HTTP ${httpStatus}).` });

    await supabase.from("olaclick_connections")
      .update({ status: "error", last_error: `HTTP ${httpStatus}: ${bodySnippet?.slice(0, 100) ?? ""}` })
      .eq("id", conn.id);

    return NextResponse.json({
      ok: false,
      ...cls,
      provider: conn.provider,
      baseUrlResolved: true,
      endpoint: ENDPOINT,
      httpStatus,
      providerErrorMessage: bodySnippet,
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "internal_error" }, { status: 500 });
  }
}
