import { NextResponse, type NextRequest } from "next/server";
import {
  createServerSupabaseClient,
  createRequiredSupabaseAdminClient,
  hasSupabaseServiceRoleKey,
} from "@/lib/supabase/server";
import { withMutationProtection } from "@/lib/workspaces/assert-not-preview";
import { classifyRpcError, canAccessClientIndependently, shouldAttemptPrivilegedFallback } from "@/lib/supabase/authorization-guard";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const ADMIN_ROLES = new Set(["admin", "super_admin"]);

// POST /api/admin/clients/[id]/restore
// Restaura cliente arquivado/deletado para status onboarding
export const POST = withMutationProtection(async function POST(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id: clientId } = await params;

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = (profile as { role?: string } | null)?.role ?? "";
    if (!ADMIN_ROLES.has(role)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // Tenta via RPC SECURITY DEFINER primeiro
    const rpcResult = await supabase.rpc("admin_restore_client", { p_client_id: clientId });

    if (!rpcResult.error) {
      return NextResponse.json({ restored: true });
    }
    const outcome = classifyRpcError(rpcResult.error);
    if (outcome === "authorization_denied") {
      // Uma negação de autorização da RPC é FINAL -- nunca dispara fallback privilegiado.
      return NextResponse.json({ error: "forbidden", code: "AUTHORIZATION_DENIED" }, { status: 403 });
    }
    if (outcome === "unknown_error") {
      // Erro técnico não classificado -- fail closed, nenhum fallback.
      return NextResponse.json({ error: "forbidden", code: "UNKNOWN_DB_ERROR" }, { status: 400 });
    }

    // outcome === "rpc_unavailable" (nunca negação nem erro desconhecido)
    // -- só agora um fallback privilegiado pode ser considerado, e só
    // depois de revalidar autorização de forma independente (service_role
    // disponível nunca significa autorização concedida).
    const independentlyAuthorized = await canAccessClientIndependently(supabase, clientId);
    if (!shouldAttemptPrivilegedFallback(rpcResult.error, independentlyAuthorized)) {
      return NextResponse.json({ error: "forbidden", code: "AUTHORIZATION_DENIED" }, { status: 403 });
    }

    if (hasSupabaseServiceRoleKey()) {
      const adminDb = createRequiredSupabaseAdminClient();

      // Contrato RESTORE (PROMPT 05G, Regra 2/4): distingue os dois
      // cenários -- Company só arquivada (deleted_at NULL) preserva o
      // status atual; Company restaurada da lixeira (deleted_at
      // preenchido) volta para 'onboarding' de forma conservadora (nunca
      // adivinha o status anterior). archived_at/deleted_at sempre limpos.
      const { data: current, error: lookupError } = await adminDb
        .from("clients")
        .select("deleted_at")
        .eq("id", clientId)
        .maybeSingle();

      if (lookupError) {
        return NextResponse.json({ error: "Nao foi possivel restaurar o cliente." }, { status: 500 });
      }
      if (!current) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }

      const wasDeleted = current.deleted_at !== null;
      const update = wasDeleted
        ? { status: "onboarding", archived_at: null, deleted_at: null }
        : { archived_at: null, deleted_at: null };

      const { error } = await adminDb
        .from("clients")
        .update(update)
        .eq("id", clientId);

      if (!error) return NextResponse.json({ restored: true });

      return NextResponse.json({ error: "Nao foi possivel restaurar o cliente." }, { status: 500 });
    }

    return NextResponse.json({ error: "Nao foi possivel restaurar. Rode SQL 55 no Supabase." }, { status: 500 });
  } catch {
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
});
