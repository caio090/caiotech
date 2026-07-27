import type { BusinessArchetypeId } from "./types";

/**
 * Local-only fixtures for the "Selecione a empresa" entry screen. Deliberately
 * NOT a Supabase query — the accounts-panel-routing-audit (feat/accounts-
 * panel-routing-v1) confirmed agency_workspaces/agency_clients have zero
 * real rows and there is no real "manage as agency/business" mode yet, so
 * this screen shows demonstration cards only, never a real client fetch.
 */

export type ModuleActivationState =
  | "locked_preview"
  | "available_for_activation"
  | "setup_required"
  | "active"
  | "incomplete"
  | "suspended";

export interface CompanySelectionCard {
  id: string;
  name: string;
  /** True names of the only two real `clients` rows confirmed by the accounts audit — shown as read-only demonstration cards, never fetched from Supabase here. */
  segmentLabel: string;
  archetype: BusinessArchetypeId;
  moduleState: ModuleActivationState;
  diagnosticPercent: number;
  missingFields: string[];
  alerts: string[];
  lastUpdatedLabel: string;
}

export const COMPANY_SELECTION_FIXTURES: CompanySelectionCard[] = [
  {
    id: "duh-lanches",
    name: "Duh Lanches",
    segmentLabel: "Alimentação · Lanchonete/Delivery",
    archetype: "food_service",
    moduleState: "active",
    diagnosticPercent: 78,
    missingFields: ["Embalagem por ficha técnica", "Custo de entrega por pedido"],
    alerts: ["3 insumos abaixo do ponto de reposição"],
    lastUpdatedLabel: "Simulação atualizada nesta demonstração",
  },
  {
    id: "o-pedreirao",
    name: "O Pedreirão",
    segmentLabel: "Varejo",
    archetype: "retail",
    moduleState: "available_for_activation",
    diagnosticPercent: 22,
    missingFields: ["Catálogo de produtos", "Estoque inicial", "Fornecedores"],
    alerts: [],
    lastUpdatedLabel: "Ainda não ativado nesta demonstração",
  },
];

export function findCompanyById(id: string): CompanySelectionCard | undefined {
  return COMPANY_SELECTION_FIXTURES.find((c) => c.id === id);
}
