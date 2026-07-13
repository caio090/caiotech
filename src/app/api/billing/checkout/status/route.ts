// GET /api/billing/checkout/status?checkout_id=...
// Verifica o status de um checkout em andamento.

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getProviderStatus } from "@/lib/billing/providers";

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });

  const checkoutId = new URL(request.url).searchParams.get("checkout_id");
  if (!checkoutId) {
    return NextResponse.json({ ok: false, reason: "missing_checkout_id" }, { status: 400 });
  }

  const providerStatus = getProviderStatus();
  if (!providerStatus.configured) {
    return NextResponse.json({ ok: false, reason: "gateway_not_configured", status: "pending" });
  }

  // Quando gateway estiver configurado, consultar status real
  return NextResponse.json({
    ok: true,
    checkout_id: checkoutId,
    status: "pending",
    provider: providerStatus.active,
  });
}
