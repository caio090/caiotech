/** Fase 24: providers de calendário -- nenhuma conexão real nesta sprint. */
export type CalendarProviderId = "internal" | "google_ical" | "google_oauth" | "manual" | "holiday_provider" | "seasonal_provider";

export type CalendarProviderState = "available" | "configured" | "disconnected" | "blocked" | "planned" | "error";

export interface CalendarProviderAdapter {
  id: CalendarProviderId;
  label: string;
  state: CalendarProviderState;
  /** Descreve por que está no estado atual -- nunca deixar "blocked"/"planned" sem explicação. */
  reason: string;
}

/**
 * Google por URL (iCal) fica "planned"; Google OAuth fica "blocked" até uma
 * integração segura formal (Fase 24: "Não alterar o status atual congelado
 * do Google Calendar OAuth sem autorização formal" -- este registry só
 * declara o estado, não conecta nada).
 */
export const CALENDAR_PROVIDERS: CalendarProviderAdapter[] = [
  { id: "internal", label: "Calendário interno LOKAT", state: "available", reason: "GlobalCalendarEvent já agrega content_item/operational_task/approval." },
  { id: "manual", label: "Evento manual", state: "available", reason: "Criação manual de evento, sem provider externo." },
  { id: "google_ical", label: "Google Calendar (por URL/iCal)", state: "planned", reason: "Mapeado nesta sprint, nenhuma leitura real implementada." },
  { id: "google_oauth", label: "Google Calendar (OAuth)", state: "blocked", reason: "Status congelado -- requer autorização formal antes de qualquer integração segura." },
  { id: "holiday_provider", label: "Feriados", state: "planned", reason: "Contrato definido (HolidayContext), nenhuma fonte de dados real conectada." },
  { id: "seasonal_provider", label: "Datas sazonais", state: "planned", reason: "Contrato definido (SeasonalDateContext), nenhuma fonte de dados real conectada." },
];

export function findCalendarProvider(id: CalendarProviderId): CalendarProviderAdapter | undefined {
  return CALENDAR_PROVIDERS.find((provider) => provider.id === id);
}
