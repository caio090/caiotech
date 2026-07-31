import type { BusinessSegment } from "@/lib/business-profile/types";

/**
 * Pacotes de nicho (Fase 11-15). Um pacote NUNCA copia um módulo -- ele
 * adapta linguagem, campos, indicadores, etapas, recomendações, datas
 * sazonais e integrações relevantes sobre o MESMO módulo universal. Exemplos
 * genéricos apenas -- nenhum cliente real (Duh Lanches, O Pedreirão etc.)
 * referenciado.
 */

export interface OperationalTemplateStep {
  id: string;
  label: string;
  requiredFields: string[];
}

export interface NichePackReportSection {
  id: string;
  label: string;
}

export interface BusinessNichePack {
  id: string;
  segment: BusinessSegment;
  name: string;
  terminology: Record<string, string>;
  enabledModules: string[];
  recommendedModules: string[];
  operationalTemplates: OperationalTemplateStep[];
  importantMetrics: string[];
  calendarCategories: string[];
  seasonalOpportunities: string[];
  relevantIntegrations: string[];
  reportSections: NichePackReportSection[];
  financialInterpretationModel: string;
  productCostModel: string;
}

export const BUSINESS_NICHE_PACKS: BusinessNichePack[] = [
  {
    id: "general_business",
    segment: "general_business",
    name: "Empresa geral",
    terminology: { product: "Produto/Serviço", order: "Pedido", customer: "Cliente" },
    enabledModules: ["meu_negocio", "financeiro", "crm_leads_clientes", "calendario_global", "relatorios"],
    recommendedModules: ["rec_os"],
    operationalTemplates: [{ id: "generic_task", label: "Tarefa genérica", requiredFields: ["responsavel", "prazo", "status"] }],
    importantMetrics: ["faturamento", "ticket_medio", "clientes_ativos"],
    calendarCategories: ["operations", "finance", "meetings"],
    seasonalOpportunities: [],
    relevantIntegrations: [],
    reportSections: [{ id: "overview", label: "Visão geral" }],
    financialInterpretationModel: "generic_cash_in_cash_out",
    productCostModel: "generic_margin",
  },
  {
    id: "food_service",
    segment: "food_service",
    name: "Alimentação",
    terminology: { product: "Item do cardápio", order: "Pedido", customer: "Cliente" },
    enabledModules: ["meu_negocio", "financeiro", "calendario_global", "relatorios"],
    recommendedModules: ["rec_os", "whatsapp"],
    operationalTemplates: [
      { id: "order_fulfillment", label: "Preparo e entrega de pedido", requiredFields: ["canal", "horario_pico", "tempo_preparo"] },
      { id: "menu_review", label: "Revisão de cardápio", requiredFields: ["cmv", "margem", "giro"] },
    ],
    importantMetrics: ["cmv", "ticket_medio", "cancelamentos", "perdas", "horario_pico"],
    calendarCategories: ["operations", "campaigns", "seasonal"],
    seasonalOpportunities: ["dia_dos_namorados", "dia_das_maes", "copa_do_mundo", "festas_juninas"],
    relevantIntegrations: ["digital_menu", "whatsapp_meta_cloud_api"],
    reportSections: [{ id: "menu_performance", label: "Desempenho do cardápio" }, { id: "delivery_channels", label: "Canais de delivery" }],
    financialInterpretationModel: "food_service_cmv_based",
    productCostModel: "technical_sheet_cmv",
  },
  {
    id: "construction_materials",
    segment: "construction_materials",
    name: "Materiais de construção",
    terminology: { product: "Material", order: "Pedido", customer: "Cliente/Obra" },
    enabledModules: ["meu_negocio", "financeiro", "calendario_global", "relatorios"],
    recommendedModules: ["rec_os"],
    operationalTemplates: [
      { id: "order_separation", label: "Separação e conferência", requiredFields: ["itens", "peso", "veiculo"] },
      { id: "delivery_route", label: "Entrega e rota", requiredFields: ["endereco_obra", "prazo", "comprovante"] },
    ],
    importantMetrics: ["giro_estoque", "ticket_medio", "prazo_entrega"],
    calendarCategories: ["operations", "inventory", "deadlines"],
    seasonalOpportunities: ["temporada_de_chuvas", "fim_de_ano_reformas"],
    relevantIntegrations: [],
    reportSections: [{ id: "stock_rotation", label: "Giro de estoque" }, { id: "delivery_performance", label: "Desempenho de entregas" }],
    financialInterpretationModel: "generic_cash_in_cash_out",
    productCostModel: "supplier_cost_markup",
  },
  {
    id: "agency_services",
    segment: "agency_services",
    name: "Agência e serviços",
    terminology: { product: "Serviço", order: "Projeto", customer: "Cliente" },
    enabledModules: ["rec_os", "crm_leads_clientes", "calendario_global", "relatorios", "equipe"],
    recommendedModules: ["financeiro"],
    operationalTemplates: [
      { id: "briefing_to_approval", label: "Briefing até aprovação", requiredFields: ["objetivo", "publico", "formato", "prazo"] },
      { id: "team_capacity", label: "Capacidade da equipe", requiredFields: ["horas_disponiveis", "horas_alocadas"] },
    ],
    importantMetrics: ["margem_por_cliente", "recorrencia", "capacidade_equipe", "horas_faturaveis"],
    calendarCategories: ["content", "meetings", "deadlines", "campaigns"],
    seasonalOpportunities: [],
    relevantIntegrations: ["whatsapp_meta_cloud_api"],
    reportSections: [{ id: "client_margin", label: "Margem por cliente" }, { id: "team_capacity", label: "Capacidade da equipe" }],
    financialInterpretationModel: "project_based_margin",
    productCostModel: "internal_hour_cost",
  },
  {
    id: "construction_projects",
    segment: "construction_projects",
    name: "Construção civil",
    terminology: { product: "Etapa da obra", order: "Contrato", customer: "Cliente/Contratante" },
    enabledModules: ["meu_negocio", "financeiro", "calendario_global", "relatorios"],
    recommendedModules: ["crm_leads_clientes"],
    operationalTemplates: [
      { id: "project_stage", label: "Etapa de obra", requiredFields: ["cronograma", "custo_previsto", "custo_realizado"] },
      { id: "measurement", label: "Medição e recebimento", requiredFields: ["avanco_fisico", "avanco_financeiro"] },
    ],
    importantMetrics: ["custo_previsto", "custo_realizado", "custo_comprometido", "avanco_fisico", "avanco_financeiro", "margem_projetada"],
    calendarCategories: ["projects", "finance", "deadlines"],
    seasonalOpportunities: ["temporada_de_chuvas"],
    relevantIntegrations: [],
    reportSections: [{ id: "budget_vs_actual", label: "Orçado vs. realizado" }, { id: "physical_progress", label: "Avanço físico" }],
    financialInterpretationModel: "project_budget_tracking",
    productCostModel: "planned_vs_actual_cost",
  },
];

export function findNichePackById(id: string): BusinessNichePack | undefined {
  return BUSINESS_NICHE_PACKS.find((pack) => pack.id === id);
}

export function findNichePackBySegment(segment: BusinessSegment): BusinessNichePack | undefined {
  return BUSINESS_NICHE_PACKS.find((pack) => pack.segment === segment);
}
