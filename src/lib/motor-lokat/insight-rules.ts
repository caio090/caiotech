/**
 * Deterministic, rule-based interpreter — no LLM involved. Every insight must
 * say what happened, why, which data it used, how confident that data is,
 * and the limits of the suggestion. Never phrased as if an AI analyzed it.
 */

import type { FinancialSnapshot, CashFlowResult, CampaignProjection, MotorLokatInsight } from "./types";

export function generateFinancialInsights(snapshot: FinancialSnapshot, cashFlow?: CashFlowResult): MotorLokatInsight[] {
  const insights: MotorLokatInsight[] = [];

  if (snapshot.directCostPct.status === "critico" || snapshot.directCostPct.status === "atencao") {
    insights.push({
      id: "direct_cost_above_goal",
      what: "O custo para produzir está acima da meta configurada.",
      mainReason: snapshot.directCostPct.statusReason,
      dataUsed: "Custo direto e receita líquida do período informado.",
      dataQuality: snapshot.directCostPct.confidence,
      suggestion: "Revisar fornecedores, desperdício ou composição do produto/serviço antes de decidir sobre preço.",
      suggestionLimits: "Esta é uma leitura de regras fixas — não considera sazonalidade nem negociações em andamento.",
      severity: snapshot.directCostPct.status === "critico" ? "critico" : "atencao",
    });
  }

  if (snapshot.contributionMargin.value < 0) {
    insights.push({
      id: "negative_contribution_margin",
      what: "A margem de contribuição está negativa.",
      mainReason: "Custo direto e despesas variáveis juntos superam a receita líquida do período.",
      dataUsed: "Receita líquida, custo direto e despesas variáveis.",
      dataQuality: snapshot.contributionMargin.confidence,
      suggestion: "Rever preço, mix de produtos/serviços ou renegociar custos variáveis antes de investir em crescimento.",
      suggestionLimits: "Não considera efeitos de curto prazo (promoções pontuais) nem contratos já firmados.",
      severity: "critico",
    });
  }

  if (
    snapshot.breakEvenRevenue.value > 0 &&
    snapshot.grossSales.value > 0 &&
    snapshot.breakEvenRevenue.value > snapshot.grossSales.value
  ) {
    insights.push({
      id: "break_even_above_current_sales",
      what: "O ponto de equilíbrio está acima do faturamento atual.",
      mainReason: "As despesas fixas exigem um faturamento maior do que o registrado neste período para não haver prejuízo.",
      dataUsed: "Ponto de equilíbrio em faturamento e faturamento bruto do período.",
      dataQuality: snapshot.breakEvenRevenue.confidence,
      suggestion: "Avaliar se é sazonalidade pontual ou se despesas fixas/margem precisam ser revistas.",
      suggestionLimits: "Um único período abaixo do ponto de equilíbrio não indica necessariamente um problema estrutural.",
      severity: "atencao",
    });
  }

  if (cashFlow && cashFlow.coverageMonths !== null && cashFlow.coverageMonths < 1) {
    insights.push({
      id: "cash_below_one_month",
      what: "O caixa cobre menos de um mês de despesas.",
      mainReason: "A reserva atual é menor do que a média de despesas mensais.",
      dataUsed: "Reserva atual e despesas médias mensais informadas no Fluxo de Caixa.",
      dataQuality: "media",
      suggestion: "Priorizar entradas previstas, renegociar prazos de contas a pagar e evitar novos compromissos fixos.",
      suggestionLimits: "Não considera linhas de crédito disponíveis nem sazonalidade de entradas.",
      severity: "critico",
    });
  }

  const missing = [
    snapshot.grossSales, snapshot.directCost, snapshot.variableExpenses, snapshot.fixedExpenses,
  ].filter((m) => m.missingInputs.length > 0);
  if (missing.length > 0) {
    insights.push({
      id: "missing_inputs",
      what: "Alguns indicadores estão incompletos por falta de dados.",
      mainReason: `Dados ausentes em: ${missing.map((m) => m.label).join(", ")}.`,
      dataUsed: "Campos marcados como ausentes nesta simulação.",
      dataQuality: "insuficiente",
      suggestion: "Preencher os valores ausentes para que os cálculos deixem de depender de estimativas.",
      suggestionLimits: "Enquanto houver dados ausentes, os indicadores derivados também ficam com confiança reduzida.",
      severity: "atencao",
    });
  }

  return insights;
}

export function generateCampaignInsights(campaign: CampaignProjection): MotorLokatInsight[] {
  const insights: MotorLokatInsight[] = [];

  if (campaign.cac !== null && campaign.ltvContribution !== null && campaign.cac > campaign.ltvContribution) {
    insights.push({
      id: "cac_above_ltv",
      what: "O CAC estimado é maior do que o LTV de contribuição estimado.",
      mainReason: "O investimento para conquistar cada cliente novo não se paga com a margem de contribuição futura estimada.",
      dataUsed: "Investimento fixo da campanha, novos clientes esperados, ticket futuro e margem de contribuição futura.",
      dataQuality: "baixa",
      suggestion: "Revisar o investimento por cliente ou as premissas de recompra/margem futura antes de escalar a campanha.",
      suggestionLimits: "Baseado em estimativas de recompra futura informadas manualmente, não em histórico real do segmento.",
      severity: "critico",
    });
  }

  if (campaign.discountWasNegative) {
    insights.push({
      id: "campaign_discount_negative",
      what: "O desconto financiado pela empresa deu um valor negativo.",
      mainReason: "O valor pago pelo cliente somado ao subsídio da plataforma supera o preço normal informado.",
      dataUsed: "Preço normal, valor pago pelo cliente e subsídio da plataforma por pedido.",
      dataQuality: "media",
      suggestion: "Conferir se o preço normal ou o subsídio da plataforma foram informados corretamente.",
      suggestionLimits: "Este alerta é apenas uma checagem de consistência, não uma correção automática dos valores.",
      severity: "atencao",
    });
  }

  if (campaign.status === "prejuizo_projetado" && !campaign.isBrandObjective) {
    insights.push({
      id: "campaign_projected_loss",
      what: "A campanha projeta prejuízo antes das despesas gerais.",
      mainReason: campaign.statusReason,
      dataUsed: "Margem de contribuição por pedido, quantidade projetada e investimento fixo da campanha.",
      dataQuality: "media",
      suggestion: "Revisar desconto, custo direto por unidade ou reduzir o investimento fixo antes de lançar a campanha.",
      suggestionLimits: "A projeção assume que a quantidade projetada realmente será vendida.",
      severity: "critico",
    });
  }

  return insights;
}
