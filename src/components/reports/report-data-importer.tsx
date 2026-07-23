"use client";

/**
 * Universal file importer: select → detect format → choose report type →
 * detect columns → map columns → preview → validate → confirm → process →
 * result. Built to be reused outside Relatórios later (Estoque, Financeiro,
 * Produtos, Clientes, Campanhas) — it never assumes a specific business
 * shape beyond ImportField (src/lib/reports/import/column-mapping.ts).
 *
 * Demo-safe: everything runs in memory in the browser. Nothing is written
 * to Supabase from here yet — see docs/supabase/DRAFT-relatorios-import.sql
 * for the additive migration this will need once persistence ships.
 */

import { useRef, useState } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import {
  buildImportPreview, detectFileFormat, type ImportPreview, type ImportFileFormat,
} from "@/lib/reports/import/importer";
import { IMPORT_FIELD_LABELS, type ImportField } from "@/lib/reports/import/column-mapping";
import { XLSX_BLOCKED_REASON } from "@/lib/reports/import/xlsx-status";

type Step = "select" | "mapping" | "preview" | "done";

interface Props {
  clientId: string;
  sourceId: string; // e.g. "olaclick" or "manual" — used only for the dedupe key
  onImported?: (preview: ImportPreview) => void;
}

const IMPORT_FIELDS = Object.keys(IMPORT_FIELD_LABELS) as ImportField[];

export function ReportDataImporter({ clientId, sourceId, onImported }: Props) {
  const [step, setStep] = useState<Step>("select");
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processed, setProcessed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep("select"); setFileName(null); setPreview(null); setError(null); setProcessed(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleFile(file: File) {
    setError(null);
    const format: ImportFileFormat = detectFileFormat(file.name);

    if (format === "xlsx") { setError(XLSX_BLOCKED_REASON); return; }
    if (format === "unknown") {
      if (/\.(pdf|png|jpe?g|gif|webp)$/i.test(file.name)) {
        setError("Este formato será interpretado pelo Assistente LOKAT após a liberação do leitor de documentos. Use CSV ou JSON por enquanto.");
      } else {
        setError("Formato não reconhecido. Use .csv ou .json.");
      }
      return;
    }

    const text = await file.text();
    const result = buildImportPreview(file.name, text, sourceId, clientId);
    if ("error" in result) { setError(result.error); return; }

    setFileName(file.name);
    setPreview(result);
    setStep("mapping");
  }

  function updateMapping(header: string, field: ImportField | null) {
    if (!preview) return;
    setPreview({ ...preview, mapping: { ...preview.mapping, [header]: field } });
  }

  function confirmImport() {
    if (!preview) return;
    setProcessed(true);
    setStep("done");
    onImported?.(preview);
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5">
      {step === "select" && (
        <div
          className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-purple-300 transition-colors cursor-pointer"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        >
          <UploadCloud className="w-8 h-8 text-purple-400 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-700 mb-1">Selecione ou arraste um arquivo</p>
          <p className="text-xs text-gray-400">CSV ou JSON — XLSX está temporariamente bloqueado (ver aviso de segurança)</p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.json"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {step === "mapping" && preview && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <FileText className="w-4 h-4 text-purple-500" /> {fileName}
          </div>
          <p className="text-xs text-gray-400">Confira o mapeamento sugerido para cada coluna antes de continuar. Nenhuma importação é confirmada automaticamente.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-100">
                  <th className="py-2 pr-3">Coluna no arquivo</th>
                  <th className="py-2">Campo do LOKAT</th>
                </tr>
              </thead>
              <tbody>
                {preview.headers.map((header) => (
                  <tr key={header} className="border-b border-gray-50">
                    <td className="py-2 pr-3 font-mono text-gray-600">{header}</td>
                    <td className="py-2">
                      <select
                        value={preview.mapping[header] ?? ""}
                        onChange={(e) => updateMapping(header, (e.target.value || null) as ImportField | null)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white"
                        aria-label={`Campo para a coluna ${header}`}
                      >
                        <option value="">Não reconhecido / ignorar</option>
                        {IMPORT_FIELDS.map((f) => (
                          <option key={f} value={f}>{IMPORT_FIELD_LABELS[f]}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={reset} className="text-xs font-bold text-gray-500 px-3 py-2">Cancelar</button>
            <button onClick={() => setStep("preview")} className="text-xs font-bold text-white bg-purple-600 px-4 py-2 rounded-xl hover:bg-purple-700">
              Ver prévia
            </button>
          </div>
        </div>
      )}

      {step === "preview" && preview && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
              <p className="text-xl font-black text-emerald-700">{preview.validCount}</p>
              <p className="text-[10px] text-emerald-600">linhas válidas</p>
            </div>
            <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-center">
              <p className="text-xl font-black text-red-700">{preview.invalidCount}</p>
              <p className="text-[10px] text-red-600">linhas inválidas</p>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-center">
              <p className="text-xl font-black text-amber-700">{preview.duplicateCount}</p>
              <p className="text-[10px] text-amber-600">duplicidades no arquivo</p>
            </div>
          </div>
          {preview.periodStart && preview.periodEnd && (
            <p className="text-xs text-gray-500">Período detectado: {preview.periodStart} a {preview.periodEnd} · Fonte: {sourceId}</p>
          )}
          <div className="max-h-64 overflow-y-auto border border-gray-100 rounded-xl">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="text-left text-gray-400">
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">Situação</th>
                  <th className="py-2 px-3">Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 50).map((row) => (
                  <tr key={row.index} className="border-t border-gray-50">
                    <td className="py-1.5 px-3 text-gray-400">{row.index + 1}</td>
                    <td className="py-1.5 px-3">
                      {row.isDuplicateInFile ? (
                        <span className="inline-flex items-center gap-1 text-amber-600"><AlertTriangle className="w-3 h-3" /> Duplicada</span>
                      ) : row.valid ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3 h-3" /> Válida</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600"><XCircle className="w-3 h-3" /> Inválida</span>
                      )}
                    </td>
                    <td className="py-1.5 px-3 text-gray-500">{row.errors.join("; ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.validCount === 0 && (
            <p className="text-xs text-red-600">Nenhuma linha válida para importar — corrija o mapeamento e tente novamente.</p>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => setStep("mapping")} className="text-xs font-bold text-gray-500 px-3 py-2">Voltar ao mapeamento</button>
            <button
              onClick={confirmImport}
              disabled={preview.validCount === 0}
              className="text-xs font-bold text-white bg-purple-600 px-4 py-2 rounded-xl hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Confirmar importação
            </button>
          </div>
        </div>
      )}

      {step === "done" && preview && processed && (
        <div className="text-center py-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-800 mb-1">{preview.validCount} linha{preview.validCount !== 1 ? "s" : ""} processada{preview.validCount !== 1 ? "s" : ""}</p>
          <p className="text-xs text-gray-400 mb-4">
            Os dados ficam disponíveis nesta sessão do navegador. A persistência real (Supabase) depende da migration ainda não aplicada — ver Fontes de dados.
          </p>
          <button onClick={reset} className="text-xs font-bold text-purple-700 bg-purple-50 px-4 py-2 rounded-xl hover:bg-purple-100">
            Importar outro arquivo
          </button>
        </div>
      )}
    </div>
  );
}
