import type { DigitalMenuProvider } from "./provider-status";

/**
 * Registry of digital menu providers LOKAT OS knows about. Only OlaClick
 * exists today (matches `ADAPTERS` in ./index.ts) -- this list grows as more
 * providers get an adapter, never by guessing capabilities a provider hasn't
 * proven.
 */
export const DIGITAL_MENU_PROVIDERS: DigitalMenuProvider[] = [
  {
    id: "provider-olaclick",
    code: "olaclick",
    displayName: "OlaClick",
    adapterKey: "olaclick",
    documentationUrl: undefined,
    // ORDERS/MENU: rotas existem no adapter (orders/route.ts, menu/route.ts) mas
    // o endpoint de menu segue com TODO no código -- não incluído até confirmado.
    supportedCapabilities: ["ORDERS", "ORDER_ITEMS", "PRODUCTS", "DISCOUNTS", "FEES", "PAYMENTS", "CANCELLATIONS"],
    connectionRequirements: ["Token de acesso da loja no OlaClick", "URL base da API (opcional; usa o padrão público quando ausente)"],
  },
];

export function findDigitalMenuProvider(code: string): DigitalMenuProvider | null {
  return DIGITAL_MENU_PROVIDERS.find((provider) => provider.code === code) ?? null;
}
