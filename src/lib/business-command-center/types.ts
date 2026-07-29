import type { BusinessModuleKey } from "@/lib/business-archetypes/types";

export type DataNature = "simulated" | "manual" | "imported" | "calculated" | "integrated";
export type DataState = "available" | "stale" | "missing" | "unavailable" | "simulated";
export type Confidence = "high" | "medium" | "low" | "insufficient";

export interface MetricCalculationTrace {
  metricId: string; metricLabel: string; formulaLabel: string; formulaExpression: string;
  periodStart: string; periodEnd: string; dataNature: DataNature; dataSources: string[];
  inputs: Array<{ label: string; value: number; unit: string; source: string }>;
  includedRecords: number; excludedRecords: number; coverage: number; warnings: string[];
  calculationVersion: string; calculatedAt: string; target: number | null; result: number; unit: string;
  linksToFixData: Array<{ label: string; destination: BusinessModuleKey }>;
}

export interface CommandCenterMetric {
  id: string; label: string; value: number; formattedValue: string; comparison: string;
  period: string; source: string; updatedAt: string; nature: DataNature; confidence: Confidence;
  state: DataState; tooltip: string; destination: BusinessModuleKey; alert?: string; trace: MetricCalculationTrace;
}

export interface BusinessAlert {
  id: string; priority: "high" | "medium" | "low"; title: string; explanation: string; impact: string;
  origin: string; sector: string; action: string; destination: BusinessModuleKey; suggestedOwner: string; status: "open" | "monitoring";
}

export type CommerceCapability = "orders" | "order_items" | "products" | "categories" | "modifiers" | "customers_summary" | "payments" | "discounts" | "fees" | "service_types" | "order_sources" | "cancellations" | "refunds" | "reports";
export type CapabilityState = "available" | "unauthorized" | "unavailable" | "not_implemented" | "not_tested";
export interface CommerceDataProviderCapability { resource: CommerceCapability; state: CapabilityState; source: string; lastTest: string | null; note: string; }

export type ProductCompleteness = "complete" | "incomplete" | "missing_sheet";
export type ProductCostStatus = "current" | "stale" | "missing";
export type ProductSource = "manual" | "spreadsheet" | "digital_menu" | "simulated";
export interface ProductExternalMapping { externalLabel: string; state: "linked" | "suggested" | "unlinked" | "conflict" | "archived"; technicalSheetLabel: string | null; }
export interface ProductTechnicalSheetSummary { id: string | null; label: string; version: string | null; completeness: ProductCompleteness; coverage: number; }
export interface ProductAttachment { id: string; name: string; type: "image" | "pdf" | "xlsx" | "xls" | "csv"; state: "session_only"; }
export interface ProductCatalogItem {
  id: string; image: string | null; name: string; category: string; code: string; status: "active" | "draft" | "archived";
  source: ProductSource; externalMapping: ProductExternalMapping; technicalSheet: ProductTechnicalSheetSummary;
  costCents: number | null; portionCostCents: number | null; priceCents: number; cmv: number | null; marginCents: number | null;
  costStatus: ProductCostStatus; updatedAt: string; alerts: string[]; attachments: ProductAttachment[];
}

export interface CmvEvolutionPoint { period: string; actual: number | null; theoretical: number | null; target: number; gap: number | null; coverage: number; state: "calculated" | "estimated" | "incomplete" | "unavailable"; source: string; note: string; }
export interface CmvChangeEffect { id: string; label: string; percentagePoints: number | null; state: "calculated" | "estimated" | "incomplete" | "unavailable"; explanation: string; }

export interface BusinessInsightSnapshot {
  companyLabel: string; period: string; archetype: string; metrics: Array<{ id: string; value: number; unit: string }>;
  targets: Array<{ metricId: string; value: number }>; sources: string[]; coverage: number; trends: string[];
  missingData: string[]; alerts: string[]; aggregatedProducts: Array<{ quadrant: string; count: number }>;
  stock: { valueCents: number; lowItems: number }; cash: { balanceCents: number; reserveDays: number }; question: string;
}

export interface BusinessInsightResponse {
  summary: string; situation: string;
  findings: Array<{ title: string; explanation: string; impact: string; severity: "high" | "medium" | "low"; metricIds: string[] }>;
  evidence: string[];
  hypotheses: Array<{ title: string; reason: string; evidenceMetricIds: string[]; missingEvidence: string[]; confidence: Confidence; checks: string[] }>;
  missingData: string[]; recommendedChecks: string[];
  recommendedActions: Array<{ title: string; sector: string; priority: "high" | "medium" | "low"; reason: string; destination: string; requiresConfirmation: boolean }>;
  questionsForTeam: string[]; metricReferences: string[]; confidence: Confidence; limitations: string[]; disclaimer: string;
}

export interface BusinessInsightAIProvider { analyze(snapshot: BusinessInsightSnapshot, signal?: AbortSignal): Promise<BusinessInsightResponse>; }
