/**
 * Local-only, in-memory fixtures for when no real agency/second-client/
 * direct-business exists yet — which is the actual state of this database
 * today (audit confirmed: only Duh Lanches exists as a real `clients` row;
 * no `agency_workspaces` row, no second client, no direct-business signup).
 *
 * Never persisted, never real IDs, never Duh Lanches' real numbers — every
 * value here is clearly fictional and labeled "Estrutura demonstrativa" by
 * every consumer (see workspace-entity-selector.tsx). These do not
 * participate in resolveWorkspacePreview() at all — a blueprint can be
 * LOOKED AT but never actually entered as a preview target, since
 * preview.ts only validates real database rows.
 */

export interface BlueprintWorkspace {
  id: string;
  name: string;
  kind: "agency" | "agency_client" | "direct_business";
  parentName?: string;
  connectionState: "demo" | "disconnected";
}

export const BLUEPRINT_AGENCY: BlueprintWorkspace = {
  id: "blueprint-agency-01", name: "Agência de Teste (Blueprint)", kind: "agency", connectionState: "demo",
};

export const BLUEPRINT_AGENCY_CLIENTS: BlueprintWorkspace[] = [
  { id: "blueprint-client-01", name: "Cliente de Teste 02 (Blueprint)", kind: "agency_client", parentName: BLUEPRINT_AGENCY.name, connectionState: "disconnected" },
];

export const BLUEPRINT_DIRECT_BUSINESS: BlueprintWorkspace = {
  id: "blueprint-business-01", name: "Empresa/Autônomo de Teste (Blueprint)", kind: "direct_business", connectionState: "demo",
};

export const ALL_BLUEPRINTS: BlueprintWorkspace[] = [BLUEPRINT_AGENCY, ...BLUEPRINT_AGENCY_CLIENTS, BLUEPRINT_DIRECT_BUSINESS];
