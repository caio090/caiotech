/**
 * Fase 10 — builds the compact context snapshot sent to the assistant.
 * Pure function, no I/O. Deliberately leaves out anything not needed for
 * the current page: never the whole shell state, never unconfirmed SWOT
 * examples presented as fact.
 */

import type { BusinessSegment, CampaignInput, FinancialSnapshot } from "../types";
import type { BusinessDNA, FourPs, SwotItem, SalesGoal, ProductServiceItem, ProductCostResult } from "../business-types";
import { DNA_FIELD_ORDER } from "../business-types";
import { businessSourceToOrigin, financialSourceToOrigin, type AssistantContextSnapshot } from "./types";
import { truncate } from "./cost-controls";
import { MAX_CONTEXT_CHARS } from "./cost-controls";

const PAGE_GLOSSARY: Record<string, string[]> = {
  overview: ["margem_contribuicao", "fluxo_caixa", "ponto_equilibrio"],
  business: ["margem_contribuicao"],
  products: ["cmv", "csv", "margem_contribuicao"],
  pricing: ["markup", "margem_lucro"],
  campaigns: ["cac", "ltv", "ponto_equilibrio", "ticket_medio"],
  cashflow: ["fluxo_caixa", "capital_giro"],
};

export interface BuildContextInput {
  page: string;
  segment: BusinessSegment;
  dna: BusinessDNA;
  fourPs: FourPs;
  swotItems: SwotItem[];
  salesGoals: SalesGoal[];
  snapshot: FinancialSnapshot;
  currentProduct?: { item: ProductServiceItem; cost: ProductCostResult } | null;
  currentCampaign?: CampaignInput | null;
}

export function buildAssistantContext(input: BuildContextInput): AssistantContextSnapshot {
  const { page, segment, dna, fourPs, swotItems, salesGoals, snapshot, currentProduct, currentCampaign } = input;

  const dnaContext: AssistantContextSnapshot["dna"] = {};
  for (const { key, label } of DNA_FIELD_ORDER) {
    const field = dna[key] as { value: string; source: BusinessDNA["companyName"]["source"] };
    if (field.value.trim()) {
      dnaContext[label] = { value: field.value, origin: businessSourceToOrigin(field.source) };
    }
  }

  const fourPsContext: AssistantContextSnapshot["fourPs"] = {};
  (["product", "price", "place", "promotion"] as const).forEach((key) => {
    const section = fourPs[key];
    if (section.text.trim()) fourPsContext[key] = { text: section.text, evidence: section.evidence };
  });

  const swotConfirmed = swotItems
    .filter((item) => item.confirmed && item.text.trim())
    .map((item) => ({ category: item.category, text: item.text, impact: item.impact, priority: item.priority }));

  const goals = salesGoals.map((g) => ({ label: g.label, metric: g.metric, actualValue: g.actualValue, goalValue: g.goalValue }));

  const missingFields = Array.from(new Set([
    ...snapshot.grossSales.missingInputs, ...snapshot.directCost.missingInputs,
    ...snapshot.variableExpenses.missingInputs, ...snapshot.fixedExpenses.missingInputs,
  ]));

  return {
    page,
    segment,
    dna: dnaContext,
    fourPs: fourPsContext,
    swotConfirmed,
    goals,
    financial: {
      grossSales: { value: snapshot.grossSales.value, origin: financialSourceToOrigin(snapshot.grossSales.source) },
      netRevenue: { value: snapshot.netRevenue.value, origin: financialSourceToOrigin(snapshot.netRevenue.source) },
      directCostPct: snapshot.directCostPct.value ?? null,
      contributionMarginPct: snapshot.contributionMarginPct.value ?? null,
      operatingResult: snapshot.operatingResult.value ?? null,
      confidence: snapshot.operatingResult.confidence,
      missingInputs: missingFields,
    },
    currentProduct: currentProduct
      ? {
          name: currentProduct.item.name,
          kind: currentProduct.item.kind,
          salesPrice: currentProduct.item.salesPrice,
          directCost: currentProduct.cost.directCost,
          contributionMarginPct: currentProduct.cost.contributionMarginPct,
          confidence: currentProduct.cost.confidence,
        }
      : null,
    currentCampaign: currentCampaign
      ? {
          objective: currentCampaign.objective,
          product: currentCampaign.product,
          regularPrice: currentCampaign.regularPrice,
          pricePaidByCustomer: currentCampaign.pricePaidByCustomer,
          projectedQuantity: currentCampaign.projectedQuantity,
        }
      : null,
    missingFields,
    relevantGlossary: PAGE_GLOSSARY[page] ?? [],
  };
}

/** Serializes the context for the model prompt, hard-capped so a huge DNA/SWOT set never blows the token budget. */
export function serializeContextForPrompt(context: AssistantContextSnapshot): string {
  return truncate(JSON.stringify(context), MAX_CONTEXT_CHARS);
}
