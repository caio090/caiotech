/**
 * Motor LOKAT 1.1 — types for Business DNA, the 4 Ps, SWOT, sales goals,
 * products/services engineering, the test laboratory and the performance
 * matrix. Kept separate from types.ts (Sprint 1.0) to avoid touching
 * already-shipped code — imports shared primitives from there.
 */

import type { BusinessSegment, FinancialConfidence, CampaignInput } from "./types";

/**
 * DNA fields need a 5th origin ("diagnostico") that FinancialDataSource
 * doesn't have — never claim a field came from the diagnostic flow when it
 * didn't.
 */
export type BusinessDataSource = "diagnostico" | "manual" | "imported" | "estimated" | "missing";

export interface DnaField<T = string> {
  value: T;
  source: BusinessDataSource;
}

// ── DNA do Negócio (Fase 3) ──────────────────────────────────────────────────

export interface BusinessDNA {
  companyName: DnaField<string>;
  segment: DnaField<BusinessSegment>;
  businessModel: DnaField<string>;
  description: DnaField<string>;
  mainProducts: DnaField<string>;
  problemSolved: DnaField<string>;
  desiresServed: DnaField<string>;
  valueProposition: DnaField<string>;
  differentiators: DnaField<string>;
  audiences: DnaField<string>;
  priceRange: DnaField<string>;
  salesChannels: DnaField<string>;
  units: DnaField<string>;
  regionsServed: DnaField<string>;
  seasonality: DnaField<string>;
  goals: DnaField<string>;
  restrictions: DnaField<string>;
  contactNetwork: DnaField<string>;
  competitors: DnaField<string>;
  positioning: DnaField<string>;
}

export const DNA_FIELD_ORDER: Array<{ key: keyof BusinessDNA; label: string }> = [
  { key: "companyName", label: "Nome da empresa" },
  { key: "businessModel", label: "Modelo de negócio" },
  { key: "description", label: "Descrição" },
  { key: "mainProducts", label: "Produtos ou serviços principais" },
  { key: "problemSolved", label: "Problema resolvido" },
  { key: "desiresServed", label: "Desejos atendidos" },
  { key: "valueProposition", label: "Proposta de valor" },
  { key: "differentiators", label: "Diferenciais" },
  { key: "audiences", label: "Públicos" },
  { key: "priceRange", label: "Faixa de preço" },
  { key: "salesChannels", label: "Canais de venda" },
  { key: "units", label: "Unidades" },
  { key: "regionsServed", label: "Regiões atendidas" },
  { key: "seasonality", label: "Sazonalidades" },
  { key: "goals", label: "Metas" },
  { key: "restrictions", label: "Restrições" },
  { key: "contactNetwork", label: "Rede de contatos" },
  { key: "competitors", label: "Concorrentes" },
  { key: "positioning", label: "Posicionamento" },
];

// ── 4 Ps (Fase 5) ────────────────────────────────────────────────────────────

export interface FourPsSection {
  text: string;
  evidence: string;
  notes: string;
}

export interface FourPs {
  product: FourPsSection;
  price: FourPsSection;
  place: FourPsSection;
  promotion: FourPsSection;
}

// ── SWOT / FOFA (Fase 6) ─────────────────────────────────────────────────────

export type SwotCategory = "forca" | "fraqueza" | "oportunidade" | "ameaca";
export type SwotImpact = "alto" | "medio" | "baixo";
export type SwotPriority = "alta" | "media" | "baixa";

export interface SwotItem {
  id: string;
  category: SwotCategory;
  text: string;
  source: BusinessDataSource;
  evidence: string;
  impact: SwotImpact;
  priority: SwotPriority;
  confirmed: boolean;
  /** True for the segment example rows seeded on first load — never presented as fact. */
  isExample?: boolean;
  /**
   * Sprint Meu Negócio 2.1.2 — campos aditivos e opcionais (não quebram
   * nenhum item existente sem eles) que ligam um item SWOT ao módulo,
   * concorrente ou meta que o originou, e ao seu próprio ciclo de revisão.
   * `status` é sobre o item em si; `confirmed` continua sendo a fonte da
   * verdade sobre "isto é fato do negócio" — um item pode estar `reviewing`
   * e ainda não `confirmed`.
   */
  status?: "draft" | "reviewing" | "confirmed" | "outdated" | "archived";
  linkedModule?: string;
  linkedCompetitorId?: string;
  linkedGoalId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ── Metas de vendas (Fase 7) ─────────────────────────────────────────────────

export type SalesGoalMetric = "unidades" | "faturamento" | "clientes_novos" | "recompra" | "margem_contribuicao" | "ticket_medio";

export interface SalesGoal {
  id: string;
  label: string;
  metric: SalesGoalMetric;
  /** Cents for money metrics (faturamento, ticket_medio, margem_contribuicao); plain count/fraction otherwise. */
  actualValue: number;
  goalValue: number;
  period: string;
  channel: string;
  product: string;
  unit: string;
}

// ── Products & Services (Fase 8/9) ──────────────────────────────────────────

export type ProductSituation = "ideia" | "teste" | "ativo" | "sazonal" | "descontinuado";

/**
 * Whether the item is a physical product (stock, ingredients, packaging can
 * apply) or a service (never requires stock/ingredients/packaging/expiry).
 * Chosen once at creation (Sprint 1.1.1 hotfix, Fase 9) — never inferred.
 */
export type ProductKind = "produto" | "servico";

export interface ProductCostComponent {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  /** Integer cents. */
  unitCost: number;
}

export interface ProductCostInput {
  components: ProductCostComponent[];
  packagingCost: number;
  feePct: number;
  commissionPct: number;
  discountPct: number;
  deliveryCost: number;
  taxPct: number;
  expectedLossPct: number;
}

export interface ProductCostResult {
  directCost: number;
  directCostPct: number | null;
  contributionMarginUnit: number;
  contributionMarginPct: number | null;
  formula: string;
  confidence: FinancialConfidence;
  missingInputs: string[];
  status: "ok" | "atencao" | "critico" | "sem_meta";
  statusReason: string;
}

export interface ProductOperationInput {
  productionTimeMinutes: number;
  capacityPerPeriod: number;
  period: "dia" | "semana" | "mes";
  equipment: string;
  storage: string;
  shelfLifeDays: number;
  wasteRisk: "baixo" | "medio" | "alto";
  complexity: "baixa" | "media" | "alta";
  supplier: string;
  dependency: string;
  bottleneck: string;
  maxCapacity: number;
}

export interface ProductOperationResult {
  projectedCapacity: number;
  utilizationPct: number | null;
  possibleSales: number;
  mainBottleneck: string;
  operationalRisk: "baixo" | "medio" | "alto" | "insuficiente";
}

export interface ProductPositioning {
  mainAudience: string;
  priceRange: string;
  consumptionOccasion: string;
  competitors: string;
  differentiator: string;
  visualPresentation: string;
  valuePerception: string;
  place: string;
  promotion: string;
  seasonality: string;
  inheritedFromDna: boolean;
}

export interface ProductServiceItem {
  id: string;
  name: string;
  kind: ProductKind;
  category: string;
  audience: string;
  problemOrDesire: string;
  /** Integer cents. */
  salesPrice: number;
  channel: string;
  unit: string;
  situation: ProductSituation;
  /** Free-form segment-specific fields (Fase 9) — labels come from product-presets.ts. */
  segmentFields: Record<string, string>;
  cost: ProductCostInput;
  operation: ProductOperationInput;
  positioning: ProductPositioning;
}

// ── Test Laboratory (Fase 13/14) ────────────────────────────────────────────

export type LabStage = "ideia" | "planejamento" | "teste" | "resultado" | "decisao";

export type LabDecision = "manter" | "ajustar_preco" | "reformular" | "transformar_combo" | "tornar_sazonal" | "retirar" | "expandir";

export interface LabTestResultInput {
  revenue: number;
  quantitySold: number;
  cmvOrCsv: number;
  productionTimeMinutes: number;
  rating: number | null;
  repeatPurchaseRate: number | null;
  wastePct: number | null;
  cancellationsCount: number;
  capacityUsedPct: number | null;
  acquisitionCost: number | null;
}

export interface LabTest {
  id: string;
  productId: string;
  productName: string;
  stage: LabStage;
  /** Reuses CampaignInput/calculateCampaignProjection from Sprint 1.0 — never a second simulator. */
  test: CampaignInput;
  result: LabTestResultInput | null;
  recommendedDecision: LabDecision | null;
  decisionReason: string;
}

// ── Performance matrix (Fase 15/16) ──────────────────────────────────────────

export type PerformanceQuadrant = "alta_venda_alta_margem" | "alta_venda_baixa_margem" | "baixa_venda_alta_margem" | "baixa_venda_baixa_margem";

export interface ProductRecommendation {
  productId: string;
  quadrant: PerformanceQuadrant;
  actions: string[];
  dataUsed: string;
  confidence: FinancialConfidence;
  ruleApplied: string;
  limitations: string;
}

// ── REC OS bridge for products (Fase 18) ────────────────────────────────────

export interface ProductRecOsContext {
  productName: string;
  differentiators: string;
  audience: string;
  offer: string;
  priceLabel: string;
  period: string;
  goalLabel: string;
  budgetLabel: string;
  channels: string;
  cta: string;
  restrictions: string[];
  capacity: string;
  risks: string[];
  visualPresentation: string;
}
