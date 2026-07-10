import { NextResponse, type NextRequest } from "next/server";
import {
  createServerSupabaseClient,
  createRequiredSupabaseAdminClient,
  hasSupabaseServiceRoleKey,
} from "@/lib/supabase/server";
import { CANONICAL_ACCOUNT_TYPE_VALUES } from "@/lib/account-types";

const ALLOWED_ROLES = new Set(["super_admin", "admin"]);

async function authorizeAdmin() {
  const supabase = await createServerSupabaseClient().catch(() => null);
  if (!supabase) return { error: "supabase_not_configured", status: 503 as const };

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { error: "unauthenticated", status: 401 as const };

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role: string =
    (profileRow as { role?: string } | null)?.role ??
    (user.user_metadata?.role as string | undefined) ??
    (user.app_metadata?.role as string | undefined) ??
    "";

  if (!ALLOWED_ROLES.has(role)) return { error: "forbidden", status: 403 as const };
  return { ok: true as const };
}

export async function GET(req: NextRequest) {
  const auth = await authorizeAdmin();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, code: auth.error }, { status: auth.status });
  }

  if (!hasSupabaseServiceRoleKey()) {
    return NextResponse.json({ ok: false, code: "service_role_missing" }, { status: 503 });
  }

  const admin = createRequiredSupabaseAdminClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  let query = admin
    .from("launch_waitlist")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query;
  if (error) {
    if (error.message?.includes("does not exist") || error.code === "42P01") {
      return NextResponse.json({ ok: false, code: "table_missing",
        message: "Tabela launch_waitlist não existe. Rode o SQL 73 no Supabase." }, { status: 503 });
    }
    return NextResponse.json({ ok: false, code: "db_error", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, entries: data ?? [], total: count ?? 0, debug: { rowsReturned: data?.length ?? 0, countReturned: count ?? 0 } });
}

export async function PATCH(req: NextRequest) {
  const auth = await authorizeAdmin();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, code: auth.error }, { status: auth.status });
  }

  if (!hasSupabaseServiceRoleKey()) {
    return NextResponse.json({ ok: false, code: "service_role_missing" }, { status: 503 });
  }

  let body: { id?: string; status?: string; notes?: string; beta_months_granted?: number; account_type?: string | null };
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, code: "invalid_payload" }, { status: 400 }); }

  const { id, status, notes, beta_months_granted, account_type } = body;
  if (!id) return NextResponse.json({ ok: false, code: "missing_id" }, { status: 400 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status) update.status = status;
  if (notes !== undefined) update.notes = notes;
  if (beta_months_granted !== undefined) update.beta_months_granted = beta_months_granted;
  if ("account_type" in body) {
    if (account_type !== null && account_type !== undefined &&
        !(CANONICAL_ACCOUNT_TYPE_VALUES as readonly string[]).includes(account_type as string)) {
      return NextResponse.json({
        ok: false, code: "invalid_account_type",
        message: `Valor inválido. Aceitos: ${CANONICAL_ACCOUNT_TYPE_VALUES.join(", ")}.`,
      }, { status: 422 });
    }
    update.account_type = account_type ?? null;
  }

  const admin = createRequiredSupabaseAdminClient();
  const { error } = await admin.from("launch_waitlist").update(update).eq("id", id);
  if (error) {
    return NextResponse.json({ ok: false, code: "db_error", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await authorizeAdmin();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, code: auth.error }, { status: auth.status });
  }

  if (!hasSupabaseServiceRoleKey()) {
    return NextResponse.json({ ok: false, code: "service_role_missing" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, code: "missing_id" }, { status: 400 });

  const admin = createRequiredSupabaseAdminClient();
  const { error } = await admin.from("launch_waitlist").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ ok: false, code: "db_error", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
