export type BusinessPeriodPreset = "TODAY" | "YESTERDAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "THIS_MONTH" | "PREVIOUS_MONTH" | "THIS_QUARTER" | "THIS_YEAR" | "CUSTOM";

export const BUSINESS_PERIOD_PRESET_LABEL: Record<BusinessPeriodPreset, string> = {
  TODAY: "Hoje",
  YESTERDAY: "Ontem",
  LAST_7_DAYS: "Últimos 7 dias",
  LAST_30_DAYS: "Últimos 30 dias",
  THIS_MONTH: "Este mês",
  PREVIOUS_MONTH: "Mês anterior",
  THIS_QUARTER: "Este trimestre",
  THIS_YEAR: "Este ano",
  CUSTOM: "Personalizado",
};

/**
 * Central period selection for Meu Negócio (Fase 7). Dates are plain
 * "YYYY-MM-DD" operational-day strings (already adjusted for
 * operationalDayStart/timezone, see business-period/calculations.ts), with
 * an EXCLUSIVE end -- `endDateExclusive` is the first day NOT included, so
 * ranges compose without off-by-one errors. UI may show `endDateExclusive`
 * minus one day as the inclusive "data final" the user sees.
 */
export interface BusinessPeriodSelection {
  preset: BusinessPeriodPreset;
  startDate: string;
  endDateExclusive: string;
  comparisonStartDate: string;
  comparisonEndDateExclusive: string;
  timezone: string;
  /** "HH:MM", e.g. "04:00" -- configured per company, never a global default applied silently. */
  operationalDayStart: string;
  label: string;
  comparisonLabel: string;
  isCustom: boolean;
}
