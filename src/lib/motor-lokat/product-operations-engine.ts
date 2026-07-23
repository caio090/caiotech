import { safeDivide } from "./money";
import type { ProductOperationInput, ProductOperationResult } from "./business-types";

/**
 * Capacity/operational read for a single product. Never invents a demand
 * figure — utilization compares the achievable capacity against the
 * user-entered maximum, and "possible sales" is capped at whichever is lower.
 */
export function calculateProductOperation(input: ProductOperationInput): ProductOperationResult {
  const { capacityPerPeriod, maxCapacity, bottleneck, wasteRisk, complexity } = input;

  const projectedCapacity = capacityPerPeriod;
  const utilizationPct = maxCapacity > 0 ? safeDivide(capacityPerPeriod, maxCapacity) : null;
  const possibleSales = maxCapacity > 0 ? Math.min(capacityPerPeriod, maxCapacity) : capacityPerPeriod;
  const mainBottleneck = bottleneck.trim() || "Nenhum gargalo informado";

  let operationalRisk: ProductOperationResult["operationalRisk"] = "insuficiente";
  if (utilizationPct !== null) {
    const riskFromWaste = wasteRisk === "alto" ? 2 : wasteRisk === "medio" ? 1 : 0;
    const riskFromComplexity = complexity === "alta" ? 2 : complexity === "media" ? 1 : 0;
    const riskFromUtilization = utilizationPct >= 0.9 ? 2 : utilizationPct >= 0.7 ? 1 : 0;
    const total = riskFromWaste + riskFromComplexity + riskFromUtilization;
    operationalRisk = total >= 4 ? "alto" : total >= 2 ? "medio" : "baixo";
  }

  return { projectedCapacity, utilizationPct, possibleSales, mainBottleneck, operationalRisk };
}
