/**
 * Motor LOKAT — shared types for the "Meu Negócio" preview (Sprint Motor LOKAT 1.0).
 *
 * All monetary fields are integer cents (BRL). Percentages are stored as
 * fractions (0.35 = 35%), never as "35" meaning 35%, to avoid unit mixups in
 * the pure calculation functions.
 */

export type BusinessSegment =
  | "delivery"
  | "varejo"
  | "clinica"
  | "servicos"
  | "agencia"
  | "saas";

/** Where a value came from — never let a calculated metric pretend to be more certain than its inputs. */
export type FinancialDataSource = "imported" | "manual" | "estimated" | "missing";

export type FinancialConfidence = "alta" | "media" | "baixa" | "insuficiente";

export interface FinancialInput {
  /** Integer cents. */
  value: number;
  source: FinancialDataSource;
}

/** The raw, user-editable inputs that feed the financial engine. Everything in cents or fractions. */
export interface FinancialProfile {
  segment: BusinessSegment;
  grossSales: FinancialInput;
  platformSubsidies: FinancialInput;
  refunds: FinancialInput;
  chargebacks: FinancialInput;
  directCost: FinancialInput;
  variableExpenses: FinancialInput;
  fixedExpenses: FinancialInput;
  ordersCount: FinancialInput;
  /** Goals are fractions (0.35 = 35%) except cashReserveMonthsGoal. */
  goals: {
    directCostPct: number;
    variableExpensesPct: number;
    contributionMarginPct: number;
    cashReserveMonthsGoal: number;
  };
}

export interface FinancialMetric {
  id: string;
  label: string;
  /** Integer cents, or a plain number for ratios/counts/months — see `unit`. */
  value: number;
  unit: "cents" | "percent" | "count" | "months" | "ratio";
  /** Fraction of some base value, when the metric is naturally a percentage of something (e.g. direct cost % of revenue). */
  percentOfBase?: number;
  source: FinancialDataSource;
  confidence: FinancialConfidence;
  formula: string;
  explanationSimple: string;
  explanationTechnical: string;
  missingInputs: string[];
  goal?: number;
  status?: "ok" | "atencao" | "critico" | "sem_meta";
  statusReason: string;
}

export interface FinancialSnapshot {
  grossSales: FinancialMetric;
  recognizedRevenue: FinancialMetric;
  netRevenue: FinancialMetric;
  directCost: FinancialMetric;
  directCostPct: FinancialMetric;
  variableExpenses: FinancialMetric;
  variableExpensesPct: FinancialMetric;
  contributionMargin: FinancialMetric;
  contributionMarginPct: FinancialMetric;
  fixedExpenses: FinancialMetric;
  operatingResult: FinancialMetric;
  operatingResultPct: FinancialMetric;
  averageTicket: FinancialMetric;
  breakEvenRevenue: FinancialMetric;
  breakEvenQuantity: FinancialMetric;
  workingCapitalNeeded: FinancialMetric;
}

// ── Pricing ──────────────────────────────────────────────────────────────────

export interface PricingInput {
  /** Integer cents. */
  productCost: number;
  fixedExpensesPct: number;
  variableExpensesPct: number;
  desiredMarginPct: number;
  /** Integer cents — what the business currently charges, for comparison. */
  currentPrice?: number;
}

export interface PricingResult {
  valid: boolean;
  error?: string;
  /** Integer cents. */
  minimumPrice: number;
  composition: {
    productCost: number;
    fixedExpensesAmount: number;
    variableExpensesAmount: number;
    marginAmount: number;
  };
  /** Integer cents; only present when currentPrice was provided. */
  differenceFromCurrent?: number;
  belowMinimum?: boolean;
}

// ── Cash flow ────────────────────────────────────────────────────────────────

export interface CashFlowInput {
  openingBalance: number;
  expectedInflows: number;
  realizedInflows: number;
  expectedOutflows: number;
  realizedOutflows: number;
  receivables: number;
  payables: number;
  currentReserve: number;
  desiredReserveMonths: number;
  /** Average monthly outflow, for coverage math — derived from the financial profile when available. */
  averageMonthlyOutflow: number;
}

export interface CashFlowResult {
  projectedBalance: number;
  realizedBalance: number;
  difference: number;
  suggestedWorkingCapital: number;
  coverageMonths: number | null;
  risk: "baixo" | "atencao" | "alto" | "insuficiente";
}

// ── Campaigns ────────────────────────────────────────────────────────────────

export type CampaignObjective =
  | "vender"
  | "aumentar_ticket"
  | "conquistar_clientes"
  | "recuperar_clientes"
  | "gerar_recorrencia"
  | "fortalecer_marca";

export type MarketplaceFeeBase = "preco_normal" | "receita_reconhecida" | "valor_pago_cliente";

export interface CampaignInput {
  name: string;
  objective: CampaignObjective;
  product: string;
  /** Integer cents. */
  regularPrice: number;
  pricePaidByCustomer: number;
  platformSubsidyPerOrder: number;
  directCostPerUnit: number;
  projectedQuantity: number;
  marketplaceFeePct: number;
  marketplaceFeeBase: MarketplaceFeeBase;
  cardFeePct: number;
  salesTaxPct: number;
  subsidizedDeliveryPerOrder: number;
  mediaBudget: number;
  influencerBudget: number;
  contentProductionBudget: number;
  decorationBudget: number;
  printedMaterialBudget: number;
  otherFixedCosts: number;
  expectedNewCustomers: number;
  futureAverageTicket: number;
  futureRepeatPurchases: number;
  futureContributionMarginPct: number;
  /** Only meaningful for non-revenue objectives (e.g. fortalecer_marca) — user-entered, never fabricated. */
  brandMetrics?: {
    reach?: number;
    recall?: number;
    baseGrowth?: number;
    qualifiedEngagement?: number;
  };
}

export type CampaignStatus = "saudavel" | "viavel_com_atencao" | "margem_apertada" | "prejuizo_projetado" | "dados_insuficientes";

export interface CampaignProjection {
  companyFundedDiscount: number;
  discountWasNegative: boolean;
  recognizedRevenuePerOrder: number;
  contributionMarginPerOrder: number;
  totalFixedInvestment: number;
  totalVariableCost: number;
  projectedGrossRevenue: number;
  projectedNetRevenue: number;
  projectedContributionMargin: number;
  resultBeforeOverhead: number;
  ordersToBreakEven: number | null;
  cac: number | null;
  ltvRevenue: number | null;
  ltvContribution: number | null;
  ltvToCacRatio: number | null;
  paybackOrders: number | null;
  status: CampaignStatus;
  statusReason: string;
  isBrandObjective: boolean;
}

// ── REC OS bridge ────────────────────────────────────────────────────────────

export interface RecOsCampaignContext {
  campaignName: string;
  objective: CampaignObjective;
  product: string;
  offer: string;
  regularPriceLabel: string;
  promoPriceLabel: string;
  audience: string;
  period: string;
  channel: string;
  budgetLabel: string;
  minimumMarginLabel: string;
  quantity: number;
  cta: string;
  risks: string[];
  restrictions: string[];
  expectedResult: string;
}

// ── Glossary ─────────────────────────────────────────────────────────────────

export interface GlossaryEntry {
  id: string;
  simpleName: string;
  technicalName: string;
  explanation: string;
  formula: string;
  example: string;
  commonMistakes: string[];
  relatedTerms: string[];
}

// ── LLM payload preview (Fase 24 — never sent anywhere) ─────────────────────

export interface MotorLokatLlmPayloadPreview {
  business_segment: BusinessSegment;
  period: string;
  gross_sales: number;
  net_revenue: number;
  direct_cost: number;
  variable_expenses: number;
  contribution_margin: number;
  fixed_expenses: number;
  operating_result: number;
  cash_coverage_months: number | null;
  campaign: Record<string, unknown>;
  missing_data: string[];
  confidence: FinancialConfidence;
}

// ── Deterministic insights (Fase 23) ─────────────────────────────────────────

export interface MotorLokatInsight {
  id: string;
  what: string;
  mainReason: string;
  dataUsed: string;
  dataQuality: FinancialConfidence;
  suggestion: string;
  suggestionLimits: string;
  severity: "info" | "atencao" | "critico";
}
