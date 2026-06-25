import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// POST /api/payments/create-charge
// Cria cobrança no Supabase e (futuramente) no gateway.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const { description, amount, due_date, client_id, plan_id, notes, gateway_provider } = body as {
    description?: string;
    amount?: number;
    due_date?: string;
    client_id?: string;
    plan_id?: string;
    notes?: string;
    gateway_provider?: string;
  };

  if (!amount || !due_date) {
    return NextResponse.json({ error: "amount e due_date são obrigatórios." }, { status: 400 });
  }

  // Verificar se gateway está configurado para disparar
  if (gateway_provider) {
    const gatewayKey =
      gateway_provider === "asaas"        ? process.env.ASAAS_API_KEY :
      gateway_provider === "mercadopago"   ? process.env.MERCADOPAGO_ACCESS_TOKEN :
      gateway_provider === "pagarme"       ? process.env.PAGARME_API_KEY :
      gateway_provider === "stripe"        ? process.env.STRIPE_SECRET_KEY : null;

    if (!gatewayKey) {
      return NextResponse.json({
        success: false,
        gateway_configured: false,
        message: `Gateway "${gateway_provider}" ainda não configurado. Adicione a variável de ambiente correspondente na Vercel. Cobrança criada localmente sem envio ao gateway.`,
      });
    }
    // TODO: Implementar chamada real ao gateway quando integração for ativada.
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

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
        gateway_provider: gateway_provider ?? null,
        organization_id: user.id,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, charge: data });
  } catch (e) {
    console.error("[payments/create-charge]", e);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
