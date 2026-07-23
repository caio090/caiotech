import type { ReportInsight } from "./types";
import type { ReconciliationResult } from "./reconciliation-types";
import { formatCents, formatPercent } from "@/lib/motor-lokat/money";

let counter = 0;
function makeInsight(partial: Omit<ReportInsight, "id">): ReportInsight {
  counter += 1;
  return { id: `reconciliation-insight-${counter}`, ...partial };
}

/** "Do faturamento bruto de X, aproximadamente Y foram descontados entre taxas, descontos e repasses." */
export function insightGrossToNetGap(result: ReconciliationResult): ReportInsight | null {
  const gross = result.input.customerPaidAmount.value;
  const net = result.expectedNetAmount.value;
  if (gross === null || net === null) return null;
  const deducted = gross - net;
  if (deducted <= 0) return null;
  return makeInsight({
    whatHappened: `Do valor pago pelo cliente de ${formatCents(gross)}, aproximadamente ${formatCents(deducted)} foram descontados entre taxas, descontos e repasses.`,
    whyItMatters: "Esse é o valor que efetivamente saiu do faturamento antes de chegar à conta da empresa.",
    estimatedImpact: result.effectiveFeePercentage !== null ? `Taxa efetiva de ${formatPercent(result.effectiveFeePercentage)} sobre o valor pago.` : null,
    nextAction: "Revisar quais taxas têm maior peso na aba Detalhes técnicos.",
    severity: "info",
  });
}

/** "O valor recebido ficou X abaixo do líquido esperado." */
export function insightSettlementGap(result: ReconciliationResult): ReportInsight | null {
  const diff = result.reconciliationDifference.value;
  if (diff === null || diff === 0) return null;
  const belowOrAbove = diff < 0 ? "abaixo" : "acima";
  return makeInsight({
    whatHappened: `O valor recebido ficou ${formatCents(Math.abs(diff))} ${belowOrAbove} do líquido esperado.`,
    whyItMatters: diff < 0
      ? "Uma divergência negativa pode indicar taxa não informada, atraso de repasse ou erro de lançamento."
      : "Uma divergência positiva também merece confirmação — pode ser um repasse de período anterior.",
    estimatedImpact: null,
    nextAction: "Conferir campos marcados como estimados ou incompletos nesta reconciliação.",
    severity: diff < 0 ? "attention" : "info",
  });
}

/** "A principal diferença ainda não pôde ser explicada porque a taxa de X não foi informada." */
export function insightUnexplainedDifference(result: ReconciliationResult): ReportInsight | null {
  if (result.incompleteFields.length === 0) return null;
  const fieldLabels: Record<string, string> = {
    customerPaidAmount: "valor pago pelo cliente",
    merchantFundedDiscounts: "desconto financiado pela loja",
    platformFundedDiscounts: "desconto financiado pela plataforma",
    processorPercentageFee: "taxa percentual do processador",
    processorFixedFee: "taxa fixa do processador",
    installmentFee: "taxa de parcelamento",
    anticipationFee: "taxa de antecipação",
    platformCommission: "comissão da plataforma",
    splitAllocationsTotal: "valores de split",
    retentions: "retenções",
    refunds: "estornos",
    chargebacks: "chargebacks",
    informedTaxes: "impostos informados",
    otherDeductions: "outras deduções",
  };
  const first = fieldLabels[result.incompleteFields[0]] ?? result.incompleteFields[0];
  return makeInsight({
    whatHappened: `A diferença de reconciliação ainda não pôde ser totalmente explicada porque ${first} não foi informado${result.incompleteFields.length > 1 ? `, entre outros ${result.incompleteFields.length - 1} campo${result.incompleteFields.length - 1 !== 1 ? "s" : ""}` : ""}.`,
    whyItMatters: "Sem esses valores, o líquido esperado é uma estimativa, não um número confirmado.",
    estimatedImpact: null,
    nextAction: "Informar os campos faltantes na Visão Analítica para confirmar o cálculo.",
    severity: "attention",
  });
}

/** Cartão concentra X% das vendas e Y% dos custos de pagamento. */
export function insightCardCostConcentration(cardShareOfRevenue: number | null, cardShareOfFees: number | null): ReportInsight | null {
  if (cardShareOfRevenue === null || cardShareOfFees === null) return null;
  if (cardShareOfRevenue < 0.3) return null;
  return makeInsight({
    whatHappened: `Cartões concentram ${formatPercent(cardShareOfRevenue)} das vendas e ${formatPercent(cardShareOfFees)} dos custos de pagamento do período.`,
    whyItMatters: "Um meio de pagamento pode valer mais em volume do que custa em taxa, ou o oposto — vale comparar as duas participações.",
    estimatedImpact: null,
    nextAction: "Avaliar se vale negociar a taxa com a adquirente ou incentivar outro meio de pagamento.",
    severity: "info",
  });
}
