// PATCH /api/admin/billing/coupons/[id]  — edita cupom
// DELETE /api/admin/billing/coupons/[id] — desativa cupom (não apaga)

import { NextRequest, NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  createSupabaseAdminClient,
  hasSupabaseServiceRoleKey,
} from "@/lib/supabase/server";
import { withMutationProtection } from "@/lib/workspaces/assert-not-preview";

const ALLOWED_ROLES = new Set(["super_admin", "admin"]);

async function getAdminDb() {
  if (hasSupabaseServiceRoleKey()) {
    try { return createSupabaseAdminClient(); } catch { /* fallthrough */ }
  }
  return await createServerSupabaseClient();
}

export const PATCH = withMutationProtection(async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!ALLOWED_ROLES.has(profile?.role ?? "")) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  const body = await request.json() as Record<string, unknown>;
  // Campos mutáveis — não permite alterar code ou created_by
  const allowed: Record<string, unknown> = {};
  const mutable = ["description","discount_type","discount_value","duration_type","duration_months","max_redemptions","expires_at","status","metadata"];
  for (const key of mutable) {
    if (key in body) allowed[key] = body[key];
  }
  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ ok: false, reason: "no_changes" }, { status: 400 });
  }

  const db = await getAdminDb();
  const { data, error } = await db
    .from("billing_coupons")
    .update(allowed)
    .eq("id", id)
    .select("id, code, status")
    .single();

  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, coupon: data });
});

export const DELETE = withMutationProtection(async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!ALLOWED_ROLES.has(profile?.role ?? "")) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  const db = await getAdminDb();
  // Desativa — nunca apaga
  const { error } = await db
    .from("billing_coupons")
    .update({ status: "inactive" })
    .eq("id", id);

  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
});
