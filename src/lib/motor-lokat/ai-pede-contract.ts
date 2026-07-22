/**
 * AiPede — conceptual data contract only (Fase 19).
 *
 * This is NOT an integration: no API call, no endpoint discovery, no token,
 * no cookie, no real data. It exists so the product engineering module has a
 * documented shape to eventually map real fields onto, once AiPede's
 * official documentation and authorization are available.
 */

export interface AiPedeConceptualField {
  id: string;
  label: string;
}

export const AIPEDE_CONCEPTUAL_FIELDS: AiPedeConceptualField[] = [
  { id: "establishment", label: "Estabelecimento" },
  { id: "unit", label: "Unidade" },
  { id: "category", label: "Categoria" },
  { id: "product", label: "Produto" },
  { id: "addons", label: "Adicionais" },
  { id: "price", label: "Preço" },
  { id: "discount", label: "Desconto" },
  { id: "order", label: "Pedido" },
  { id: "orderItem", label: "Item do pedido" },
  { id: "customer", label: "Cliente" },
  { id: "coupon", label: "Cupom" },
  { id: "fee", label: "Taxa" },
  { id: "commission", label: "Comissão" },
  { id: "payment", label: "Pagamento" },
  { id: "settlement", label: "Repasse" },
  { id: "cancellation", label: "Cancelamento" },
  { id: "stock", label: "Estoque" },
];

export type AiPedeConnectorState = "documentacao_pendente" | "planejado";

export const AIPEDE_CONNECTOR_STATE: AiPedeConnectorState = "documentacao_pendente";
export const AIPEDE_CONNECTOR_NOTE = "AiPede — documentação oficial pendente. Nenhuma integração real, nenhuma chamada de API, nenhum dado importado.";
export const CSV_CONNECTOR_NOTE = "CSV/Excel — planejado para um próximo vertical slice.";
