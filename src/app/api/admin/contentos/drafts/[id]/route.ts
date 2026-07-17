import { NextRequest, NextResponse } from "next/server";
import { requireAdminContentOSContext, type AdminDb } from "@/lib/admin-contentos-api";

const ALLOWED_STATUS = ["ideia", "briefing", "roteiro", "revisao_interna"] as const;

async function loadDraft(adminDb: AdminDb, id: string, clientId: string) {
  const { data } = await adminDb
    .from("content_items")
    .select(
      "id, client_id, title, type, objective, caption, script, status, scheduled_date, metadata, created_at"
    )
    .eq("id", id)
    .eq("client_id", clientId)
    .single();
  return data ?? null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await requireAdminContentOSContext();
    if (ctx instanceof NextResponse) return ctx;
    const { adminDb } = ctx;

    const url = new URL(req.url);
    const clientId = url.searchParams.get("client_id");
    if (!clientId) {
      return NextResponse.json({ error: "client_id obrigatório." }, { status: 400 });
    }

    const item = await loadDraft(adminDb, id, clientId);
    if (!item) {
      return NextResponse.json({ error: "Rascunho não encontrado." }, { status: 404 });
    }

    return NextResponse.json({
      id: item.id,
      client_id: item.client_id,
      status: item.status,
      created_at: item.created_at,
      guided_create:
        (item.metadata as Record<string, unknown> | null)?.guided_create ?? null,
    });
  } catch (e) {
    console.error("[drafts GET]", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await requireAdminContentOSContext();
    if (ctx instanceof NextResponse) return ctx;
    const { adminDb } = ctx;

    const body: unknown = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
    }

    const {
      client_id,
      guided_create,
      status: requestedStatus,
      scheduled_date,
    } = body as Record<string, unknown>;

    if (typeof client_id !== "string" || !client_id) {
      return NextResponse.json({ error: "client_id obrigatório." }, { status: 400 });
    }

    const item = await loadDraft(adminDb, id, client_id);
    if (!item) {
      return NextResponse.json(
        { error: "Rascunho não encontrado ou cliente incorreto." },
        { status: 404 }
      );
    }

    const existingMeta =
      typeof item.metadata === "object" && item.metadata !== null
        ? (item.metadata as Record<string, unknown>)
        : {};
    const gc =
      typeof guided_create === "object" && guided_create !== null
        ? (guided_create as Record<string, unknown>)
        : {};

    const updatedMeta = {
      ...existingMeta,
      guided_create: {
        schema_version: 1,
        source: "rec_os_guided_create",
        ...gc,
        updated_at: new Date().toISOString(),
      },
    };

    const brief = (gc.brief as Record<string, string> | undefined) ?? {};
    const content = (gc.content as Record<string, string> | undefined) ?? {};

    let newStatus = item.status;
    if (
      typeof requestedStatus === "string" &&
      (ALLOWED_STATUS as readonly string[]).includes(requestedStatus)
    ) {
      newStatus = requestedStatus;
    }

    const patch: Record<string, unknown> = {
      metadata: updatedMeta,
      status: newStatus,
    };

    const title = String(
      content.title || brief.objective || item.title || "Rascunho sem título"
    ).slice(0, 200);
    if (title) patch.title = title;
    if (brief.objective) patch.objective = String(brief.objective).slice(0, 500);
    if (content.caption) patch.caption = String(content.caption).slice(0, 1000);
    if (content.script) patch.script = String(content.script).slice(0, 5000);
    if (brief.format) patch.type = String(brief.format).slice(0, 100);
    if (typeof scheduled_date === "string" && scheduled_date) {
      patch.scheduled_date = scheduled_date;
    }

    const { data: updated, error } = await adminDb
      .from("content_items")
      .update(patch)
      .eq("id", id)
      .eq("client_id", client_id)
      .select("id, client_id, status")
      .single();

    if (error) {
      console.error("[drafts PATCH] db error code:", error.code, "msg:", error.message);
      return NextResponse.json({ error: "Erro ao atualizar rascunho." }, { status: 500 });
    }

    return NextResponse.json({
      id: updated.id,
      client_id: updated.client_id,
      status: updated.status,
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[drafts PATCH]", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
