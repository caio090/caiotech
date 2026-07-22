import type { BusinessSegment } from "./types";

/** Segment-specific extra fields for a product/service — free-form text, optional, stored in ProductServiceItem.segmentFields. */
export const PRODUCT_SEGMENT_FIELDS: Record<BusinessSegment, string[]> = {
  delivery: ["Ingredientes", "Porção", "Embalagem", "Tempo de preparo", "Validade", "Desperdício esperado", "Equipamento", "Fornecedor", "Estoque"],
  varejo: ["SKU", "Custo de compra", "Frete", "Armazenamento", "Validade", "Estoque", "Fornecedor"],
  clinica: ["Duração do atendimento", "Profissional", "Materiais", "Sala", "Capacidade", "Faltas", "Retrabalho"],
  servicos: ["Horas estimadas", "Função responsável", "Ferramenta usada", "Deslocamento", "Terceirização", "Retrabalho", "Capacidade"],
  agencia: ["Horas estimadas", "Função responsável", "Ferramenta usada", "Deslocamento", "Terceirização", "Retrabalho", "Capacidade"],
  saas: ["Plano", "Infraestrutura", "Suporte", "Onboarding", "Capacidade", "Churn esperado", "Custo por conta"],
};
