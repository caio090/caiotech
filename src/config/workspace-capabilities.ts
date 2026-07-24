import type { WorkspaceSurface } from "@/lib/workspaces/types";

/**
 * Central capability registry. Modules must gate on a capability
 * (WorkspaceCapabilityGate, src/components/workspaces/workspace-capability-gate.tsx)
 * — never on `role === "x"` scattered across components. This is exactly
 * what the audit found missing: three unsynced role/account-type
 * vocabularies (src/lib/access-control.ts, src/lib/account-permissions.ts,
 * src/lib/account-types.ts) with role checks spread across 20+ files.
 * This registry doesn't replace those — it sits ABOVE them, so a page only
 * ever asks "can this surface do X", not "which of the three role systems
 * says so".
 */

export type WorkspaceCapability =
  // platform (super_admin surface)
  | "platform.manage"
  | "platform.view_status"
  | "platform.manage_agencies"
  | "platform.manage_businesses"
  | "platform.preview_surfaces"
  // agency surface
  | "agency.view_dashboard"
  | "agency.manage_clients"
  | "agency.manage_team"
  | "agency.view_multi_client_rec_os"
  | "agency.view_multi_client_reports"
  | "agency.manage_production"
  | "agency.manage_approvals"
  // direct business surface
  | "business.view_own_dashboard"
  | "business.manage_own_business"
  | "business.view_own_rec_os"
  | "business.view_own_reports"
  | "business.manage_own_finance"
  | "business.manage_own_integrations"
  | "business.manage_own_team"
  // agency client portal surface
  | "client_portal.view_content"
  | "client_portal.approve_content"
  | "client_portal.view_calendar"
  | "client_portal.view_reports"
  | "client_portal.create_requests"
  | "client_portal.view_finance"
  // support
  | "support.preview_workspace";

const SUPER_ADMIN_CAPABILITIES: WorkspaceCapability[] = [
  "platform.manage", "platform.view_status", "platform.manage_agencies",
  "platform.manage_businesses", "platform.preview_surfaces", "support.preview_workspace",
];

const AGENCY_CAPABILITIES: WorkspaceCapability[] = [
  "agency.view_dashboard", "agency.manage_clients", "agency.manage_team",
  "agency.view_multi_client_rec_os", "agency.view_multi_client_reports",
  "agency.manage_production", "agency.manage_approvals",
];

const DIRECT_BUSINESS_CAPABILITIES: WorkspaceCapability[] = [
  "business.view_own_dashboard", "business.manage_own_business", "business.view_own_rec_os",
  "business.view_own_reports", "business.manage_own_finance", "business.manage_own_integrations",
  "business.manage_own_team",
];

const AGENCY_CLIENT_CAPABILITIES: WorkspaceCapability[] = [
  "client_portal.view_content", "client_portal.approve_content", "client_portal.view_calendar",
  "client_portal.view_reports", "client_portal.create_requests", "client_portal.view_finance",
];

const CAPABILITIES_BY_SURFACE: Record<WorkspaceSurface, WorkspaceCapability[]> = {
  super_admin: SUPER_ADMIN_CAPABILITIES,
  agency: AGENCY_CAPABILITIES,
  agency_client: AGENCY_CLIENT_CAPABILITIES,
  direct_business: DIRECT_BUSINESS_CAPABILITIES,
};

/** A capability a read-only preview must never grant, regardless of surface — every mutation-shaped capability. */
const MUTATING_CAPABILITIES = new Set<WorkspaceCapability>([
  "platform.manage", "platform.manage_agencies", "platform.manage_businesses",
  "agency.manage_clients", "agency.manage_team", "agency.manage_production", "agency.manage_approvals",
  "business.manage_own_business", "business.manage_own_finance", "business.manage_own_integrations", "business.manage_own_team",
  "client_portal.approve_content", "client_portal.create_requests",
]);

export function isMutatingCapability(capability: WorkspaceCapability): boolean {
  return MUTATING_CAPABILITIES.has(capability);
}

/**
 * Pure resolver: surface + readOnly -> the exact capability list a page may
 * render against. A read-only preview keeps every capability for VISIBILITY
 * (so the UI can still show what a real agency owner would see) but the
 * caller must check isMutatingCapability() before allowing any action —
 * see WorkspaceCapabilityGate, which does this automatically.
 */
export function resolveCapabilities(surface: WorkspaceSurface): WorkspaceCapability[] {
  return CAPABILITIES_BY_SURFACE[surface] ?? [];
}

export function hasCapability(surface: WorkspaceSurface, capability: WorkspaceCapability): boolean {
  return resolveCapabilities(surface).includes(capability);
}

export const SURFACE_LABELS: Record<WorkspaceSurface, string> = {
  super_admin: "Super Admin",
  agency: "Agência",
  agency_client: "Cliente da agência",
  direct_business: "Empresa direta",
};
