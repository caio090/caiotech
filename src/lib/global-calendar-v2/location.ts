import type { CalendarLocationContext } from "./types";

/** Fase 25: prioridade fixa de resolução de localização -- nunca solicita geolocalização automaticamente. */
const LOCATION_PRIORITY: CalendarLocationContext["source"][] = ["business_address", "manual_city", "browser_geolocation", "unknown"];

export function resolveLocationContext(candidates: Partial<Record<CalendarLocationContext["source"], { city?: string; state?: string }>>): CalendarLocationContext {
  for (const source of LOCATION_PRIORITY) {
    const candidate = candidates[source];
    if (candidate?.city) return { city: candidate.city, state: candidate.state, source };
  }
  return { source: "unknown" };
}

/** UX futura (Fase 25) -- opções apresentadas ao usuário, nunca chamada automática ao navegador. */
export const LOCATION_UX_OPTIONS = ["Usar endereço cadastrado", "Informar cidade", "Permitir localização", "Agora não"] as const;
