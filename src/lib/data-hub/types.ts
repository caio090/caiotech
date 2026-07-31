/**
 * Data Hub — camada que recebe informação de módulos internos, arquivos,
 * planilhas, documentos e integrações, e a envelopa com proveniência,
 * confiança e qualidade antes de qualquer módulo consumir. Não é um banco
 * paralelo: nenhum tipo aqui implica persistência própria (Fase 7).
 */

export type DataSourceType =
  | "internal_module"
  | "api"
  | "csv"
  | "xlsx"
  | "json"
  | "pdf"
  | "image"
  | "manual"
  | "whatsapp"
  | "calendar"
  | "bank_statement"
  | "fiscal_document"
  | "webhook";

export interface DataSource {
  id: string;
  label: string;
  type: DataSourceType;
  ownerModuleId?: string;
  description: string;
}

export type DataCapability = "read" | "import" | "normalize" | "reconcile" | "export";

export type DataConfidence = "confirmed" | "calculated" | "estimated" | "incomplete" | "divergent" | "unknown";

export type DataQualityStatus = "valid" | "partial" | "invalid" | "missing_fields" | "duplicate" | "inconsistent" | "processing" | "blocked";

export interface DataQualityIssue {
  field: string;
  status: DataQualityStatus;
  message: string;
}

export interface DataProvenance {
  sourceId: string;
  origin: string;
  collectedAt: string;
  updatedAt: string;
  confidence: DataConfidence;
  quality: DataQualityStatus;
  responsible?: string;
  importBatchId?: string;
  externalId?: string;
  transformationApplied?: string;
  originalValue?: string;
  normalizedValue?: string;
}

export interface DataRecordEnvelope<T> {
  data: T;
  provenance: DataProvenance;
  issues: DataQualityIssue[];
}

export interface DataImportBatch {
  id: string;
  sourceId: string;
  startedAt: string;
  finishedAt?: string;
  recordCount: number;
  successCount: number;
  errorCount: number;
  status: "pending" | "processing" | "completed" | "failed";
}

export interface DataFieldMapping {
  sourceField: string;
  targetField: string;
  transform?: string;
}

/** O que um módulo declara que produz/consome, na mesma linguagem do platform-modules.ts. */
export interface ModuleDataContract {
  moduleId: string;
  consumes: string[];
  produces: string[];
}

export type DataHubEventType = "source_registered" | "batch_started" | "batch_completed" | "batch_failed" | "quality_issue_detected" | "record_normalized";

export interface DataHubEvent {
  id: string;
  type: DataHubEventType;
  sourceId: string;
  occurredAt: string;
  payload: Record<string, string | number | boolean | null>;
}
