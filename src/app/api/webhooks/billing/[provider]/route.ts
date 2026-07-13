// POST /api/webhooks/billing/[provider]
// Recebe e processa eventos de webhook do gateway de pagamento.
//
// Segurança:
//   - Lê corpo bruto antes de qualquer parse
//   - Verifica autenticidade via token/signature do provider
//   - Aplica idempotência via idempotency_key
//   - Registra evento bruto antes de processar
//   - Retorna 200 imediatamente (não confiar em query params)
//   - Não processa evento duas vezes

import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/billing/providers";
import type { ProviderSlug } from "@/lib/billing/providers";
import type { WebhookEvent } from "@/lib/billing/providers/types";
import { createSupabaseAdminClient, hasSupabaseServiceRoleKey } from "@/lib/supabase/server";

const VALID_PROVIDERS = new Set<ProviderSlug>(["asaas", "manual"]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerSlug } = await params;

  if (!VALID_PROVIDERS.has(providerSlug as ProviderSlug)) {
    return NextResponse.json({ ok: false, reason: "unknown_provider" }, { status: 404 });
  }

  // Lê corpo bruto — necessário para verificação de assinatura
  const rawBody = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => { headers[key] = value; });

  let provider;
  try {
    provider = getPaymentProvider(providerSlug as ProviderSlug);
  } catch {
    // Provider não implementado — retorna 200 para não retentar
    return NextResponse.json({ ok: true, ignored: true });
  }

  // Verifica autenticidade do webhook
  const isValid = provider.verifyWebhook(rawBody, headers);
  if (!isValid && process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, reason: "invalid_signature" }, { status: 401 });
  }

  // Parse do evento
  let event;
  try {
    event = provider.parseWebhookEvent(rawBody);
  } catch {
    return NextResponse.json({ ok: false, reason: "parse_error" }, { status: 400 });
  }

  // Registra e processa evento (requer banco)
  if (hasSupabaseServiceRoleKey()) {
    try {
      const db = createSupabaseAdminClient();

      // Verifica idempotência — não processa duas vezes
      const { data: existing } = await db
        .from("billing_provider_events")
        .select("id, processed")
        .eq("idempotency_key", event.idempotency_key)
        .maybeSingle();

      if (existing?.processed) {
        return NextResponse.json({ ok: true, duplicate: true });
      }

      // Registra evento bruto (tabela proposta em SQL 77)
      await db.from("billing_provider_events").upsert({
        idempotency_key: event.idempotency_key,
        provider: event.provider,
        event_type: event.type,
        raw_payload: event.raw,
        customer_id: event.customer_id ?? null,
        subscription_id: event.subscription_id ?? null,
        payment_id: event.payment_id ?? null,
        processed: false,
        created_at: event.timestamp,
      }, { onConflict: "idempotency_key" });

      // Processa evento — atualiza status no banco
      await processWebhookEvent(db, event);

      // Marca como processado
      await db
        .from("billing_provider_events")
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq("idempotency_key", event.idempotency_key);

    } catch (err) {
      // Log do erro sem expor ao provider — retorna 200 para evitar retentativas
      console.error("[webhook] error:", err);
    }
  }

  // Retorna 200 imediatamente
  return NextResponse.json({ ok: true, received: event.type });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processWebhookEvent(db: any, event: WebhookEvent) {
  switch (event.type) {
    case "payment_confirmed":
    case "payment_received":
      if (event.subscription_id) {
        await db
          .from("client_subscriptions")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("metadata->>provider_subscription_id", event.subscription_id);
      }
      break;

    case "payment_failed":
    case "payment_overdue":
      if (event.subscription_id) {
        await db
          .from("client_subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("metadata->>provider_subscription_id", event.subscription_id);
      }
      break;

    case "subscription_canceled":
      if (event.subscription_id) {
        await db
          .from("client_subscriptions")
          .update({ status: "canceled", updated_at: new Date().toISOString() })
          .eq("metadata->>provider_subscription_id", event.subscription_id);
      }
      break;

    default:
      break;
  }
}
