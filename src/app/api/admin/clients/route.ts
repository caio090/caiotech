import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/admin/clients
// Retorna lista de clientes reais com badges derivados de dados relacionados.
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = profile?.role === "admin";

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

    return NextResponse.json({ clients: enriched, isAdmin });
  } catch {
    return NextResponse.json({ clients: [], isAdmin: false });
  }
}
