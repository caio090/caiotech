// POST /api/billing/checkout
// Inicia um checkout. Preço e plano vêm sempre do servidor — nunca do frontend.
// Retorna URL do checkout hospedado (quando provider configurado) ou instrução manual.

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getActiveProvider, getProviderStatus } from "@/lib/billing/providers";
import { PLANS } from "@/lib/billing/plans";

interface CheckoutBody {
  plan_slug: string;
  billing_cycle?: "monthly" | "yearly";
  coupon_code?: string;
  return_url?: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });
  }

  let body: CheckoutBody;
  try { body = await request.json() as CheckoutBody; }
  catch { return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 }); }

  if (!body.plan_slug) {
    return NextResponse.json({ ok: false, reason: "missing_plan" }, { status: 400 });
  }

  // Busca plano do servidor — nunca aceita preço do frontend
  const plan = PLANS.find((p) => p.slug === body.plan_slug);
  if (!plan || plan.status === "coming_soon") {
    return NextResponse.json({ ok: false, reason: "plan_not_found", message: "Plano não encontrado." }, { status: 404 });
  }

  const providerStatus = getProviderStatus();

  // Se gateway não configurado, retorna instrução manual
  if (!providerStatus.configured) {
    return NextResponse.json({
      ok: false,
      reason: "gateway_not_configured",
      message: "Gateway de pagamento ainda não configurado. Entre em contato para assinar.",
      fallback: "manual",
      plan: {
        slug: plan.slug,
        name: plan.name,
        price_monthly: plan.price_monthly,
        trial_days: plan.trial_days,
      },
    }, { status: 503 });
  }

  // Quando gateway estiver configurado, criar checkout session
  try {
    const provider = getActiveProvider();
    const returnUrl = body.return_url ?? `${request.nextUrl.origin}/onboarding/sucesso`;

    const result = await provider.createCheckoutSession({
      account_id: user.id,
      plan_slug: body.plan_slug,
      billing_cycle: body.billing_cycle ?? "monthly",
      coupon_code: body.coupon_code,
      return_url: returnUrl,
    });

    return NextResponse.json({
      ok: true,
      checkout: {
        id: result.checkout_id,
        url: result.checkout_url,
        status: result.status,
      },
      provider: providerStatus.active,
      environment: providerStatus.environment,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, reason: "checkout_error", message }, { status: 500 });
  }
}
