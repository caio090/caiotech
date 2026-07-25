import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { verifyPreviewSessionToken, WORKSPACE_PREVIEW_COOKIE } from "./preview-session";
import { resolveWorkspacePreview } from "./preview";
import { BLUEPRINT_AGENCY, BLUEPRINT_AGENCY_CLIENTS, BLUEPRINT_DIRECT_BUSINESS } from "./blueprint-fixtures";
import { recordWorkspaceAuditEvent } from "./audit-log";
import type { WorkspaceContext } from "./types";

export type PreviewContextStatus = "inactive" | "active_read_only" | "invalid" | "expired" | "revoked";

export interface ResolvedPreviewContext {
  status: PreviewContextStatus;
  context: WorkspaceContext | null;
}

function blueprintName(id: string): string | null {
  if (id === BLUEPRINT_AGENCY.id) return BLUEPRINT_AGENCY.name;
  if (id === BLUEPRINT_DIRECT_BUSINESS.id) return BLUEPRINT_DIRECT_BUSINESS.name;
  const client = BLUEPRINT_AGENCY_CLIENTS.find((c) => c.id === id);
  return client?.name ?? null;
}

/**
 * The ONLY function any page or route should call to know "is a preview
 * active right now, and what is it". Reads the signed cookie, then
 * re-validates EVERYTHING against the current session and database —
 * fail closed on any mismatch (Fase 7: "Ele deve... verificar expiração;
 * retornar contexto tipado; falhar fechado").
 */
export async function getWorkspacePreviewContext(): Promise<ResolvedPreviewContext> {
  const cookieStore = await cookies();
  const token = cookieStore.get(WORKSPACE_PREVIEW_COOKIE)?.value;
  if (!token) return { status: "inactive", context: null };

  const verified = verifyPreviewSessionToken(token);
  if (!verified.ok) {
    if (verified.reason === "expired") {
      recordWorkspaceAuditEvent({
        type: "workspace_preview_expired",
        uid: verified.payload.uid, surface: verified.payload.surface,
        workspaceId: verified.payload.workspaceId, isBlueprint: verified.payload.isBlueprint,
      });
      return { status: "expired", context: null };
    }
    return { status: "invalid", context: null };
  }
  const { payload } = verified;

  // Re-validate the signer is still the current, authenticated, super_admin user.
  const user = await getCurrentUser();
  if (!user || user.id !== payload.uid) return { status: "revoked", context: null };

  const authClient = await createServerSupabaseClient();
  const { data: profile } = await authClient.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || profile.role !== "super_admin") return { status: "revoked", context: null };

  if (payload.isBlueprint) {
    const name = blueprintName(payload.workspaceId);
    if (!name) return { status: "invalid", context: null };
    // Fase 4 do hotfix 1.0.4 — parentWorkspaceName nunca era resolvido aqui
    // (sempre null), mesmo quando payload.parentWorkspaceId apontava para o
    // blueprint da agência — daí o banner sempre mostrar "Atendido por: —"
    // para o Cliente de Teste 02. blueprintName() já resolve qualquer id de
    // fixture, incluindo o da agência-pai.
    const parentName = payload.parentWorkspaceId ? blueprintName(payload.parentWorkspaceId) : null;
    return {
      status: "active_read_only",
      context: {
        surface: payload.surface, workspaceId: payload.workspaceId, workspaceName: name,
        parentWorkspaceId: payload.parentWorkspaceId, parentWorkspaceName: parentName,
        relationshipType: payload.parentWorkspaceId ? "managed_client" : null,
        isPreview: true, readOnly: true,
      },
    };
  }

  // Real workspace — re-run the full existence/relationship validation,
  // never trust that "it was valid when the cookie was issued" still holds.
  const resolution = await resolveWorkspacePreview({ previewSurface: payload.surface, workspaceId: payload.workspaceId });
  if (!resolution.ok) return { status: "invalid", context: null };
  return { status: "active_read_only", context: resolution.context };
}

/** Convenience boolean check — true whenever ANY preview is active, regardless of surface. The mutation guard (assert-not-preview.ts) calls getWorkspacePreviewContext() directly instead, since it also needs surface/workspaceId for the audit log. */
export async function isWorkspacePreviewActive(): Promise<boolean> {
  const resolved = await getWorkspacePreviewContext();
  return resolved.status === "active_read_only";
}
