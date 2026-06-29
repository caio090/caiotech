import { NextResponse, type NextRequest } from "next/server";
import {
  createServerSupabaseClient,
  createRequiredSupabaseAdminClient,
  hasSupabaseServiceRoleKey,
} from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/current-profile";

const CLIENT_MANAGER_ROLES = new Set(["admin", "super_admin"]);
const CLIENT_DELETE_ROLES = new Set(["admin", "super_admin"]);
const SERVICE_ROLE_MISSING_MESSAGE =
  "SUPABASE_SERVICE_ROLE_KEY ausente no ambiente de produção. Configure na Vercel e faça redeploy.";
const CLIENT_CREATE_FRIENDLY_ERROR =
  "Nao foi possivel criar o cliente. Verifique os campos obrigatorios ou o schema da tabela clients.";

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
  const text = error?.message?.toLowerCase() ?? "";
  return error?.code === "PGRST204" || text.includes("could not find") || text.includes("column");
}

function isRlsError(error: { message?: string } | null) {
  const text = error?.message?.toLowerCase() ?? "";
  return text.includes("row-level security") || text.includes("rls");
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
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, plan")
      .eq("id", user.id)
      .maybeSingle();

    const role = (profile as { role?: string } | null)?.role ?? "";
    const isAdmin = CLIENT_DELETE_ROLES.has(role);
    const userPlan = (profile as { plan?: string } | null)?.plan ?? null;

    // Busca clientes
    let clientsResult = await supabase
      .from("clients")
      .select("id, company_name, responsible_name, email, phone, segment, status, deleted_at, archived_at")
      .in("status", ["active", "onboarding", "inactive"])
      .is("deleted_at", null)
      .is("archived_at", null)
      .order("company_name");

    if (clientsResult.error && isMissingColumnError(clientsResult.error)) {
      const fallbackClientsResult = await supabase
        .from("clients")
        .select("id, company_name, responsible_name, email, phone, segment, status")
        .in("status", ["active", "onboarding", "inactive"])
        .order("company_name");
      clientsResult = fallbackClientsResult as typeof clientsResult;
    }

    const { data: clients, error } = clientsResult;
    if (error) throw error;

    // Busca diagnósticos / briefs
    const { data: diagnoses } = await supabase.from("onboarding_profiles").select("client_id");
    const contextsRes = await supabase.from("client_context").select("client_id");
    const contexts = contextsRes.error ? null : contextsRes.data;

    const diagIds  = new Set((diagnoses ?? []).map((d) => d.client_id));
    const briefIds = new Set((contexts ?? []).map((c: { client_id: string }) => c.client_id));

    // Tenta buscar vínculos client_meta_assets (SQL 37)
    const assetsRes = await supabase
      .from("client_meta_assets")
      .select("client_id, asset_type");

    let metaClientIds    = new Set<string>();
    let instagramClientIds = new Set<string>();
    let useAssets = false;

    if (!assetsRes.error) {
      useAssets = true;
      (assetsRes.data ?? []).forEach((a: { client_id: string; asset_type: string }) => {
        if (a.asset_type === "facebook_page")     metaClientIds.add(a.client_id);
        if (a.asset_type === "instagram_business") instagramClientIds.add(a.client_id);
      });
    } else {
      // SQL 37 não rodado — heurística: se há conexão Meta ativa no sistema
      const metaConnsRes = await supabase
        .from("meta_connections")
        .select("id")
        .eq("status", "active")
        .eq("is_active", true)
        .limit(1);
      if (!metaConnsRes.error && (metaConnsRes.data ?? []).length > 0) {
        // Marca todos como potencialmente com meta até SQL 37 ser rodado
        // (campo informativo, não crítico)
        metaClientIds    = new Set<string>();
        instagramClientIds = new Set<string>();
      }
    }

    const enriched = (clients ?? []).map((c) => ({
      ...c,
      has_meta:        useAssets ? metaClientIds.has(c.id)     : false,
      has_instagram:   useAssets ? instagramClientIds.has(c.id) : false,
      has_diagnostico: diagIds.has(c.id),
      has_brief:       briefIds.has(c.id),
    }));

    return NextResponse.json({ clients: enriched, isAdmin, plan: userPlan });
  } catch {
    return NextResponse.json({ clients: [], isAdmin: false });
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

    const serviceRoleConfigured = hasSupabaseServiceRoleKey();
    if (!serviceRoleConfigured) {
      console.error("[api/admin/clients POST] service role ausente", {
        role,
        account_type: accountType,
        serviceRoleConfigured,
      });
      return NextResponse.json(
        {
          error: SERVICE_ROLE_MISSING_MESSAGE,
          code: "missing_service_role",
          role,
          account_type: accountType,
          serviceRoleConfigured,
        },
        { status: 500 }
      );
    }

    const body = await req.json() as {
      company_name?: string; responsible_name?: string; email?: string;
      phone?: string; segment?: string; status?: string;
    };

    console.info("[api/admin/clients POST] tentativa de criar cliente", {
      role,
      account_type: accountType,
      serviceRoleConfigured,
      payload: sanitizeClientCreatePayload(body),
    });

    if (!body.company_name?.trim()) {
      return NextResponse.json({ error: "Nome da empresa é obrigatório." }, { status: 400 });
    }

    const requestedStatus = ["active", "onboarding"].includes(body.status ?? "") ? body.status : "onboarding";
    const insert: Record<string, unknown> = {
      company_name:     body.company_name.trim(),
      responsible_name: body.responsible_name?.trim() ?? null,
      email:            body.email?.trim() ?? null,
      phone:            body.phone?.trim() ?? null,
      segment:          body.segment?.trim() ?? null,
      status:           requestedStatus,
    };

    const db = createRequiredSupabaseAdminClient();
    const insertWithOwnership = buildOwnershipInsert(insert, role, profile.id);

    let result = await db
      .from("clients")
      .insert(insertWithOwnership)
      .select("id, company_name, responsible_name, email, phone, segment, status")
      .single();

    if (result.error && isMissingColumnError(result.error)) {
      result = await db
        .from("clients")
        .insert(insert)
        .select("id, company_name, responsible_name, email, phone, segment, status")
        .single();
    }

    if (result.error && requestedStatus === "active" && result.error.code === "23514") {
      result = await db
        .from("clients")
        .insert({ ...insertWithOwnership, status: "onboarding" })
        .select("id, company_name, responsible_name, email, phone, segment, status")
        .single();

      if (result.error && isMissingColumnError(result.error)) {
        result = await db
          .from("clients")
          .insert({ ...insert, status: "onboarding" })
          .select("id, company_name, responsible_name, email, phone, segment, status")
          .single();
      }
    }

    if (result.error && isRlsError(result.error)) {
      console.warn("[api/admin/clients POST] service role retornou RLS; tentando fallback server-side autenticado", {
        role,
        account_type: accountType,
        serviceRoleConfigured,
        supabaseError: toSafeSupabaseError(result.error),
      });

      const sessionDb = await createServerSupabaseClient();
      result = await sessionDb
        .from("clients")
        .insert(insertWithOwnership)
        .select("id, company_name, responsible_name, email, phone, segment, status")
        .single();

      if (result.error && isMissingColumnError(result.error)) {
        result = await sessionDb
          .from("clients")
          .insert(insert)
          .select("id, company_name, responsible_name, email, phone, segment, status")
          .single();
      }

      if (result.error && requestedStatus === "active" && result.error.code === "23514") {
        result = await sessionDb
          .from("clients")
          .insert({ ...insertWithOwnership, status: "onboarding" })
          .select("id, company_name, responsible_name, email, phone, segment, status")
          .single();

        if (result.error && isMissingColumnError(result.error)) {
          result = await sessionDb
            .from("clients")
            .insert({ ...insert, status: "onboarding" })
            .select("id, company_name, responsible_name, email, phone, segment, status")
            .single();
        }
      }
    }

    if (result.error) {
      const supabaseError = toSafeSupabaseError(result.error);
      console.error("[api/admin/clients POST] erro ao criar cliente", {
        role,
        account_type: accountType,
        serviceRoleConfigured,
        supabaseError,
      });
      return NextResponse.json(
        {
          error: clientWriteErrorMessage(result.error.message, serviceRoleConfigured),
          code: "CLIENT_INSERT_FAILED",
          supabaseError,
          role,
          account_type: accountType,
          serviceRoleConfigured,
        },
        { status: 500 }
      );
    }

    const data = result.data;
    return NextResponse.json({ ...data, has_meta: false, has_instagram: false, has_diagnostico: false, has_brief: false }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : undefined;
    const serviceRoleConfigured = hasSupabaseServiceRoleKey();
    console.error("[api/admin/clients POST] erro inesperado", {
      serviceRoleConfigured,
      message,
    });
    return NextResponse.json({
      error: clientWriteErrorMessage(message, serviceRoleConfigured),
      code: "CLIENT_CREATE_UNEXPECTED_ERROR",
      serviceRoleConfigured,
    }, { status: 500 });
  }
}
