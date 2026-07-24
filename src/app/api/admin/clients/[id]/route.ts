import { NextResponse } from "next/server";
import { createServerSupabaseClient, createSupabaseAdminClient, hasSupabaseServiceRoleKey } from "@/lib/supabase/server";
import { CLIENT_VISIBLE_STATUSES, isMissingClientVisibilityColumn } from "@/lib/client-visibility";
import { withMutationProtection } from "@/lib/workspaces/assert-not-preview";

const CLIENT_MANAGER_ROLES = new Set(["admin", "super_admin", "agency"]);
const CLIENT_DELETE_ROLES = new Set(["admin", "super_admin"]);
const CLIENT_WRITE_FRIENDLY_ERROR =
  "Nao foi possivel atualizar o cliente. Verifique permissoes do banco ou variavel SUPABASE_SERVICE_ROLE_KEY na Vercel.";

function isMissingColumnError(error: { code?: string; message?: string } | null) {
  return isMissingClientVisibilityColumn(error);
}

function isRpcMissing(error: { code?: string; message?: string } | null) {
  const text = error?.message?.toLowerCase() ?? "";
  return error?.code === "PGRST202" || text.includes("could not find the function") || text.includes("schema cache");
}

function safeDbError(error: { code?: string; message?: string; details?: string; hint?: string } | null) {
  if (!error) return null;
  return {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  };
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
    let clientResult = await supabase
      .from("clients")
      .select("id, company_name, deleted_at, archived_at")
      .eq("id", id)
      .in("status", CLIENT_VISIBLE_STATUSES)
      .is("deleted_at", null)
      .is("archived_at", null)
      .maybeSingle();

    if (clientResult.error && isMissingColumnError(clientResult.error)) {
      clientResult = await supabase
        .from("clients")
        .select("id, company_name")
        .eq("id", id)
        .in("status", CLIENT_VISIBLE_STATUSES)
        .maybeSingle() as typeof clientResult;
    }

    const { data } = clientResult;
    if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ id: data.id, company_name: data.company_name });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// PATCH /api/admin/clients/[id]
export const PATCH = withMutationProtection(async function PATCH(
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
    // Normalise app-layer "active" → DB-layer "ativo" (constraint: clients_status_check).
    if (update.status === "active") update.status = "ativo";

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!CLIENT_MANAGER_ROLES.has(profile?.role ?? "")) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const serviceRolePresent = hasSupabaseServiceRoleKey();
    let db = supabase;
    try {
      db = createSupabaseAdminClient();
    } catch {
      db = supabase;
    }
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
});

// DELETE /api/admin/clients/[id]
export const DELETE = withMutationProtection(async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const mode = new URL(req.url).searchParams.get("mode") === "hard" ? "hard" : "archive";
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

    if (mode === "hard") {
      if (profile?.role !== "super_admin") {
        return NextResponse.json({ error: "Apenas super_admin pode apagar definitivamente clientes." }, { status: 403 });
      }

      const hardResult = await supabase.rpc("admin_hard_delete_clients", { p_client_ids: [id] });
      if (hardResult.error) {
        console.error("[api/admin/clients DELETE] erro no hard delete rpc", {
          clientId: id,
          role: profile?.role ?? null,
          supabaseError: safeDbError(hardResult.error),
        });
        return NextResponse.json(
          {
            error: isRpcMissing(hardResult.error)
              ? "SQL 53 ausente. Rode docs/supabase/53-client-admin-cleanup-tools.sql no Supabase antes do hard delete."
              : "Nao foi possivel apagar definitivamente o cliente.",
            code: isRpcMissing(hardResult.error) ? "SQL_53_REQUIRED" : "CLIENT_HARD_DELETE_FAILED",
            technical: safeDbError(hardResult.error),
          },
          { status: 400 }
        );
      }

      return NextResponse.json({ ok: true, mode: "hard", affected: hardResult.data ?? 0 });
    }

    const serviceRolePresent = hasSupabaseServiceRoleKey();
    let db = supabase;
    try {
      db = createSupabaseAdminClient();
    } catch {
      db = supabase;
    }
    const deletedAt = new Date().toISOString();

    const archiveResult = await supabase.rpc("admin_archive_clients", { p_client_ids: [id] });
    if (!archiveResult.error) {
      return NextResponse.json({ ok: true, mode: "archive", affected: archiveResult.data ?? 0 });
    }

    const rpcResult = await supabase.rpc("admin_delete_client", { p_client_id: id });
    if (!rpcResult.error) {
      return NextResponse.json({ ok: true, mode: "archive" });
    }

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
});
