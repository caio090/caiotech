import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// POST /api/webhooks/payments/asaas
// Recebe eventos do Asaas e atualiza finance_charges no Supabase.
export async function POST(req: NextRequest) {
  const secret = process.env.ASAAS_WEBHOOK_SECRET;

  if (secret) {
    const sig = req.headers.get("asaas-access-token") ?? req.headers.get("x-webhook-signature");
    if (!sig || sig !== secret) {
      console.warn("[webhook/asaas] Assinatura inválida.");
      return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try { payload = await req.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const event = payload.event as string | undefined;
  const payment = payload.payment as Record<string, unknown> | undefined;
  const gatewayChargeId = payment?.id as string | undefined;

  console.log(`[webhook/asaas] event=${event} charge=${gatewayChargeId}`);

  if (!gatewayChargeId || !event) {
    return NextResponse.json({ received: true, processed: false, reason: "Sem payment.id ou event." });
  }

  const STATUS_MAP: Record<string, string> = {
    PAYMENT_RECEIVED:  "paid",
    PAYMENT_CONFIRMED: "paid",
    PAYMENT_OVERDUE:   "overdue",
    PAYMENT_DELETED:   "canceled",
    PAYMENT_REFUNDED:  "refunded",
    PAYMENT_RESTORED:  "pending",
  };

  const newStatus = STATUS_MAP[event];
  if (!newStatus) {
    return NextResponse.json({ received: true, processed: false, reason: `Evento "${event}" ignorado.` });
  }

  try {
    const supabase = await createServerSupabaseClient();

    const { data: existing } = await supabase
      .from("finance_charges")
      .select("id, status, webhook_event_id")
      .eq("gateway_charge_id", gatewayChargeId)
      .maybeSingle();

    if (!existing) {
      console.warn(`[webhook/asaas] Cobrança não encontrada: ${gatewayChargeId}`);
      return NextResponse.json({ received: true, processed: false, reason: "Cobrança não encontrada." });
    }

    // Evitar duplicata: mesmo evento já processado
    if (existing.webhook_event_id === (payload.id as string)) {
      return NextResponse.json({ received: true, processed: false, reason: "Evento já processado." });
    }

    await supabase
      .from("finance_charges")
      .update({
        status: newStatus,
        paid_at: newStatus === "paid" ? new Date().toISOString() : null,
        webhook_event_id: payload.id as string ?? null,
        webhook_received_at: new Date().toISOString(),
        metadata: payload,
      })
      .eq("id", existing.id);

    // Notificação para o admin da organização
    const { data: chargeRow } = await supabase
      .from("finance_charges")
      .select("organization_id, description, amount")
      .eq("id", existing.id)
      .maybeSingle();

    if (chargeRow?.organization_id && newStatus === "paid") {
      void supabase.from("notifications").insert({
        recipient_id: chargeRow.organization_id,
        recipient_role: "admin",
        type: "finance",
        title: "Pagamento recebido",
        message: `Cobrança "${chargeRow.description ?? "—"}" de R$ ${Number(chargeRow.amount).toFixed(2)} foi paga via Asaas.`,
        is_read: false,
      });
    }

    return NextResponse.json({ received: true, processed: true, new_status: newStatus });
  } catch (e) {
    console.error("[webhook/asaas]", e);
    return NextResponse.json({ received: true, processed: false, error: "Erro interno." }, { status: 500 });
  }
}
