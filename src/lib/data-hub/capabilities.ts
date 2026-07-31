import type { DataCapability, DataSourceType } from "./types";

/** Quais capacidades cada tipo de fonte suporta hoje, de forma determinística -- não uma promessa, um fato sobre o que já está implementado nesta sprint (nenhum). */
const CAPABILITIES_BY_SOURCE_TYPE: Record<DataSourceType, DataCapability[]> = {
  internal_module: ["read", "normalize"],
  api: ["read"],
  csv: ["read", "import", "normalize"],
  xlsx: ["read", "import", "normalize"],
  json: ["read", "import"],
  pdf: ["read"],
  image: ["read"],
  manual: ["read", "import"],
  whatsapp: ["read"],
  calendar: ["read", "normalize"],
  bank_statement: ["read", "import", "reconcile"],
  fiscal_document: ["read"],
  webhook: ["read"],
};

export function resolveDataCapabilities(sourceType: DataSourceType): DataCapability[] {
  return CAPABILITIES_BY_SOURCE_TYPE[sourceType] ?? [];
}

export function hasDataCapability(sourceType: DataSourceType, capability: DataCapability): boolean {
  return resolveDataCapabilities(sourceType).includes(capability);
}
