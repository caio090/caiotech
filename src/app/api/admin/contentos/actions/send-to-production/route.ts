import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const body: unknown = await req.json();
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Payload inválido." }, { status: 400 });

    const { content_id, client_id } = body as Record<string, unknown>;
    if (typeof content_id !== "string" || typeof client_id !== "string") {
      return NextResponse.json({ error: "content_id e client_id são obrigatórios." }, { status: 400 });
    }

    // Confirm content belongs to client
    const { data: item } = await supabase
      .from("content_items").select("id, title, status").eq("id", content_id).eq("client_id", client_id).single();
    if (!item) return NextResponse.json({ error: "Conteúdo não encontrado." }, { status: 404 });

    // Idempotency: check for existing active task
    const { data: existing } = await supabase
      .from("operational_tasks")
      .select("id")
      .eq("content_item_id", content_id)
      .eq("client_id", client_id)
      .not("status", "eq", "concluido")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ task_id: existing.id, existed: true });
    }

    const { data: task, error: taskErr } = await supabase
      .from("operational_tasks")
      .insert({
        client_id,
        content_item_id: content_id,
        title: item.title,
        status: "briefing",
        task_type: "content",
        department: "conteudo",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (taskErr) {
      console.error("[send-to-production] task insert:", taskErr.message);
      return NextResponse.json({ error: "Erro ao criar tarefa." }, { status: 500 });
    }

    // Update content status
    await supabase.from("content_items").update({ status: "producao" }).eq("id", content_id).eq("client_id", client_id);

    return NextResponse.json({ task_id: task.id, existed: false }, { status: 201 });
  } catch (e) {
    console.error("[send-to-production]", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
