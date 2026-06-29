import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient, createSupabaseAdminClient } from "@/lib/supabase/server";

const CLIENT_MANAGER_ROLES = new Set(["admin", "super_admin", "agency"]);

function clientWriteErrorMessage(message?: string) {
  const text = message?.toLowerCase() ?? "";
  if (text.includes("row-level security") || text.includes("rls")) {
    return "Nao foi possivel criar o cliente por bloqueio de permissao/RLS. Rode docs/supabase/48-admin-insert-client.sql no Supabase ou configure SUPABASE_SERVICE_ROLE_KEY.";
  }
  if (text.includes("violates check constraint") || text.includes("clients_status_check")) {
    return "Nao foi possivel criar o cliente porque o status escolhido nao e aceito pelo banco. Tente novamente com status Onboarding.";
  }
  return message ?? "Erro ao criar cliente.";
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

    const isAdmin = profile?.role === "admin";
    const userPlan = (profile as { plan?: string } | null)?.plan ?? null;

    // Busca clientes
    const { data: clients, error } = await supabase
      .from("clients")
      .select("id, company_name, responsible_name, email, phone, segment, status")
      .order("company_name");

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
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const role = (profile as { role?: string } | null)?.role ?? "";
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
    const insert: Record<string, unknown> = {
      company_name:     body.company_name.trim(),
      responsible_name: body.responsible_name?.trim() ?? null,
      email:            body.email?.trim() ?? null,
      phone:            body.phone?.trim() ?? null,
      segment:          body.segment?.trim() ?? null,
      status:           requestedStatus,
    };

    const admin = createSupabaseAdminClient() ?? supabase;
    let result = await admin
      .from("clients")
      .insert(insert)
      .select("id, company_name, responsible_name, email, phone, segment, status")
      .single();

    if (result.error && requestedStatus === "active" && result.error.code === "23514") {
      result = await admin
        .from("clients")
        .insert({ ...insert, status: "onboarding" })
        .select("id, company_name, responsible_name, email, phone, segment, status")
        .single();
    }

    if (result.error) {
      return NextResponse.json({ error: clientWriteErrorMessage(result.error.message) }, { status: 500 });
    }

    const data = result.data;
    return NextResponse.json({ ...data, has_meta: false, has_instagram: false, has_diagnostico: false, has_brief: false }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : undefined;
    return NextResponse.json({ error: clientWriteErrorMessage(message) }, { status: 500 });
  }
}
