/**
 * Pure classification logic for the local spreadsheet import flow (Fase 11).
 * Operates on already-parsed rows (string matrices) — no xlsx/file-reading
 * here, so it's testable without any binary file. The actual xlsx parsing
 * (via the `xlsx` package) lives in the client component that calls this.
 */

import type { SpreadsheetColumn, SpreadsheetDataClassification, SpreadsheetSheet, SpreadsheetSheetType } from "./types";

const SHEET_TYPE_KEYWORDS: Record<Exclude<SpreadsheetSheetType, "unknown">, string[]> = {
  cash_flow: ["fluxo de caixa", "fluxo caixa", "caixa"],
  fixed_costs: ["custo fixo", "custos fixos", "despesa fixa"],
  variable_costs: ["custo variavel", "custo variável", "custos variaveis", "despesa variavel"],
  revenues: ["receita", "faturamento", "vendas"],
  accounts_receivable: ["contas a receber", "recebiveis", "recebíveis", "a receber"],
  accounts_payable: ["contas a pagar", "pagaveis", "pagáveis", "a pagar"],
  inventory: ["estoque", "inventario", "inventário"],
  ingredients: ["insumo", "insumos", "ingrediente"],
  products: ["produto", "produtos"],
  technical_sheets: ["ficha tecnica", "ficha técnica", "fichas tecnicas"],
  pricing: ["precificacao", "precificação", "preco", "preço"],
};

const COLUMN_FIELD_KEYWORDS: Record<string, string[]> = {
  description: ["descricao", "descrição", "item", "lancamento", "lançamento"],
  amount: ["valor", "montante", "preco", "preço", "total"],
  dueDate: ["vencimento", "data de vencimento", "data vencimento"],
  effectiveDate: ["data de pagamento", "data pagamento", "data de recebimento", "pago em", "recebido em"],
  competenceDate: ["competencia", "competência", "mes referencia", "mês referência"],
  category: ["categoria", "classificacao", "classificação", "tipo"],
  status: ["status", "situacao", "situação"],
  paymentMethod: ["forma de pagamento", "metodo de pagamento", "método de pagamento", "meio de pagamento"],
  quantity: ["quantidade", "qtd", "qtde"],
  unit: ["unidade", "un"],
  unitCost: ["custo unitario", "custo unitário", "valor unitario", "valor unitário"],
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/** Detects the most likely header row: the first row where most cells are non-empty, non-numeric text. */
export function detectHeaderRowIndex(rows: string[][]): number | null {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    const nonEmpty = row.filter((c) => c && c.trim() !== "");
    if (nonEmpty.length < Math.max(2, Math.ceil(row.length * 0.5))) continue;
    const textCells = nonEmpty.filter((c) => Number.isNaN(Number(c.replace(",", "."))));
    if (textCells.length >= Math.ceil(nonEmpty.length * 0.6)) return i;
  }
  return null;
}

/** Suggests a sheet type from its name and header row, with a confidence score. */
export function suggestSheetType(sheetName: string, headerRow: string[]): { type: SpreadsheetSheetType; confidence: number } {
  const haystack = normalize(`${sheetName} ${headerRow.join(" ")}`);
  let best: { type: SpreadsheetSheetType; score: number } = { type: "unknown", score: 0 };

  for (const [type, keywords] of Object.entries(SHEET_TYPE_KEYWORDS) as Array<[SpreadsheetSheetType, string[]]>) {
    let score = 0;
    for (const kw of keywords) {
      if (haystack.includes(normalize(kw))) score += 1;
    }
    if (score > best.score) best = { type, score };
  }

  if (best.score === 0) return { type: "unknown", confidence: 0 };
  const confidence = Math.min(0.95, 0.5 + best.score * 0.15);
  return { type: best.type, confidence };
}

function wordsOf(text: string): string[] {
  return normalize(text).split(/[^a-z0-9]+/).filter(Boolean);
}

/** True when `needle` words appear as a contiguous run inside `haystack` words — word-boundary match, never a raw substring (avoids e.g. "un" matching inside "coluna"). */
function containsWordSequence(haystack: string[], needle: string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  for (let start = 0; start <= haystack.length - needle.length; start++) {
    if (needle.every((word, i) => haystack[start + i] === word)) return true;
  }
  return false;
}

/** Suggests a target field for each header cell, with per-column confidence. */
export function suggestColumnMapping(headerRow: string[], sampleRows: string[][]): SpreadsheetColumn[] {
  return headerRow.map((header, index) => {
    const headerWords = wordsOf(header ?? "");
    let bestField: string | null = null;
    let bestScore = 0;

    for (const [field, keywords] of Object.entries(COLUMN_FIELD_KEYWORDS)) {
      for (const kw of keywords) {
        const kwWords = wordsOf(kw);
        if (kwWords.length === 0 || !containsWordSequence(headerWords, kwWords)) continue;
        const score = kwWords.length === headerWords.length ? 1 : Math.min(0.95, 0.6 + (kwWords.length / Math.max(1, headerWords.length)) * 0.35);
        if (score > bestScore) { bestField = field; bestScore = score; }
      }
      if (bestScore >= 1) break;
    }

    const sampleValues = sampleRows.map((r) => r[index] ?? "").filter((v) => v !== "").slice(0, 3);
    return {
      index,
      headerLabel: header ?? `Coluna ${index + 1}`,
      suggestedField: bestField,
      confidence: bestField ? Math.min(0.95, bestScore) : 0,
      sampleValues,
    };
  });
}

/** Suggests the data nature/classification for a sheet from its name/header — never defaults to "actual" without a signal. */
export function suggestDataClassification(sheetName: string, headerRow: string[]): SpreadsheetDataClassification {
  const haystack = normalize(`${sheetName} ${headerRow.join(" ")}`);
  if (/\bplanejad|\borcamento|\borçamento|\bprevist/.test(haystack)) return "planned";
  if (/\bteoric|\bteóric|\bficha tecnica|\bficha técnica/.test(haystack)) return "theoretical";
  if (/\bprojet|\bprojec|\bprevisao|\bprevisão|\bsimulad/.test(haystack)) return "projected";
  if (/\bestimad/.test(haystack)) return "estimated";
  if (/\brealizad|\bpago|\brecebido|\bfechamento/.test(haystack)) return "actual";
  return "unknown";
}

/** Builds a full SpreadsheetSheet analysis (header detection + type + classification + column mapping) from raw rows. */
export function analyzeSheet(sheetName: string, rows: string[][]): SpreadsheetSheet {
  const headerRowIndex = detectHeaderRowIndex(rows);
  const headerRow = headerRowIndex !== null ? rows[headerRowIndex] : [];
  const dataRows = headerRowIndex !== null ? rows.slice(headerRowIndex + 1) : rows;

  const { type, confidence } = suggestSheetType(sheetName, headerRow);
  const classification = suggestDataClassification(sheetName, headerRow);
  const columns = suggestColumnMapping(headerRow, dataRows.slice(0, 5));

  return {
    name: sheetName,
    headerRowIndex,
    suggestedType: type,
    typeConfidence: confidence,
    suggestedClassification: classification,
    columns,
    rowCount: dataRows.filter((r) => r.some((c) => c && c.trim() !== "")).length,
    previewRows: rows.slice(0, 6),
  };
}
