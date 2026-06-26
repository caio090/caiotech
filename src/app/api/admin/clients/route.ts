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

    // Busca diagnósticos existentes
    const { data: diagnoses } = await supabase
      .from("onboarding_profiles")
      .select("client_id");

    const contextsRes = await supabase
      .from("client_context")
      .select("client_id");
    const contexts = contextsRes.error ? null : contextsRes.data;

    // Busca conexões Meta ativas
    const metaConnsRes = await supabase
      .from("meta_connections")
      .select("connected_by, page_id, instagram_business_account_id")
      .eq("status", "active")
      .eq("is_active", true);
    const metaConns = metaConnsRes.error ? null : metaConnsRes.data;

    const diagIds   = new Set((diagnoses ?? []).map((d) => d.client_id));
    const briefIds  = new Set((contexts ?? []).map((c: { client_id: string }) => c.client_id));

    // Para Meta, a conexão é por usuário (connected_by), não por cliente diretamente.
    // Como a vinculação cliente<>meta ainda está em desenvolvimento (client_meta_assets),
    // usamos uma heurística: se há alguma conexão Meta ativa no sistema, marca como disponível.
    // Quando client_meta_assets estiver populado, substituir por join.
    const hasAnyMeta      = (metaConns ?? []).length > 0;
    const hasAnyInstagram = (metaConns ?? []).some((m) => m.instagram_business_account_id);

    const enriched = (clients ?? []).map((c) => ({
      ...c,
      has_meta:        hasAnyMeta,
      has_instagram:   hasAnyInstagram,
      has_diagnostico: diagIds.has(c.id),
      has_brief:       briefIds.has(c.id),
    }));

    return NextResponse.json({ clients: enriched, isAdmin });
  } catch {
    return NextResponse.json({ clients: [], isAdmin: false });
  }
}
