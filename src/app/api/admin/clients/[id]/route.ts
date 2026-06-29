import { NextResponse } from "next/server";
import { createServerSupabaseClient, createSupabaseAdminClient, hasSupabaseServiceRoleKey } from "@/lib/supabase/server";

const CLIENT_MANAGER_ROLES = new Set(["admin", "super_admin", "agency"]);
const CLIENT_DELETE_ROLES = new Set(["admin", "super_admin"]);
const CLIENT_WRITE_FRIENDLY_ERROR =
  "Nao foi possivel atualizar o cliente. Verifique permissoes do banco ou variavel SUPABASE_SERVICE_ROLE_KEY na Vercel.";

function isMissingColumnError(error: { code?: string; message?: string } | null) {
  const text = error?.message?.toLowerCase() ?? "";
  return error?.code === "PGRST204" || text.includes("could not find") || text.includes("column");
}

// GET /api/admin/clients/[id] — returns company_name for breadcrumb sync
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    const { data } = await supabase
      .from("clients")
      .select("id, company_name")
      .eq("id", id)
      .neq("status", "archived")
      .maybeSingle();
    if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ id: data.id, company_name: data.company_name });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// PATCH /api/admin/clients/[id]
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const body = await req.json() as Record<string, unknown>;
    const allowed = ["company_name", "responsible_name", "email", "phone", "segment", "status"];
    const update = Object.fromEntries(
      Object.entries(body).filter(([k]) => allowed.includes(k))
    );

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!CLIENT_MANAGER_ROLES.has(profile?.role ?? "")) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const serviceRolePresent = hasSupabaseServiceRoleKey();
    const admin = createSupabaseAdminClient();
    const db = admin ?? supabase;
    const { error } = await db
      .from("clients")
      .update(update)
      .eq("id", id);

    if (error) {
      console.error("[api/admin/clients PATCH] erro ao atualizar cliente", {
        clientId: id,
        role: profile?.role ?? null,
        serviceRolePresent,
        supabaseError: error,
      });
      return NextResponse.json({ error: CLIENT_WRITE_FRIENDLY_ERROR, technical: error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// DELETE /api/admin/clients/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!CLIENT_DELETE_ROLES.has(profile?.role ?? "")) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const serviceRolePresent = hasSupabaseServiceRoleKey();
    const admin = createSupabaseAdminClient();
    const db = admin ?? supabase;
    const deletedAt = new Date().toISOString();

    let result = await db
      .from("clients")
      .update({ status: "archived", deleted_at: deletedAt, archived_at: deletedAt })
      .eq("id", id);

    if (result.error && isMissingColumnError(result.error)) {
      result = await db
        .from("clients")
        .update({ status: "archived" })
        .eq("id", id);
    }

    if (result.error && result.error.code === "23514") {
      result = await db
        .from("clients")
        .update({ status: "inactive", deleted_at: deletedAt, archived_at: deletedAt })
        .eq("id", id);

      if (result.error && isMissingColumnError(result.error)) {
        result = await db
          .from("clients")
          .update({ status: "inactive" })
          .eq("id", id);
      }
    }

    if (result.error && result.error.code === "23514") {
      result = await db
        .from("clients")
        .update({ status: "pausado", deleted_at: deletedAt, archived_at: deletedAt })
        .eq("id", id);

      if (result.error && isMissingColumnError(result.error)) {
        result = await db
          .from("clients")
          .update({ status: "pausado" })
          .eq("id", id);
      }
    }

    if (result.error) {
      console.error("[api/admin/clients DELETE] erro ao remover cliente", {
        clientId: id,
        role: profile?.role ?? null,
        serviceRolePresent,
        supabaseError: result.error,
      });
      return NextResponse.json({ error: CLIENT_WRITE_FRIENDLY_ERROR, technical: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
