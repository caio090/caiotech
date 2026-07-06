import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient, createRequiredSupabaseAdminClient, hasSupabaseServiceRoleKey } from "@/lib/supabase/server";

const VALID_ACCOUNT_TYPES = new Set(["agency", "business", "professional", "interested"]);

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Payload inválido." }, { status: 400 });
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

  // Honeypot — bots preenchem campos ocultos
  if (body._hp) {
    return NextResponse.json({ ok: true, message: "Inscrição recebida." });
  }

  if (!name || name.length < 2) {
    return NextResponse.json({ ok: false, message: "Nome é obrigatório." }, { status: 400 });
  }
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ ok: false, message: "E-mail inválido." }, { status: 400 });
  }
  if (!VALID_ACCOUNT_TYPES.has(account_type)) {
    return NextResponse.json({ ok: false, message: "Tipo de conta inválido." }, { status: 400 });
  }

  // Usar service role para inserir e verificar duplicata
  if (!hasSupabaseServiceRoleKey()) {
    // Fallback: usar session client (insert público via RLS)
    try {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase
        .from("launch_waitlist")
        .insert({ name, email, phone, account_type, city, segment, interest,
          social_or_site: social, source, utm_source, utm_medium, utm_campaign });
      if (error?.message?.includes("already exists") || error?.code === "23505") {
        return NextResponse.json({ ok: true, message: "Você já está na lista. Vamos te avisar quando o acesso for liberado." });
      }
      if (error) throw error;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      if (msg.includes("does not exist") || msg.includes("42P01")) {
        return NextResponse.json({ ok: false, message: "A lista beta ainda não foi ativada no banco de dados. Rode o SQL 73 no Supabase." }, { status: 503 });
      }
      return NextResponse.json({ ok: false, message: "Erro ao registrar inscrição." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, message: "Inscrição recebida. Vamos te avisar quando o acesso beta for liberado." });
  }

  try {
    const admin = createRequiredSupabaseAdminClient();

    // Verificar duplicata por email
    const { data: existing } = await admin
      .from("launch_waitlist")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: true, message: "Você já está na lista. Vamos te avisar quando o acesso for liberado." });
    }

    const { error: insertErr } = await admin
      .from("launch_waitlist")
      .insert({ name, email, phone, account_type, city, segment, interest,
        social_or_site: social, source, utm_source, utm_medium, utm_campaign });

    if (insertErr) {
      if (insertErr.message?.includes("does not exist") || insertErr.code === "42P01") {
        return NextResponse.json({ ok: false, message: "A lista beta ainda não foi ativada. Rode o SQL 73 no Supabase." }, { status: 503 });
      }
      throw insertErr;
    }

    // Notificação para super_admin (try/catch para não quebrar se tabela não existir)
    try {
      const typeLabel = account_type === "agency" ? "Agência" :
                        account_type === "business" ? "Empresa" :
                        account_type === "professional" ? "Profissional" : "Interessado";
      await admin.from("platform_notifications").insert({
        type:  "launch_waitlist_signup",
        title: `Novo interessado no beta: ${name}`,
        body:  `${name} (${email}) entrou na lista beta como ${typeLabel}${city ? ` — ${city}` : ""}`,
      });
    } catch { /* silencioso se platform_notifications não existir */ }

  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ ok: false, message: `Erro ao registrar inscrição: ${msg}` }, { status: 500 });
  }

  return NextResponse.json({
    ok:      true,
    message: "Inscrição recebida. Vamos te avisar quando o acesso beta for liberado.",
  });
}
