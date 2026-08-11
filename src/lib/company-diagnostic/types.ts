/**
 * Sprint MVP Core Closure V2 (Fase 3) — Company Diagnostic → Finding →
 * Recommendation → Roadmap. Modelo mínimo, espelhando exatamente
 * docs/supabase/91-company-diagnostic-roadmap.sql (schema ainda não
 * executado -- ver Fase 6, "schema gate"). `clients.id` continua sendo a
 * Company; nenhuma tabela de Company nova.
 */
export type DiagnosticStatus = "in_progress" | "completed" | "archived";
export type ChecklistItemStatus = "yes" | "no" | "partial" | "unknown";
export type FindingSeverity = "low" | "medium" | "high";
export type FindingPriority = "low" | "medium" | "high";
export type FindingStatus = "open" | "in_roadmap" | "resolved" | "ignored";
export type RecommendationCapability = "internal_execution" | "external_execution" | "coming_soon" | "not_supported";
export type RoadmapItemStatus = "planned" | "in_project" | "in_campaign" | "done" | "dismissed";
export type RoadmapSourceType = "diagnostic_recommendation" | "radar" | "manual";

export interface CompanyDiagnostic {
  id: string;
  companyId: string;
  status: DiagnosticStatus;
  nicheCategory: string | null;
  nicheSubcategory: string | null;
  operationType: "b2b" | "b2c" | "both" | null;
  locationCity: string | null;
  locationState: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface DiagnosticChecklistItem {
  id: string;
  diagnosticId: string;
  category: string;
  label: string;
  status: ChecklistItemStatus;
  notes: string | null;
  evidenceUrl: string | null;
}

export interface DiagnosticFinding {
  id: string;
  diagnosticId: string;
  companyId: string;
  category: string;
  title: string;
  description: string | null;
  evidenceUrl: string | null;
  severity: FindingSeverity;
  priority: FindingPriority;
  status: FindingStatus;
  source: string;
}

export interface DiagnosticRecommendation {
  id: string;
  findingId: string;
  title: string;
  description: string | null;
  capability: RecommendationCapability;
}

export interface RoadmapItem {
  id: string;
  companyId: string;
  sourceType: RoadmapSourceType;
  sourceId: string | null;
  title: string;
  priority: FindingPriority;
  status: RoadmapItemStatus;
  destinationCapability: RecommendationCapability | null;
  dueDate: string | null;
  projectId: string | null;
}

/**
 * Fase 46 (No Hallucination) — toda leitura desta camada retorna um destes
 * três estados, nunca inventa um deles a partir do outro:
 *   - `unavailable`: a tabela ainda não existe no Supabase alvo (schema 91
 *     não aplicado) OU a query falhou por outro motivo real. NUNCA
 *     tratado como "vazio real".
 *   - `available` com valor `null`/`[]`: a tabela existe, a query rodou,
 *     não há dado real ainda para esta Company -- estado vazio honesto.
 *   - `available` com valor presente: dado real.
 */
export type SourceFetchResult<T> =
  | { status: "unavailable" }
  | { status: "available"; data: T };
