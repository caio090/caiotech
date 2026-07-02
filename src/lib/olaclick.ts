// Compatibilidade retroativa: delega ao adapter do módulo Cardápio Digital.
// Use src/lib/digital-menu/index.ts para código novo.

import { OlaClickAdapter } from "./digital-menu/providers/olaclick";
import { makeBaseUrlMissingResponse } from "./digital-menu/index";

export function resolveOlaClickBaseUrl(conn: { api_base_url?: string | null }): string | null {
  return OlaClickAdapter.resolveBaseUrl({ api_base_url: conn.api_base_url ?? null });
}

export const OLACLICK_BASE_URL_MISSING_RESPONSE = makeBaseUrlMissingResponse(OlaClickAdapter);
