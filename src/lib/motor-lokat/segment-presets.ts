import type { BusinessSegment } from "./types";

export interface SegmentPreset {
  id: BusinessSegment;
  label: string;
  directCostLabel: string;
  variableExpensesLabel: string;
  lossExamples: string[];
  suggestedGoals: {
    directCostPct: number;
    variableExpensesPct: number;
    contributionMarginPct: number;
    cashReserveMonthsGoal: number;
  };
  notes: string;
}

export const SEGMENT_PRESETS: Record<BusinessSegment, SegmentPreset> = {
  delivery: {
    id: "delivery", label: "Delivery e alimentação",
    directCostLabel: "Custo de ingredientes, embalagem e insumos",
    variableExpensesLabel: "Taxas de app, entrega subsidiada e cartão",
    lossExamples: ["Alimento estragado", "Pedido refeito", "Entrega perdida", "Cancelamento", "Cupom indevido"],
    suggestedGoals: { directCostPct: 0.35, variableExpensesPct: 0.20, contributionMarginPct: 0.40, cashReserveMonthsGoal: 2 },
    notes: "Referência inicial para delivery — ajuste conforme cardápio e canais usados.",
  },
  varejo: {
    id: "varejo", label: "Comércio e varejo",
    directCostLabel: "Custo da mercadoria vendida",
    variableExpensesLabel: "Taxas de cartão, comissões e impostos sobre venda",
    lossExamples: ["Quebra", "Roubo", "Extravio", "Devolução", "Estoque parado"],
    suggestedGoals: { directCostPct: 0.45, variableExpensesPct: 0.10, contributionMarginPct: 0.35, cashReserveMonthsGoal: 3 },
    notes: "Referência inicial para varejo — ajuste conforme categoria de produto e giro de estoque.",
  },
  clinica: {
    id: "clinica", label: "Clínica e atendimento",
    directCostLabel: "Materiais e insumos usados no atendimento",
    variableExpensesLabel: "Taxas de convênio, cartão e comissões",
    lossExamples: ["Falta", "Cancelamento tardio", "Material desperdiçado", "Agenda ociosa"],
    suggestedGoals: { directCostPct: 0.20, variableExpensesPct: 0.08, contributionMarginPct: 0.55, cashReserveMonthsGoal: 3 },
    notes: "Referência inicial para clínicas — ajuste conforme especialidade e mix de convênio/particular.",
  },
  servicos: {
    id: "servicos", label: "Prestação de serviços",
    directCostLabel: "Custo direto para entregar o serviço",
    variableExpensesLabel: "Comissões, taxas de pagamento e impostos sobre serviço",
    lossExamples: ["Retrabalho", "Cancelamento", "Falta em consulta/reunião", "Erro operacional"],
    suggestedGoals: { directCostPct: 0.25, variableExpensesPct: 0.10, contributionMarginPct: 0.50, cashReserveMonthsGoal: 3 },
    notes: "Referência inicial para serviços — ajuste conforme complexidade da entrega.",
  },
  agencia: {
    id: "agencia", label: "Agência",
    directCostLabel: "Custo de produção e equipe alocada por projeto",
    variableExpensesLabel: "Comissões, mídia paga por terceiros e impostos sobre serviço",
    lossExamples: ["Retrabalho", "Escopo não cobrado", "Cancelamento de contrato", "Inadimplência"],
    suggestedGoals: { directCostPct: 0.30, variableExpensesPct: 0.08, contributionMarginPct: 0.45, cashReserveMonthsGoal: 4 },
    notes: "Referência inicial para agências — ajuste conforme mix de projetos recorrentes e pontuais.",
  },
  saas: {
    id: "saas", label: "SaaS e produto digital",
    directCostLabel: "Infraestrutura e custo de servir o cliente",
    variableExpensesLabel: "Taxas de pagamento, comissões de venda e impostos",
    lossExamples: ["Churn", "Inadimplência", "Infraestrutura desperdiçada", "Suporte excessivo"],
    suggestedGoals: { directCostPct: 0.15, variableExpensesPct: 0.08, contributionMarginPct: 0.65, cashReserveMonthsGoal: 6 },
    notes: "Referência inicial para SaaS — ajuste conforme estágio (aquisição vs. retenção) do produto.",
  },
};

export const SEGMENT_ORDER: BusinessSegment[] = ["delivery", "varejo", "clinica", "servicos", "agencia", "saas"];
