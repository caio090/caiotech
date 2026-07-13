// POST /api/contato
// Recebe formulário de contato, registra como lead e retorna confirmação.
// Não envia e-mail externo nesta versão — infraestrutura de e-mail pendente.
// Rate limiting básico por IP (via header x-forwarded-for).

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient, hasSupabaseServiceRoleKey } from "@/lib/supabase/server";

interface ContactBody {
  name: string;
  company?: string;
  email: string;
  whatsapp?: string;
  subject: string;
  message: string;
  perfil: string;
  consent: boolean;
  _hp?: string; // honeypot
}

const RATE_LIMIT_MAP = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 3;

function getRateLimitKey(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function checkRateLimit(key: string): boolean {
  const count = RATE_LIMIT_MAP.get(key) ?? 0;
  if (count >= RATE_LIMIT_MAX) {
    return false;
  }
  // Reset entries older than window (lazy cleanup)
  if (RATE_LIMIT_MAP.size > 1000) RATE_LIMIT_MAP.clear();
  RATE_LIMIT_MAP.set(key, count + 1);
  setTimeout(() => RATE_LIMIT_MAP.delete(key), RATE_LIMIT_WINDOW_MS);
  return true;
}

export async function POST(request: NextRequest) {
  const rateLimitKey = getRateLimitKey(request);
  if (!checkRateLimit(rateLimitKey)) {
    return NextResponse.json({ ok: false, reason: "rate_limited", message: "Muitas tentativas. Aguarde um momento." }, { status: 429 });
  }

  let body: ContactBody;
  try { body = await request.json() as ContactBody; }
  catch { return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 }); }

  // Honeypot check
  if (body._hp) {
    return NextResponse.json({ ok: true }); // silently accept bots
  }

  // Validation
  if (!body.name?.trim() || !body.email?.trim() || !body.subject?.trim() || !body.message?.trim()) {
    return NextResponse.json({ ok: false, reason: "missing_fields", message: "Preencha todos os campos obrigatórios." }, { status: 422 });
  }
  if (!body.email.includes("@")) {
    return NextResponse.json({ ok: false, reason: "invalid_email", message: "E-mail inválido." }, { status: 422 });
  }
  if (!body.consent) {
    return NextResponse.json({ ok: false, reason: "consent_required", message: "É necessário aceitar os termos." }, { status: 422 });
  }

  if (hasSupabaseServiceRoleKey()) {
    try {
      const db = createSupabaseAdminClient();

      // Try to insert into launch_waitlist or a contacts-specific table when available.
      // For V1, we record in launch_waitlist with type=contato.
      await db.from("launch_waitlist").upsert({
        email: body.email.toLowerCase().trim(),
        name:  body.name.trim(),
        company: body.company?.trim() ?? null,
        whatsapp: body.whatsapp?.trim() ?? null,
        source: "contato_form",
        metadata: {
          subject: body.subject,
          message: body.message,
          perfil: body.perfil,
          received_at: new Date().toISOString(),
        },
        created_at: new Date().toISOString(),
      }, { onConflict: "email", ignoreDuplicates: false });
    } catch {
      // Log failure without exposing to user — the UX shows success regardless
      console.error("[contato] failed to record lead");
    }
  }

  return NextResponse.json({
    ok: true,
    message: "Mensagem recebida com sucesso. Retornaremos em breve.",
  });
}
