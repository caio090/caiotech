/**
 * Fase 19-21: dois modos de visualização de Relatórios sobre A MESMA fonte
 * de dados -- nunca dois motores diferentes. ReportSourceData é o único
 * shape que ambas as visões leem; Essential e Analytical apenas selecionam
 * e formatam um subconjunto dele.
 */
export type ReportViewMode = "essential" | "analytical";

export const REPORT_VIEW_MODE_LABELS: Record<ReportViewMode, string> = {
  essential: "Visão Essencial",
  analytical: "Visão Analítica",
};

/** Fonte única -- ambos os modos derivam exclusivamente deste objeto. */
export interface ReportSourceData {
  grossRevenue: number;
  discounts: number;
  fees: number;
  commissions: number;
  advanceFee: number;
  installmentFee: number;
  split: number;
  retentions: number;
  refunds: number;
  chargebacks: number;
  informedTaxes: number;
  expectedNet: number;
  receivedNet: number;
  averageTicket: number;
  mainPaymentMethod: string;
  bestDay: string;
  bestHour: string;
  channels: Array<{ channel: string; revenue: number }>;
  paymentMethods: Array<{ method: string; revenue: number }>;
  topProducts: Array<{ product: string; revenue: number }>;
}

export interface EssentialReportView {
  totalSold: number;
  totalReceived: number;
  totalDiscounted: number;
  averageTicket: number;
  mainPaymentMethod: string;
  bestDay: string;
  bestHour: string;
  mainAlert: string | null;
  nextAction: string;
}

export interface AnalyticalReportView {
  grossRevenue: number;
  discounts: number;
  fees: number;
  commissions: number;
  advanceFee: number;
  installmentFee: number;
  split: number;
  retentions: number;
  refunds: number;
  chargebacks: number;
  informedTaxes: number;
  expectedNet: number;
  receivedNet: number;
  divergence: number;
  effectiveRate: number;
  channels: Array<{ channel: string; revenue: number }>;
  paymentMethods: Array<{ method: string; revenue: number }>;
  topProducts: Array<{ product: string; revenue: number }>;
}

export function buildEssentialView(source: ReportSourceData): EssentialReportView {
  const mainAlert = source.receivedNet < source.expectedNet ? "Valor recebido ficou abaixo do esperado." : null;
  return {
    totalSold: source.grossRevenue,
    totalReceived: source.receivedNet,
    totalDiscounted: source.discounts,
    averageTicket: source.averageTicket,
    mainPaymentMethod: source.mainPaymentMethod,
    bestDay: source.bestDay,
    bestHour: source.bestHour,
    mainAlert,
    nextAction: mainAlert ? "Revisar a divergência na Visão Analítica." : "Nenhuma ação necessária hoje.",
  };
}

export function buildAnalyticalView(source: ReportSourceData): AnalyticalReportView {
  const divergence = source.expectedNet - source.receivedNet;
  const effectiveRate = source.grossRevenue > 0 ? (source.fees + source.commissions) / source.grossRevenue : 0;
  return {
    grossRevenue: source.grossRevenue,
    discounts: source.discounts,
    fees: source.fees,
    commissions: source.commissions,
    advanceFee: source.advanceFee,
    installmentFee: source.installmentFee,
    split: source.split,
    retentions: source.retentions,
    refunds: source.refunds,
    chargebacks: source.chargebacks,
    informedTaxes: source.informedTaxes,
    expectedNet: source.expectedNet,
    receivedNet: source.receivedNet,
    divergence,
    effectiveRate,
    channels: source.channels,
    paymentMethods: source.paymentMethods,
    topProducts: source.topProducts,
  };
}

/** Fixture demonstrativa genérica -- nenhum número real de cliente. */
export const DEMO_REPORT_SOURCE: ReportSourceData = {
  grossRevenue: 4500000,
  discounts: 120000,
  fees: 90000,
  commissions: 45000,
  advanceFee: 30000,
  installmentFee: 15000,
  split: 20000,
  retentions: 5000,
  refunds: 40000,
  chargebacks: 10000,
  informedTaxes: 60000,
  expectedNet: 4065000,
  receivedNet: 4050000,
  averageTicket: 4500,
  mainPaymentMethod: "Pix",
  bestDay: "Sábado",
  bestHour: "19h-21h",
  channels: [{ channel: "Loja física", revenue: 2500000 }, { channel: "Delivery", revenue: 2000000 }],
  paymentMethods: [{ method: "Pix", revenue: 2200000 }, { method: "Cartão de crédito", revenue: 1800000 }, { method: "Dinheiro", revenue: 500000 }],
  topProducts: [{ product: "Produto de exemplo A", revenue: 900000 }, { product: "Produto de exemplo B", revenue: 700000 }],
};
