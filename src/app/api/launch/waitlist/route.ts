import { NextResponse, type NextRequest } from "next/server";
import {
  createRequiredSupabaseAdminClient,
  hasSupabaseServiceRoleKey,
} from "@/lib/supabase/server";

const VALID_ACCOUNT_TYPES = new Set(["agency", "business", "professional", "interested"]);

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "invalid_json", message: "Payload inválido." }, { status: 400 });
  }

  // Honeypot — bots preenchem campos ocultos; responder ok sem inserir
  if (body._hp) {
    return NextResponse.json({ ok: true, duplicate: false, message: "Inscrição recebida." });
  }

  const name         = (body.name as string | undefined)?.trim() ?? "";
  const email        = (body.email as string | undefined)?.trim().toLowerCase() ?? "";
  const phone        = (body.phone as string | undefined)?.trim() || null;
  const account_type = (body.account_type as string | undefined) ?? "interested";
  const city         = (body.city as string | undefined)?.trim() || null;
  const segment      = (body.segment as string | undefined)?.trim() || null;
  const interest     = (body.interest as string | undefined)?.trim() || null;
  const social       = (body.social_or_site as string | undefined)?.trim() || null;
  const source       = (body.source as string | undefined)?.trim() || "website";
  const utm_source   = (body.utm_source as string | undefined) || null;
  const utm_medium   = (body.utm_medium as string | undefined) || null;
  const utm_campaign = (body.utm_campaign as string | undefined) || null;

  if (!name || name.length < 2) {
    return NextResponse.json({ ok: false, code: "validation_name", message: "Nome é obrigatório (mínimo 2 caracteres)." }, { status: 400 });
  }
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ ok: false, code: "validation_email", message: "E-mail inválido." }, { status: 400 });
  }
  if (!VALID_ACCOUNT_TYPES.has(account_type)) {
    return NextResponse.json({ ok: false, code: "validation_account_type", message: "Tipo de conta inválido." }, { status: 400 });
  }

  // Service role é obrigatório — sem fallback silencioso
  if (!hasSupabaseServiceRoleKey()) {
    return NextResponse.json({
      ok: false,
      code: "service_role_missing",
      message: "Serviço temporariamente indisponível. Tente novamente em instantes.",
    }, { status: 503 });
  }

  let admin: ReturnType<typeof createRequiredSupabaseAdminClient>;
  try {
    admin = createRequiredSupabaseAdminClient();
  } catch (e) {
    return NextResponse.json({
      ok: false,
      code: "admin_client_error",
      message: "Não foi possível conectar ao banco de dados.",
      debug: { error: e instanceof Error ? e.message : String(e) },
    }, { status: 500 });
  }

  // ── Checar duplicata por email ─────────────────────────────────────────────
  const { data: existing, error: dupErr } = await admin
    .from("launch_waitlist")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (dupErr) {
    // Se a tabela não existe, retornar mensagem clara
    if (dupErr.code === "42P01" || dupErr.message?.includes("does not exist")) {
      return NextResponse.json({
        ok: false,
        code: "table_missing",
        message: "A lista beta ainda não foi ativada no banco de dados. O administrador precisa rodar o SQL 73.",
      }, { status: 503 });
    }
    return NextResponse.json({
      ok: false,
      code: "waitlist_check_failed",
      message: "Não foi possível verificar sua inscrição. Tente novamente.",
      debug: { stage: "duplicate_check", supabaseCode: dupErr.code, supabaseMessage: dupErr.message },
    }, { status: 500 });
  }

  if (existing) {
    return NextResponse.json({
      ok: true,
      duplicate: true,
      id: (existing as { id: string }).id,
      message: "Você já está na lista. Vamos te avisar quando o acesso beta for liberado.",
    });
  }

  // ── Inserir ────────────────────────────────────────────────────────────────
  const { data: inserted, error: insertErr } = await admin
    .from("launch_waitlist")
    .insert({
      name, email, phone, account_type, city, segment, interest,
      social_or_site: social, source, utm_source, utm_medium, utm_campaign,
    })
    .select("id")
    .single();

  if (insertErr) {
    if (insertErr.code === "42P01" || insertErr.message?.includes("does not exist")) {
      return NextResponse.json({
        ok: false,
        code: "table_missing",
        message: "A lista beta ainda não foi ativada. O administrador precisa rodar o SQL 73.",
      }, { status: 503 });
    }
    if (insertErr.code === "23505") {
      // Unique constraint — duplicata capturada tarde
      return NextResponse.json({
        ok: true,
        duplicate: true,
        message: "Você já está na lista. Vamos te avisar quando o acesso beta for liberado.",
      });
    }
    return NextResponse.json({
      ok: false,
      code: "waitlist_insert_failed",
      message: "Não foi possível salvar sua inscrição agora. Tente novamente.",
      debug: {
        stage:           "insert",
        supabaseCode:    insertErr.code,
        supabaseMessage: insertErr.message,
        supabaseDetails: insertErr.details ?? null,
        supabaseHint:    insertErr.hint ?? null,
      },
    }, { status: 500 });
  }

  // ── Notificação interna (silenciosa se tabela não existir) ─────────────────
  try {
    const typeLabel =
      account_type === "agency"       ? "Agência" :
      account_type === "business"     ? "Empresa" :
      account_type === "professional" ? "Profissional" : "Interessado";
    await admin.from("platform_notifications").insert({
      type:  "launch_waitlist_signup",
      title: `Novo interessado no beta: ${name}`,
      body:  `${name} (${email}) — ${typeLabel}${city ? ` — ${city}` : ""}`,
    });
  } catch { /* silencioso */ }

  return NextResponse.json({
    ok:        true,
    duplicate: false,
    id:        (inserted as { id: string }).id,
    message:   "Inscrição recebida! Vamos te avisar quando o acesso beta for liberado.",
  });
}
