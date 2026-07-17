import { NextRequest, NextResponse } from "next/server";
import {
  requireAdminContentOSContext,
  validateAdminClient,
} from "@/lib/admin-contentos-api";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAdminContentOSContext();
    if (ctx instanceof NextResponse) return ctx;
    const { adminDb } = ctx;

    const body: unknown = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
    }

    const { client_id, guided_create } = body as Record<string, unknown>;
    if (typeof client_id !== "string" || !client_id) {
      return NextResponse.json({ error: "client_id obrigatório." }, { status: 400 });
    }

    const valid = await validateAdminClient(adminDb, client_id);
    if (!valid) {
      return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    }

    const gc =
      typeof guided_create === "object" && guided_create !== null
        ? (guided_create as Record<string, unknown>)
        : {};
    const brief = (gc.brief as Record<string, string> | undefined) ?? {};
    const content = (gc.content as Record<string, string> | undefined) ?? {};

    const { data, error } = await adminDb
      .from("content_items")
      .insert({
        client_id,
        title: String(content.title || brief.objective || "Rascunho sem título").slice(0, 200),
        type: String(brief.format || "").slice(0, 100) || null,
        objective: String(brief.objective || "").slice(0, 500) || null,
        caption: String(content.caption || "").slice(0, 1000) || null,
        script: String(content.script || "").slice(0, 5000) || null,
        status: "ideia",
        metadata: {
          guided_create: {
            schema_version: 1,
            source: "rec_os_guided_create",
            ...gc,
            updated_at: new Date().toISOString(),
          },
        },
      })
      .select("id, client_id, status, created_at")
      .single();

    if (error) {
      console.error("[drafts POST] db error code:", error.code, "msg:", error.message, "client_id:", client_id);
      return NextResponse.json({ error: "Erro ao criar rascunho." }, { status: 500 });
    }

    return NextResponse.json(
      {
        id: data.id,
        client_id: data.client_id,
        status: data.status,
        created_at: data.created_at,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("[drafts POST] unexpected:", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
