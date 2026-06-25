import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const ASAAS_BASE =
  process.env.ASAAS_ENVIRONMENT === "production"
    ? "https://api.asaas.com/api/v3"
    : "https://sandbox.asaas.com/api/v3";

// POST /api/payments/asaas/create-charge
// Cria cobrança no Supabase e, se gateway configurado, no Asaas.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const { description, amount, due_date, client_id, plan_id, notes, billing_type } = body as {
    description?: string;
    amount?: number;
    due_date?: string;
    client_id?: string;
    plan_id?: string;
    notes?: string;
    billing_type?: "PIX" | "BOLETO" | "CREDIT_CARD" | "UNDEFINED";
  };

  if (!amount || !due_date) {
    return NextResponse.json({ error: "amount e due_date são obrigatórios." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const apiKey = process.env.ASAAS_API_KEY;

  // ── Caso sem gateway: cobrança manual ────────────────────────
  if (!apiKey) {
    const { data, error } = await supabase
      .from("finance_charges")
      .insert({
        description: description ?? null,
        amount,
        due_date,
        client_id: client_id ?? null,
        plan_id: plan_id ?? null,
        notes: notes ?? null,
        status: "pending",
        gateway_provider: null,
        organization_id: user.id,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      success: true,
      gateway_configured: false,
      message: "Cobrança criada manualmente. Gateway Asaas ainda não configurado. Adicione ASAAS_API_KEY na Vercel para ativar cobranças automáticas.",
      charge: data,
    });
  }

  // ── Com gateway: criar no Asaas ───────────────────────────────
  // Buscar o gateway_customer_id do cliente, se houver
  let asaasCustomerId: string | null = null;
  if (client_id) {
    const { data: clientRow } = await supabase
      .from("clients")
      .select("metadata")
      .eq("id", client_id)
      .maybeSingle();
    asaasCustomerId = (clientRow?.metadata as Record<string, unknown> | null)?.asaas_customer_id as string ?? null;
  }

  if (!asaasCustomerId) {
    // Sem customer no Asaas: criar cobrança sem vínculo de cliente
    // (cobrança avulsa via link)
    asaasCustomerId = "UNDEFINED";
  }

  let asaasCharge: Record<string, unknown> | null = null;
  try {
    const res = await fetch(`${ASAAS_BASE}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": apiKey,
      },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: billing_type ?? "PIX",
        value: amount,
        dueDate: due_date,
        description: description ?? "Cobrança LOKAT OS",
      }),
    });

    if (res.ok) {
      asaasCharge = await res.json() as Record<string, unknown>;
    } else {
      const errBody = await res.text();
      console.error("[asaas/create-charge] Asaas error:", errBody);
    }
  } catch (e) {
    console.error("[asaas/create-charge] fetch error:", e);
  }

  // Salvar no Supabase independente de sucesso no Asaas
  const { data, error } = await supabase
    .from("finance_charges")
    .insert({
      description: description ?? null,
      amount,
      due_date,
      client_id: client_id ?? null,
      plan_id: plan_id ?? null,
      notes: notes ?? null,
      status: "pending",
      gateway_provider: "asaas",
      gateway_charge_id: asaasCharge?.id as string ?? null,
      payment_link: asaasCharge?.invoiceUrl as string ?? null,
      pix_qr_code: (asaasCharge?.pix as Record<string, unknown>)?.encodedImage as string ?? null,
      organization_id: user.id,
      created_by: user.id,
      metadata: asaasCharge ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    gateway_configured: true,
    asaas_charge_id: asaasCharge?.id ?? null,
    payment_link: asaasCharge?.invoiceUrl ?? null,
    charge: data,
  });
}
