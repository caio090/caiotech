/**
 * Canonical import fields an uploaded report row can map to, and a
 * deterministic header-name detector. Detection only pre-fills a suggestion
 * — src/components/reports/report-data-importer.tsx always shows the
 * mapping step and requires explicit confirmation before any row is
 * processed (Fase "Mapeamento de colunas": "Nunca confirmar importação
 * automaticamente sem prévia").
 */
export type ImportField =
  | "order_id"
  | "occurred_at"
  | "occurred_time"
  | "status"
  | "total"
  | "discount"
  | "fee"
  | "payment_method"
  | "channel"
  | "service_type"
  | "product"
  | "quantity"
  | "customer";

export const IMPORT_FIELD_LABELS: Record<ImportField, string> = {
  order_id: "ID do pedido",
  occurred_at: "Data",
  occurred_time: "Hora",
  status: "Status",
  total: "Valor total",
  discount: "Desconto",
  fee: "Taxa",
  payment_method: "Forma de pagamento",
  channel: "Canal",
  service_type: "Tipo de serviço",
  product: "Produto",
  quantity: "Quantidade",
  customer: "Cliente",
};

const HEADER_PATTERNS: Array<{ field: ImportField; pattern: RegExp }> = [
  { field: "order_id", pattern: /^(pedido|order_?id|id_?pedido|n[uú]mero)$/i },
  { field: "occurred_at", pattern: /^(data|date)$/i },
  { field: "occurred_time", pattern: /^(hora|time|hor[aá]rio)$/i },
  { field: "status", pattern: /^status$/i },
  { field: "total", pattern: /^(valor|total|valor_?total|amount)$/i },
  { field: "discount", pattern: /^(desconto|discount)$/i },
  { field: "fee", pattern: /^(taxa|fee)$/i },
  { field: "payment_method", pattern: /^(forma_?pagamento|payment_?method|pagamento)$/i },
  { field: "channel", pattern: /^(canal|channel|origem)$/i },
  { field: "service_type", pattern: /^(tipo_?servico|service_?type|tipo)$/i },
  { field: "product", pattern: /^(produto|product|item)$/i },
  { field: "quantity", pattern: /^(quantidade|quantity|qtd)$/i },
  { field: "customer", pattern: /^(cliente|customer)$/i },
];

export type ColumnMapping = Record<string, ImportField | null>; // header -> suggested field (or null = unrecognized)

/** Pure function — given the headers of a parsed file, suggests a mapping. Never applied without user confirmation. */
export function suggestColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<ImportField>();
  for (const header of headers) {
    const trimmed = header.trim();
    const match = HEADER_PATTERNS.find((h) => h.pattern.test(trimmed) && !used.has(h.field));
    if (match) { mapping[header] = match.field; used.add(match.field); }
    else mapping[header] = null;
  }
  return mapping;
}
