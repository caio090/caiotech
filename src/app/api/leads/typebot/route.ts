import { NextResponse, type NextRequest } from "next/server";
import {
  createRequiredSupabaseAdminClient,
  hasSupabaseServiceRoleKey,
} from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  if (!hasSupabaseServiceRoleKey()) {
    return NextResponse.json({ ok: false, code: "service_role_missing" }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, code: "invalid_payload" }, { status: 400 }); }

  const name    = typeof body.name  === "string" ? body.name.trim()  : "";
  const email   = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone   = typeof body.phone === "string" ? body.phone.trim() : null;
  const account_type = typeof body.account_type === "string" ? body.account_type.trim() : null;
  const interest     = typeof body.interest     === "string" ? body.interest.trim()     : null;
  const city         = typeof body.city         === "string" ? body.city.trim()         : null;
  const source       = "typebot";

  if (!name || !email) {
    return NextResponse.json({ ok: false, code: "missing_required_fields", fields: { name: !name, email: !email } }, { status: 400 });
  }

  const admin = createRequiredSupabaseAdminClient();

  const { data: existing } = await admin
    .from("launch_waitlist")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true, id: existing.id, message: "Você já está na lista de espera." });
  }

  const { data: inserted, error } = await admin
    .from("launch_waitlist")
    .insert({ name, email, phone, account_type, interest, city, source, status: "new" })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true, message: "Você já está na lista de espera." });
    }
    return NextResponse.json(
      { ok: false, code: "db_error", debug: { supabaseCode: error.code, supabaseMessage: error.message, table: "launch_waitlist" } },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, duplicate: false, id: inserted.id, message: "Inscrição recebida!" });
}
