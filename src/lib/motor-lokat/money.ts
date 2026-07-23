/**
 * Money is always stored as integer cents internally. Conversion to/from
 * reais only happens at the UI boundary (parsing input, formatting output).
 */

/** Formats integer cents as a BRL currency string, e.g. 15050 -> "R$ 150,50". */
export function formatCents(cents: number): string {
  if (!Number.isFinite(cents)) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

/** Parses a BRL-ish user input string ("150,50", "150.50", "R$ 150,50") into integer cents. Returns 0 for empty/invalid. */
export function parseCentsInput(raw: string): number {
  const cleaned = raw.replace(/[^\d,.-]/g, "");
  if (!cleaned) return 0;
  // Assume comma is the decimal separator when both are present (pt-BR "1.234,56"); otherwise treat the last separator as decimal.
  const normalized = cleaned.includes(",") && cleaned.includes(".")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned.replace(",", ".");
  const reais = Number.parseFloat(normalized);
  if (!Number.isFinite(reais)) return 0;
  return Math.round(reais * 100);
}

/** Formats a fraction (0.35) as a percentage string ("35,0%"). */
export function formatPercent(fraction: number, digits = 1): string {
  if (!Number.isFinite(fraction)) return "—";
  return `${(fraction * 100).toFixed(digits).replace(".", ",")}%`;
}

/** Parses a "35" or "35%" or "35,5" input into a fraction (0.355). */
export function parsePercentInput(raw: string): number {
  const cleaned = raw.replace(/[^\d,.-]/g, "").replace(",", ".");
  if (!cleaned) return 0;
  const pct = Number.parseFloat(cleaned);
  if (!Number.isFinite(pct)) return 0;
  return pct / 100;
}

/** Division that never produces NaN/Infinity — returns null when the denominator is unusable. */
export function safeDivide(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  if (denominator === 0) return null;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : null;
}

/** Rounds a fraction result to avoid floating point noise (e.g. 0.6000000000000001). */
export function roundFraction(fraction: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(fraction * factor) / factor;
}
