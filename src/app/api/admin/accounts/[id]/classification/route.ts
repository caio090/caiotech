import { NextResponse, type NextRequest } from "next/server";
import {
  createServerSupabaseClient,
  createRequiredSupabaseAdminClient,
  hasSupabaseServiceRoleKey,
} from "@/lib/supabase/server";
import { CANONICAL_ACCOUNT_TYPE_VALUES } from "@/lib/account-types";

const ALLOWED_ROLES = new Set(["super_admin", "admin"]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // ── Auth ──────────────────────────────────────────────────────
  const supabase = await createServerSupabaseClient().catch(() => null);
  if (!supabase) {
    return NextResponse.json({ ok: false, code: "supabase_not_configured" }, { status: 503 });
  }

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, code: "unauthenticated" }, { status: 401 });
  }

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

  if (!ALLOWED_ROLES.has(role)) {
    return NextResponse.json({ ok: false, code: "forbidden" }, { status: 403 });
  }

  // ── Service role ──────────────────────────────────────────────
  if (!hasSupabaseServiceRoleKey()) {
    return NextResponse.json({ ok: false, code: "service_role_missing" }, { status: 503 });
  }

  // ── Payload ───────────────────────────────────────────────────
  let body: { account_type?: string | null };
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, code: "invalid_payload" }, { status: 400 }); }

  const { account_type } = body;

  const isNull = account_type === null || account_type === undefined;
  if (!isNull && typeof account_type !== "string") {
    return NextResponse.json({ ok: false, code: "invalid_account_type", message: "account_type deve ser string ou null." }, { status: 422 });
  }
  if (!isNull && !(CANONICAL_ACCOUNT_TYPE_VALUES as readonly string[]).includes(account_type!)) {
    return NextResponse.json({
      ok: false,
      code: "invalid_account_type",
      message: `Valor inválido. Valores aceitos: ${CANONICAL_ACCOUNT_TYPE_VALUES.join(", ")}.`,
      allowed: CANONICAL_ACCOUNT_TYPE_VALUES,
    }, { status: 422 });
  }

  // ── Target account ────────────────────────────────────────────
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ ok: false, code: "missing_id" }, { status: 400 });
  }

  const admin = createRequiredSupabaseAdminClient();

  // Verificar se profile existe antes de atualizar
  const { data: target, error: targetErr } = await admin
    .from("profiles")
    .select("id, account_type")
    .eq("id", id)
    .maybeSingle();

  if (targetErr) {
    return NextResponse.json({ ok: false, code: "db_error", message: targetErr.message }, { status: 500 });
  }
  if (!target) {
    return NextResponse.json({
      ok: false,
      code: "profile_not_found",
      message: "Perfil não encontrado. Não é possível classificar uma conta sem perfil.",
    }, { status: 404 });
  }

  // ── Update apenas account_type — role e auth intactos ─────────
  const { error: updateErr } = await admin
    .from("profiles")
    .update({
      account_type:  isNull ? null : account_type,
      updated_at:    new Date().toISOString(),
    } as Record<string, unknown>)
    .eq("id", id);

  if (updateErr) {
    return NextResponse.json({ ok: false, code: "db_error", message: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok:               true,
    id,
    previous_type:    (target as { account_type?: string | null }).account_type ?? null,
    new_type:         isNull ? null : account_type,
  });
}
