/**
 * Minimal, dependency-free CSV parser/writer (RFC 4180-ish): handles quoted
 * fields, escaped quotes (""), commas and newlines inside quotes, and both
 * \r\n and \n line endings. No external library — XLSX needed one
 * (see ../import/xlsx-status.ts for why that format is blocked instead).
 */

export interface ParsedTable {
  headers: string[];
  rows: string[][];
}

export function parseCsv(text: string): ParsedTable {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  // Strip a UTF-8 BOM, common in spreadsheet-exported CSVs.
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (inQuotes) {
      if (c === '"') {
        if (input[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') { inQuotes = true; continue; }
    if (c === ",") { row.push(field); field = ""; continue; }
    if (c === "\r") continue;
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }

  const nonEmpty = rows.filter((r) => !(r.length === 1 && r[0] === ""));
  const headers = (nonEmpty[0] ?? []).map((h) => h.trim());
  return { headers, rows: nonEmpty.slice(1) };
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Builds a CSV string preserving UTF-8, headers, and treating every cell as text (no destructive currency/date coercion). */
export function buildCsv(headers: string[], rows: string[][]): string {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) lines.push(row.map((cell) => csvEscape(cell ?? "")).join(","));
  return lines.join("\r\n");
}
