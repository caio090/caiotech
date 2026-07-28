/**
 * Adaptive business-archetype layer for "Meu Negócio". A single
 * BusinessArchetypeConfig drives labels/terminology across the module so a
 * future nicho (agency, clinic, law firm...) never needs a new set of
 * scattered `if (segment === "...")` branches — it needs one new config
 * object. Only `food_service` has a fully built experience this sprint;
 * every other archetype exists as a typed, honest placeholder.
 */

export type BusinessArchetypeId =
  | "food_service"
  | "retail"
  | "services"
  | "agency"
  | "clinic"
  | "law_firm"
  | "generic";

export type BusinessModuleKey =
  | "overview"
  | "reports"
  | "stock"
  | "purchasing"
  | "technical_sheets"
  | "products_pricing"
  | "cmv_menu"
  | "finance"
  | "settings";

export interface BusinessArchetypeConfig {
  id: BusinessArchetypeId;
  label: string;
  /** Is the full vertical slice built for this archetype yet? */
  implemented: boolean;
  terminology: {
    /** What a single stock/resource unit is called ("Insumo", "Recurso"...). */
    itemLabel: string;
    /** What the sellable composition is called ("Ficha técnica", "Composição do serviço"...). */
    offeringLabel: string;
    /** Where the item is consumed/produced ("Cozinha", "Equipe", "Operação jurídica"...). */
    productionLocationLabel: string;
    /** The core cost-vs-revenue metric ("CMV", "Custo do serviço vendido"...). */
    costMetricLabel: string;
    costMetricLabelPlural: string;
  };
  modules: BusinessModuleKey[];
  /** Short description shown on placeholder screens for archetypes not yet built. */
  futureNote: string;
}

export const BUSINESS_ARCHETYPES: Record<BusinessArchetypeId, BusinessArchetypeConfig> = {
  food_service: {
    id: "food_service",
    label: "Alimentação (restaurante, delivery, lanchonete)",
    implemented: true,
    terminology: {
      itemLabel: "Insumo",
      offeringLabel: "Ficha técnica",
      productionLocationLabel: "Cozinha",
      costMetricLabel: "CMV",
      costMetricLabelPlural: "CMV (Custo da Mercadoria Vendida)",
    },
    modules: ["overview", "reports", "cmv_menu", "stock", "purchasing", "technical_sheets", "products_pricing", "finance", "settings"],
    futureNote: "Vertical slice completo desta sprint.",
  },
  retail: {
    id: "retail",
    label: "Varejo",
    implemented: false,
    terminology: {
      itemLabel: "Produto",
      offeringLabel: "SKU",
      productionLocationLabel: "Loja",
      costMetricLabel: "CMV",
      costMetricLabelPlural: "CMV (Custo da Mercadoria Vendida)",
    },
    modules: ["overview", "reports", "stock", "purchasing", "products_pricing", "finance", "settings"],
    futureNote: "Estoque de varejo (giro, curva ABC, ruptura de prateleira) planejado para uma sprint futura — ainda não construído.",
  },
  services: {
    id: "services",
    label: "Prestação de serviços",
    implemented: false,
    terminology: {
      itemLabel: "Recurso",
      offeringLabel: "Composição do serviço",
      productionLocationLabel: "Equipe",
      costMetricLabel: "CSV",
      costMetricLabelPlural: "CSV (Custo do Serviço Vendido)",
    },
    modules: ["overview", "reports", "products_pricing", "finance", "settings"],
    futureNote: "Regras de custeio de serviço (hora técnica, deslocamento, materiais) planejadas para uma sprint futura.",
  },
  agency: {
    id: "agency",
    label: "Agência",
    implemented: false,
    terminology: {
      itemLabel: "Recurso",
      offeringLabel: "Composição do serviço",
      productionLocationLabel: "Equipe",
      costMetricLabel: "CSV",
      costMetricLabelPlural: "CSV (Custo do Serviço Vendido)",
    },
    modules: ["overview", "reports", "products_pricing", "finance", "settings"],
    futureNote: "Custeio de horas e entregas por cliente planejado para uma sprint futura.",
  },
  clinic: {
    id: "clinic",
    label: "Clínica",
    implemented: false,
    terminology: {
      itemLabel: "Insumo",
      offeringLabel: "Procedimento",
      productionLocationLabel: "Consultório",
      costMetricLabel: "Custo do procedimento",
      costMetricLabelPlural: "Custo dos procedimentos",
    },
    modules: ["overview", "reports", "products_pricing", "finance", "settings"],
    futureNote: "Custeio de procedimentos e materiais clínicos planejado para uma sprint futura.",
  },
  law_firm: {
    id: "law_firm",
    label: "Escritório de advocacia",
    implemented: false,
    terminology: {
      itemLabel: "Recurso",
      offeringLabel: "Composição do serviço",
      productionLocationLabel: "Operação jurídica",
      costMetricLabel: "Custo do serviço",
      costMetricLabelPlural: "Custo dos serviços",
    },
    modules: ["overview", "reports", "products_pricing", "finance", "settings"],
    futureNote: "Custeio por hora/caso planejado para uma sprint futura.",
  },
  generic: {
    id: "generic",
    label: "Negócio genérico",
    implemented: false,
    terminology: {
      itemLabel: "Item",
      offeringLabel: "Oferta",
      productionLocationLabel: "Operação",
      costMetricLabel: "Custo",
      costMetricLabelPlural: "Custos",
    },
    modules: ["overview", "reports", "finance", "settings"],
    futureNote: "Arquétipo de fallback para segmentos ainda não mapeados.",
  },
};

export function getArchetypeConfig(id: BusinessArchetypeId): BusinessArchetypeConfig {
  return BUSINESS_ARCHETYPES[id];
}
