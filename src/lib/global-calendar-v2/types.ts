import type { GlobalCalendarEvent } from "@/lib/global-calendar";

/**
 * Fase 23: contratos "2.0" do Calendário Global -- EVOLUEM
 * src/lib/global-calendar.ts, não o substituem. GlobalCalendarEvent
 * continua sendo o tipo real (content_item/operational_task/approval);
 * CalendarCategory é uma camada de classificação adicional por cima dele,
 * nunca um segundo modelo de evento.
 */
export type CalendarCategory =
  | "operations"
  | "content"
  | "meetings"
  | "commercial"
  | "finance"
  | "fiscal"
  | "projects"
  | "team"
  | "inventory"
  | "campaigns"
  | "seasonal"
  | "holidays"
  | "deadlines"
  | "reminders";

export type CalendarLayer = "core" | "niche_pack" | "manual" | "holiday" | "seasonal";

export type CalendarEventRelationType = "blocks" | "depends_on" | "related_to" | "duplicate_of";

export interface CalendarEventRelation {
  eventId: string;
  relatedEventId: string;
  type: CalendarEventRelationType;
}

/** Extensão opcional de um GlobalCalendarEvent existente -- nunca redefine os campos originais. */
export interface CalendarEventV2Extension {
  eventId: string;
  category: CalendarCategory;
  layer: CalendarLayer;
  relations: CalendarEventRelation[];
}

export interface CalendarLocationContext {
  city?: string;
  state?: string;
  source: "business_address" | "manual_city" | "browser_geolocation" | "unknown";
}

export interface HolidayContext {
  id: string;
  name: string;
  date: string;
  scope: "national" | "state" | "municipal" | "segment" | "company_custom";
  region?: string;
  segment?: string;
  relevance: "low" | "medium" | "high";
  confidence: "confirmed" | "estimated";
  enabled: boolean;
  notes?: string;
}

export interface SeasonalDateContext {
  id: string;
  name: string;
  approximateDate: string;
  scope: "national" | "state" | "municipal" | "segment" | "company_custom";
  segment?: string;
  relevance: "low" | "medium" | "high";
  confidence: "confirmed" | "estimated";
  enabled: boolean;
  notes?: string;
}

/** Reexporta o tipo real -- garante que quem importar daqui não crie um segundo GlobalCalendarEvent por engano. */
export type { GlobalCalendarEvent };
