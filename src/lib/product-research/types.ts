/** Radar de Produto — registro diário de dores e oportunidades encontradas em conversas com empresários. */

export type ProductResearchSourceType = "interview" | "support_ticket" | "sales_call" | "survey" | "observation" | "internal_hypothesis";

export type ProductResearchStatus =
  | "captured"
  | "reviewing"
  | "validating"
  | "validated_problem"
  | "solution_hypothesis"
  | "planned"
  | "in_development"
  | "testing"
  | "released"
  | "rejected"
  | "archived";

export type ProductResearchFrequency = "one_off" | "occasional" | "recurring" | "constant";
export type ProductResearchSeverity = "low" | "medium" | "high" | "critical";

export interface ProductResearchEntry {
  id: string;
  title: string;
  businessSegment: string;
  businessSize: "solo" | "micro" | "small" | "medium" | "large";
  city: string;
  state: string;
  reportedProblem: string;
  currentWorkaround: string;
  frequency: ProductResearchFrequency;
  severity: ProductResearchSeverity;
  financialImpact?: string;
  operationalImpact?: string;
  affectedModules: string[];
  suggestedSolution?: string;
  evidence: string[];
  sourceType: ProductResearchSourceType;
  interviewDate: string;
  reportedBy: string;
  validationCount: number;
  status: ProductResearchStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductPainPoint {
  id: string;
  entryIds: string[];
  summary: string;
  affectedModules: string[];
  occurrenceCount: number;
  segments: string[];
}

export interface ProductOpportunity {
  id: string;
  painPointId: string;
  title: string;
  rationale: string;
  estimatedImpact: ProductResearchSeverity;
  affectedModules: string[];
  status: ProductResearchStatus;
}

export interface ProductValidationSignal {
  id: string;
  opportunityId: string;
  entryId: string;
  signalType: "confirms" | "contradicts" | "neutral";
  notes: string;
  recordedAt: string;
}

export interface ProductExperiment {
  id: string;
  opportunityId: string;
  hypothesis: string;
  metric: string;
  status: ProductResearchStatus;
  startedAt?: string;
  concludedAt?: string;
  result?: string;
}
