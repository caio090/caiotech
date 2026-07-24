/**
 * Workspace/surface model — deliberately a thin conceptual layer over the
 * REAL existing tables/roles, not a parallel schema. Mapping, confirmed by
 * audit before writing this file:
 *
 *   WorkspaceType "platform" → the LOKAT platform itself (no row; super_admin role)
 *   WorkspaceType "agency"   → docs/supabase/69-account-types-agency-workspaces.sql
 *                              `agency_workspaces` row (id, owner_user_id, name, status, plan_slug)
 *   WorkspaceType "business" → a `clients` row (id, company_name) — used for BOTH
 *                              an agency-managed client (surface "agency_client")
 *                              and a business that signed up directly (surface
 *                              "direct_business"); which one it is depends on
 *                              whether an `agency_clients` row links it to an
 *                              `agency_workspaces` row.
 *
 * This sprint does not assume `agency_workspaces`/`agency_clients` are
 * actually applied to the live database — every read goes through a
 * try/catch exactly like the existing precedent in
 * src/app/api/admin/accounts/route.ts ("tabela pode não existir"), and a
 * missing table resolves to an honest empty state, never a fabricated one.
 *
 * "client" is deliberately never used as a type name here — this project
 * already overloads that word for both a CRM lead/client record and (in
 * this file) a business occupying a workspace; every export below says
 * Workspace/Business/Membership explicitly instead.
 */

export type WorkspaceType = "platform" | "agency" | "business";

/** What the Super Admin's "Visualizar como" menu offers — a rendering mode, never an auth grant by itself. */
export type WorkspaceSurface = "super_admin" | "agency" | "agency_client" | "direct_business";

export interface Workspace {
  id: string;
  type: WorkspaceType;
  name: string;
  /** For type "agency": agency_workspaces.id. For type "business": clients.id. Null for "platform" (no row). */
  parentWorkspaceId: string | null;
}

export type WorkspaceRelationshipType = "managed_client" | "direct_customer" | "platform_owned" | "support_access";

export interface WorkspaceRelationship {
  parentWorkspaceId: string;
  childWorkspaceId: string;
  relationshipType: WorkspaceRelationshipType;
  status: "active" | "paused" | "archived";
}

export type WorkspaceRoleWithinSurface =
  | "platform_super_admin"
  | "agency_owner" | "agency_admin" | "agency_member"
  | "agency_client_owner" | "agency_client_member"
  | "business_owner" | "business_admin" | "business_member";

export interface WorkspaceMembership {
  userId: string;
  workspaceId: string;
  role: WorkspaceRoleWithinSurface;
}

/**
 * The resolved context every page/component actually renders against.
 * Never role === "x" checks scattered around — everything reads capabilities
 * off this object (see src/config/workspace-capabilities.ts).
 */
export interface WorkspaceContext {
  surface: WorkspaceSurface;
  workspaceId: string | null;
  workspaceName: string | null;
  parentWorkspaceId: string | null;
  parentWorkspaceName: string | null;
  /**
   * How workspaceId relates to parentWorkspaceId — null when there is no
   * parent (surface "agency" and "direct_business" today). Added in the
   * hotfix 1.0.4 (Fase 4) alongside the fix for the banner always showing
   * "Atendido por: —" for a blueprint agency_client: the context carried
   * parentWorkspaceId but context.ts never resolved parentWorkspaceName
   * from it, and there was no field describing the relationship itself.
   */
  relationshipType: WorkspaceRelationshipType | null;
  /** true whenever this context came from a Super Admin preview — never true for a real session. */
  isPreview: boolean;
  /** Always true when isPreview is true. Enforced server-side (see preview.ts), never trusted from the client alone. */
  readOnly: boolean;
}

/** Support access — contract only this sprint, not persisted (see docs/supabase/DRAFT-support-access-grants.sql). */
export type SupportAccessLevel = "read_only";

export interface SupportAccessGrant {
  id: string;
  grantedToUserId: string;
  targetWorkspaceId: string;
  parentWorkspaceId: string | null;
  accessLevel: SupportAccessLevel;
  reason: string;
  expiresAt: string; // ISO
  createdBy: string;
  revokedAt: string | null;
  active: boolean;
}
