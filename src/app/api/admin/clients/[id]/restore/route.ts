import { NextResponse, type NextRequest } from "next/server";
import {
  createServerSupabaseClient,
  createRequiredSupabaseAdminClient,
  hasSupabaseServiceRoleKey,
} from "@/lib/supabase/server";
import { withMutationProtection } from "@/lib/workspaces/assert-not-preview";
import { isAuthorizationDeniedError, canAccessClientIndependently } from "@/lib/supabase/authorization-guard";

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
    if (isAuthorizationDeniedError(rpcResult.error)) {
      // Uma negação de autorização da RPC é FINAL -- nunca dispara fallback privilegiado.
      return NextResponse.json({ error: "forbidden", code: "AUTHORIZATION_DENIED" }, { status: 403 });
    }

    // A RPC falhou por motivo técnico (não autorização) -- só agora um
    // fallback privilegiado pode ser considerado, e só depois de revalidar
    // autorização de forma independente (service_role disponível nunca
    // significa autorização concedida).
    if (!(await canAccessClientIndependently(supabase, clientId))) {
      return NextResponse.json({ error: "forbidden", code: "AUTHORIZATION_DENIED" }, { status: 403 });
    }

    if (hasSupabaseServiceRoleKey()) {
      const { error } = await createRequiredSupabaseAdminClient()
        .from("clients")
        .update({ status: "onboarding", archived_at: null, deleted_at: null })
        .eq("id", clientId);

      if (!error) return NextResponse.json({ restored: true });

      return NextResponse.json({ error: "Nao foi possivel restaurar o cliente." }, { status: 500 });
    }

    return NextResponse.json({ error: "Nao foi possivel restaurar. Rode SQL 55 no Supabase." }, { status: 500 });
  } catch {
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
});
