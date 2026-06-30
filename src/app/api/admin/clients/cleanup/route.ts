import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/current-profile";

const CLEANUP_ROLES = new Set(["admin", "super_admin"]);

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

export async function GET() {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    if (!CLEANUP_ROLES.has(profile.role ?? "")) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const supabase = await createServerSupabaseClient();
    const result = await supabase.rpc("admin_list_clients_for_cleanup");

    if (result.error) {
      console.error("[api/admin/clients/cleanup] rpc falhou", {
        role: profile.role,
        supabaseError: safeDbError(result.error),
      });
      return NextResponse.json(
        {
          error: isRpcMissing(result.error)
            ? "SQL 53 ausente. Rode docs/supabase/53-client-admin-cleanup-tools.sql no Supabase para listar candidatos."
            : "Nao foi possivel carregar candidatos de limpeza.",
          code: isRpcMissing(result.error) ? "SQL_53_REQUIRED" : "CLIENT_CLEANUP_LIST_FAILED",
          technical: safeDbError(result.error),
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ candidates: result.data ?? [], role: profile.role });
  } catch (error) {
    const message = error instanceof Error ? error.message : "server_error";
    console.error("[api/admin/clients/cleanup] erro inesperado", { message });
    return NextResponse.json({ error: "Erro interno ao carregar limpeza.", code: "SERVER_ERROR" }, { status: 500 });
  }
}
