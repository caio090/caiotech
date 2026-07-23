import { safeDivide } from "./money";
import type { CampaignInput, CampaignProjection, CampaignStatus } from "./types";

function marketplaceFeeBaseValue(input: CampaignInput, recognizedRevenuePerOrder: number): number {
  switch (input.marketplaceFeeBase) {
    case "preco_normal": return input.regularPrice;
    case "valor_pago_cliente": return input.pricePaidByCustomer;
    case "receita_reconhecida":
    default: return recognizedRevenuePerOrder;
  }
}

function classifyStatus(params: {
  hasMinimumData: boolean;
  isBrandObjective: boolean;
  resultBeforeOverhead: number;
  contributionMarginPerOrder: number;
  ordersToBreakEven: number | null;
  projectedQuantity: number;
}): { status: CampaignStatus; reason: string } {
  const { hasMinimumData, isBrandObjective, resultBeforeOverhead, contributionMarginPerOrder, ordersToBreakEven, projectedQuantity } = params;

  if (!hasMinimumData) {
    return { status: "dados_insuficientes", reason: "Faltam dados essenciais (quantidade projetada, custo direto ou preço) para classificar esta campanha." };
  }

  if (resultBeforeOverhead < 0) {
    const reason = isBrandObjective
      ? `Prejuízo financeiro projetado de ${Math.abs(resultBeforeOverhead)} centavos — esperado em campanhas de marca, mas acompanhe os indicadores de alcance e base.`
      : "O resultado projetado da campanha é negativo antes das despesas gerais.";
    return { status: "prejuizo_projetado", reason };
  }

  if (contributionMarginPerOrder <= 0) {
    return { status: "margem_apertada", reason: "Cada pedido desta campanha não deixa margem de contribuição — o resultado positivo depende só do volume." };
  }

  if (ordersToBreakEven !== null && projectedQuantity > 0 && ordersToBreakEven > projectedQuantity * 0.8) {
    return {
      status: "margem_apertada",
      reason: `Margem apertada porque a campanha deixa pouca margem por pedido, enquanto são necessários ${Math.ceil(ordersToBreakEven)} pedidos para recuperar o investimento (projeção é de ${projectedQuantity}).`,
    };
  }

  return { status: "saudavel", reason: "A campanha recupera o investimento dentro da quantidade projetada e mantém margem positiva por pedido." };
}

export function calculateCampaignProjection(input: CampaignInput): CampaignProjection {
  const {
    regularPrice, pricePaidByCustomer, platformSubsidyPerOrder, directCostPerUnit, projectedQuantity,
    marketplaceFeePct, cardFeePct, salesTaxPct, subsidizedDeliveryPerOrder,
    mediaBudget, influencerBudget, contentProductionBudget, decorationBudget, printedMaterialBudget, otherFixedCosts,
    expectedNewCustomers, futureAverageTicket, futureRepeatPurchases, futureContributionMarginPct, objective,
  } = input;

  const companyFundedDiscount = regularPrice - pricePaidByCustomer - platformSubsidyPerOrder;
  const discountWasNegative = companyFundedDiscount < 0;

  const recognizedRevenuePerOrder = pricePaidByCustomer + platformSubsidyPerOrder;

  const marketplaceFeeBase = marketplaceFeeBaseValue(input, recognizedRevenuePerOrder);
  const marketplaceFeeAmount = Math.round(marketplaceFeeBase * marketplaceFeePct);
  const cardFeeAmount = Math.round(pricePaidByCustomer * cardFeePct);
  const salesTaxAmount = Math.round(recognizedRevenuePerOrder * salesTaxPct);

  const variableCostPerOrder = directCostPerUnit + marketplaceFeeAmount + cardFeeAmount + salesTaxAmount + subsidizedDeliveryPerOrder;
  const contributionMarginPerOrder = recognizedRevenuePerOrder - variableCostPerOrder;

  const totalFixedInvestment = mediaBudget + influencerBudget + contentProductionBudget + decorationBudget + printedMaterialBudget + otherFixedCosts;
  const totalVariableCost = variableCostPerOrder * projectedQuantity;

  const projectedGrossRevenue = regularPrice * projectedQuantity;
  const projectedNetRevenue = recognizedRevenuePerOrder * projectedQuantity;
  const projectedContributionMargin = contributionMarginPerOrder * projectedQuantity;
  const resultBeforeOverhead = projectedContributionMargin - totalFixedInvestment;

  const ordersToBreakEven = contributionMarginPerOrder > 0
    ? safeDivide(totalFixedInvestment, contributionMarginPerOrder)
    : null;

  const cac = expectedNewCustomers > 0 ? safeDivide(totalFixedInvestment, expectedNewCustomers) : null;
  const ltvRevenue = futureAverageTicket > 0 && futureRepeatPurchases > 0
    ? futureAverageTicket * futureRepeatPurchases
    : null;
  const ltvContribution = ltvRevenue !== null ? Math.round(ltvRevenue * futureContributionMarginPct) : null;
  const ltvToCacRatio = ltvContribution !== null && cac !== null && cac > 0 ? safeDivide(ltvContribution, cac) : null;
  const paybackPerPurchase = futureAverageTicket > 0 ? Math.round(futureAverageTicket * futureContributionMarginPct) : 0;
  const paybackOrders = cac !== null && paybackPerPurchase > 0 ? safeDivide(cac, paybackPerPurchase) : null;

  const isBrandObjective = objective === "fortalecer_marca";
  const hasMinimumData = projectedQuantity > 0 && regularPrice > 0 && (directCostPerUnit > 0 || pricePaidByCustomer > 0);

  const { status, reason } = classifyStatus({
    hasMinimumData, isBrandObjective, resultBeforeOverhead, contributionMarginPerOrder, ordersToBreakEven, projectedQuantity,
  });

  return {
    companyFundedDiscount,
    discountWasNegative,
    recognizedRevenuePerOrder,
    contributionMarginPerOrder,
    totalFixedInvestment,
    totalVariableCost,
    projectedGrossRevenue,
    projectedNetRevenue,
    projectedContributionMargin,
    resultBeforeOverhead,
    ordersToBreakEven,
    cac,
    ltvRevenue,
    ltvContribution,
    ltvToCacRatio,
    paybackOrders,
    status,
    statusReason: reason,
    isBrandObjective,
  };
}
