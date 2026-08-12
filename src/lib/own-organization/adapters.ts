/**
 * Sprint Final Closure (Parte D) — leitura real da própria organização do
 * usuário (agência ou empresa direta), nunca uma Company externa
 * selecionada. Reaproveita exatamente o schema já existente e usado por
 * fetchAdminCompanyAuthorization() em src/lib/company-context/resolve.ts
 * (agency_workspaces, agency_clients, profiles.account_type/client_id) --
 * nenhuma tabela nova, nenhum dado fabricado. Fail closed: qualquer erro
 * de consulta vira "unavailable", nunca um número inventado (Fase 26).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type OwnOrganizationKind = "agency" | "business" | "not_applicable";

export interface AgencyIdentity {
  id: string;
  name: string;
  status: string;
  planSlug: string;
  maxClients: number;
}

export interface AgencyPortfolioClient {
  id: string;
  companyName: string | null;
}

export interface AgencySummary {
  kind: "agency";
  identity: AgencyIdentity | null;
  portfolio: AgencyPortfolioClient[] | null;
}

export interface BusinessSummary {
  kind: "business";
  companyId: string | null;
  companyName: string | null;
  companyStatus: string | null;
}

export type OwnOrganizationResult =
  | { status: "unavailable" }
  | { status: "not_applicable" }
  | { status: "available"; data: AgencySummary | BusinessSummary };

/** Deriva Minha Agência vs Meu Negócio da MESMA raiz de dados (Fase 23) -- nunca dois sistemas. */
export function resolveOwnOrganizationKind(accountType: string | null): OwnOrganizationKind {
  if (accountType === "agencia") return "agency";
  if (accountType === "empresa") return "business";
  return "not_applicable";
}

export async function getOwnOrganizationSummary(
  db: SupabaseClient,
  userId: string,
  accountType: string | null,
  profileClientId: string | null,
): Promise<OwnOrganizationResult> {
  const kind = resolveOwnOrganizationKind(accountType);
  if (kind === "not_applicable") return { status: "not_applicable" };

  try {
    if (kind === "agency") {
      const { data: workspace, error: wErr } = await db
        .from("agency_workspaces")
        .select("id, name, status, plan_slug, max_clients")
        .eq("owner_user_id", userId)
        .maybeSingle();
      if (wErr) return { status: "unavailable" };

      let portfolio: AgencyPortfolioClient[] | null = null;
      if (workspace) {
        const { data: links, error: linksErr } = await db
          .from("agency_clients")
          .select("client_id, status, clients(id, company_name)")
          .eq("agency_id", workspace.id)
          .eq("status", "active");
        if (!linksErr) {
          portfolio = (links ?? []).map((row) => {
            const client = row.clients as unknown as { id: string; company_name: string | null } | null;
            return { id: client?.id ?? row.client_id, companyName: client?.company_name ?? null };
          });
        }
      }

      return {
        status: "available",
        data: {
          kind: "agency",
          identity: workspace
            ? {
                id: workspace.id, name: workspace.name, status: workspace.status,
                planSlug: workspace.plan_slug, maxClients: workspace.max_clients,
              }
            : null,
          portfolio,
        },
      };
    }

    // business
    if (!profileClientId) {
      return { status: "available", data: { kind: "business", companyId: null, companyName: null, companyStatus: null } };
    }
    const { data: client, error: cErr } = await db
      .from("clients")
      .select("id, company_name, status")
      .eq("id", profileClientId)
      .maybeSingle();
    if (cErr) return { status: "unavailable" };

    return {
      status: "available",
      data: {
        kind: "business",
        companyId: client?.id ?? null,
        companyName: client?.company_name ?? null,
        companyStatus: client?.status ?? null,
      },
    };
  } catch {
    return { status: "unavailable" };
  }
}
