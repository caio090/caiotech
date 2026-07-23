/**
 * Fase 4 — internal "tools". Every function here wraps an existing
 * deterministic engine (financial-engine, pricing-engine, campaign-engine,
 * product-cost-engine) — the LLM never recalculates money itself.
 *
 * Design choice: in this first version these are called directly by the
 * API route (server-side, based on `mode`) before the model is invoked,
 * rather than exposed as LLM-invocable function-calling tools. The model
 * only ever sees the *results*, never a way to trigger a calculation with
 * arbitrary arguments — a smaller, easier-to-audit surface than a full
 * tool-calling loop, at the cost of the model not being able to ask for a
 * tool it wasn't given. There is intentionally no `apply_updates`,
 * `save_data` or `delete_data` tool — proposals are only ever applied by
 * the user, in the UI, never automatically.
 */

import { buildFinancialSnapshot } from "../financial-engine";
import { calculatePricing } from "../pricing-engine";
import { calculateCampaignProjection } from "../campaign-engine";
import { calculateProductCost } from "../product-cost-engine";
import { calculateProductOperation } from "../product-operations-engine";
import type { FinancialProfile, PricingInput, CampaignInput } from "../types";
import type { ProductCostInput, ProductKind, ProductOperationInput } from "../business-types";
import type { CalculationRequest } from "./types";

export function get_financial_snapshot(profile: FinancialProfile): CalculationRequest & { result: ReturnType<typeof buildFinancialSnapshot> } {
  const result = buildFinancialSnapshot(profile);
  return { tool: "get_financial_snapshot", summary: `Snapshot financeiro recalculado (motor determinístico) para o segmento ${profile.segment}.`, result };
}

export function simulate_product_price(input: PricingInput): CalculationRequest & { result: ReturnType<typeof calculatePricing> } {
  const result = calculatePricing(input);
  return { tool: "simulate_product_price", summary: "Preço mínimo simulado pelo motor de precificação.", result };
}

export function simulate_campaign(input: CampaignInput): CalculationRequest & { result: ReturnType<typeof calculateCampaignProjection> } {
  const result = calculateCampaignProjection(input);
  return { tool: "simulate_campaign", summary: "Projeção de campanha recalculada pelo motor de campanha.", result };
}

export function calculate_product_cost(input: ProductCostInput, salesPrice: number, kind: ProductKind): CalculationRequest & { result: ReturnType<typeof calculateProductCost> } {
  const result = calculateProductCost(input, salesPrice, kind);
  return { tool: "calculate_financial_snapshot", summary: "Custo e margem do item recalculados pelo motor de custo de produto.", result };
}

export function calculate_product_operation(input: ProductOperationInput): CalculationRequest & { result: ReturnType<typeof calculateProductOperation> } {
  const result = calculateProductOperation(input);
  return { tool: "calculate_financial_snapshot", summary: "Capacidade e risco operacional recalculados pelo motor de operação.", result };
}

export function identify_missing_data(missingInputs: string[]): CalculationRequest & { result: string[] } {
  return { tool: "identify_missing_data", summary: "Lista de dados ausentes já identificada pelos motores determinísticos.", result: Array.from(new Set(missingInputs)) };
}
