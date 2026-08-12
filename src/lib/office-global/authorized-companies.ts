/**
 * Sprint Final Closure (Parte E, Fase 30) — lista de Companies REALMENTE
 * autorizadas para o usuário atual. Mesmo contrato canônico de
 * fetchAdminCompanyAuthorization() em src/lib/company-context/resolve.ts
 * (profiles.client_id / client_user_access / agency_workspaces +
 * agency_clients), só que devolvendo a LISTA em vez de validar um único
 * client_id. Nenhuma tabela nova, nenhuma consulta de service role "vendo
 * tudo" sem antes restringir por ownership real (Fase 18).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { CLIENT_VISIBLE_STATUSES } from "@/lib/client-visibility";

export interface AuthorizedCompany {
  id: string;
  companyName: string | null;
}

export async function listAuthorizedCompanies(
  adminDb: SupabaseClient,
  userId: string,
  role: string,
): Promise<AuthorizedCompany[]> {
  if (role === "super_admin") {
    const { data } = await adminDb
      .from("clients")
      .select("id, company_name")
      .in("status", CLIENT_VISIBLE_STATUSES)
      .is("deleted_at", null)
      .order("company_name", { ascending: true });
    return (data ?? []).map((r) => ({ id: r.id, companyName: r.company_name ?? null }));
  }

  const ids = new Set<string>();

  try {
    const { data: profile } = await adminDb.from("profiles").select("client_id").eq("id", userId).maybeSingle();
    if (profile?.client_id) ids.add(profile.client_id);
  } catch { /* fail closed -- não adiciona nada */ }

  try {
    const { data: access } = await adminDb
      .from("client_user_access").select("client_id").eq("user_id", userId).eq("status", "active");
    for (const row of access ?? []) ids.add((row as { client_id: string }).client_id);
  } catch { /* tabela pode não existir ainda */ }

  try {
    const { data: workspaces } = await adminDb.from("agency_workspaces").select("id").eq("owner_user_id", userId);
    const agencyIds = (workspaces ?? []).map((w) => (w as { id: string }).id);
    if (agencyIds.length > 0) {
      const { data: links } = await adminDb
        .from("agency_clients").select("client_id").in("agency_id", agencyIds).eq("status", "active");
      for (const row of links ?? []) ids.add((row as { client_id: string }).client_id);
    }
  } catch { /* fail closed */ }

  if (ids.size === 0) return [];

  const { data: clients } = await adminDb
    .from("clients")
    .select("id, company_name")
    .in("id", Array.from(ids))
    .in("status", CLIENT_VISIBLE_STATUSES)
    .is("deleted_at", null)
    .order("company_name", { ascending: true });

  return (clients ?? []).map((r) => ({ id: r.id, companyName: r.company_name ?? null }));
}
