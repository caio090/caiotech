/**
 * LOKAT OS — Conversation Core Foundation V1. Wrapper de Company Context
 * para a conversa -- reusa EXATAMENTE resolveCompanyContext() e
 * listAuthorizedCompanies(), nunca reimplementa autorização (que já
 * inclui isCompanyAuthorizedForAdmin() internamente). Comportamento
 * pedido pela missão: 1 empresa autorizada -> seleção automática; várias
 * -> perguntar; nunca listar uma empresa não autorizada.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveCompanyContext } from "@/lib/company-context/resolve";
import type { CompanyContextResolution } from "@/lib/company-context/types";
import { listAuthorizedCompanies, type AuthorizedCompany } from "@/lib/office-global/authorized-companies";

export type ConversationCompanyResolution =
  | { kind: "resolved"; context: CompanyContextResolution }
  | { kind: "choose"; companies: AuthorizedCompany[] }
  | { kind: "unauthorized"; reason: string };

export interface ResolveConversationCompanyParams {
  /** Cliente admin real (service role) -- sempre fornecido pelo chamador; este módulo nunca cria seu próprio client. */
  adminDb: SupabaseClient;
  userId: string;
  role: string;
  explicitCompanyId?: string | null;
}

export async function resolveConversationCompanyContext(
  params: ResolveConversationCompanyParams,
): Promise<ConversationCompanyResolution> {
  const resolution = await resolveCompanyContext(params.explicitCompanyId ?? null);
  if (resolution.valid) return { kind: "resolved", context: resolution };

  // Só "company_required" é convite para listar/escolher -- qualquer outro
  // motivo (not_authenticated/company_not_found/role_not_supported) é um
  // bloqueio real, nunca contornado aqui.
  if (resolution.reason !== "company_required") {
    return { kind: "unauthorized", reason: resolution.reason ?? "unknown" };
  }

  const companies = await listAuthorizedCompanies(params.adminDb, params.userId, params.role);
  if (companies.length === 0) {
    return { kind: "unauthorized", reason: "company_required" };
  }
  if (companies.length === 1) {
    const autoSelected = await resolveCompanyContext(companies[0].id);
    return autoSelected.valid
      ? { kind: "resolved", context: autoSelected }
      : { kind: "unauthorized", reason: autoSelected.reason ?? "unknown" };
  }
  return { kind: "choose", companies };
}
