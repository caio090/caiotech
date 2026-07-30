/**
 * Generic, provider-agnostic presentation layer for digital menu
 * connections (Fase 3 of the "Cardápios digitais" brief). OlaClick is one
 * possible provider, never the domain itself -- LOKAT OS owns "Cardápio
 * digital", the provider is just a labeled field inside it.
 *
 * Deliberately separate from `./types.ts` (`DigitalMenuConnection`,
 * `DigitalMenuAdapter`): those are the literal `olaclick_connections` DB row
 * shape and the server-side adapter contract used by the real API routes --
 * renaming/reshaping them is out of scope and unnecessary risk to working
 * code. This file is the UI-facing status summary built ON TOP of that data.
 */

export interface DigitalMenuProvider {
  id: string;
  code: string;
  displayName: string;
  adapterKey: string;
  logoUrl?: string;
  documentationUrl?: string;
  supportedCapabilities: DigitalMenuCapability[];
  connectionRequirements: string[];
}

export type DigitalMenuCapability =
  | "ORDERS"
  | "ORDER_ITEMS"
  | "PRODUCTS"
  | "ADDITIONS"
  | "DISCOUNTS"
  | "FEES"
  | "PAYMENTS"
  | "CANCELLATIONS"
  | "MENU"
  | "INVENTORY"
  | "CUSTOMERS_ANONYMIZED"
  | "OPENING_HOURS"
  | "ORDER_STATUS";

export const DIGITAL_MENU_CAPABILITY_LABEL: Record<DigitalMenuCapability, string> = {
  ORDERS: "Pedidos",
  ORDER_ITEMS: "Itens dos pedidos",
  PRODUCTS: "Produtos",
  ADDITIONS: "Adicionais",
  DISCOUNTS: "Descontos",
  FEES: "Taxas",
  PAYMENTS: "Pagamentos",
  CANCELLATIONS: "Cancelamentos",
  MENU: "Cardápio",
  INVENTORY: "Estoque",
  CUSTOMERS_ANONYMIZED: "Clientes (anonimizado)",
  OPENING_HOURS: "Horário de funcionamento",
  ORDER_STATUS: "Status do pedido",
};

export type DigitalMenuConnectionStatus =
  | "NOT_LINKED"
  | "LINKING"
  | "CONNECTED"
  | "SYNCING"
  | "UPDATED"
  | "PARTIAL"
  | "NO_DATA_FOR_PERIOD"
  | "EXPIRED_CREDENTIAL"
  | "INSUFFICIENT_PERMISSION"
  | "CONNECTION_ERROR"
  | "RUNTIME_NOT_VALIDATED";

export const DIGITAL_MENU_CONNECTION_STATUS_LABEL: Record<DigitalMenuConnectionStatus, string> = {
  NOT_LINKED: "Não vinculado",
  LINKING: "Vinculando",
  CONNECTED: "Conectado",
  SYNCING: "Sincronizando",
  UPDATED: "Atualizado",
  PARTIAL: "Parcial",
  NO_DATA_FOR_PERIOD: "Sem dados no período",
  EXPIRED_CREDENTIAL: "Credencial expirada",
  INSUFFICIENT_PERMISSION: "Permissão insuficiente",
  CONNECTION_ERROR: "Erro de conexão",
  RUNTIME_NOT_VALIDATED: "Runtime não validado",
};

/**
 * A status can only ever claim CONNECTED/SYNCING/UPDATED/PARTIAL when
 * `runtimeValidated` is true -- a row existing in `olaclick_connections` is
 * not, by itself, proof of anything (Fase 20: "status Conectada exige
 * runtimeValidated").
 */
const STATUSES_REQUIRING_RUNTIME_PROOF: ReadonlySet<DigitalMenuConnectionStatus> = new Set(["CONNECTED", "SYNCING", "UPDATED", "PARTIAL"]);

export function resolveConnectionStatus(input: { hasConnectionRow: boolean; runtimeValidated: boolean; credentialExpired?: boolean; permissionDenied?: boolean; connectionError?: boolean; hasDataForPeriod?: boolean }): DigitalMenuConnectionStatus {
  if (!input.hasConnectionRow) return "NOT_LINKED";
  if (input.credentialExpired) return "EXPIRED_CREDENTIAL";
  if (input.permissionDenied) return "INSUFFICIENT_PERMISSION";
  if (input.connectionError) return "CONNECTION_ERROR";
  if (!input.runtimeValidated) return "RUNTIME_NOT_VALIDATED";
  if (input.hasDataForPeriod === false) return "NO_DATA_FOR_PERIOD";
  return "UPDATED";
}

export function isConnectedStatus(status: DigitalMenuConnectionStatus, runtimeValidated: boolean): boolean {
  return STATUSES_REQUIRING_RUNTIME_PROOF.has(status) && runtimeValidated;
}

export interface DigitalMenuConnectionOverview {
  id: string | null;
  workspaceId: string;
  providerCode: string;
  externalStoreId: string | null;
  externalStoreName: string | null;
  status: DigitalMenuConnectionStatus;
  runtimeValidated: boolean;
  lastRuntimeCheckAt: string | null;
  lastSuccessfulSyncAt: string | null;
  coveredPeriod: { start: string; end: string } | null;
  capabilities: DigitalMenuCapability[];
  warnings: string[];
  errors: string[];
}
