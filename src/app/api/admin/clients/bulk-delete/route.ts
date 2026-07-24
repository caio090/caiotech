import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { withMutationProtection } from "@/lib/workspaces/assert-not-preview";

const ARCHIVE_ROLES = new Set(["admin", "super_admin"]);

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

export const POST = withMutationProtection(async function POST(req: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const body = await req.json().catch(() => ({})) as {
      clientIds?: unknown;
      mode?: "archive" | "hard";
    };
    const clientIds = Array.isArray(body.clientIds)
      ? body.clientIds.filter((id): id is string => typeof id === "string" && id.length > 0)
      : [];
    const mode = body.mode === "hard" ? "hard" : "archive";

    if (clientIds.length === 0) {
      return NextResponse.json({ error: "Nenhum cliente selecionado." }, { status: 400 });
    }

    const role = profile.role ?? "";
    if (mode === "archive" && !ARCHIVE_ROLES.has(role)) {
      return NextResponse.json({ error: "Sem permissao para arquivar clientes." }, { status: 403 });
    }
    if (mode === "hard" && role !== "super_admin") {
      return NextResponse.json({ error: "Apenas super_admin pode apagar definitivamente clientes." }, { status: 403 });
    }

    const supabase = await createServerSupabaseClient();
    const functionName = mode === "hard" ? "admin_hard_delete_clients" : "admin_archive_clients";
    const result = await supabase.rpc(functionName, { p_client_ids: clientIds });

    if (result.error) {
      console.error("[api/admin/clients/bulk-delete] rpc falhou", {
        mode,
        role,
        count: clientIds.length,
        supabaseError: safeDbError(result.error),
      });
      return NextResponse.json(
        {
          error: isRpcMissing(result.error)
            ? "SQL 53 ausente. Rode docs/supabase/53-client-admin-cleanup-tools.sql no Supabase antes desta acao."
            : "Nao foi possivel concluir a acao em massa.",
          code: isRpcMissing(result.error) ? "SQL_53_REQUIRED" : "CLIENT_BULK_DELETE_FAILED",
          technical: safeDbError(result.error),
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, mode, affected: result.data ?? 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "server_error";
    console.error("[api/admin/clients/bulk-delete] erro inesperado", { message });
    return NextResponse.json({ error: "Erro interno ao processar clientes.", code: "SERVER_ERROR" }, { status: 500 });
  }
});
