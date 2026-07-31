import type { HolidayContext, SeasonalDateContext } from "./types";

/** Fase 26: fixtures demonstrativas -- nenhuma pesquisa/importação real de datas nesta sprint, nenhuma data tratada como "verdade universal" sem fonte/escopo. */
export const DEMO_HOLIDAYS: HolidayContext[] = [
  { id: "hol_001", name: "Confraternização Universal (exemplo)", date: "2027-01-01", scope: "national", relevance: "medium", confidence: "confirmed", enabled: true },
];

export const DEMO_SEASONAL_DATES: SeasonalDateContext[] = [
  { id: "sea_001", name: "Dia das Mães (exemplo)", approximateDate: "segundo domingo de maio", scope: "segment", segment: "food_service", relevance: "high", confidence: "estimated", enabled: true, notes: "Data aproximada -- confirmar por ano." },
];

export function findEnabledHolidays(holidays: HolidayContext[] = DEMO_HOLIDAYS): HolidayContext[] {
  return holidays.filter((holiday) => holiday.enabled);
}

export function findSeasonalOpportunitiesForSegment(segment: string, dates: SeasonalDateContext[] = DEMO_SEASONAL_DATES): SeasonalDateContext[] {
  return dates.filter((date) => date.enabled && (date.segment === segment || date.scope === "national"));
}
