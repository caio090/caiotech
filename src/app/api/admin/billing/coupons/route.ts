// POST   /api/admin/billing/coupons  — cria cupom (super_admin)
// PATCH  /api/admin/billing/coupons/[id] — edita cupom (no [id]/route.ts)
//
// Operações de billing NÃO podem ser feitas via client Supabase diretamente.
// Todo insert/update de billing_coupons passa por aqui.

import { NextRequest, NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  createSupabaseAdminClient,
  hasSupabaseServiceRoleKey,
} from "@/lib/supabase/server";
import { withMutationProtection } from "@/lib/workspaces/assert-not-preview";

const ALLOWED_ROLES = new Set(["super_admin", "admin"]);

interface CouponBody {
  code: string;
  description?: string;
  discount_type: "percent" | "fixed" | "free_trial" | "free_period";
  discount_value?: number;
  duration_type: "once" | "forever" | "repeating" | "trial_extension";
  duration_months?: number;
  max_redemptions?: number;
  expires_at?: string;
  applicable_plans?: string[]; // stored in metadata.applicable_plans
}

async function getAdminDb() {
  if (hasSupabaseServiceRoleKey()) {
    try { return createSupabaseAdminClient(); } catch { /* fallthrough */ }
  }
  return await createServerSupabaseClient();
}

export const POST = withMutationProtection(async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!ALLOWED_ROLES.has(profile?.role ?? "")) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  let body: CouponBody;
  try { body = await request.json() as CouponBody; }
  catch { return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 }); }

  if (!body.code?.trim()) {
    return NextResponse.json({ ok: false, reason: "missing_code", message: "Código obrigatório." }, { status: 400 });
  }
  if (!body.discount_type || !body.duration_type) {
    return NextResponse.json({ ok: false, reason: "missing_fields", message: "Tipo de desconto e duração obrigatórios." }, { status: 400 });
  }

  const metadata: Record<string, unknown> = {};
  if (body.applicable_plans?.length) {
    metadata.applicable_plans = body.applicable_plans;
  }

  const payload = {
    code:           body.code.trim().toUpperCase(),
    description:    body.description ?? null,
    discount_type:  body.discount_type,
    discount_value: body.discount_value ?? null,
    duration_type:  body.duration_type,
    duration_months: body.duration_months ?? null,
    max_redemptions: body.max_redemptions ?? null,
    expires_at:     body.expires_at ? new Date(body.expires_at).toISOString() : null,
    status:         "active" as const,
    created_by:     user.id,
    metadata,
  };

  const db = await getAdminDb();
  const { data, error } = await db
    .from("billing_coupons")
    .insert(payload)
    .select("id, code, status")
    .single();

  if (error?.code === "42P01") {
    return NextResponse.json({
      ok: false, reason: "sql_pending",
      message: "Tabela billing_coupons não existe. Rode o SQL 68.",
    }, { status: 503 });
  }
  if (error?.code === "23505") {
    return NextResponse.json({
      ok: false, reason: "duplicate_code", message: "Código de cupom já existe.",
    }, { status: 409 });
  }
  if (error) {
    return NextResponse.json({ ok: false, reason: "db_error", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, coupon: data }, { status: 201 });
});

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!ALLOWED_ROLES.has(profile?.role ?? "")) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  const db = await getAdminDb();
  const { data, error } = await db
    .from("billing_coupons")
    .select("id, code, description, discount_type, discount_value, duration_type, duration_months, max_redemptions, redeemed_count, expires_at, status, metadata, created_at")
    .order("created_at", { ascending: false });

  if (error?.code === "42P01") {
    return NextResponse.json({ ok: true, coupons: [], sql_pending: true });
  }
  if (error) {
    return NextResponse.json({ ok: false, reason: "db_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, coupons: data ?? [] });
}
