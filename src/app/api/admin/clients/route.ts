import { NextResponse, type NextRequest } from "next/server";
import {
  createServerSupabaseClient,
  createRequiredSupabaseAdminClient,
  hasSupabaseServiceRoleKey,
} from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { CLIENT_VISIBLE_STATUSES, isMissingClientVisibilityColumn, isVisibleClientRecord } from "@/lib/client-visibility";

const CLIENT_MANAGER_ROLES = new Set(["admin", "super_admin"]);
const CLIENT_DELETE_ROLES = new Set(["admin", "super_admin"]);
const SERVICE_ROLE_MISSING_MESSAGE =
  "SUPABASE_SERVICE_ROLE_KEY ausente no ambiente de produção. Configure na Vercel e faça redeploy.";
const CLIENT_CREATE_FRIENDLY_ERROR =
  "Nao foi possivel criar o cliente. Verifique os campos obrigatorios ou o schema da tabela clients.";
const RPC_MISSING_MESSAGE =
  "RPC admin_create_client indisponivel ou com assinatura diferente. Rode docs/supabase/51-admin-create-client-bypass.sql no Supabase.";

interface SafeSupabaseError {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

function clientWriteErrorMessage(message?: string, serviceRolePresent = true) {
  const text = message?.toLowerCase() ?? "";
  if (text.includes("supabase_service_role_key")) {
    return SERVICE_ROLE_MISSING_MESSAGE;
  }
  if (text.includes("row-level security") || text.includes("rls")) {
    if (!serviceRolePresent) {
      return `${CLIENT_CREATE_FRIENDLY_ERROR} ${SERVICE_ROLE_MISSING_MESSAGE}`;
    }
    return CLIENT_CREATE_FRIENDLY_ERROR;
  }
  if (text.includes("violates check constraint") || text.includes("clients_status_check")) {
    return "Nao foi possivel criar o cliente porque o status escolhido nao e aceito pelo banco. Tente novamente com status Onboarding.";
  }
  return message ?? CLIENT_CREATE_FRIENDLY_ERROR;
}

function isMissingColumnError(error: { code?: string; message?: string } | null) {
  return isMissingClientVisibilityColumn(error);
}

function isRlsError(error: { message?: string } | null) {
  const text = error?.message?.toLowerCase() ?? "";
  return text.includes("row-level security") || text.includes("rls");
}

function isRpcUnavailable(error: { code?: string; message?: string } | null) {
  const text = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "PGRST202" ||
    text.includes("could not find the function") ||
    text.includes("schema cache") ||
    text.includes("function public.admin_create_client")
  );
}

function toSafeSupabaseError(error: SafeSupabaseError | null): SafeSupabaseError | null {
  if (!error) return null;
  return {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
  };
}

function buildClientCreateError(params: {
  error: string;
  code: string;
  step: string;
  status?: number;
  role?: string | null;
  accountType?: string | null;
  serviceRoleConfigured: boolean;
  usedRpc: boolean;
  usedServiceRole: boolean;
  supabaseError?: SafeSupabaseError | null;
}) {
  return NextResponse.json(
    {
      error: params.error,
      code: params.code,
      step: params.step,
      role: params.role ?? null,
      account_type: params.accountType ?? null,
      serviceRoleConfigured: params.serviceRoleConfigured,
      usedRpc: params.usedRpc,
      usedServiceRole: params.usedServiceRole,
      supabaseCode: params.supabaseError?.code ?? null,
      supabaseMessage: params.supabaseError?.message ?? null,
      supabaseError: toSafeSupabaseError(params.supabaseError ?? null),
    },
    { status: params.status ?? 500 }
  );
}

function sanitizeClientCreatePayload(body: {
  company_name?: string; responsible_name?: string; email?: string;
  phone?: string; segment?: string; status?: string;
}) {
  return {
    hasCompanyName: Boolean(body.company_name?.trim()),
    hasResponsibleName: Boolean(body.responsible_name?.trim()),
    hasEmail: Boolean(body.email?.trim()),
    hasPhone: Boolean(body.phone?.trim()),
    segment: body.segment?.trim() || null,
    status: body.status || null,
  };
}

function buildOwnershipInsert(
  base: Record<string, unknown>,
  role: string,
  userId: string,
) {
  if (role === "super_admin") {
    return { ...base, created_by: userId };
  }

  return {
    ...base,
    agency_id:  userId,
    created_by: userId,
  };
}

// GET /api/admin/clients
// Retorna lista de clientes reais com badges derivados de dados relacionados.
export async function GET() {
  // Step tracking — available in catch for server-side logging only
  let _authenticated = false;
  let _role = "";

  try {
    const supabase = await createServerSupabaseClient();

    // ── 1. Auth ──────────────────────────────────────────────────────────────
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, code: "unauthenticated", message: "Sessão não encontrada." },
        { status: 401 },
      );
    }
    _authenticated = true;

    // ── 2. Profile ───────────────────────────────────────────────────────────
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, plan")
      .eq("id", user.id)
      .maybeSingle();

    const role    = (profile as { role?: string } | null)?.role ?? "";
    const userPlan = (profile as { plan?: string } | null)?.plan ?? null;
    _role = role;

    if (!profile) {
      return NextResponse.json(
        { ok: false, code: "profile_not_found", message: "Perfil administrativo não encontrado." },
        { status: 404 },
      );
    }

    // ── 3. Role check ────────────────────────────────────────────────────────
    const isAdmin = CLIENT_DELETE_ROLES.has(role);
    if (!isAdmin) {
      return NextResponse.json(
        { ok: false, code: "forbidden", message: "Usuário sem permissão para listar clientes." },
        { status: 403 },
      );
    }

    // ── 4. Clients query (primary — failure is hard) ──────────────────────
    let clientsResult = await supabase
      .from("clients")
      .select("id, company_name, responsible_name, email, phone, segment, status, deleted_at, archived_at")
      .in("status", CLIENT_VISIBLE_STATUSES)
      .is("deleted_at", null)
      .is("archived_at", null)
      .order("company_name");

    if (clientsResult.error && isMissingColumnError(clientsResult.error)) {
      const fallback = await supabase
        .from("clients")
        .select("id, company_name, responsible_name, email, phone, segment, status")
        .in("status", CLIENT_VISIBLE_STATUSES)
        .order("company_name");
      clientsResult = fallback as typeof clientsResult;
    }

    const { data: clients, error: clientsError } = clientsResult;
    if (clientsError) {
      console.error("[api/admin/clients GET] clients query failed", {
        step: "clients_query",
        supabaseCode: clientsError.code,
        authenticated: _authenticated,
        role,
      });
      return NextResponse.json(
        { ok: false, code: "clients_query_failed", message: "Não foi possível carregar os clientes." },
        { status: 500 },
      );
    }

    const visibleClients = (clients ?? []).filter(isVisibleClientRecord);
    const clientsCount   = visibleClients.length;

    // ── 5. Auxiliary queries (failures produce warnings, not empty clients) ─
    const warnings: { code: string; feature: string }[]      = [];
    const enrichment: Record<string, string>                  = {};

    // diagnoses
    const diagRes = await supabase.from("onboarding_profiles").select("client_id");
    const diagIds = new Set(
      (diagRes.error ? [] : (diagRes.data ?? [])).map((d: { client_id: string }) => d.client_id),
    );
    enrichment.diagnoses = diagRes.error ? "unavailable" : "success";
    if (diagRes.error) warnings.push({ code: "diagnoses_unavailable", feature: "diagnostico" });

    // briefs
    const contextsRes = await supabase.from("client_context").select("client_id");
    const briefIds = new Set(
      (contextsRes.error ? [] : (contextsRes.data ?? [])).map((c: { client_id: string }) => c.client_id),
    );
    enrichment.briefs = contextsRes.error ? "unavailable" : "success";
    if (contextsRes.error) warnings.push({ code: "client_context_unavailable", feature: "brief" });

    // olaclick connections — canonical statuses: "connected" | "active"
    // Admin client bypasses RLS; enrichment is already gated behind role check above.
    const enrichDb = hasSupabaseServiceRoleKey() ? createRequiredSupabaseAdminClient() : supabase;
    const olaRes = await enrichDb
      .from("olaclick_connections")
      .select("client_id, status")
      .in("status", ["connected", "active"])
      .order("created_at", { ascending: false });
    const olaClientIds = new Set<string>();
    let olaQueryStatus: "success" | "unavailable" = "unavailable";
    if (!olaRes.error) {
      olaQueryStatus = "success";
      (olaRes.data ?? []).forEach((r: { client_id: string; status: string }) => {
        if (r.client_id) olaClientIds.add(r.client_id);
      });
    } else {
      warnings.push({ code: "olaclick_unavailable", feature: "digital_menu" });
    }

    // meta assets (SQL 37 optional)
    const assetsRes = await enrichDb.from("client_meta_assets").select("client_id, asset_type");
    let metaClientIds     = new Set<string>();
    let instagramClientIds = new Set<string>();
    let useAssets = false;

    if (!assetsRes.error) {
      useAssets = true;
      enrichment.metaAssets = "success";
      (assetsRes.data ?? []).forEach((a: { client_id: string; asset_type: string }) => {
        if (a.asset_type === "facebook_page")      metaClientIds.add(a.client_id);
        if (a.asset_type === "instagram_business") instagramClientIds.add(a.client_id);
      });
    } else {
      enrichment.metaAssets = "unavailable";
      warnings.push({ code: "meta_assets_unavailable", feature: "meta" });
      const metaConnsRes = await supabase
        .from("meta_connections").select("id").eq("status", "active").eq("is_active", true).limit(1);
      if (!metaConnsRes.error && (metaConnsRes.data ?? []).length > 0) {
        metaClientIds     = new Set<string>();
        instagramClientIds = new Set<string>();
      }
    }

    const enriched = visibleClients.map((c) => {
      const hasFbPage = useAssets ? metaClientIds.has(c.id)      : false;
      const hasIg     = useAssets ? instagramClientIds.has(c.id) : false;
      const hasOla    = olaClientIds.has(c.id);
      const metaStatus: "complete" | "partial" | "not_connected" | "unknown" =
        !useAssets           ? "unknown"
        : (hasFbPage && hasIg) ? "complete"
        : (hasFbPage || hasIg) ? "partial"
        : "not_connected";
      return {
        ...c,
        has_meta:        hasFbPage,
        has_meta_page:   hasFbPage,
        has_instagram:   hasIg,
        has_olaclick:    hasOla,
        meta_status:     metaStatus,
        olaclick_status: hasOla ? "connected" as const : olaQueryStatus === "unavailable" ? "unknown" as const : "not_connected" as const,
        has_diagnostico: diagIds.has(c.id),
        has_brief:       briefIds.has(c.id),
      };
    });

    // ── 6. Diagnostics (admin-only, safe — no values, only booleans) ─────────
    const diagnostics = {
      authenticated: true,
      profileFound:  true,
      role,
      clientsQuery:  "success",
      clientsCount,
      enrichment,
      integrationConsistency: {
        olaclickQuery:         olaQueryStatus,
        connectedClientsCount: olaClientIds.size,
        acceptedStatuses:      ["active", "connected"],
        usedAdminClient:       hasSupabaseServiceRoleKey(),
      },
      environment: {
        supabaseUrlConfigured:  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        supabaseAnonConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      },
    };

    const body: Record<string, unknown> = {
      ok:      true,
      clients: enriched,
      isAdmin,
      role,
      plan:    userPlan,
    };
    if (clientsCount === 0) { body.empty = true; body.code = "no_clients"; }
    if (warnings.length > 0) body.warnings = warnings;
    body.diagnostics = diagnostics; // always for admin (role already gated above)

    return NextResponse.json(body);

  } catch {
    console.error("[api/admin/clients GET] unexpected error", {
      step: "unexpected",
      authenticated: _authenticated,
      role: _role || null,
    });
    return NextResponse.json(
      { ok: false, code: "clients_query_failed", message: "Não foi possível carregar os clientes." },
      { status: 500 },
    );
  }
}

// POST /api/admin/clients — cria novo cliente
export async function POST(req: NextRequest) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const role = profile.role ?? "";
    const accountType = profile.account_type ?? null;
    if (!CLIENT_MANAGER_ROLES.has(role)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const body = await req.json() as {
      company_name?: string; responsible_name?: string; email?: string;
      phone?: string; segment?: string; status?: string;
    };

    if (!body.company_name?.trim()) {
      return NextResponse.json({ error: "Nome da empresa é obrigatório." }, { status: 400 });
    }

    const requestedStatus = ["active", "onboarding"].includes(body.status ?? "") ? body.status : "onboarding";
    const serviceRoleConfigured = hasSupabaseServiceRoleKey();

    console.info("[api/admin/clients POST] tentativa de criar cliente", {
      role,
      account_type: accountType,
      serviceRoleConfigured,
      payload: sanitizeClientCreatePayload(body),
    });

    // Caminho 1: função SECURITY DEFINER (bypassa RLS, valida role internamente)
    const sessionDb = await createServerSupabaseClient();
    const rpcResult = await sessionDb.rpc("admin_create_client", {
      p_company_name:     body.company_name.trim(),
      p_responsible_name: body.responsible_name?.trim() ?? null,
      p_email:            body.email?.trim() ?? null,
      p_phone:            body.phone?.trim() ?? null,
      p_segment:          body.segment?.trim() ?? null,
      p_status:           requestedStatus ?? "onboarding",
      p_created_by:       profile.id,
      p_agency_id:        role !== "super_admin" ? profile.id : null,
    });

    if (!rpcResult.error && rpcResult.data) {
      const rows = rpcResult.data as Array<{
        id: string; company_name: string; responsible_name: string | null;
        email: string | null; phone: string | null; segment: string | null; status: string;
      }>;
      const row = Array.isArray(rows) ? rows[0] : rows;
      if (row?.id) {
        return NextResponse.json(
          { ...row, has_meta: false, has_instagram: false, has_diagnostico: false, has_brief: false, usedRpc: true, usedServiceRole: false },
          { status: 201 }
        );
      }
    }

    const rpcError = toSafeSupabaseError(rpcResult.error as SafeSupabaseError | null);
    if (rpcResult.error) {
      console.error("[api/admin/clients POST] rpc admin_create_client falhou", {
        role,
        account_type: accountType,
        serviceRoleConfigured,
        rpcError,
      });
    }

    // Caminho 2: service role (bypassa RLS via chave admin)
    // Tenta SEMPRE que service role estiver configurado, independente do motivo
    // da falha da RPC — inclusive quando SQL 51 ainda não foi rodado.
    if (serviceRoleConfigured) {
      const insert: Record<string, unknown> = {
        company_name:     body.company_name.trim(),
        responsible_name: body.responsible_name?.trim() ?? null,
        email:            body.email?.trim() ?? null,
        phone:            body.phone?.trim() ?? null,
        segment:          body.segment?.trim() ?? null,
        status:           requestedStatus,
      };
      const insertWithOwnership = buildOwnershipInsert(insert, role, profile.id);

      let result = await createRequiredSupabaseAdminClient()
        .from("clients")
        .insert(insertWithOwnership)
        .select("id, company_name, responsible_name, email, phone, segment, status")
        .single();

      if (result.error && isMissingColumnError(result.error)) {
        result = await createRequiredSupabaseAdminClient()
          .from("clients")
          .insert(insert)
          .select("id, company_name, responsible_name, email, phone, segment, status")
          .single();
      }

      if (!result.error && result.data) {
        return NextResponse.json(
          { ...result.data, has_meta: false, has_instagram: false, has_diagnostico: false, has_brief: false, usedRpc: false, usedServiceRole: true },
          { status: 201 }
        );
      }

      if (result.error) {
        const supabaseError = toSafeSupabaseError(result.error);
        console.error("[api/admin/clients POST] service role tambem falhou", {
          role,
          account_type: accountType,
          serviceRoleConfigured,
          serviceRoleError: supabaseError,
          rpcError,
        });
        return buildClientCreateError({
          error: clientWriteErrorMessage(result.error.message, serviceRoleConfigured),
          code: isRlsError(result.error) ? "CLIENT_RLS_BLOCKED" : "CLIENT_INSERT_FAILED",
          step: "service_role_insert",
          role,
          accountType,
          serviceRoleConfigured,
          usedRpc: false,
          usedServiceRole: true,
          supabaseError,
        });
      }
    }

    const rpcErr = rpcResult.error as SafeSupabaseError | null;
    console.error("[api/admin/clients POST] criacao bloqueada — service role ausente e rpc falhou", {
      role,
      account_type: accountType,
      rpcError: toSafeSupabaseError(rpcErr),
      serviceRoleConfigured,
    });
    return buildClientCreateError({
      error: isRpcUnavailable(rpcErr)
        ? `${RPC_MISSING_MESSAGE} Configure também SUPABASE_SERVICE_ROLE_KEY na Vercel para habilitar fallback.`
        : clientWriteErrorMessage(rpcErr?.message, serviceRoleConfigured),
      code: isRpcUnavailable(rpcErr) ? "ADMIN_CREATE_CLIENT_RPC_UNAVAILABLE" : "CLIENT_INSERT_FAILED",
      step: "rpc_admin_create_client",
      role,
      accountType,
      serviceRoleConfigured,
      usedRpc: true,
      usedServiceRole: false,
      supabaseError: toSafeSupabaseError(rpcErr),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : undefined;
    const serviceRoleConfigured = hasSupabaseServiceRoleKey();
    console.error("[api/admin/clients POST] erro inesperado", { serviceRoleConfigured, message });
    return buildClientCreateError({
      error: clientWriteErrorMessage(message, serviceRoleConfigured),
      code: "CLIENT_CREATE_UNEXPECTED_ERROR",
      step: "unexpected",
      serviceRoleConfigured,
      usedRpc: false,
      usedServiceRole: false,
      supabaseError: message ? { message } : null,
    });
  }
}
