import type { ReportPaymentMethod } from "./types";

/**
 * Normalizes free-text payment method labels (as reported by a connector or
 * an imported file) into a stable key + optional parent group, so "Cartão",
 * "Cartão de Débito", "Cartão de Crédito" and "Visa"/"Mastercard" can be
 * grouped under "Cartões" without double-counting a single order under both
 * the specific method and the generic "Cartão" bucket.
 */
export interface PaymentMethodGroup {
  key: string;
  label: string;
  children: string[]; // child group keys, e.g. ["debit_card", "credit_card"]
}

export const PAYMENT_METHOD_GROUPS: PaymentMethodGroup[] = [
  { key: "cartao", label: "Cartões", children: ["debito", "credito", "bandeira"] },
];

const NORMALIZE_MAP: Array<{ match: RegExp; key: string; label: string; groupKey: string | null }> = [
  { match: /\bpix\b/i, key: "pix", label: "Pix", groupKey: null },
  { match: /dinheiro|cash|especie/i, key: "dinheiro", label: "Dinheiro", groupKey: null },
  { match: /d[eé]bito/i, key: "debito", label: "Débito", groupKey: "cartao" },
  { match: /cr[eé]dito/i, key: "credito", label: "Crédito", groupKey: "cartao" },
  { match: /visa|master ?card|elo|amex|american express|hipercard/i, key: "bandeira", label: "Bandeira", groupKey: "cartao" },
  { match: /^cart[aã]o$|card/i, key: "cartao_generico", label: "Cartão (não especificado)", groupKey: "cartao" },
  { match: /online|link de pagamento/i, key: "pagamento_online", label: "Pagamento online", groupKey: null },
  { match: /entrega|delivery|maquininha/i, key: "pagamento_entrega", label: "Pagamento na entrega", groupKey: null },
];

export function normalizePaymentMethodLabel(raw: string | null | undefined): { key: string; label: string; groupKey: string | null } {
  if (!raw || !raw.trim()) return { key: "outro", label: "Outro", groupKey: null };
  const trimmed = raw.trim();
  for (const rule of NORMALIZE_MAP) {
    if (rule.match.test(trimmed)) return { key: rule.key, label: rule.label, groupKey: rule.groupKey };
  }
  return { key: `outro:${trimmed.toLowerCase()}`, label: trimmed, groupKey: null };
}

interface RawPaymentOrder {
  paymentMethod: string | null;
  totalCents: number;
}

/**
 * Builds one ReportPaymentMethod per normalized method (never per raw
 * string) — this is what prevents "Cartão" + "Cartão de Crédito" from being
 * summed as if they were independent, mutually-exclusive categories.
 */
export function buildPaymentMethodBreakdown(orders: RawPaymentOrder[]): ReportPaymentMethod[] {
  const byKey = new Map<string, { label: string; groupKey: string | null; orders: number; totalCents: number }>();
  for (const order of orders) {
    const { key, label, groupKey } = normalizePaymentMethodLabel(order.paymentMethod);
    const existing = byKey.get(key);
    if (existing) {
      existing.orders += 1;
      existing.totalCents += order.totalCents;
    } else {
      byKey.set(key, { label, groupKey, orders: 1, totalCents: order.totalCents });
    }
  }

  const grandTotal = orders.reduce((sum, o) => sum + o.totalCents, 0);

  return Array.from(byKey.entries()).map(([key, v]) => ({
    key,
    label: v.label,
    groupKey: v.groupKey,
    orders: v.orders,
    totalCents: v.totalCents,
    shareOfTotal: grandTotal > 0 ? v.totalCents / grandTotal : null,
    averageTicketCents: v.orders > 0 ? Math.round(v.totalCents / v.orders) : null,
    availability: { status: "available" as const },
  }));
}

/** Sums every child of a group (e.g. "cartao") without double-counting a generic parent entry twice. */
export function sumGroup(methods: ReportPaymentMethod[], groupKey: string): { orders: number; totalCents: number } {
  return methods
    .filter((m) => m.groupKey === groupKey)
    .reduce((acc, m) => ({ orders: acc.orders + m.orders, totalCents: acc.totalCents + m.totalCents }), { orders: 0, totalCents: 0 });
}
