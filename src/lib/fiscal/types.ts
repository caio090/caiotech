/** Fase 34: apenas mapa de módulo futuro -- nenhum cálculo de imposto, nenhuma emissão, nenhuma integração com Receita/município/União. Todo status é "planned". */
export type FiscalModuleStatus = "planned";

export interface FiscalDocument {
  id: string;
  type: "nfe" | "nfce" | "nfse" | "receipt";
  status: FiscalModuleStatus;
}

export interface FiscalOperation {
  id: string;
  description: string;
  status: FiscalModuleStatus;
}

export interface FiscalProvider {
  id: string;
  label: string;
  status: FiscalModuleStatus;
}

export interface FiscalRequirement {
  id: string;
  description: string;
  applicableSegments: string[];
  status: FiscalModuleStatus;
}

export interface FiscalReconciliation {
  id: string;
  description: string;
  status: FiscalModuleStatus;
}

export interface FiscalEmissionQueue {
  id: string;
  status: FiscalModuleStatus;
  pendingCount: number;
}

/** Mapa demonstrativo -- não afirma compatibilidade fiscal universal. */
export const FISCAL_MODULE_MAP = {
  status: "planned" as FiscalModuleStatus,
  notes: "Nenhum cálculo de imposto, emissão de nota ou integração fiscal real existe nesta branch. Este arquivo só documenta o formato futuro do módulo.",
};
