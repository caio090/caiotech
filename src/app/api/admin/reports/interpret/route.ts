import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { withMutationProtection } from "@/lib/workspaces/assert-not-preview";

const ALLOWED_ROLES = new Set(["admin", "super_admin", "agency"]);

// POST /api/admin/reports/interpret
// Dispara interpretação de um relatório por IA.
// Por enquanto retorna status claro quando IA não está configurada.
// Nunca inventa dados. Nunca marca como processed sem interpretação real.
export const POST = withMutationProtection(async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (!ALLOWED_ROLES.has(profile?.role ?? "")) {
      return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
    }

    let body: { upload_id?: string; client_id?: string };
    try { body = await request.json() as typeof body; }
    catch { return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 }); }

    const { upload_id, client_id } = body;
    if (!upload_id || !client_id) {
      return NextResponse.json({
        ok: false, reason: "missing_fields",
        message: "upload_id e client_id são obrigatórios.",
      }, { status: 400 });
    }

    // Busca o upload
    const { data: upload, error: uploadErr } = await supabase
      .from("client_report_uploads")
      .select("id, client_id, report_type, file_name, file_type, extraction_status, raw_text")
      .eq("id", upload_id)
      .eq("client_id", client_id)
      .maybeSingle();

    if (uploadErr?.code === "42P01") {
      return NextResponse.json({
        ok: false, reason: "sql_pending",
        message: "Tabela client_report_uploads não existe. Rode o SQL 64 no Supabase.",
      });
    }
    if (!upload) {
      return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
    }

    if (upload.extraction_status === "processed") {
      return NextResponse.json({
        ok: true, already_processed: true,
        message: "Este relatório já foi interpretado.",
      });
    }

    // Verifica se IA está disponível no projeto
    const hasOpenAI = Boolean(process.env.OPENAI_API_KEY?.trim());
    if (!hasOpenAI) {
      // Marca como manual_review — não inventa dados
      await supabase
        .from("client_report_uploads")
        .update({ extraction_status: "manual_review" })
        .eq("id", upload_id);

      return NextResponse.json({
        ok: false,
        reason: "ai_not_configured",
        message: "Interpretação automática não configurada. O relatório foi marcado para revisão manual.",
        extraction_status: "manual_review",
      });
    }

    // IA disponível — marca como processando
    await supabase
      .from("client_report_uploads")
      .update({ extraction_status: "processing" })
      .eq("id", upload_id);

    // TODO: implementar chamada real à IA quando endpoint for definido.
    // Não processar agora para não criar dados fictícios.
    await supabase
      .from("client_report_uploads")
      .update({ extraction_status: "pending" })
      .eq("id", upload_id);

    return NextResponse.json({
      ok: false,
      reason: "ai_not_implemented",
      message: "Interpretação por IA ainda não implementada. Estrutura pronta para receber o endpoint.",
      extraction_status: "pending",
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "internal_error" }, { status: 500 });
  }
});
