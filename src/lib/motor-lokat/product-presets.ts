import type { BusinessSegment } from "./types";
import type { ProductKind } from "./business-types";

/** Segment-specific extra fields for a product/service — free-form text, optional, stored in ProductServiceItem.segmentFields. */
export const PRODUCT_SEGMENT_FIELDS: Record<BusinessSegment, string[]> = {
  delivery: ["Ingredientes", "Porção", "Embalagem", "Tempo de preparo", "Validade", "Desperdício esperado", "Equipamento", "Fornecedor", "Estoque"],
  varejo: ["SKU", "Custo de compra", "Frete", "Armazenamento", "Validade", "Estoque", "Fornecedor"],
  clinica: ["Duração do atendimento", "Profissional", "Materiais", "Sala", "Capacidade", "Faltas", "Retrabalho"],
  servicos: ["Horas estimadas", "Função responsável", "Ferramenta usada", "Deslocamento", "Terceirização", "Retrabalho", "Capacidade"],
  agencia: ["Horas estimadas", "Função responsável", "Ferramenta usada", "Deslocamento", "Terceirização", "Retrabalho", "Capacidade"],
  saas: ["Plano", "Infraestrutura", "Suporte", "Onboarding", "Capacidade", "Churn esperado", "Custo por conta"],
};

/** Field labels that imply physical stock/ingredients/packaging/expiry — never required for a service (Fase 9 hotfix). */
const STOCK_LIKE_KEYWORDS = ["ingrediente", "porção", "embalagem", "validade", "estoque", "sku", "armazenamento"];

/**
 * Segment fields applicable to an item, filtered by kind. A service never
 * shows stock/ingredient/packaging/expiry fields regardless of segment —
 * e.g. "Serviço de consultoria" in a delivery-segment business shouldn't ask
 * for "Ingredientes" or "Estoque".
 */
export function productSegmentFields(segment: BusinessSegment, kind: ProductKind): string[] {
  const fields = PRODUCT_SEGMENT_FIELDS[segment];
  if (kind === "produto") return fields;
  return fields.filter((f) => !STOCK_LIKE_KEYWORDS.some((kw) => f.toLowerCase().includes(kw)));
}
