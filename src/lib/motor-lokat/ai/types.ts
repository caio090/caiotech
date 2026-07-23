/**
 * Motor LOKAT AI assistant — shared types (Sprint 1.2).
 *
 * The assistant never recalculates money by itself: every number it reasons
 * about is computed beforehand by the deterministic engines in
 * src/lib/motor-lokat/*-engine.ts and handed to it as read-only context.
 * The assistant only produces language, classification and *proposed*
 * updates — never a silent write.
 */

import type { BusinessSegment, CampaignInput, FinancialConfidence, FinancialDataSource } from "../types";
import type { BusinessDataSource, ProductKind } from "../business-types";

export type AssistantMode =
  | "interpret"
  | "explain"
  | "fill"
  | "campaign"
  | "product"
  | "diagnosis"
  | "report";

/** Chat-like modes stream prose. Structured modes return a single JSON payload (no partial parsing mid-stream). */
export const STREAMING_MODES: AssistantMode[] = ["interpret", "explain", "diagnosis"];
export const STRUCTURED_MODES: AssistantMode[] = ["fill", "campaign", "product", "report"];

export type AssistantRequestStatus = "idle" | "sending" | "streaming" | "completed" | "error" | "blocked";

/** Every piece of context the assistant sees must declare where it came from — never presented as more certain than it is. */
export type ContextDataOrigin = "real" | "manual" | "estimated" | "missing" | "example";

export function businessSourceToOrigin(source: BusinessDataSource): ContextDataOrigin {
  if (source === "diagnostico" || source === "imported") return "real";
  if (source === "manual") return "manual";
  if (source === "estimated") return "estimated";
  return "missing";
}

export function financialSourceToOrigin(source: FinancialDataSource): ContextDataOrigin {
  if (source === "imported") return "real";
  if (source === "manual") return "manual";
  if (source === "estimated") return "estimated";
  return "missing";
}

export interface ProposedUpdate {
  /** Dot path into the shell's in-memory state, e.g. "dna.businessModel" or "products[0].salesPrice". */
  path: string;
  label: string;
  oldValue: string | number | null;
  proposedValue: string | number;
  reason: string;
  confidence: FinancialConfidence;
  source: ContextDataOrigin;
  requiresConfirmation: true;
}

export interface CalculationRequest {
  /** Name of a deterministic tool the server already ran to ground this answer — never a request for the LLM to compute itself. */
  tool: string;
  summary: string;
}

export interface MotorLokatAssistantResponse {
  answerSimple: string;
  answerTechnical: string;
  summary: string;
  insights: string[];
  questions: string[];
  proposedUpdates: ProposedUpdate[];
  warnings: string[];
  nextActions: string[];
  confidence: FinancialConfidence;
  sources: string[];
  calculationRequests: CalculationRequest[];
}

export interface AssistantContextSnapshot {
  page: string;
  segment: BusinessSegment;
  dna: Record<string, { value: string; origin: ContextDataOrigin }>;
  fourPs: Record<string, { text: string; evidence: string }>;
  swotConfirmed: Array<{ category: string; text: string; impact: string; priority: string }>;
  goals: Array<{ label: string; metric: string; actualValue: number; goalValue: number }>;
  financial: {
    grossSales: { value: number; origin: ContextDataOrigin };
    netRevenue: { value: number; origin: ContextDataOrigin };
    directCostPct: number | null;
    contributionMarginPct: number | null;
    operatingResult: number | null;
    confidence: FinancialConfidence;
    missingInputs: string[];
  };
  currentProduct: {
    name: string;
    kind: ProductKind;
    salesPrice: number;
    directCost: number | null;
    contributionMarginPct: number | null;
    confidence: FinancialConfidence;
  } | null;
  currentCampaign: Partial<CampaignInput> | null;
  missingFields: string[];
  relevantGlossary: string[];
}

export interface ReportInterpretationResult {
  period: string;
  source: string;
  metrics: Array<{ label: string; value: string; unit: string }>;
  proposedClassification: string;
  confidence: FinancialConfidence;
  missingData: string[];
  warnings: string[];
  questions: string[];
}

export interface AssistantRequestBody {
  mode: AssistantMode;
  message: string;
  context: AssistantContextSnapshot;
  history: Array<{ role: "user" | "assistant"; content: string }>;
}

export class AssistantUnavailableError extends Error {
  constructor(message = "Assistente temporariamente indisponível.") {
    super(message);
    this.name = "AssistantUnavailableError";
  }
}

export class AssistantLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssistantLimitError";
  }
}
