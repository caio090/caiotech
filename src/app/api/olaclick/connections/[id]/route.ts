import { NextRequest, NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  createSupabaseAdminClient,
  hasSupabaseServiceRoleKey,
} from "@/lib/supabase/server";

const ALLOWED_ROLES = new Set(["admin", "super_admin", "agency"]);

// PATCH /api/olaclick/connections/[id]
// Edita uma conexão Cardápio Digital existente sem criar duplicata.
// Se o token vier vazio, preserva o token atual.
// Se o token vier preenchido, atualiza access_token e token_last_four.
// Nunca retorna access_token.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ ok: false, reason: "missing_id" }, { status: 400 });

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (!ALLOWED_ROLES.has(profile?.role ?? "")) {
      return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
    }

    let body: {
      connection_name?: string;
      access_token?: string;   // vazio = preserva atual; preenchido = atualiza
      api_base_url?: string | null;
      notes?: string | null;
    };
    try { body = await request.json() as typeof body; }
    catch { return NextResponse.json({ ok: false, reason: "invalid_body" }, { status: 400 }); }

    // ── Verifica que a conexão existe ────────────────────────────
    const findResult = await supabase
      .from("olaclick_connections")
      .select("id, client_id, connection_name, token_last_four, api_base_url, notes, provider")
      .eq("id", id)
      .maybeSingle();

    const existing = (findResult.data ?? null) as {
      id: string; client_id: string; connection_name: string;
      token_last_four: string | null; api_base_url: string | null;
      notes: string | null; provider: string;
    } | null;

    if (!existing) {
      return NextResponse.json({ ok: false, reason: "not_found", message: "Conexão não encontrada." }, { status: 404 });
    }

    // ── Monta payload de atualização ─────────────────────────────
    const newToken = body.access_token?.trim() ?? "";

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.connection_name !== undefined) {
      updatePayload["connection_name"] = body.connection_name.trim() || existing.connection_name;
    }

    if (body.notes !== undefined) {
      updatePayload["notes"] = body.notes ?? null;
    }

    // api_base_url: null = limpa (usa preset do provider); string = personaliza
    if (body.api_base_url !== undefined) {
      updatePayload["api_base_url"] = body.api_base_url?.trim() || null;
    }

    // Token: só atualiza se vier preenchido
    if (newToken.length > 0) {
      updatePayload["access_token"]    = newToken;
      updatePayload["token_last_four"] = newToken.length >= 4 ? newToken.slice(-4) : "****";
    }

    // ── Atualiza via session client primeiro ─────────────────────
    let { data: updatedRow, error: updateError } = await supabase
      .from("olaclick_connections")
      .update(updatePayload)
      .eq("id", id)
      .select("id, client_id, provider, connection_name, token_last_four, api_base_url, status, notes, updated_at")
      .single();

    if (updateError && hasSupabaseServiceRoleKey()) {
      try {
        const adminDb = createSupabaseAdminClient();
        const r = await adminDb
          .from("olaclick_connections")
          .update(updatePayload)
          .eq("id", id)
          .select("id, client_id, provider, connection_name, token_last_four, api_base_url, status, notes, updated_at")
          .single();
        updatedRow  = r.data;
        updateError = r.error;
      } catch { /* mantém erro original */ }
    }

    if (updateError) {
      return NextResponse.json({
        ok:      false,
        reason:  "db_error",
        message: updateError.message,
      }, { status: 500 });
    }

    const row = updatedRow as Record<string, unknown>;

    return NextResponse.json({
      ok: true,
      connection: {
        id:              row["id"],
        client_id:       row["client_id"],
        provider:        row["provider"],
        connection_name: row["connection_name"],
        token_last_four: row["token_last_four"],
        api_base_url:    row["api_base_url"],
        status:          row["status"],
        notes:           row["notes"],
        updated_at:      row["updated_at"],
        // token_updated: informa se o token foi trocado (sem expor o valor)
        token_updated:   newToken.length > 0,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "internal_error" }, { status: 500 });
  }
}
