import type { ReportTimeBucket, ReportWeekday } from "./types";

interface TimedOrder {
  occurredAt: string; // ISO
  totalCents: number;
}

const WEEKDAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export function weekdayLabel(weekday: number): string {
  return WEEKDAY_LABELS[weekday] ?? "—";
}

/** Buckets orders into 2-hour windows (0-2, 2-4, …, 22-24) in the given IANA timezone. */
export function buildHourlyBuckets(orders: TimedOrder[], timeZone: string): ReportTimeBucket[] {
  const buckets = new Map<number, { orders: number; totalCents: number }>();
  for (const order of orders) {
    const hour = hourInTimeZone(order.occurredAt, timeZone);
    if (hour === null) continue;
    const bucketStart = Math.floor(hour / 2) * 2;
    const existing = buckets.get(bucketStart) ?? { orders: 0, totalCents: 0 };
    existing.orders += 1;
    existing.totalCents += order.totalCents;
    buckets.set(bucketStart, existing);
  }
  return Array.from(buckets.entries())
    .map(([hourStart, v]) => ({ hourStart, granularityHours: 2 as const, orders: v.orders, totalCents: v.totalCents }))
    .sort((a, b) => a.hourStart - b.hourStart);
}

export function buildWeekdayBuckets(orders: TimedOrder[], timeZone: string): ReportWeekday[] {
  const buckets = new Map<number, { orders: number; totalCents: number }>();
  for (const order of orders) {
    const weekday = weekdayInTimeZone(order.occurredAt, timeZone);
    if (weekday === null) continue;
    const existing = buckets.get(weekday) ?? { orders: 0, totalCents: 0 };
    existing.orders += 1;
    existing.totalCents += order.totalCents;
    buckets.set(weekday, existing);
  }
  return Array.from(buckets.entries())
    .map(([weekday, v]) => ({ weekday, orders: v.orders, totalCents: v.totalCents }))
    .sort((a, b) => a.weekday - b.weekday);
}

function hourInTimeZone(iso: string, timeZone: string): number | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const formatted = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(d);
  const hour = Number.parseInt(formatted, 10);
  return Number.isFinite(hour) ? hour : null;
}

function weekdayInTimeZone(iso: string, timeZone: string): number | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const label = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(d);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return label in map ? map[label] : null;
}

export function bestBucket<T extends { orders: number }>(buckets: T[]): T | null {
  if (buckets.length === 0) return null;
  return buckets.reduce((best, b) => (b.orders > best.orders ? b : best), buckets[0]);
}

export function worstBucket<T extends { orders: number }>(buckets: T[]): T | null {
  const withOrders = buckets.filter((b) => b.orders > 0);
  if (withOrders.length === 0) return null;
  return withOrders.reduce((worst, b) => (b.orders < worst.orders ? b : worst), withOrders[0]);
}
