import { NextResponse, type NextRequest } from "next/server";
import {
  createRequiredSupabaseAdminClient,
  hasSupabaseServiceRoleKey,
} from "@/lib/supabase/server";
import {
  normalizeLeadPayload,
  computeLeadScore,
} from "@/lib/leads/normalize-lead-payload";

// ── Webhook secret (opcional) ─────────────────────────────────
// Se LOKAT_TYPEBOT_WEBHOOK_SECRET estiver configurado na Vercel,
// a rota exige o header x-lokat-webhook-secret com o mesmo valor.
// Sem a variável, a rota funciona sem autenticação (dev/staging).
function validateSecret(req: NextRequest): boolean {
  const secret = process.env.LOKAT_TYPEBOT_WEBHOOK_SECRET;
  if (!secret) return true; // sem variável = sem bloqueio
  const header = req.headers.get("x-lokat-webhook-secret");
  return header === secret;
}

export async function POST(req: NextRequest) {
  // ── 1. Service role obrigatório ────────────────────────────
  if (!hasSupabaseServiceRoleKey()) {
    return NextResponse.json(
      { ok: false, error: "server_error", message: "Configuração de banco ausente." },
      { status: 503 },
    );
  }

  // ── 2. Validação de secret ─────────────────────────────────
  if (!validateSecret(req)) {
    return NextResponse.json(
      { ok: false, error: "unauthorized", message: "Webhook secret inválido." },
      { status: 401 },
    );
  }

  // ── 3. Parse do payload ────────────────────────────────────
  let raw: Record<string, unknown>;
  try {
    raw = await req.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "validation_error", message: "JSON inválido." },
      { status: 400 },
    );
  }

  // ── 4. Normalização ────────────────────────────────────────
  const lead = normalizeLeadPayload(raw, { source: "typebot", channel: "external_bot" });

  // ── 5. Validação mínima: precisa de email OU whatsapp/phone ─
  const hasContact = lead.email || lead.whatsapp || lead.phone;
  if (!hasContact) {
    return NextResponse.json(
      {
        ok: false,
        error: "validation_error",
        message: "Obrigatório pelo menos um contato: email, whatsapp ou phone.",
      },
      { status: 400 },
    );
  }

  // ── 6. Lead score ──────────────────────────────────────────
  const lead_score = computeLeadScore(lead);

  const admin = createRequiredSupabaseAdminClient();

  // ── 7. Dedup por typebot_result_id ─────────────────────────
  if (lead.typebot_result_id) {
    const { data: byResult } = await admin
      .from("launch_waitlist")
      .select("id")
      .eq("typebot_result_id", lead.typebot_result_id)
      .maybeSingle();

    if (byResult) {
      return NextResponse.json({
        ok: true,
        lead_id: byResult.id,
        source: "typebot",
        status: "new",
        duplicate: true,
        message: "Lead já registrado para esta sessão do Typebot.",
      });
    }
  }

  // ── 8. Dedup por email ─────────────────────────────────────
  if (lead.email) {
    const { data: byEmail } = await admin
      .from("launch_waitlist")
      .select("id, status")
      .eq("email", lead.email)
      .maybeSingle();

    if (byEmail) {
      return NextResponse.json({
        ok: true,
        lead_id: byEmail.id,
        source: "typebot",
        status: byEmail.status ?? "new",
        duplicate: true,
        message: "Você já está na lista de espera.",
      });
    }
  }

  // ── 9. Montagem do registro ────────────────────────────────
  // Colunas que existem desde SQL 73/75 → sempre enviadas
  // Colunas adicionadas em SQL 76 → guardadas em metadata se ainda não existirem
  const coreInsert = {
    name:          lead.name   || null,
    email:         lead.email  || null,
    phone:         lead.phone,
    account_type:  lead.account_type,
    city:          lead.city,
    segment:       lead.segment,
    interest:      lead.interest,
    source:        "typebot",
    status:        "new",
    utm_source:    lead.utm_source,
    utm_medium:    lead.utm_medium,
    utm_campaign:  lead.utm_campaign,
  };

  // Campos do SQL 76 (podem não existir em produção até a migration ser rodada)
  const extendedFields = {
    whatsapp:           lead.whatsapp,
    business_name:      lead.business_name,
    business_type:      lead.business_type,
    main_problem:       lead.main_problem,
    channel:            "external_bot",
    stage:              "captured",
    lead_score,
    utm_content:        lead.utm_content,
    utm_term:           lead.utm_term,
    referrer:           lead.referrer,
    landing_path:       lead.landing_path,
    typebot_session_id: lead.typebot_session_id,
    typebot_result_id:  lead.typebot_result_id,
    raw_payload:        raw,
    metadata: {
      normalized_at: new Date().toISOString(),
      lead_score,
    },
  };

  // Tenta inserir com campos estendidos; se colunas não existirem, cai no fallback
  const { data: inserted, error: insertErr } = await admin
    .from("launch_waitlist")
    .insert({ ...coreInsert, ...extendedFields })
    .select("id, status")
    .single();

  if (insertErr) {
    // Duplicata por unique constraint
    if (insertErr.code === "23505") {
      return NextResponse.json({
        ok: true,
        lead_id: null,
        source: "typebot",
        status: "new",
        duplicate: true,
        message: "Você já está na lista de espera.",
      });
    }

    // Coluna não existe (SQL 76 ainda não rodado) → fallback sem campos estendidos
    if (insertErr.code === "42703" || insertErr.message?.includes("column") || insertErr.message?.includes("does not exist")) {
      const { data: fallback, error: fallbackErr } = await admin
        .from("launch_waitlist")
        .insert(coreInsert)
        .select("id, status")
        .single();

      if (fallbackErr) {
        if (fallbackErr.code === "23505") {
          return NextResponse.json({
            ok: true,
            lead_id: null,
            source: "typebot",
            status: "new",
            duplicate: true,
            message: "Você já está na lista de espera.",
          });
        }
        return NextResponse.json(
          {
            ok: false,
            error: "server_error",
            message: "Erro ao salvar lead.",
            debug: { code: fallbackErr.code, msg: fallbackErr.message, table: "launch_waitlist" },
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        ok: true,
        lead_id: fallback!.id,
        source: "typebot",
        status: "new",
        duplicate: false,
        _note: "SQL 76 pendente — campos estendidos não salvos",
      });
    }

    return NextResponse.json(
      {
        ok: false,
        error: "server_error",
        message: "Erro ao salvar lead.",
        debug: { code: insertErr.code, msg: insertErr.message, table: "launch_waitlist" },
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    lead_id: inserted!.id,
    source: "typebot",
    status: "new",
    duplicate: false,
  });
}
