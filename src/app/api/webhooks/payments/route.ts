import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// POST /api/webhooks/payments
// Recebe webhook de gateway de pagamento.
// O provider é identificado via header ou body.
//
// Headers esperados:
//   x-gateway-provider: asaas | mercadopago | pagarme | stripe
//   x-webhook-signature: <assinatura do gateway>

export async function POST(req: NextRequest) {
  const provider = req.headers.get("x-gateway-provider") ?? "unknown";
  const secret   = process.env.PAYMENT_WEBHOOK_SECRET;

  // Verificar segredo básico (antes de processar qualquer coisa)
  if (secret) {
    const sig = req.headers.get("x-webhook-signature") ?? req.headers.get("stripe-signature");
    if (!sig || !sig.includes(secret)) {
      console.warn(`[webhook/${provider}] Assinatura inválida.`);
      return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  console.log(`[webhook/${provider}] Recebido:`, JSON.stringify(payload).slice(0, 200));

  // Se o gateway não estiver totalmente configurado, apenas logar e responder 200
  const hasGatewayKey =
    (provider === "asaas"       && !!process.env.ASAAS_API_KEY) ||
    (provider === "mercadopago" && !!process.env.MERCADOPAGO_ACCESS_TOKEN) ||
    (provider === "pagarme"     && !!process.env.PAGARME_API_KEY) ||
    (provider === "stripe"      && !!process.env.STRIPE_SECRET_KEY);

  if (!hasGatewayKey) {
    return NextResponse.json({
      received: true,
      processed: false,
      message: `Gateway "${provider}" não configurado. Webhook recebido mas não processado.`,
    });
  }

  try {
    const supabase = await createServerSupabaseClient();

    // Extrair gateway_charge_id conforme o provider
    let gatewayChargeId: string | null = null;
    let newStatus: string | null = null;

    if (provider === "asaas") {
      gatewayChargeId = (payload.payment as Record<string, unknown>)?.id as string ?? null;
      const eventType = payload.event as string;
      if (eventType === "PAYMENT_RECEIVED") newStatus = "paid";
      if (eventType === "PAYMENT_OVERDUE")  newStatus = "overdue";
    } else if (provider === "mercadopago") {
      gatewayChargeId = String((payload.data && (payload.data as Record<string, unknown>).id) ?? "");
      if (payload.action === "payment.updated") newStatus = "paid";
    } else if (provider === "stripe") {
      const obj = (payload.data as Record<string, unknown>)?.object as Record<string, unknown> | null;
      gatewayChargeId = obj?.id as string ?? null;
      if (payload.type === "payment_intent.succeeded") newStatus = "paid";
    }

    if (gatewayChargeId && newStatus) {
      await supabase
        .from("finance_charges")
        .update({
          status: newStatus,
          paid_at: newStatus === "paid" ? new Date().toISOString() : null,
          webhook_event_id: (payload.id as string) ?? null,
          webhook_received_at: new Date().toISOString(),
          metadata: payload,
        })
        .eq("gateway_charge_id", gatewayChargeId);
    }

    return NextResponse.json({ received: true, processed: true });
  } catch (e) {
    console.error(`[webhook/${provider}]`, e);
    return NextResponse.json({ received: true, processed: false, error: "Erro interno." }, { status: 500 });
  }
}
