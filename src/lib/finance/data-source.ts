/**
 * Lightweight, generic data-provenance model (Fase 4 of the "Centro de
 * Comando" brief) — scoped narrowly for this sprint to the typed model +
 * badge only. Full wiring to a live OlaClick provider/capability registry
 * is explicitly deferred to a future, separately-scoped session (an
 * existing, mature server-side integration already lives in
 * src/lib/olaclick.ts and src/lib/digital-menu/ and deserves its own
 * careful audit rather than a rushed pass here).
 */

export type BusinessDataSourceType =
  | "olaclick"
  | "spreadsheet"
  | "google_sheets"
  | "manual"
  | "diagnostic"
  | "lokat_calculation"
  | "supabase"
  | "future_integration";

export type DataFreshness = "live" | "recent" | "stale" | "unknown" | "unavailable";

export type DataReliability = "integrated" | "imported" | "manual" | "derived" | "simulated" | "incomplete";

export interface DataProvenance {
  id: string;
  source: BusinessDataSourceType;
  sourceLabel: string;
  dataNature: "actual" | "planned" | "theoretical" | "projected" | "estimated" | "simulated";
  reliability: DataReliability;
  periodStart: string | null;
  periodEnd: string | null;
  lastUpdatedAt: string | null;
  calculationVersion: string;
  fieldsUsed: string[];
  excludedRecords: string[];
  warnings: string[];
  isSimulated: boolean;
}

const SOURCE_LABEL: Record<BusinessDataSourceType, string> = {
  olaclick: "Fonte: OlaClick",
  spreadsheet: "Fonte: Planilha importada",
  google_sheets: "Fonte: Google Planilhas",
  manual: "Fonte: Preenchimento manual",
  diagnostic: "Fonte: Diagnóstico",
  lokat_calculation: "Calculado pela Lokat",
  supabase: "Fonte: Banco de dados",
  future_integration: "Integração futura",
};

export function describeDataSource(source: BusinessDataSourceType): string {
  return SOURCE_LABEL[source] ?? source;
}

/** Builds the provenance record for this sprint's demo dataset — every finance number in this tab is simulated. */
export function buildSimulatedProvenance(overrides: Partial<DataProvenance> = {}): DataProvenance {
  return {
    id: "demo-finance-provenance",
    source: "manual",
    sourceLabel: "Exemplo simulado",
    dataNature: "simulated",
    reliability: "simulated",
    periodStart: null,
    periodEnd: null,
    lastUpdatedAt: null,
    calculationVersion: "meu-negocio-finance-v1",
    fieldsUsed: [],
    excludedRecords: [],
    warnings: ["Todos os valores desta tela são exemplos e não representam nenhum cliente real."],
    isSimulated: true,
    ...overrides,
  };
}
