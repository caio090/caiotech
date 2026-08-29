import { NextResponse } from "next/server";
import { createServerSupabaseClient, createSupabaseAdminClient, hasSupabaseServiceRoleKey } from "@/lib/supabase/server";
import { CLIENT_VISIBLE_STATUSES, isMissingClientVisibilityColumn } from "@/lib/client-visibility";
import { withMutationProtection } from "@/lib/workspaces/assert-not-preview";
import { classifyRpcError, canAccessClientIndependently, shouldAttemptPrivilegedFallback } from "@/lib/supabase/authorization-guard";

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
    // PROMPT 05G, Regra 5: 'active' nunca foi um valor válido de
    // clients.status (clients_status_check só aceita 'ativo'). A origem
    // real (o <select> em src/app/admin/clientes/page.tsx) foi corrigida
    // para enviar 'ativo' diretamente -- sem tradução silenciosa aqui.
    // Se algum caller ainda enviar 'active', o constraint do banco rejeita
    // explicitamente (23514) em vez de mascarar o valor incorreto.

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

    // PROMPT 05G: archive e logical delete têm semânticas diferentes agora
    // (archive preserva status; delete grava status='encerrado') -- nunca
    // mais interconjambiáveis, então este caminho NUNCA tenta
    // admin_delete_client como alternativa para um archive que falhou.
    const archiveResult = await supabase.rpc("admin_archive_clients", { p_client_ids: [id] });
    if (!archiveResult.error) {
      return NextResponse.json({ ok: true, mode: "archive", affected: archiveResult.data ?? 0 });
    }
    const archiveOutcome = classifyRpcError(archiveResult.error);
    if (archiveOutcome === "authorization_denied") {
      // Uma negação de autorização da RPC é FINAL -- nunca dispara fallback privilegiado.
      return NextResponse.json({ error: "forbidden", code: "AUTHORIZATION_DENIED" }, { status: 403 });
    }
    if (archiveOutcome === "unknown_error") {
      // Erro técnico não classificado -- fail closed. Nenhum fallback é
      // tentado para um erro desconhecido (só rpc_unavailable segue adiante).
      console.error("[api/admin/clients DELETE] erro desconhecido na RPC de archive", {
        clientId: id, supabaseError: safeDbError(archiveResult.error),
      });
      return NextResponse.json({ error: CLIENT_WRITE_FRIENDLY_ERROR, code: "UNKNOWN_DB_ERROR", technical: safeDbError(archiveResult.error) }, { status: 400 });
    }

    // archiveOutcome === "rpc_unavailable" -- só agora um fallback
    // privilegiado pode ser considerado, e só depois de revalidar
    // autorização de forma independente (service_role disponível nunca
    // significa autorização concedida).
    const independentlyAuthorized = await canAccessClientIndependently(supabase, id);
    if (!shouldAttemptPrivilegedFallback(archiveResult.error, independentlyAuthorized)) {
      return NextResponse.json({ error: "forbidden", code: "AUTHORIZATION_DENIED" }, { status: 403 });
    }

    const serviceRolePresent = hasSupabaseServiceRoleKey();
    let db = supabase;
    try {
      db = createSupabaseAdminClient();
    } catch {
      db = supabase;
    }

    // Contrato ARCHIVE (PROMPT 05G, Regra 1/4): status NUNCA é alterado --
    // só archived_at/deleted_at. Nunca escreve 'archived'/'inactive'/
    // 'pausado' -- esses valores nunca foram (e continuam não sendo)
    // aceitos por clients_status_check.
    const result = await db
      .from("clients")
      .update({ archived_at: new Date().toISOString(), deleted_at: null })
      .eq("id", id);

    if (result.error) {
      console.error("[api/admin/clients DELETE] erro ao arquivar cliente", {
        clientId: id,
        role: profile?.role ?? null,
        serviceRolePresent,
        supabaseError: result.error,
      });
      return NextResponse.json({ error: CLIENT_WRITE_FRIENDLY_ERROR, technical: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, mode: "archive" });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
});
