/**
 * Sprint MVP Dogfood Spine V0.1 (Bloco B, Fase 5-8) — Company Context Resolver.
 * `resolveCompanyContextFromInputs()` é PURA (testável sem banco/sessão) e
 * concentra toda a precedência (Fase 8). `resolveCompanyContext()` é o único
 * ponto assíncrono: busca os inputs reais e delega a decisão à função pura
 * -- nunca duplica auth, nunca cria um permission engine novo, nunca aceita
 * um companyId sem validação de acesso.
 */
import type { WorkspaceSurface } from "@/lib/workspaces/types";
import { getWorkspacePreviewContext } from "@/lib/workspaces/context";
import { createServerSupabaseClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { resolveEffectiveUserRole, canAccessAdmin, canAccessClient } from "@/lib/access-control";
import { resolveCurrentClient } from "@/lib/client/resolve-client";
import { CLIENT_VISIBLE_STATUSES, isVisibleClientRecord, isMissingClientVisibilityColumn } from "@/lib/client-visibility";
import type { ResolvedCompanyContext, CompanyContextResolution } from "./types";

// ── Pure precedence (Fase 8) ────────────────────────────────────────────

export interface CompanyContextInputs {
  /** Fase 8, precedência 4 — resultado de getWorkspacePreviewContext(), já revalidado contra sessão/DB. */
  preview: { active: boolean; workspaceId: string | null; workspaceName: string | null; surface: WorkspaceSurface | null };
  /** Sessão real (nunca usada quando preview está ativo). */
  session: { authenticated: boolean; role: string | null };
  /** Fase 8, precedência 2 — Company já resolvida para um usuário do portal do cliente (role "cliente"), via resolveCurrentClient() + checagem de agency_clients. */
  clientPortalCompany: { companyId: string; companyName: string | null; surface: WorkspaceSurface } | null;
  /** Fase 8, precedência 5 — Company explicitamente selecionada por um admin/agency, já validada contra a tabela clients (nunca aceita sem essa validação). */
  adminSelectedCompany: { companyId: string; companyName: string | null; surface: WorkspaceSurface } | null;
  /** true quando um `?client=`/parâmetro explícito foi passado mas NÃO validou contra nenhuma company real e visível. */
  explicitCompanyRequestedButInvalid: boolean;
}

/**
 * Fase 8 — precedência: 1) contexto de preview ativo; 2) agency client
 * selecionado (portal do cliente); 3) direct business (mesmo caminho de
 * clientPortalCompany -- a distinção agency_client/direct_business vem da
 * checagem de agency_clients, não de um segundo branch aqui); 4) preview
 * quando permitido (já coberto pelo item 1 -- preview sempre vence quando
 * ativo, pois é uma ação explícita e já totalmente revalidada); 5) parâmetro
 * explícito de company/client somente se autorizado (admin/agency).
 * Nunca aceita companyId arbitrário: adminSelectedCompany só chega aqui
 * já validado pelo chamador assíncrono.
 */
export function resolveCompanyContextFromInputs(inputs: CompanyContextInputs): CompanyContextResolution {
  if (inputs.preview.active && inputs.preview.workspaceId && inputs.preview.surface) {
    if (inputs.preview.surface !== "agency_client" && inputs.preview.surface !== "direct_business") {
      // Preview de uma agência/super_admin sem uma Company específica selecionada dentro dela.
      return { valid: false, reason: "company_required", context: null };
    }
    return {
      valid: true,
      context: {
        workspaceId: inputs.preview.workspaceId,
        companyId: inputs.preview.workspaceId,
        companyName: inputs.preview.workspaceName,
        surface: inputs.preview.surface,
        role: "super_admin",
        accountType: inputs.preview.surface,
        preview: true,
        readOnly: true,
        source: "workspace_preview",
        sourceClientId: inputs.preview.workspaceId,
      },
    };
  }

  if (!inputs.session.authenticated || !inputs.session.role) {
    return { valid: false, reason: "not_authenticated", context: null };
  }

  if (canAccessClient(inputs.session.role)) {
    if (!inputs.clientPortalCompany) return { valid: false, reason: "company_required", context: null };
    const c = inputs.clientPortalCompany;
    return {
      valid: true,
      context: {
        workspaceId: c.companyId, companyId: c.companyId, companyName: c.companyName,
        surface: c.surface, role: inputs.session.role, accountType: c.surface,
        preview: false, readOnly: false, source: "client_portal", sourceClientId: c.companyId,
      },
    };
  }

  if (canAccessAdmin(inputs.session.role)) {
    if (inputs.explicitCompanyRequestedButInvalid) return { valid: false, reason: "company_not_found", context: null };
    if (!inputs.adminSelectedCompany) return { valid: false, reason: "company_required", context: null };
    const c = inputs.adminSelectedCompany;
    return {
      valid: true,
      context: {
        workspaceId: c.companyId, companyId: c.companyId, companyName: c.companyName,
        surface: c.surface, role: inputs.session.role, accountType: c.surface,
        preview: false, readOnly: false, source: "admin_explicit_selection", sourceClientId: c.companyId,
      },
    };
  }

  return { valid: false, reason: "role_not_supported", context: null };
}

/**
 * Fase 48 — guard de isolamento entre Companies. Pura, sem I/O: a Company A
 * nunca pode ler dado explicitamente marcado como pertencente à Company B,
 * mesmo em projection. Comparação estrita de id -- nunca prefix/substring.
 */
export function assertCompanyAccess(context: ResolvedCompanyContext | null, targetCompanyId: string): boolean {
  if (!context) return false;
  return context.companyId === targetCompanyId;
}

/**
 * Sprint MVP Dogfood Security + Voice Closure V0.1 (P0) — correção do gap
 * apontado pela auditoria CODEX WEB: `validateExplicitCompany()` sozinha só
 * provava "esta Company existe e está visível", nunca "este usuário tem
 * vínculo real com ela" -- qualquer sessão `role === "admin"` conseguia
 * fornecer o UUID de qualquer Company visível no banco e resolvê-la.
 *
 * Fase 4/5 — `super_admin` é o único papel REAL e já nomeado explicitamente
 * como global em todo o repo (`canAccessPlatformCentral`, RLS de
 * `agency_workspaces`/`agency_clients`) -- só ele preserva acesso
 * incondicional. `admin` precisa provar a relação através de estruturas que
 * JÁ EXISTEM (Fase 3: nenhuma tabela nova):
 *   1. `client_user_access` (user_id, client_id) -- já usada para conceder
 *      acesso de um usuário específico a um client específico;
 *   2. `agency_clients` + `agency_workspaces.owner_user_id` -- a mesma
 *      relação que a RLS de `agency_workspaces`/`agency_clients` já usa
 *      para "esta agência pertence a este usuário, este client pertence a
 *      esta agência".
 * Função PURA -- decide só a partir de relações já buscadas, testável sem
 * banco. `resolveCompanyContext()` busca os dados reais e chama esta função.
 */
export interface AdminCompanyAuthorizationInputs {
  role: string;
  hasExplicitClientUserAccessGrant: boolean;
  ownedAgencyIds: string[];
  agencyIdsLinkedToCompany: string[];
}

export function isCompanyAuthorizedForAdmin(inputs: AdminCompanyAuthorizationInputs): boolean {
  if (inputs.role === "super_admin") return true;
  if (inputs.hasExplicitClientUserAccessGrant) return true;
  return inputs.ownedAgencyIds.some((id) => inputs.agencyIdsLinkedToCompany.includes(id));
}

// ── Async orchestration (I/O real, sem duplicar auth) ───────────────────

async function resolveClientSurface(companyId: string): Promise<WorkspaceSurface> {
  try {
    const adminDb = createSupabaseAdminClient();
    const { data } = await adminDb
      .from("agency_clients")
      .select("id")
      .eq("client_id", companyId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    return data ? "agency_client" : "direct_business";
  } catch {
    // agency_clients pode não existir ainda — mesmo padrão já usado em workspaces/*.
    return "direct_business";
  }
}

async function validateExplicitCompany(companyId: string): Promise<{ id: string; company_name: string | null } | null> {
  try {
    const adminDb = createSupabaseAdminClient();
    let result = await adminDb
      .from("clients")
      .select("id, company_name, status, deleted_at, archived_at")
      .eq("id", companyId)
      .in("status", CLIENT_VISIBLE_STATUSES)
      .is("deleted_at", null)
      .is("archived_at", null)
      .maybeSingle();
    if (result.error && isMissingClientVisibilityColumn(result.error)) {
      result = await adminDb
        .from("clients")
        .select("id, company_name, status")
        .eq("id", companyId)
        .in("status", CLIENT_VISIBLE_STATUSES)
        .maybeSingle() as typeof result;
    }
    if (!result.data || !isVisibleClientRecord(result.data)) return null;
    return { id: result.data.id, company_name: result.data.company_name ?? null };
  } catch {
    return null;
  }
}

/**
 * Sprint MVP Dogfood Security + Voice Closure V0.1 (Fase 6) — busca as
 * relações REAIS (nenhuma tabela nova) e delega a decisão a
 * `isCompanyAuthorizedForAdmin()`. Fail closed: qualquer erro de consulta
 * vira lista vazia / grant ausente, NUNCA autorização implícita.
 */
async function fetchAdminCompanyAuthorization(userId: string, companyId: string, role: string): Promise<boolean> {
  if (role === "super_admin") return true;

  const adminDb = createSupabaseAdminClient();

  let hasExplicitClientUserAccessGrant = false;
  try {
    const { data } = await adminDb
      .from("client_user_access")
      .select("id")
      .eq("client_id", companyId)
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    hasExplicitClientUserAccessGrant = !!data;
  } catch {
    // tabela pode não existir ainda — nunca autoriza por conta disso, só não decide sozinha aqui.
  }

  let ownedAgencyIds: string[] = [];
  try {
    const { data } = await adminDb.from("agency_workspaces").select("id").eq("owner_user_id", userId);
    ownedAgencyIds = ((data ?? []) as { id: string }[]).map((row) => row.id);
  } catch {
    ownedAgencyIds = [];
  }

  let agencyIdsLinkedToCompany: string[] = [];
  if (ownedAgencyIds.length > 0) {
    try {
      const { data } = await adminDb
        .from("agency_clients")
        .select("agency_id")
        .eq("client_id", companyId)
        .eq("status", "active")
        .in("agency_id", ownedAgencyIds);
      agencyIdsLinkedToCompany = ((data ?? []) as { agency_id: string }[]).map((row) => row.agency_id);
    } catch {
      agencyIdsLinkedToCompany = [];
    }
  }

  return isCompanyAuthorizedForAdmin({ role, hasExplicitClientUserAccessGrant, ownedAgencyIds, agencyIdsLinkedToCompany });
}

/**
 * Fase 7 — único ponto assíncrono. `explicitCompanyId` é o `?company=`/`?client=`
 * já lido pela página chamadora (nunca lido daqui, para não duplicar parsing
 * de query string por rota).
 */
export async function resolveCompanyContext(explicitCompanyId?: string | null): Promise<CompanyContextResolution> {
  const preview = await getWorkspacePreviewContext();
  const previewActive = preview.status === "active_read_only" && !!preview.context;

  if (previewActive) {
    return resolveCompanyContextFromInputs({
      preview: {
        active: true,
        workspaceId: preview.context!.workspaceId,
        workspaceName: preview.context!.workspaceName,
        surface: preview.context!.surface,
      },
      session: { authenticated: true, role: "super_admin" },
      clientPortalCompany: null,
      adminSelectedCompany: null,
      explicitCompanyRequestedButInvalid: false,
    });
  }

  const authClient = await createServerSupabaseClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return resolveCompanyContextFromInputs({
      preview: { active: false, workspaceId: null, workspaceName: null, surface: null },
      session: { authenticated: false, role: null },
      clientPortalCompany: null,
      adminSelectedCompany: null,
      explicitCompanyRequestedButInvalid: false,
    });
  }

  const { data: profile } = await authClient.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = resolveEffectiveUserRole({
    profileRole: profile?.role as string | undefined,
    userMetadataRole: user.user_metadata?.role as string | undefined,
    appMetadataRole: user.app_metadata?.role as string | undefined,
  });

  let clientPortalCompany: CompanyContextInputs["clientPortalCompany"] = null;
  if (role && canAccessClient(role)) {
    const resolved = await resolveCurrentClient();
    if (resolved?.clientId && resolved.client) {
      const surface = await resolveClientSurface(resolved.clientId);
      clientPortalCompany = {
        companyId: resolved.clientId,
        companyName: (resolved.client.company_name as string) ?? null,
        surface,
      };
    }
  }

  let adminSelectedCompany: CompanyContextInputs["adminSelectedCompany"] = null;
  let explicitCompanyRequestedButInvalid = false;
  if (role && canAccessAdmin(role) && explicitCompanyId) {
    const validated = await validateExplicitCompany(explicitCompanyId);
    // P0 (CODEX WEB): existir e estar visível não é suficiente -- precisa
    // de uma relação real de autorização (super_admin global, ou
    // client_user_access / agency_clients+agency_workspaces.owner_user_id
    // para "admin"). Fail closed: qualquer resultado negativo cai no MESMO
    // "company_not_found" do UUID inexistente, nunca revela existência.
    const authorized = validated ? await fetchAdminCompanyAuthorization(user.id, validated.id, role) : false;
    if (validated && authorized) {
      const surface = await resolveClientSurface(validated.id);
      adminSelectedCompany = { companyId: validated.id, companyName: validated.company_name, surface };
    } else {
      explicitCompanyRequestedButInvalid = true;
    }
  }

  return resolveCompanyContextFromInputs({
    preview: { active: false, workspaceId: null, workspaceName: null, surface: null },
    session: { authenticated: true, role },
    clientPortalCompany,
    adminSelectedCompany,
    explicitCompanyRequestedButInvalid,
  });
}
