/**
 * BusinessProfile é uma INTERPRETAÇÃO normalizada dos dados que já existem
 * em Meu Negócio -- não um cadastro paralelo. Nada aqui persiste; é o
 * contrato que futuras telas usarão para ler "que tipo de empresa é essa"
 * de forma consistente entre módulos (Fase 10).
 */

export type BusinessSegment = "food_service" | "construction_materials" | "agency_services" | "construction_projects" | "retail" | "general_business";

export type BusinessModel = "b2c" | "b2b" | "b2b2c" | "marketplace";

export type BusinessRevenueModel = "one_off_sale" | "subscription" | "project_based" | "commission" | "retainer";

export type BusinessOperationModel = "storefront" | "delivery_only" | "field_service" | "project_execution" | "hybrid";

export type BusinessChannel = "physical_store" | "delivery_app" | "whatsapp" | "instagram" | "own_website" | "marketplace" | "field_sales";

export interface BusinessLocation {
  city: string;
  state: string;
  isPrimary: boolean;
}

export type BusinessMaturity = "starting" | "structuring" | "growing" | "established";

export interface BusinessNeed {
  id: string;
  label: string;
  priority: "low" | "medium" | "high";
}

export interface BusinessModuleRecommendation {
  moduleId: string;
  reason: string;
}

export interface BusinessProfile {
  workspaceId: string;
  segment: BusinessSegment;
  subsegment?: string;
  businessModel: BusinessModel;
  revenueModels: BusinessRevenueModel[];
  operationModel: BusinessOperationModel;
  salesChannels: BusinessChannel[];
  locations: BusinessLocation[];
  teamSize: number;
  customersType: "consumer" | "business" | "mixed";
  productsType: "physical_goods" | "services" | "mixed";
  seasonality: boolean;
  fiscalProfile?: string;
  maturity: BusinessMaturity;
  mainProblems: string[];
  objectives: string[];
  enabledNichePack?: string;
  recommendedModules: BusinessModuleRecommendation[];
}
