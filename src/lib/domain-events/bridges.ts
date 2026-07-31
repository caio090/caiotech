/** Fase 28-29: pontes entre módulos. Nenhum tipo aqui cria campanha real nem persiste -- só a prévia demonstrativa da ponte. */

export type ProductOpportunityReason =
  | "inventory_rotation"
  | "product_launch"
  | "sales_recovery"
  | "increase_ticket"
  | "low_demand_period"
  | "bundle_promotion"
  | "margin_recovery"
  | "seasonal_opportunity"
  | "offer_test";

export interface ProductCampaignOpportunity {
  workspaceId: string;
  productId: string;
  productName: string;
  reason: ProductOpportunityReason;
  evidence: string[];
  margin: number;
  stock: number;
  salesVelocity: number;
  confidence: "confirmed" | "calculated" | "estimated";
  detectedAt: string;
  suggestedCampaignType: string;
  missingData: string[];
}

export interface CommercialCampaignBrief {
  campaignId: string;
  workspaceId: string;
  clientId?: string;
  productId: string;
  objective: string;
  reason: ProductOpportunityReason;
  offer: string;
  regularPrice: number;
  promotionalPrice: number;
  expectedQuantity: number;
  stockLimit: number;
  breakEvenQuantity: number;
  expectedMargin: number;
  budget: number;
  periodStart: string;
  periodEnd: string;
  channels: string[];
  audience: string;
  mainMessage: string;
  risks: string[];
  restrictions: string[];
  source: "product_campaign_bridge" | "manual";
}

/** Fase 30: prévia demonstrativa da ponte Produto -> Oportunidade -> Campanha -- nunca persiste, só transforma um shape no outro. */
export function buildCampaignBriefFromOpportunity(opportunity: ProductCampaignOpportunity, campaignId: string): CommercialCampaignBrief {
  return {
    campaignId,
    workspaceId: opportunity.workspaceId,
    productId: opportunity.productId,
    objective: `Aproveitar oportunidade: ${opportunity.reason}`,
    reason: opportunity.reason,
    offer: `Oferta a definir para ${opportunity.productName}`,
    regularPrice: 0,
    promotionalPrice: 0,
    expectedQuantity: 0,
    stockLimit: opportunity.stock,
    breakEvenQuantity: 0,
    expectedMargin: opportunity.margin,
    budget: 0,
    periodStart: opportunity.detectedAt,
    periodEnd: opportunity.detectedAt,
    channels: [],
    audience: "",
    mainMessage: "",
    risks: [],
    restrictions: [],
    source: "product_campaign_bridge",
  };
}

/** Fase 32: briefing guiado para o REC OS -- 7 etapas fixas, não redireciona para o início do fluxo real do REC OS. */
export interface GuidedCreativeBrief {
  campaignId: string;
  whatToCommunicate: string;
  whyToCommunicate: string;
  audience: string;
  whatToProduce: string;
  requirements: string[];
  restrictions: string[];
  approvalRequired: boolean;
}

export function buildGuidedCreativeBrief(campaignBrief: CommercialCampaignBrief): GuidedCreativeBrief {
  return {
    campaignId: campaignBrief.campaignId,
    whatToCommunicate: campaignBrief.mainMessage || campaignBrief.offer,
    whyToCommunicate: campaignBrief.objective,
    audience: campaignBrief.audience,
    whatToProduce: "A definir com a equipe de produção",
    requirements: [],
    restrictions: campaignBrief.restrictions,
    approvalRequired: true,
  };
}
