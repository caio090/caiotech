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

    const { content_id, client_id, due_date } = body as Record<string, unknown>;
    if (typeof content_id !== "string" || typeof client_id !== "string") {
      return NextResponse.json({ error: "content_id e client_id são obrigatórios." }, { status: 400 });
    }

    // Confirm content belongs to client
    const { data: item } = await supabase
      .from("content_items").select("id, title, status").eq("id", content_id).eq("client_id", client_id).single();
    if (!item) return NextResponse.json({ error: "Conteúdo não encontrado." }, { status: 404 });

    // Idempotency: check for existing pending approval
    const { data: existing } = await supabase
      .from("approvals")
      .select("id, public_token")
      .eq("content_id", content_id)
      .eq("client_id", client_id)
      .eq("status", "aguardando")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ approval_id: existing.id, token: existing.public_token, existed: true });
    }

    const dueAt = typeof due_date === "string" && due_date
      ? due_date
      : new Date(Date.now() + 48 * 3600 * 1000).toISOString();

    const { data: approval, error: approvalErr } = await supabase
      .from("approvals")
      .insert({
        content_id,
        client_id,
        status: "aguardando",
        approval_sent_at: new Date().toISOString(),
        approval_due_at: dueAt,
      })
      .select("id, public_token")
      .single();

    if (approvalErr) {
      console.error("[send-to-approval] approval insert:", approvalErr.message);
      return NextResponse.json({ error: "Erro ao criar aprovação." }, { status: 500 });
    }

    // Update content status — only if not already in a later state
    const laterStates = ["aprovado", "agendado", "publicado"];
    if (!laterStates.includes(item.status)) {
      await supabase.from("content_items").update({ status: "enviado_aprovacao" }).eq("id", content_id).eq("client_id", client_id);
    }

    return NextResponse.json({ approval_id: approval.id, token: approval.public_token, existed: false }, { status: 201 });
  } catch (e) {
    console.error("[send-to-approval]", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
