import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createServerSupabaseClient, createRequiredSupabaseAdminClient, hasSupabaseServiceRoleKey } from "@/lib/supabase/server";
import type { WorkspaceContext, WorkspaceSurface } from "./types";

/**
 * Server-side-only resolution of a Super Admin's "Visualizar como" preview.
 * Fase "Modo de visualização": the URL may carry which surface/workspace to
 * RENDER, but never authorization — every field is re-validated here against
 * real session + database state. A missing/invalid/unauthorized combination
 * returns null; callers must render the real admin panel (or a 403), never
 * a default preview.
 *
 * This does NOT change the user's session, cookies, or role — the person
 * previewing is still, and remains, a super_admin. See readOnly enforcement
 * in src/config/workspace-capabilities.ts (isMutatingCapability) and in any
 * server action a previewed page might call — the action itself is
 * responsible for re-checking previewReadOnly, this resolver only computes it.
 */

const VALID_PREVIEW_SURFACES: WorkspaceSurface[] = ["agency", "agency_client", "direct_business"];

export interface PreviewRequest {
  previewSurface?: string;
  workspaceId?: string;
}

export type PreviewResolution =
  | { ok: true; context: WorkspaceContext }
  | { ok: false; reason: string };

export async function resolveWorkspacePreview(request: PreviewRequest): Promise<PreviewResolution> {
  const surface = request.previewSurface as WorkspaceSurface | undefined;
  const workspaceId = request.workspaceId?.trim();

  if (!surface || !workspaceId) return { ok: false, reason: "missing_params" };
  if (!VALID_PREVIEW_SURFACES.includes(surface)) return { ok: false, reason: "invalid_surface" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  if (!hasSupabaseServiceRoleKey()) return { ok: false, reason: "service_unavailable" };

  const authClient = await createServerSupabaseClient();
  const { data: profile } = await authClient.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || profile.role !== "super_admin") return { ok: false, reason: "forbidden_not_super_admin" };

  const adminDb = createRequiredSupabaseAdminClient();

  if (surface === "agency") {
    try {
      const { data: agency } = await adminDb.from("agency_workspaces").select("id, name, status").eq("id", workspaceId).maybeSingle();
      if (!agency || agency.status !== "active") return { ok: false, reason: "agency_not_found_or_inactive" };
      return {
        ok: true,
        context: {
          surface: "agency", workspaceId: agency.id, workspaceName: agency.name,
          parentWorkspaceId: null, parentWorkspaceName: null, isPreview: true, readOnly: true,
        },
      };
    } catch {
      return { ok: false, reason: "agency_workspaces_table_unavailable" };
    }
  }

  if (surface === "direct_business") {
    const { data: client } = await adminDb.from("clients").select("id, company_name, deleted_at, archived_at").eq("id", workspaceId).maybeSingle();
    if (!client || client.deleted_at || client.archived_at) return { ok: false, reason: "business_not_found" };
    // "Direct" means no agency_clients link exists for this client.
    try {
      const { data: link } = await adminDb.from("agency_clients").select("id").eq("client_id", workspaceId).maybeSingle();
      if (link) return { ok: false, reason: "business_is_agency_managed_not_direct" };
    } catch { /* agency_clients pode não existir — tratado como ausência de vínculo, não como erro */ }
    return {
      ok: true,
      context: {
        surface: "direct_business", workspaceId: client.id, workspaceName: client.company_name,
        parentWorkspaceId: null, parentWorkspaceName: null, isPreview: true, readOnly: true,
      },
    };
  }

  // surface === "agency_client"
  const { data: client } = await adminDb.from("clients").select("id, company_name, deleted_at, archived_at").eq("id", workspaceId).maybeSingle();
  if (!client || client.deleted_at || client.archived_at) return { ok: false, reason: "client_not_found" };
  try {
    const { data: link } = await adminDb.from("agency_clients").select("agency_id").eq("client_id", workspaceId).eq("status", "active").maybeSingle();
    if (!link) return { ok: false, reason: "no_active_agency_relationship" };
    const { data: agency } = await adminDb.from("agency_workspaces").select("id, name").eq("id", link.agency_id).maybeSingle();
    return {
      ok: true,
      context: {
        surface: "agency_client", workspaceId: client.id, workspaceName: client.company_name,
        parentWorkspaceId: agency?.id ?? null, parentWorkspaceName: agency?.name ?? null,
        isPreview: true, readOnly: true,
      },
    };
  } catch {
    return { ok: false, reason: "agency_clients_table_unavailable" };
  }
}

/** The unpreviewed, real context for a normal signed-in super_admin — never marked as preview. */
export function realSuperAdminContext(): WorkspaceContext {
  return {
    surface: "super_admin", workspaceId: null, workspaceName: null,
    parentWorkspaceId: null, parentWorkspaceName: null, isPreview: false, readOnly: false,
  };
}
