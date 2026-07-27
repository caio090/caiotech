"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Upload, Download, Cloud, AlertTriangle, CheckCircle2, Clock, XCircle, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateId } from "./_shared";
import { downloadLokatTemplate } from "@/lib/finance/spreadsheet-template";
import { analyzeSheet } from "@/lib/finance/spreadsheet-classification";
import type {
  BusinessViewMode, SpreadsheetImportBatch, SpreadsheetImportFile, SpreadsheetImportStatus, SpreadsheetSheet, GoogleSheetConnection,
} from "@/lib/finance/types";

const FIELD_OPTIONS = [
  "description", "amount", "dueDate", "effectiveDate", "competenceDate", "category", "status", "paymentMethod", "quantity", "unit", "unitCost",
];
const FIELD_LABEL: Record<string, string> = {
  description: "Descrição", amount: "Valor", dueDate: "Data de vencimento", effectiveDate: "Data efetiva",
  competenceDate: "Competência", category: "Categoria", status: "Status", paymentMethod: "Forma de pagamento",
  quantity: "Quantidade", unit: "Unidade", unitCost: "Custo unitário",
};

const SHEET_TYPE_LABEL: Record<string, string> = {
  cash_flow: "Fluxo de caixa", fixed_costs: "Custos fixos", variable_costs: "Custos variáveis", revenues: "Receitas",
  accounts_receivable: "Contas a receber", accounts_payable: "Contas a pagar", inventory: "Estoque", ingredients: "Insumos",
  products: "Produtos", technical_sheets: "Fichas técnicas", pricing: "Precificação", unknown: "Não identificado",
};
const CLASSIFICATION_LABEL: Record<string, string> = {
  actual: "Real", planned: "Planejado", theoretical: "Teórico", projected: "Projetado", estimated: "Estimado", unknown: "Não identificado",
};

const STATUS_META: Record<SpreadsheetImportStatus, { label: string; icon: React.ElementType; cls: string }> = {
  uploaded: { label: "Enviado", icon: Clock, cls: "bg-gray-100 text-gray-500" },
  analyzing: { label: "Analisando", icon: Clock, cls: "bg-blue-50 text-blue-700" },
  review_required: { label: "Revisão necessária", icon: AlertTriangle, cls: "bg-amber-50 text-amber-700" },
  confirmed: { label: "Confirmado", icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-700" },
  partially_confirmed: { label: "Confirmado parcialmente", icon: AlertTriangle, cls: "bg-amber-50 text-amber-700" },
  rejected: { label: "Rejeitado", icon: XCircle, cls: "bg-red-50 text-red-700" },
  failed: { label: "Falhou", icon: XCircle, cls: "bg-red-50 text-red-700" },
};

async function parseWorkbookToImportFile(file: File): Promise<SpreadsheetImportFile> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const format: SpreadsheetImportFile["format"] = file.name.toLowerCase().endsWith(".csv") ? "csv" : file.name.toLowerCase().endsWith(".xls") ? "xls" : "xlsx";

  const sheets: SpreadsheetSheet[] = workbook.SheetNames.map((name) => {
    const rows = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[name], { header: 1, defval: "", blankrows: false })
      .map((row) => row.map((cell) => String(cell ?? "")));
    return analyzeSheet(name, rows);
  });

  return { id: generateId("import"), fileName: file.name, fileSizeBytes: file.size, format, sheets, uploadedAt: new Date().toISOString() };
}

function sheetRowOutcome(sheet: SpreadsheetSheet): { accepted: number; warning: number; rejected: number } {
  if (sheet.headerRowIndex === null) return { accepted: 0, warning: 0, rejected: sheet.rowCount };
  if (sheet.typeConfidence >= 0.65) return { accepted: sheet.rowCount, warning: 0, rejected: 0 };
  if (sheet.typeConfidence >= 0.35) return { accepted: 0, warning: sheet.rowCount, rejected: 0 };
  return { accepted: 0, warning: 0, rejected: sheet.rowCount };
}

export function FinanceImportPanel({
  companyName, viewMode, history, onHistoryChange, googleConnection,
}: {
  companyName: string;
  viewMode: BusinessViewMode;
  history: SpreadsheetImportBatch[];
  onHistoryChange: (next: SpreadsheetImportBatch[]) => void;
  googleConnection: GoogleSheetConnection;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<SpreadsheetImportFile | null>(null);
  const [mappingOverrides, setMappingOverrides] = useState<Record<string, string | null>>({});
  const [parseError, setParseError] = useState<string | null>(null);
  const isManager = viewMode === "manager";

  async function handleFileSelected(file: File) {
    setParseError(null);
    setPending(null);
    try {
      const parsed = await parseWorkbookToImportFile(file);
      setPending(parsed);
      setMappingOverrides({});
    } catch {
      setParseError("Não foi possível ler este arquivo. Confirme que é um .xlsx, .xls ou .csv válido.");
    }
  }

  function mappingKey(sheetName: string, columnIndex: number) {
    return `${sheetName}::${columnIndex}`;
  }

  function fieldFor(sheet: SpreadsheetSheet, columnIndex: number): string | null {
    const key = mappingKey(sheet.name, columnIndex);
    return key in mappingOverrides ? mappingOverrides[key] : sheet.columns[columnIndex]?.suggestedField ?? null;
  }

  function confirmImport() {
    if (!pending) return;
    let accepted = 0, warning = 0, rejected = 0;
    for (const sheet of pending.sheets) {
      const outcome = sheetRowOutcome(sheet);
      accepted += outcome.accepted; warning += outcome.warning; rejected += outcome.rejected;
    }
    const status: SpreadsheetImportStatus = rejected === 0 && warning === 0 ? "confirmed" : accepted > 0 ? "partially_confirmed" : "rejected";
    const classifications = new Set(pending.sheets.map((s) => s.suggestedClassification));
    const batch: SpreadsheetImportBatch = {
      id: generateId("import-batch"),
      fileName: pending.fileName,
      origin: "upload_local",
      importedAt: new Date().toISOString(),
      companyName,
      sheetsFound: pending.sheets.length,
      rowsFound: pending.sheets.reduce((s, sh) => s + sh.rowCount, 0),
      rowsAccepted: accepted,
      rowsWithWarning: warning,
      rowsRejected: rejected,
      classification: classifications.size === 1 ? [...classifications][0] : "unknown",
      responsible: "Você (demonstração)",
      status,
    };
    onHistoryChange([batch, ...history]);
    setPending(null);
    setMappingOverrides({});
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Dados e planilhas</p>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => inputRef.current?.click()}
            data-testid="import-spreadsheet-button"
            className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" /> Importar planilha
          </button>
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])} />
          <button
            onClick={downloadLokatTemplate}
            data-testid="download-template-button"
            className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Baixar modelo da Lokat
          </button>
          <button
            disabled
            data-testid="connect-google-sheets-button"
            className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2.5 rounded-xl border border-gray-200 text-gray-400 cursor-not-allowed"
          >
            <Cloud className="w-3.5 h-3.5" /> Conectar Google Planilhas <span className="text-[9px] bg-gray-100 px-1.5 py-0.5 rounded-full">Em breve</span>
          </button>
        </div>
        <p className="text-[11px] text-gray-400 mt-3">Formatos aceitos: XLSX, XLS, CSV. Nada é enviado a nenhum servidor — a leitura acontece no seu navegador.</p>
        {parseError && <p className="text-xs text-red-600 mt-2">{parseError}</p>}
      </div>

      {pending && (
        <div className="bg-white rounded-2xl border border-purple-100 p-4 space-y-4" data-testid="import-proposal">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-purple-600" />
            <p className="text-sm font-bold text-gray-900">{pending.fileName}</p>
            <span className="text-[10px] text-gray-400">{pending.sheets.length} aba(s) encontrada(s)</span>
          </div>

          {pending.sheets.map((sheet) => {
            const outcome = sheetRowOutcome(sheet);
            return (
              <div key={sheet.name} className="border border-gray-100 rounded-xl p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <p className="text-xs font-bold text-gray-800">{sheet.name}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                      {SHEET_TYPE_LABEL[sheet.suggestedType]}
                    </span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                      {CLASSIFICATION_LABEL[sheet.suggestedClassification]}
                    </span>
                    <span className="text-[9px] text-gray-400">Confiança da leitura: {(sheet.typeConfidence * 100).toFixed(0)}%</span>
                  </div>
                </div>

                {sheet.headerRowIndex === null ? (
                  <p className="text-[11px] text-red-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Não foi possível identificar a linha de cabeçalho nesta aba.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="text-left text-gray-400">
                          <th className="pr-3 py-1 font-semibold">Coluna</th>
                          <th className="pr-3 py-1 font-semibold">Campo sugerido</th>
                          <th className="pr-3 py-1 font-semibold">Confiança</th>
                          <th className="py-1 font-semibold">Amostra</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sheet.columns.map((col) => (
                          <tr key={col.index} className="border-t border-gray-50">
                            <td className="pr-3 py-1.5 text-gray-700">{col.headerLabel}</td>
                            <td className="pr-3 py-1.5">
                              <select
                                value={fieldFor(sheet, col.index) ?? ""}
                                onChange={(e) => setMappingOverrides((prev) => ({ ...prev, [mappingKey(sheet.name, col.index)]: e.target.value || null }))}
                                data-testid={`mapping-select-${sheet.name}-${col.index}`}
                                className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-purple-400"
                              >
                                <option value="">Ignorar coluna</option>
                                {FIELD_OPTIONS.map((f) => <option key={f} value={f}>{FIELD_LABEL[f]}</option>)}
                              </select>
                            </td>
                            <td className="pr-3 py-1.5 text-gray-500">{col.suggestedField ? `${(col.confidence * 100).toFixed(0)}%` : "—"}</td>
                            <td className="py-1.5 text-gray-400">{col.sampleValues.join(", ") || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <p className="text-[10px] text-gray-400 mt-2">
                  {sheet.rowCount} linha(s) — {outcome.accepted} aceitas, {outcome.warning} com alerta, {outcome.rejected} rejeitadas
                </p>
              </div>
            );
          })}

          <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <p className="text-[11px] text-amber-800">Nenhuma linha é aplicada automaticamente. Revise o mapeamento e confirme para registrar a importação apenas nesta demonstração.</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={confirmImport}
              data-testid="confirm-import-button"
              className="text-xs font-bold px-4 py-2.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors"
            >
              Confirmar proposta
            </button>
            <button
              onClick={() => { setPending(null); setMappingOverrides({}); if (inputRef.current) inputRef.current.value = ""; }}
              className="text-xs font-bold px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Histórico de importações</p>
        {history.length === 0 ? (
          <p className="text-xs text-gray-400">Nenhuma importação registrada nesta demonstração ainda.</p>
        ) : (
          <div className="space-y-2">
            {history.map((batch) => {
              const meta = STATUS_META[batch.status];
              const Icon = meta.icon;
              return (
                <div key={batch.id} className="flex flex-wrap items-center justify-between gap-2 border border-gray-100 rounded-xl px-3 py-2.5">
                  <div>
                    <p className="text-xs font-bold text-gray-800">{batch.fileName}</p>
                    <p className="text-[10px] text-gray-400">
                      {batch.companyName} · {new Date(batch.importedAt).toLocaleDateString("pt-BR", { timeZone: "UTC" })} · {batch.sheetsFound} aba(s) · {batch.rowsFound} linha(s) ·{" "}
                      {batch.rowsAccepted} aceitas / {batch.rowsWithWarning} alerta / {batch.rowsRejected} rejeitadas · {batch.responsible}
                    </p>
                  </div>
                  <span className={cn("flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full", meta.cls)}>
                    <Icon className="w-3 h-3" /> {meta.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Cloud className="w-4 h-4 text-gray-400" />
          <p className="text-xs font-bold text-gray-800">Google Planilhas</p>
          <span className="text-[9px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Contrato futuro — sem OAuth</span>
        </div>
        <p className="text-[11px] text-gray-500 mb-3">
          Conectar Google → autorizar → selecionar planilha → mapear abas → revisar dados → ativar sincronização.
          Nenhuma dessas etapas está implementada nesta demonstração.
        </p>
        <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Ações manuais/web futuras</p>
        <p className="text-[11px] text-amber-700 mb-3">OAuth real, Drive API, Sheets API, webhook, tokens e sincronização automática ficam para uma sprint futura, fora desta demonstração.</p>

        {isManager && (
          <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-[11px] text-gray-600 space-y-1">
            <p><strong>status:</strong> {googleConnection.status}</p>
            <p><strong>syncDirection:</strong> {googleConnection.syncDirection}</p>
            <p><strong>sourceOfTruth:</strong> {googleConnection.sourceOfTruth}</p>
            <p><strong>conflictPolicy:</strong> {googleConnection.conflictPolicy}</p>
          </div>
        )}
      </div>
    </div>
  );
}
