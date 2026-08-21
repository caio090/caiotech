/**
 * REC OS PAID TRAFFIC PLANNER V1 FOUNDATION — estrutura de orçamento.
 * "Não calcular ROI. Não prometer venda." -- describeBudget() só
 * descreve o que foi informado, nunca infere resultado/retorno.
 */
import type { PaidTrafficBudget } from "./types";

export function describeBudget(budget: PaidTrafficBudget | undefined): string {
  if (!budget || (budget.dailyBudget === undefined && budget.monthlyBudget === undefined)) {
    return "Nenhum orçamento informado ainda.";
  }
  const parts: string[] = [];
  if (budget.dailyBudget !== undefined) parts.push(`R$ ${budget.dailyBudget.toFixed(2)}/dia`);
  if (budget.monthlyBudget !== undefined) parts.push(`R$ ${budget.monthlyBudget.toFixed(2)}/mês`);
  if (budget.investmentPeriodDays !== undefined) parts.push(`por ${budget.investmentPeriodDays} dias`);
  return parts.join(", ");
}
