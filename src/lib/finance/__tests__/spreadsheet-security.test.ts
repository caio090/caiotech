(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require("xlsx") as typeof import("xlsx");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const s = require("../spreadsheet-security.ts") as typeof import("../spreadsheet-security");
let passed = 0, failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };
const throwsCode = (fn: () => unknown, code: string) => { try { fn(); return false; } catch (error) { return error instanceof s.SpreadsheetSecurityError && error.code === code; } };

assert(!XLSX.version.startsWith("0.18.5"), "xlsx vulnerável removido");
assert(XLSX.version === "0.20.3", "xlsx fixado em 0.20.3");
assert(throwsCode(() => s.validateSpreadsheetFile({ name: "vazio.xlsx", size: 0 } as File), "empty_file"), "arquivo vazio rejeitado");
assert(throwsCode(() => s.validateSpreadsheetFile({ name: "dados.exe", size: 20 } as File), "invalid_extension"), "extensão inesperada rejeitada");
assert(throwsCode(() => s.validateSpreadsheetFile({ name: "grande.xlsx", size: s.SPREADSHEET_LIMITS.maxFileBytes + 1 } as File), "file_too_large"), "arquivo acima do limite rejeitado");
assert(!throwsCode(() => s.validateSpreadsheetFile({ name: "dados.csv", size: 20 } as File), "invalid_extension"), "CSV permitido");

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["Produto", "Valor"], ["Teste", 10]]), "Dados");
const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
const safe = s.readSpreadsheetSafely(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
assert(safe.workbook.SheetNames.length === 1, "workbook válido lido");
assert(safe.rowsBySheet.get("Dados")?.length === 2, "linhas lidas localmente");

const proto = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(proto, XLSX.utils.aoa_to_sheet([["__proto__"]]), "Dados");
const protoBuffer = XLSX.write(proto, { type: "buffer", bookType: "xlsx" });
assert(throwsCode(() => s.readSpreadsheetSafely(protoBuffer.buffer.slice(protoBuffer.byteOffset, protoBuffer.byteOffset + protoBuffer.byteLength)), "unsafe_key"), "prototype key rejeitada");

const formula = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(formula, { A1: { t: "n", v: 2, f: "1+1" }, "!ref": "A1" }, "Formula");
const formulaBuffer = XLSX.write(formula, { type: "buffer", bookType: "xlsx" });
const formulaRows = s.readSpreadsheetSafely(formulaBuffer.buffer.slice(formulaBuffer.byteOffset, formulaBuffer.byteOffset + formulaBuffer.byteLength)).rowsBySheet.get("Formula");
assert(formulaRows?.[0]?.[0] === "2", "fórmula não é executada nem exposta");

const manySheets = XLSX.utils.book_new();
for (let i = 0; i <= s.SPREADSHEET_LIMITS.maxSheets; i++) XLSX.utils.book_append_sheet(manySheets, XLSX.utils.aoa_to_sheet([[i]]), `A${i}`);
const manyBuffer = XLSX.write(manySheets, { type: "buffer", bookType: "xlsx" });
assert(throwsCode(() => s.readSpreadsheetSafely(manyBuffer.buffer.slice(manyBuffer.byteOffset, manyBuffer.byteOffset + manyBuffer.byteLength)), "too_many_sheets"), "excesso de abas rejeitado");

assert(s.SPREADSHEET_LIMITS.maxRowsPerSheet === 5000, "limite de linhas centralizado");
assert(s.SPREADSHEET_LIMITS.maxColumnsPerSheet === 80, "limite de colunas centralizado");
assert(s.SPREADSHEET_LIMITS.maxCells === 120000, "limite de células centralizado");
assert(s.SPREADSHEET_LIMITS.maxCellTextLength === 2000, "limite de texto centralizado");
assert(!JSON.stringify(s.SPREADSHEET_LIMITS).includes("Infinity"), "nenhum limite ilimitado");

console.log(`[result] ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
})();
