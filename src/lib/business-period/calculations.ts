import type { BusinessPeriodPreset, BusinessPeriodSelection } from "./types";
import { BUSINESS_PERIOD_PRESET_LABEL } from "./types";
import type { MetricPeriod } from "@/lib/data-quality/types";

function pad(value: number): string { return String(value).padStart(2, "0"); }
function formatISODate(year: number, month: number, day: number): string { return `${year}-${pad(month)}-${pad(day)}`; }

function getZonedParts(instant: Date, timeZone: string): { year: number; month: number; day: number; hour: number; minute: number } {
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  const parts = formatter.formatToParts(instant);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  const hour = get("hour");
  return { year: get("year"), month: get("month"), day: get("day"), hour: hour === 24 ? 0 : hour, minute: get("minute") };
}

/** Pure calendar-date arithmetic via Date.UTC -- never touches an actual timezone, just Y/M/D rollover (handles month/year turnover for free). */
function shiftCalendarDate(year: number, month: number, day: number, deltaDays: number): { year: number; month: number; day: number } {
  const shifted = new Date(Date.UTC(year, month - 1, day + deltaDays));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

function addDaysToISO(iso: string, deltaDays: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const shifted = shiftCalendarDate(year, month, day, deltaDays);
  return formatISODate(shifted.year, shifted.month, shifted.day);
}

/**
 * Fase 5: the ONLY place that converts between the UI's inclusive end date
 * and the domain's exclusive end date -- never scatter +1/-1 day arithmetic
 * across components again.
 */
export function toExclusiveEndDate(inclusiveEndISO: string): string { return addDaysToISO(inclusiveEndISO, 1); }
export function toInclusiveEndDate(exclusiveEndISO: string): string { return addDaysToISO(exclusiveEndISO, -1); }

export function formatDateBR(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

/** Shifts (year, month) by any number of months, positive or negative, with correct year rollover. */
function shiftMonth(year: number, month: number, deltaMonths: number): { year: number; month: number } {
  const totalMonths = year * 12 + (month - 1) + deltaMonths;
  return { year: Math.floor(totalMonths / 12), month: (((totalMonths % 12) + 12) % 12) + 1 };
}

function daysBetweenExclusive(startISO: string, endExclusiveISO: string): number {
  const [sy, sm, sd] = startISO.split("-").map(Number);
  const [ey, em, ed] = endExclusiveISO.split("-").map(Number);
  return Math.round((Date.UTC(ey, em - 1, ed) - Date.UTC(sy, sm - 1, sd)) / 86_400_000);
}

function isFullCalendarMonth(startISO: string, endExclusiveISO: string): boolean {
  const [sy, sm, sd] = startISO.split("-").map(Number);
  if (sd !== 1) return false;
  const firstOfNextMonth = new Date(Date.UTC(sy, sm, 1));
  const [ey, em, ed] = endExclusiveISO.split("-").map(Number);
  return Date.UTC(ey, em - 1, ed) === firstOfNextMonth.getTime();
}

/**
 * Fase 5/8: which operational day an instant belongs to, given a company's
 * timezone and virada (operationalDayStart, "HH:MM"). Before the virada, the
 * instant still belongs to the PREVIOUS calendar day -- this is what lets a
 * 04:00 close correctly bucket a 02:00 order into "yesterday".
 */
export function resolveOperationalDate(instant: Date, timeZone: string, operationalDayStart: string): string {
  const { year, month, day, hour, minute } = getZonedParts(instant, timeZone);
  const [startHour, startMinute] = operationalDayStart.split(":").map(Number);
  const beforeTurnover = hour * 60 + minute < startHour * 60 + startMinute;
  const { year: y, month: m, day: d } = beforeTurnover ? shiftCalendarDate(year, month, day, -1) : { year, month, day };
  return formatISODate(y, m, d);
}

function monthLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
}

/**
 * Fase 12: comparison range for ANY period. Full-calendar-month periods
 * compare against the full previous calendar month (variable length,
 * correct even across Feb/leap years); everything else compares against the
 * immediately preceding interval of the exact same duration.
 */
function resolveComparisonRange(startDate: string, endDateExclusive: string): { comparisonStartDate: string; comparisonEndDateExclusive: string; comparisonLabel: string } {
  if (isFullCalendarMonth(startDate, endDateExclusive)) {
    const [sy, sm] = startDate.split("-").map(Number);
    const previousMonth = shiftMonth(sy, sm, -1);
    return {
      comparisonStartDate: formatISODate(previousMonth.year, previousMonth.month, 1),
      comparisonEndDateExclusive: startDate,
      comparisonLabel: monthLabel(previousMonth.year, previousMonth.month),
    };
  }
  const durationDays = daysBetweenExclusive(startDate, endDateExclusive);
  const comparisonEndDateExclusive = startDate;
  const comparisonStartDate = addDaysToISO(startDate, -durationDays);
  const comparisonLabel = durationDays === 1
    ? formatDateBR(comparisonStartDate)
    : `${formatDateBR(comparisonStartDate)} até ${formatDateBR(toInclusiveEndDate(comparisonEndDateExclusive))}`;
  return { comparisonStartDate, comparisonEndDateExclusive, comparisonLabel };
}

export interface CustomPeriodDraft { startDate: string; endDateInclusive: string }
export interface CustomPeriodValidation {
  valid: boolean;
  fieldErrors: { startDate?: string; endDateInclusive?: string };
  formError: string | null;
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Fase 3: única função de validação do rascunho do período personalizado --
 * usada tanto pelo `disabled` do botão Aplicar quanto pelo handler (defesa
 * contra Enter/submit programático). Datas são comparadas como strings civis
 * "YYYY-MM-DD" (ordenação lexicográfica == ordenação cronológica nesse
 * formato), nunca convertidas para Date/UTC, para não introduzir deslocamento
 * de fuso horário acidental.
 */
export function validateCustomPeriodDraft(draft: CustomPeriodDraft): CustomPeriodValidation {
  const fieldErrors: CustomPeriodValidation["fieldErrors"] = {};
  if (!draft.startDate) fieldErrors.startDate = "Informe a data inicial.";
  else if (!ISO_DATE_PATTERN.test(draft.startDate)) fieldErrors.startDate = "Data inicial inválida.";
  if (!draft.endDateInclusive) fieldErrors.endDateInclusive = "Informe a data final.";
  else if (!ISO_DATE_PATTERN.test(draft.endDateInclusive)) fieldErrors.endDateInclusive = "Data final inválida.";

  if (fieldErrors.startDate || fieldErrors.endDateInclusive) {
    const formError = [fieldErrors.startDate, fieldErrors.endDateInclusive].filter((message): message is string => Boolean(message)).join(" ");
    return { valid: false, fieldErrors, formError };
  }
  if (draft.startDate > draft.endDateInclusive) {
    return { valid: false, fieldErrors: {}, formError: "A data inicial não pode ser posterior à data final." };
  }
  return { valid: true, fieldErrors: {}, formError: null };
}

export interface CustomPeriodInput { startDate: string; endDateExclusive: string }

export function buildPeriodSelection(preset: BusinessPeriodPreset, timezone: string, operationalDayStart: string, now: Date, custom?: CustomPeriodInput): BusinessPeriodSelection {
  const operationalToday = resolveOperationalDate(now, timezone, operationalDayStart);
  const [ty, tm] = operationalToday.split("-").map(Number);

  let startDate: string;
  let endDateExclusive: string;
  let label: string;

  switch (preset) {
    case "TODAY":
      startDate = operationalToday; endDateExclusive = addDaysToISO(operationalToday, 1); label = "Hoje";
      break;
    case "YESTERDAY":
      startDate = addDaysToISO(operationalToday, -1); endDateExclusive = operationalToday; label = "Ontem";
      break;
    case "LAST_7_DAYS":
      startDate = addDaysToISO(operationalToday, -6); endDateExclusive = addDaysToISO(operationalToday, 1); label = "Últimos 7 dias";
      break;
    case "LAST_30_DAYS":
      startDate = addDaysToISO(operationalToday, -29); endDateExclusive = addDaysToISO(operationalToday, 1); label = "Últimos 30 dias";
      break;
    case "THIS_MONTH": {
      startDate = formatISODate(ty, tm, 1);
      const nextMonth = shiftMonth(ty, tm, 1);
      endDateExclusive = formatISODate(nextMonth.year, nextMonth.month, 1);
      label = monthLabel(ty, tm);
      break;
    }
    case "PREVIOUS_MONTH": {
      const previousMonth = shiftMonth(ty, tm, -1);
      startDate = formatISODate(previousMonth.year, previousMonth.month, 1);
      endDateExclusive = formatISODate(ty, tm, 1);
      label = monthLabel(previousMonth.year, previousMonth.month);
      break;
    }
    case "THIS_QUARTER": {
      const quarterIndex = Math.floor((tm - 1) / 3);
      const quarterStartMonth = quarterIndex * 3 + 1;
      startDate = formatISODate(ty, quarterStartMonth, 1);
      const nextQuarterStart = shiftMonth(ty, quarterStartMonth, 3);
      endDateExclusive = formatISODate(nextQuarterStart.year, nextQuarterStart.month, 1);
      label = `${quarterIndex + 1}º trimestre de ${ty}`;
      break;
    }
    case "THIS_YEAR":
      startDate = formatISODate(ty, 1, 1); endDateExclusive = formatISODate(ty + 1, 1, 1); label = `Ano de ${ty}`;
      break;
    case "CUSTOM":
      if (!custom) throw new Error("CUSTOM preset requires a custom range");
      if (custom.startDate >= custom.endDateExclusive) throw new Error("startDate must be before endDateExclusive");
      startDate = custom.startDate; endDateExclusive = custom.endDateExclusive;
      label = `${formatDateBR(startDate)} a ${formatDateBR(toInclusiveEndDate(endDateExclusive))}`;
      break;
    default: {
      const exhaustive: never = preset;
      throw new Error(`Unknown preset: ${String(exhaustive)}`);
    }
  }

  const { comparisonStartDate, comparisonEndDateExclusive, comparisonLabel } = resolveComparisonRange(startDate, endDateExclusive);
  return { preset, startDate, endDateExclusive, comparisonStartDate, comparisonEndDateExclusive, timezone, operationalDayStart, label, comparisonLabel, isCustom: preset === "CUSTOM" };
}

/** Bridges to the (inclusive-end) MetricPeriod shape existing calculations already consume. */
export function toMetricPeriod(selection: BusinessPeriodSelection): MetricPeriod {
  return { start: selection.startDate, end: addDaysToISO(selection.endDateExclusive, -1), label: selection.label };
}

export function toComparisonMetricPeriod(selection: BusinessPeriodSelection): MetricPeriod {
  return { start: selection.comparisonStartDate, end: addDaysToISO(selection.comparisonEndDateExclusive, -1), label: selection.comparisonLabel };
}

export { BUSINESS_PERIOD_PRESET_LABEL };
