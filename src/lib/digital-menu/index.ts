// Registro central de provedores de Cardápio Digital.
// Para adicionar um novo provedor: crie providers/<slug>.ts e registre aqui.

import { OlaClickAdapter } from "./providers/olaclick";
import type { DigitalMenuAdapter, DigitalMenuConnection } from "./types";

export type { DigitalMenuAdapter, DigitalMenuConnection };
export { BASE_URL_MISSING_REASON } from "./types";

const ADAPTERS: Record<string, DigitalMenuAdapter> = {
  olaclick: OlaClickAdapter,
  // anotaai:       AnotaAIAdapter,      // futuro
  // deliverydireto: DeliveryDiretoAdapter, // futuro
};

/** Retorna o adapter do provedor ou null se não implementado */
export function getDigitalMenuAdapter(providerSlug: string): DigitalMenuAdapter | null {
  return ADAPTERS[providerSlug] ?? null;
}

/** Lista de provedores disponíveis para o selector da UI */
export const DIGITAL_MENU_PROVIDERS: Array<{ slug: string; name: string }> = [
  { slug: "olaclick", name: "OlaClick" },
];

/** Resposta padronizada para quando a URL base está ausente */
export function makeBaseUrlMissingResponse(adapter: DigitalMenuAdapter) {
  return {
    ok:      false as const,
    reason:  "base_url_missing" as const,
    message: adapter.missingBaseUrlMessage,
  };
}
