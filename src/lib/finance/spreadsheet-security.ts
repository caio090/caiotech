import * as XLSX from "xlsx";

export const SPREADSHEET_LIMITS = {
  maxFileBytes: 5 * 1024 * 1024,
  maxSheets: 12,
  maxRowsPerSheet: 5_000,
  maxColumnsPerSheet: 80,
  maxCells: 120_000,
  maxCellTextLength: 2_000,
} as const;

export type SpreadsheetSecurityCode =
  | "empty_file" | "invalid_extension" | "file_too_large" | "empty_workbook"
  | "too_many_sheets" | "too_many_rows" | "too_many_columns" | "too_many_cells"
  | "cell_too_long" | "unsafe_key" | "parse_failed";

export class SpreadsheetSecurityError extends Error {
  readonly code: SpreadsheetSecurityCode;
  constructor(code: SpreadsheetSecurityCode, message: string) { super(message); this.code = code; this.name = "SpreadsheetSecurityError"; }
}

const ALLOWED_EXTENSIONS = ["xlsx", "xls", "csv"];
const PROTOTYPE_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function extensionOf(name: string): string { return name.toLowerCase().split(".").pop() ?? ""; }

export function validateSpreadsheetFile(file: Pick<File, "name" | "size">): void {
  if (file.size <= 0) throw new SpreadsheetSecurityError("empty_file", "O arquivo está vazio. Escolha uma planilha com dados.");
  if (!ALLOWED_EXTENSIONS.includes(extensionOf(file.name))) throw new SpreadsheetSecurityError("invalid_extension", "Formato não aceito. Use XLSX, XLS ou CSV.");
  if (file.size > SPREADSHEET_LIMITS.maxFileBytes) throw new SpreadsheetSecurityError("file_too_large", "O arquivo excede o limite de 5 MB desta demonstração.");
}

function dimensions(sheet: XLSX.WorkSheet): { rows: number; columns: number } {
  if (!sheet["!ref"]) return { rows: 0, columns: 0 };
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  return { rows: range.e.r - range.s.r + 1, columns: range.e.c - range.s.c + 1 };
}

function sanitizeCell(value: unknown): string {
  const text = String(value ?? "").slice(0, SPREADSHEET_LIMITS.maxCellTextLength + 1);
  if (text.length > SPREADSHEET_LIMITS.maxCellTextLength) throw new SpreadsheetSecurityError("cell_too_long", "Uma célula excede o limite de 2.000 caracteres.");
  if (PROTOTYPE_KEYS.has(text.trim().toLowerCase())) throw new SpreadsheetSecurityError("unsafe_key", "A planilha contém um nome de campo reservado e não pode ser analisada.");
  return text;
}

export function readSpreadsheetSafely(buffer: ArrayBuffer): { workbook: XLSX.WorkBook; rowsBySheet: Map<string, string[][]> } {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, {
      type: "array", dense: true, cellFormula: false, cellHTML: false, cellStyles: false,
      bookVBA: false, bookDeps: false, bookFiles: false, bookProps: false, bookSheets: false,
      sheetRows: SPREADSHEET_LIMITS.maxRowsPerSheet + 1, WTF: false,
    });
  } catch {
    throw new SpreadsheetSecurityError("parse_failed", "Não foi possível ler esta planilha com segurança.");
  }
  if (!workbook.SheetNames.length) throw new SpreadsheetSecurityError("empty_workbook", "A planilha não possui nenhuma aba legível.");
  if (workbook.SheetNames.length > SPREADSHEET_LIMITS.maxSheets) throw new SpreadsheetSecurityError("too_many_sheets", `A planilha excede o limite de ${SPREADSHEET_LIMITS.maxSheets} abas.`);

  let totalCells = 0;
  const rowsBySheet = new Map<string, string[][]>();
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    const size = dimensions(sheet);
    if (size.rows > SPREADSHEET_LIMITS.maxRowsPerSheet) throw new SpreadsheetSecurityError("too_many_rows", `A aba “${name}” excede o limite de ${SPREADSHEET_LIMITS.maxRowsPerSheet} linhas.`);
    if (size.columns > SPREADSHEET_LIMITS.maxColumnsPerSheet) throw new SpreadsheetSecurityError("too_many_columns", `A aba “${name}” excede o limite de ${SPREADSHEET_LIMITS.maxColumnsPerSheet} colunas.`);
    totalCells += size.rows * size.columns;
    if (totalCells > SPREADSHEET_LIMITS.maxCells) throw new SpreadsheetSecurityError("too_many_cells", `A planilha excede o limite total de ${SPREADSHEET_LIMITS.maxCells} células.`);
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", blankrows: false, raw: false })
      .map((row) => row.map(sanitizeCell));
    rowsBySheet.set(name, rows);
  }
  return { workbook, rowsBySheet };
}
