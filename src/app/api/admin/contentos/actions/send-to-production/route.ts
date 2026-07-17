import { NextRequest, NextResponse } from "next/server";
import { requireAdminContentOSContext } from "@/lib/admin-contentos-api";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAdminContentOSContext();
    if (ctx instanceof NextResponse) return ctx;
    const { user, adminDb } = ctx;

    const body: unknown = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
    }

    const { content_id, client_id } = body as Record<string, unknown>;
    if (typeof content_id !== "string" || typeof client_id !== "string") {
      return NextResponse.json(
        { error: "content_id e client_id são obrigatórios." },
        { status: 400 }
      );
    }

    // Confirm content belongs to this client
    const { data: item } = await adminDb
      .from("content_items")
      .select("id, title, status")
      .eq("id", content_id)
      .eq("client_id", client_id)
      .single();
    if (!item) {
      return NextResponse.json({ error: "Conteúdo não encontrado." }, { status: 404 });
    }

    // Idempotency: return existing active task
    const { data: existing } = await adminDb
      .from("operational_tasks")
      .select("id")
      .eq("content_item_id", content_id)
      .eq("client_id", client_id)
      .not("status", "eq", "concluido")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ task_id: existing.id, existed: true });
    }

    // Create task first — only then update content status
    const { data: task, error: taskErr } = await adminDb
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
      console.error("[send-to-production] task insert code:", taskErr.code, "msg:", taskErr.message);
      return NextResponse.json({ error: "Erro ao criar tarefa." }, { status: 500 });
    }

    // Update content status only after task is confirmed created
    const { error: updateErr } = await adminDb
      .from("content_items")
      .update({ status: "producao" })
      .eq("id", content_id)
      .eq("client_id", client_id);

    if (updateErr) {
      // Task exists but content status did not update — log the partial state
      console.error("[send-to-production] content update failed after task created. task_id:", task.id, "code:", updateErr.code);
    }

    return NextResponse.json({ task_id: task.id, existed: false }, { status: 201 });
  } catch (e) {
    console.error("[send-to-production]", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
