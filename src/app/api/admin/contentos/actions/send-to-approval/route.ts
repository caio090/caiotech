import { NextRequest, NextResponse } from "next/server";
import { requireAdminContentOSContext } from "@/lib/admin-contentos-api";
import { withMutationProtection } from "@/lib/workspaces/assert-not-preview";

export const POST = withMutationProtection(async function POST(req: NextRequest) {
  try {
    const ctx = await requireAdminContentOSContext();
    if (ctx instanceof NextResponse) return ctx;
    const { adminDb } = ctx;

    const body: unknown = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
    }

    const { content_id, client_id, due_date } = body as Record<string, unknown>;
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

    // Idempotency: return existing pending approval (without exposing token)
    const { data: existing } = await adminDb
      .from("approvals")
      .select("id")
      .eq("content_id", content_id)
      .eq("client_id", client_id)
      .eq("status", "aguardando")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ approval_id: existing.id, existed: true });
    }

    const dueAt =
      typeof due_date === "string" && due_date
        ? due_date
        : new Date(Date.now() + 48 * 3600 * 1000).toISOString();

    // Create approval first — only then update content status
    const { data: approval, error: approvalErr } = await adminDb
      .from("approvals")
      .insert({
        content_id,
        client_id,
        status: "aguardando",
        approval_sent_at: new Date().toISOString(),
        approval_due_at: dueAt,
      })
      .select("id")
      .single();

    if (approvalErr) {
      console.error("[send-to-approval] approval insert code:", approvalErr.code, "msg:", approvalErr.message);
      return NextResponse.json({ error: "Erro ao criar aprovação." }, { status: 500 });
    }

    // Update content status only after approval is confirmed created
    const laterStates = ["aprovado", "agendado", "publicado"];
    if (!laterStates.includes(item.status)) {
      const { error: updateErr } = await adminDb
        .from("content_items")
        .update({ status: "enviado_aprovacao" })
        .eq("id", content_id)
        .eq("client_id", client_id);

      if (updateErr) {
        // Approval exists but content status did not update — log the partial state
        console.error("[send-to-approval] content update failed after approval created. approval_id:", approval.id, "code:", updateErr.code);
      }
    }

    return NextResponse.json({ approval_id: approval.id, existed: false }, { status: 201 });
  } catch (e) {
    console.error("[send-to-approval]", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
});
