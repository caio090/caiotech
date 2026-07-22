/**
 * Deterministic financial engine — pure functions, no I/O, no Supabase.
 * Every metric carries its own formula, data source and confidence so the UI
 * never has to lie about how certain a number is.
 */

import { safeDivide, roundFraction } from "./money";
import type {
  FinancialProfile, FinancialSnapshot, FinancialMetric,
  FinancialDataSource, FinancialConfidence,
} from "./types";

const SOURCE_RANK: Record<FinancialDataSource, number> = {
  imported: 3, manual: 2, estimated: 1, missing: 0,
};

/** Confidence is only as good as the weakest input a metric depends on. */
export function combineConfidence(sources: FinancialDataSource[]): FinancialConfidence {
  if (sources.length === 0) return "insuficiente";
  const worst = sources.reduce((min, s) => Math.min(min, SOURCE_RANK[s]), 3);
  if (worst === 0) return "insuficiente";
  if (worst === 1) return "baixa";
  if (worst === 2) return "media";
  return "alta";
}

function collectMissing(entries: Array<{ label: string; source: FinancialDataSource }>): string[] {
  return entries.filter((e) => e.source === "missing").map((e) => e.label);
}

/** Compares an actual fraction against a goal fraction — lower-is-better metrics (costs). */
function classifyCostVsGoal(actual: number, goal: number): { status: FinancialMetric["status"]; reason: string } {
  if (!Number.isFinite(actual) || !Number.isFinite(goal) || goal <= 0) {
    return { status: "sem_meta", reason: "Nenhuma meta configurada para comparação." };
  }
  const diffPoints = roundFraction(actual - goal, 4) * 100;
  if (actual <= goal) {
    return { status: "ok", reason: `Dentro da meta configurada de ${(goal * 100).toFixed(1)}%.` };
  }
  if (diffPoints <= 5) {
    return { status: "atencao", reason: `A meta configurada é no máximo ${(goal * 100).toFixed(1)}%. O valor atual está ${diffPoints.toFixed(1)} pontos percentuais acima da meta.` };
  }
  return { status: "critico", reason: `A meta configurada é no máximo ${(goal * 100).toFixed(1)}%. O valor atual está ${diffPoints.toFixed(1)} pontos percentuais acima da meta.` };
}

/** Compares an actual fraction against a goal fraction — higher-is-better metrics (margin). */
function classifyMarginVsGoal(actual: number, goal: number): { status: FinancialMetric["status"]; reason: string } {
  if (!Number.isFinite(actual) || !Number.isFinite(goal) || goal <= 0) {
    return { status: "sem_meta", reason: "Nenhuma meta configurada para comparação." };
  }
  const diffPoints = roundFraction(goal - actual, 4) * 100;
  if (actual >= goal) {
    return { status: "ok", reason: `Dentro da meta configurada de ${(goal * 100).toFixed(1)}%.` };
  }
  if (diffPoints <= 5) {
    return { status: "atencao", reason: `A meta configurada é no mínimo ${(goal * 100).toFixed(1)}%. O valor atual está ${diffPoints.toFixed(1)} pontos percentuais abaixo da meta.` };
  }
  return { status: "critico", reason: `A meta configurada é no mínimo ${(goal * 100).toFixed(1)}%. O valor atual está ${diffPoints.toFixed(1)} pontos percentuais abaixo da meta.` };
}

export function buildFinancialSnapshot(profile: FinancialProfile): FinancialSnapshot {
  const { grossSales, platformSubsidies, refunds, chargebacks, directCost, variableExpenses, fixedExpenses, ordersCount, goals } = profile;

  const recognizedRevenueValue = grossSales.value + platformSubsidies.value;
  const netRevenueValue = recognizedRevenueValue - refunds.value - chargebacks.value;

  const directCostPctFraction = safeDivide(directCost.value, netRevenueValue);
  const variableExpensesPctFraction = safeDivide(variableExpenses.value, netRevenueValue);

  const contributionMarginValue = netRevenueValue - directCost.value - variableExpenses.value;
  const contributionMarginPctFraction = safeDivide(contributionMarginValue, netRevenueValue);

  const operatingResultValue = contributionMarginValue - fixedExpenses.value;
  const operatingResultPctFraction = safeDivide(operatingResultValue, netRevenueValue);

  const averageTicketValue = safeDivide(grossSales.value, ordersCount.value);

  const breakEvenRevenueValue = contributionMarginPctFraction && contributionMarginPctFraction > 0
    ? fixedExpenses.value / contributionMarginPctFraction
    : null;
  const breakEvenQuantityValue = breakEvenRevenueValue !== null && averageTicketValue
    ? safeDivide(breakEvenRevenueValue, averageTicketValue)
    : null;

  const workingCapitalValue = Math.round((fixedExpenses.value + variableExpenses.value) * goals.cashReserveMonthsGoal);

  const grossSalesConfidence = combineConfidence([grossSales.source]);
  const netRevenueSources = [grossSales.source, platformSubsidies.source, refunds.source, chargebacks.source];
  const netRevenueConfidence = combineConfidence(netRevenueSources);
  const directCostConfidence = combineConfidence([directCost.source]);
  const directCostPctConfidence = combineConfidence([...netRevenueSources, directCost.source]);
  const variableExpensesConfidence = combineConfidence([variableExpenses.source]);
  const variableExpensesPctConfidence = combineConfidence([...netRevenueSources, variableExpenses.source]);
  const contributionMarginConfidence = combineConfidence([...netRevenueSources, directCost.source, variableExpenses.source]);
  const fixedExpensesConfidence = combineConfidence([fixedExpenses.source]);
  const operatingResultConfidence = combineConfidence([...netRevenueSources, directCost.source, variableExpenses.source, fixedExpenses.source]);
  const averageTicketConfidence = combineConfidence([grossSales.source, ordersCount.source]);
  const breakEvenConfidence = combineConfidence([...netRevenueSources, directCost.source, variableExpenses.source, fixedExpenses.source, ordersCount.source]);

  const directCostClass = classifyCostVsGoal(directCostPctFraction ?? NaN, goals.directCostPct);
  const variableExpensesClass = classifyCostVsGoal(variableExpensesPctFraction ?? NaN, goals.variableExpensesPct);
  const contributionMarginClass = classifyMarginVsGoal(contributionMarginPctFraction ?? NaN, goals.contributionMarginPct);

  return {
    grossSales: {
      id: "gross_sales", label: "Faturamento bruto", value: grossSales.value, unit: "cents",
      source: grossSales.source, confidence: grossSalesConfidence,
      formula: "Soma das vendas antes de descontos e cancelamentos.",
      explanationSimple: "Tudo que foi vendido, antes de qualquer desconto ou taxa.",
      explanationTechnical: "Faturamento bruto (gross sales).",
      missingInputs: collectMissing([{ label: "Faturamento bruto", source: grossSales.source }]),
      status: "sem_meta", statusReason: "Sem meta aplicável a este indicador.",
    },
    recognizedRevenue: {
      id: "recognized_revenue", label: "Receita reconhecida", value: recognizedRevenueValue, unit: "cents",
      source: combineConfidence([grossSales.source, platformSubsidies.source]) === "insuficiente" ? "missing" : "manual",
      confidence: combineConfidence([grossSales.source, platformSubsidies.source]),
      formula: "Faturamento bruto + subsídios efetivamente pagos por plataformas.",
      explanationSimple: "O que a empresa realmente recebeu, somando o que o cliente pagou e o que a plataforma completou.",
      explanationTechnical: "Receita reconhecida = valor pago pelo cliente + subsídios de plataforma.",
      missingInputs: collectMissing([{ label: "Faturamento bruto", source: grossSales.source }, { label: "Subsídios de plataforma", source: platformSubsidies.source }]),
      status: "sem_meta", statusReason: "Sem meta aplicável a este indicador.",
    },
    netRevenue: {
      id: "net_revenue", label: "Receita líquida", value: netRevenueValue, unit: "cents",
      source: "manual", confidence: netRevenueConfidence,
      formula: "Receita reconhecida − devoluções/estornos − chargebacks.",
      explanationSimple: "O que sobra depois de tirar devoluções, estornos e contestações de cartão.",
      explanationTechnical: "Receita líquida (net revenue).",
      missingInputs: collectMissing([{ label: "Devoluções/estornos", source: refunds.source }, { label: "Chargebacks", source: chargebacks.source }]),
      status: "sem_meta", statusReason: "Sem meta aplicável a este indicador.",
    },
    directCost: {
      id: "direct_cost", label: "Custo para produzir", value: directCost.value, unit: "cents",
      source: directCost.source, confidence: directCostConfidence,
      formula: "Matéria-prima + mercadoria + embalagem + frete proporcional + insumos diretos.",
      explanationSimple: "Quanto custa produzir ou entregar o que foi vendido.",
      explanationTechnical: "Custo direto (CMV / custo do serviço vendido, conforme o segmento).",
      missingInputs: collectMissing([{ label: "Custo direto", source: directCost.source }]),
      status: "sem_meta", statusReason: "Sem meta aplicável a este indicador.",
    },
    directCostPct: {
      id: "direct_cost_pct", label: "Custo para produzir (%)", value: directCostPctFraction ?? 0, unit: "percent",
      percentOfBase: netRevenueValue,
      source: "manual", confidence: directCostPctConfidence,
      formula: "Custo direto ÷ receita líquida.",
      explanationSimple: "De cada real que entra, quanto vai embora só para produzir ou entregar.",
      explanationTechnical: "Custo direto / receita líquida.",
      missingInputs: [],
      goal: goals.directCostPct,
      status: directCostClass.status, statusReason: directCostClass.reason,
    },
    variableExpenses: {
      id: "variable_expenses", label: "Despesas variáveis", value: variableExpenses.value, unit: "cents",
      source: variableExpenses.source, confidence: variableExpensesConfidence,
      formula: "Taxas de marketplace + cartão + impostos sobre vendas + entrega subsidiada + comissões + outras ligadas ao volume.",
      explanationSimple: "Custos que só existem porque a venda aconteceu (taxas, comissões, impostos sobre a venda).",
      explanationTechnical: "Despesas variáveis.",
      missingInputs: collectMissing([{ label: "Despesas variáveis", source: variableExpenses.source }]),
      status: "sem_meta", statusReason: "Sem meta aplicável a este indicador.",
    },
    variableExpensesPct: {
      id: "variable_expenses_pct", label: "Despesas variáveis (%)", value: variableExpensesPctFraction ?? 0, unit: "percent",
      percentOfBase: netRevenueValue,
      source: "manual", confidence: variableExpensesPctConfidence,
      formula: "Despesas variáveis ÷ receita líquida.",
      explanationSimple: "De cada real que entra, quanto vai embora em taxas e comissões ligadas à venda.",
      explanationTechnical: "Despesas variáveis / receita líquida.",
      missingInputs: [],
      goal: goals.variableExpensesPct,
      status: variableExpensesClass.status, statusReason: variableExpensesClass.reason,
    },
    contributionMargin: {
      id: "contribution_margin", label: "Quanto sobra depois da venda", value: contributionMarginValue, unit: "cents",
      source: "manual", confidence: contributionMarginConfidence,
      formula: "Receita líquida − custo direto − despesas variáveis.",
      explanationSimple: "O valor que permanece depois do custo para entregar, taxas e outras despesas variáveis.",
      explanationTechnical: "Margem de contribuição.",
      missingInputs: [],
      status: "sem_meta", statusReason: "Sem meta aplicável a este indicador — veja o percentual.",
    },
    contributionMarginPct: {
      id: "contribution_margin_pct", label: "Margem de contribuição (%)", value: contributionMarginPctFraction ?? 0, unit: "percent",
      percentOfBase: netRevenueValue,
      source: "manual", confidence: contributionMarginConfidence,
      formula: "Margem de contribuição ÷ receita líquida.",
      explanationSimple: "De cada real que entra, quanto realmente sobra antes das despesas fixas.",
      explanationTechnical: "Margem de contribuição / receita líquida.",
      missingInputs: [],
      goal: goals.contributionMarginPct,
      status: contributionMarginClass.status, statusReason: contributionMarginClass.reason,
    },
    fixedExpenses: {
      id: "fixed_expenses", label: "Despesas fixas", value: fixedExpenses.value, unit: "cents",
      source: fixedExpenses.source, confidence: fixedExpensesConfidence,
      formula: "Soma das despesas fixas informadas pelo negócio (aluguel, folha, sistemas, etc.).",
      explanationSimple: "O que a empresa gasta todo mês, independente de vender mais ou menos.",
      explanationTechnical: "Despesas fixas (fixed expenses).",
      missingInputs: collectMissing([{ label: "Despesas fixas", source: fixedExpenses.source }]),
      status: "sem_meta", statusReason: "Sem meta aplicável a este indicador.",
    },
    operatingResult: {
      id: "operating_result", label: "Resultado operacional estimado", value: operatingResultValue, unit: "cents",
      source: "manual", confidence: operatingResultConfidence,
      formula: "Margem de contribuição − despesas fixas.",
      explanationSimple: "O que sobra depois de pagar tudo que é fixo no mês — uma estimativa, não o lucro líquido final.",
      explanationTechnical: "Resultado operacional estimado (não é lucro líquido — não considera impostos sobre o lucro, depreciação ou itens não operacionais).",
      missingInputs: [],
      status: "sem_meta", statusReason: "Sem meta aplicável a este indicador — veja o percentual.",
    },
    operatingResultPct: {
      id: "operating_result_pct", label: "Resultado operacional (%)", value: operatingResultPctFraction ?? 0, unit: "percent",
      percentOfBase: netRevenueValue,
      source: "manual", confidence: operatingResultConfidence,
      formula: "Resultado operacional ÷ receita líquida.",
      explanationSimple: "De cada real que entra, quanto sobra depois de tudo que é fixo.",
      explanationTechnical: "Resultado operacional / receita líquida.",
      missingInputs: [],
      status: "sem_meta", statusReason: "Sem meta configurada para este indicador nesta versão.",
    },
    averageTicket: {
      id: "average_ticket", label: "Ticket médio", value: averageTicketValue ?? 0, unit: "cents",
      source: "manual", confidence: averageTicketConfidence,
      formula: "Faturamento bruto ÷ quantidade de pedidos.",
      explanationSimple: "Quanto, em média, cada pedido ou venda vale.",
      explanationTechnical: "Ticket médio.",
      missingInputs: ordersCount.value <= 0 ? ["Quantidade de pedidos"] : [],
      status: "sem_meta", statusReason: "Sem meta aplicável a este indicador.",
    },
    breakEvenRevenue: {
      id: "break_even_revenue", label: "Ponto de equilíbrio (faturamento)", value: breakEvenRevenueValue ?? 0, unit: "cents",
      source: "manual", confidence: breakEvenConfidence,
      formula: "Despesas fixas ÷ percentual da margem de contribuição.",
      explanationSimple: "Quanto o negócio precisa faturar por mês só para não ter prejuízo.",
      explanationTechnical: "Ponto de equilíbrio em faturamento (break-even revenue).",
      missingInputs: contributionMarginPctFraction === null || contributionMarginPctFraction <= 0
        ? ["Margem de contribuição positiva necessária para calcular o ponto de equilíbrio"] : [],
      status: "sem_meta", statusReason: "Indicador de referência — compare com o faturamento projetado.",
    },
    breakEvenQuantity: {
      id: "break_even_quantity", label: "Ponto de equilíbrio (quantidade)", value: breakEvenQuantityValue ?? 0, unit: "count",
      source: "manual", confidence: breakEvenConfidence,
      formula: "Ponto de equilíbrio em faturamento ÷ ticket médio.",
      explanationSimple: "Quantos pedidos ou vendas o negócio precisa fazer por mês para não ter prejuízo.",
      explanationTechnical: "Ponto de equilíbrio em quantidade.",
      missingInputs: breakEvenRevenueValue === null || !averageTicketValue ? ["Ponto de equilíbrio em faturamento ou ticket médio ausente"] : [],
      status: "sem_meta", statusReason: "Indicador de referência — compare com o volume projetado.",
    },
    workingCapitalNeeded: {
      id: "working_capital_needed", label: "Capital de giro sugerido", value: workingCapitalValue, unit: "cents",
      source: "estimated", confidence: combineConfidence([fixedExpenses.source, variableExpenses.source]),
      formula: "(Despesas fixas + despesas variáveis) × meses desejados de reserva.",
      explanationSimple: "Quanto dinheiro guardado o negócio deveria ter parado, para aguentar alguns meses sem vender.",
      explanationTechnical: "Capital de giro sugerido.",
      missingInputs: [],
      status: "sem_meta", statusReason: "Referência inicial — ajuste conforme a realidade do caixa.",
    },
  };
}
