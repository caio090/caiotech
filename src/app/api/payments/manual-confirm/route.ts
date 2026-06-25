import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// POST /api/payments/manual-confirm
// Confirma pagamento manualmente (sem gateway).
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const { charge_id, payment_method, notes } = body as {
    charge_id?: string;
    payment_method?: string;
    notes?: string;
  };

  if (!charge_id) {
    return NextResponse.json({ error: "charge_id é obrigatório." }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "financeiro"].includes(profile.role)) {
      return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
    }

    const { error } = await supabase
      .from("finance_charges")
      .update({
        status: "manual_confirmed",
        paid_at: new Date().toISOString(),
        payment_method: payment_method ?? "manual",
        notes: notes ?? null,
        confirmed_by: user.id,
      })
      .eq("id", charge_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, message: "Pagamento confirmado manualmente." });
  } catch (e) {
    console.error("[payments/manual-confirm]", e);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
