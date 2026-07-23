import { parseCsv } from "./csv";
import { suggestColumnMapping, type ColumnMapping, type ImportField } from "./column-mapping";
import { parseCentsInput } from "@/lib/motor-lokat/money";

export type ImportFileFormat = "csv" | "json" | "xlsx" | "unknown";

export function detectFileFormat(fileName: string): ImportFileFormat {
  const ext = fileName.toLowerCase().split(".").pop();
  if (ext === "csv") return "csv";
  if (ext === "json") return "json";
  if (ext === "xlsx" || ext === "xls") return "xlsx";
  return "unknown";
}

export interface ImportPreviewRow {
  index: number;
  raw: Record<string, string>;
  valid: boolean;
  errors: string[];
  dedupeKey: string;
  isDuplicateInFile: boolean;
}

export interface ImportPreview {
  headers: string[];
  mapping: ColumnMapping;
  rows: ImportPreviewRow[];
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  periodStart: string | null;
  periodEnd: string | null;
}

/** BR ("31/12/2026") or ISO ("2026-12-31") date string -> ISO date, or null if unparseable. Never guesses a fallback date. */
function parseFlexibleDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const brMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (brMatch) {
    const [, d, m, y] = brMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (isoMatch) return isoMatch[0].slice(0, 10);
  return null;
}

function rowsFromCsvOrTable(headers: string[], rows: string[][]): Record<string, string>[] {
  return rows.map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = row[i] ?? ""; });
    return obj;
  });
}

function rowsFromJson(text: string): { headers: string[]; rows: Record<string, string>[] } | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { error: "JSON inválido — não foi possível interpretar o arquivo." };
  }
  if (!Array.isArray(parsed)) return { error: "O JSON deve ser uma lista de objetos (um por pedido/linha)." };
  const headerSet = new Set<string>();
  const rows: Record<string, string>[] = parsed.map((item) => {
    const obj: Record<string, string> = {};
    if (item && typeof item === "object") {
      for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
        headerSet.add(k);
        obj[k] = v === null || v === undefined ? "" : String(v);
      }
    }
    return obj;
  });
  return { headers: Array.from(headerSet), rows };
}

/** Builds a stable dedupe key from the mapped fields — falls back to a safe combination when no external id is present. Never used to silently drop rows; only to flag them for the user. */
function buildDedupeKey(row: Record<string, string>, mapping: ColumnMapping, sourceId: string, clientId: string): string {
  const byField = (field: ImportField): string | null => {
    const header = Object.entries(mapping).find(([, f]) => f === field)?.[0];
    return header ? row[header]?.trim() || null : null;
  };
  const orderId = byField("order_id");
  if (orderId) return `${sourceId}:${clientId}:id:${orderId}`;
  const date = byField("occurred_at") ?? "";
  const total = byField("total") ?? "";
  const payment = byField("payment_method") ?? "";
  return `${sourceId}:${clientId}:combo:${date}:${total}:${payment}`;
}

export function buildImportPreview(
  fileName: string,
  fileText: string,
  sourceId: string,
  clientId: string
): ImportPreview | { error: string } {
  const format = detectFileFormat(fileName);
  let headers: string[];
  let rawRows: Record<string, string>[];

  if (format === "csv") {
    const parsed = parseCsv(fileText);
    if (parsed.headers.length === 0) return { error: "Não foi possível encontrar um cabeçalho no arquivo CSV." };
    headers = parsed.headers;
    rawRows = rowsFromCsvOrTable(parsed.headers, parsed.rows);
  } else if (format === "json") {
    const result = rowsFromJson(fileText);
    if ("error" in result) return result;
    headers = result.headers;
    rawRows = result.rows;
  } else if (format === "xlsx") {
    return { error: "IMPORT_XLSX_BLOCKED" };
  } else {
    return { error: "Formato de arquivo não reconhecido. Use .csv ou .json." };
  }

  if (rawRows.length === 0) return { error: "O arquivo não contém nenhuma linha de dados." };

  const mapping = suggestColumnMapping(headers);
  const seenKeys = new Set<string>();
  const dates: string[] = [];

  const previewRows: ImportPreviewRow[] = rawRows.map((raw, index) => {
    const errors: string[] = [];
    const totalHeader = Object.entries(mapping).find(([, f]) => f === "total")?.[0];
    const dateHeader = Object.entries(mapping).find(([, f]) => f === "occurred_at")?.[0];

    if (totalHeader) {
      const cents = parseCentsInput(raw[totalHeader] ?? "");
      if (raw[totalHeader]?.trim() && cents === 0 && !/^0([,.]0+)?$/.test(raw[totalHeader].trim())) {
        errors.push(`Valor não reconhecido em "${totalHeader}": "${raw[totalHeader]}"`);
      }
    } else {
      errors.push('Nenhuma coluna mapeada para "Valor total".');
    }

    if (dateHeader) {
      const iso = parseFlexibleDate(raw[dateHeader] ?? "");
      if (!iso) errors.push(`Data não reconhecida em "${dateHeader}": "${raw[dateHeader]}"`);
      else dates.push(iso);
    } else {
      errors.push('Nenhuma coluna mapeada para "Data".');
    }

    const dedupeKey = buildDedupeKey(raw, mapping, sourceId, clientId);
    const isDuplicateInFile = seenKeys.has(dedupeKey);
    seenKeys.add(dedupeKey);

    return { index, raw, valid: errors.length === 0, errors, dedupeKey, isDuplicateInFile };
  });

  const sortedDates = [...dates].sort();
  return {
    headers,
    mapping,
    rows: previewRows,
    validCount: previewRows.filter((r) => r.valid && !r.isDuplicateInFile).length,
    invalidCount: previewRows.filter((r) => !r.valid).length,
    duplicateCount: previewRows.filter((r) => r.isDuplicateInFile).length,
    periodStart: sortedDates[0] ?? null,
    periodEnd: sortedDates[sortedDates.length - 1] ?? null,
  };
}
