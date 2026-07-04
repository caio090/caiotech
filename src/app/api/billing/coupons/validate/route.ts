import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createSupabaseAdminClient, hasSupabaseServiceRoleKey } from "@/lib/supabase/server";
import { PLANS, formatPrice } from "@/lib/billing/plans";

// POST /api/billing/coupons/validate
// Validates a coupon code — never marks it as redeemed here.
// Returns preview of discount for UI display only.
export async function POST(request: NextRequest) {
  let code = "";
  try {
    const body = await request.json() as { code?: unknown };
    code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 });
  }

  if (!code || code.length < 2 || code.length > 50) {
    return NextResponse.json({ ok: false, reason: "invalid_code", message: "Código inválido." }, { status: 400 });
  }

  // Use admin db to read coupons (bypasses RLS), fall back to session client
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any;
  if (hasSupabaseServiceRoleKey()) {
    try { db = createSupabaseAdminClient(); } catch { /* fallthrough */ }
  }
  if (!db) {
    try {
      db = await createServerSupabaseClient();
    } catch {
      return NextResponse.json({ ok: false, reason: "db_error" }, { status: 500 });
    }
  }

  const { data: coupon, error } = await db
    .from("billing_coupons")
    .select("id,code,description,discount_type,discount_value,duration_type,duration_months,max_redemptions,redeemed_count,expires_at,status")
    .eq("code", code)
    .maybeSingle();

  if (error?.code === "42P01") {
    // Table doesn't exist yet — SQL 68 not applied
    return NextResponse.json({
      ok: false,
      reason: "sql_pending",
      message: "Tabela de cupons ainda não foi criada. Rode o SQL 68 no Supabase.",
    }, { status: 503 });
  }

  if (!coupon) {
    return NextResponse.json({ ok: false, reason: "not_found", message: "Cupom não encontrado." });
  }

  if (coupon.status !== "active") {
    return NextResponse.json({ ok: false, reason: "inactive", message: "Este cupom está inativo." });
  }

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return NextResponse.json({ ok: false, reason: "expired", message: "Este cupom expirou." });
  }

  if (coupon.max_redemptions !== null && coupon.redeemed_count >= coupon.max_redemptions) {
    return NextResponse.json({ ok: false, reason: "exhausted", message: "Este cupom atingiu o limite de usos." });
  }

  // Build preview label
  const startPlan = PLANS.find((p) => p.slug === "start");
  const basePrice = startPlan?.price_monthly ?? 49;

  let discountLabel = "";
  let trialDays = startPlan?.trial_days ?? 14;
  let finalPrice = basePrice;

  switch (coupon.discount_type) {
    case "percent":
      discountLabel = `${coupon.discount_value}% de desconto`;
      finalPrice = Math.max(0, basePrice * (1 - coupon.discount_value / 100));
      break;
    case "fixed":
      discountLabel = `${formatPrice(coupon.discount_value)} de desconto`;
      finalPrice = Math.max(0, basePrice - coupon.discount_value);
      break;
    case "free_trial":
      trialDays = Math.max(trialDays, coupon.discount_value ?? 14);
      discountLabel = `${trialDays} dias grátis`;
      break;
    case "free_period":
      discountLabel = coupon.duration_months
        ? `${coupon.duration_months} ${coupon.duration_months === 1 ? "mês" : "meses"} grátis`
        : "Período grátis";
      finalPrice = 0;
      break;
  }

  return NextResponse.json({
    ok: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      description: coupon.description,
      discount_type: coupon.discount_type,
      duration_type: coupon.duration_type,
    },
    preview: {
      discountLabel,
      trialDays,
      finalPrice: finalPrice === 0 ? "Grátis" : formatPrice(Math.round(finalPrice)),
    },
    message: `Cupom válido! ${discountLabel || "Benefício aplicado."}`,
  });
}
