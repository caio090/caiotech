import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createSupabaseAdminClient, hasSupabaseServiceRoleKey } from "@/lib/supabase/server";

const ALLOWED_ROLES = new Set(["admin", "super_admin", "agency"]);

// GET /api/admin/reports/uploads?client_id=...
// Lista relatórios manuais de um cliente.
export async function GET(request: NextRequest) {
  const clientId = new URL(request.url).searchParams.get("client_id");
  if (!clientId) return NextResponse.json({ ok: false, reason: "missing_client_id" }, { status: 400 });

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (!ALLOWED_ROLES.has(profile?.role ?? "")) {
      return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
    }

    let result = await supabase
      .from("client_report_uploads")
      .select("id, client_id, report_type, period_start, period_end, file_name, file_type, upload_status, extraction_status, ai_summary, notes, created_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (result.error?.code === "42P01") {
      return NextResponse.json({ ok: true, uploads: [], sql_pending: true });
    }

    if (result.error && hasSupabaseServiceRoleKey()) {
      try {
        const adminDb = createSupabaseAdminClient();
        const r = await adminDb
          .from("client_report_uploads")
          .select("id, client_id, report_type, period_start, period_end, file_name, file_type, upload_status, extraction_status, ai_summary, notes, created_at")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false })
          .limit(50);
        if (!r.error) result = r as unknown as typeof result;
      } catch { /* mantém resultado da sessão */ }
    }

    if (result.error) {
      return NextResponse.json({ ok: false, reason: "db_error", message: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, uploads: result.data ?? [] });
  } catch {
    return NextResponse.json({ ok: false, reason: "internal_error" }, { status: 500 });
  }
}

// POST /api/admin/reports/uploads
// Registra metadados de um relatório manual. O arquivo deve ser enviado
// diretamente ao Supabase Storage pelo frontend antes de chamar este endpoint.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (!ALLOWED_ROLES.has(profile?.role ?? "")) {
      return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
    }

    let body: {
      client_id: string;
      report_type?: string;
      period_start?: string;
      period_end?: string;
      file_name?: string;
      file_url?: string;
      file_type?: string;
      notes?: string;
      data_source_id?: string;
    };
    try { body = await request.json() as typeof body; }
    catch { return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 }); }

    if (!body.client_id) {
      return NextResponse.json({ ok: false, reason: "missing_client_id" }, { status: 400 });
    }

    const payload = {
      client_id:        body.client_id,
      data_source_id:   body.data_source_id ?? null,
      report_type:      body.report_type ?? "general",
      period_start:     body.period_start ?? null,
      period_end:       body.period_end ?? null,
      file_name:        body.file_name ?? null,
      file_url:         body.file_url ?? null,
      file_type:        body.file_type ?? null,
      notes:            body.notes ?? null,
      upload_status:    "uploaded" as const,
      extraction_status: "pending" as const,
      created_by:       user.id,
    };

    let { data, error } = await supabase
      .from("client_report_uploads")
      .insert(payload)
      .select("id, report_type, upload_status, extraction_status")
      .single();

    if (error && hasSupabaseServiceRoleKey()) {
      try {
        const adminDb = createSupabaseAdminClient();
        const r = await adminDb
          .from("client_report_uploads")
          .insert(payload)
          .select("id, report_type, upload_status, extraction_status")
          .single();
        data = r.data; error = r.error;
      } catch { /* mantém erro original */ }
    }

    if (error?.code === "42P01") {
      return NextResponse.json({
        ok: false, reason: "sql_pending",
        message: "Tabela client_report_uploads não existe. Rode o SQL 64 no Supabase.",
      });
    }
    if (error) {
      return NextResponse.json({ ok: false, reason: "db_error", message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, upload: data });
  } catch {
    return NextResponse.json({ ok: false, reason: "internal_error" }, { status: 500 });
  }
}
