"use client";

import { useRef, useState } from "react";
import { Paperclip, FileText, Loader2 } from "lucide-react";
import type { AssistantContextSnapshot, ProposedUpdate, ReportInterpretationResult } from "@/lib/motor-lokat/ai/types";
import { ALLOWED_REPORT_EXTENSIONS, MAX_FILE_SIZE_BYTES } from "@/lib/motor-lokat/ai/cost-controls";
import { useAssistantSession } from "./use-assistant-session";
import { ProposedUpdatesPanel } from "./proposed-updates-panel";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Fase 11/12 — attach a report, get a read-only interpretation, then optionally turn it into reviewable proposals. */
export function ReportUpload({ context, onApply }: { context: AssistantContextSnapshot; onApply: (applied: ProposedUpdate[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { status, structuredResult, errorMessage, askStructured } = useAssistantSession();
  const [clientError, setClientError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<ProposedUpdate[] | null>(null);
  const isBusy = status === "sending";

  async function handleFile(file: File) {
    setClientError(null);
    setProposals(null);
    const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_REPORT_EXTENSIONS.includes(extension)) {
      setClientError(`Extensão não suportada (${extension}). Use PDF, PNG, JPG, CSV ou TXT.`);
      return;
    }
    if (file.size <= 0) {
      setClientError("Arquivo vazio.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setClientError(`Arquivo maior que ${Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))} MB.`);
      return;
    }
    const dataBase64 = await fileToBase64(file);
    await askStructured(
      "report",
      "Interprete este relatório anexado e extraia período, fonte, métricas, classificação proposta, confiança, dados ausentes, alertas e perguntas.",
      context,
      { name: file.name, type: file.type, size: file.size, dataBase64 }
    );
  }

  async function generateProposals(report: ReportInterpretationResult) {
    const message = `Com base nesta interpretação de relatório: ${JSON.stringify(report)}, proponha atualizações de campos (proposedUpdates) — nunca aplique sozinho.`;
    const result = await askStructured("fill", message, context);
    if (result) setProposals(result.proposedUpdates);
  }

  const report = structuredResult as unknown as ReportInterpretationResult | null;

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_REPORT_EXTENSIONS.join(",")}
        className="hidden"
        onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={isBusy}
        className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-xl border disabled:opacity-50"
        style={{ borderColor: "var(--business-border)", color: "var(--business-text)", background: "var(--business-surface)" }}
      >
        {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
        Anexar relatório
      </button>
      <p className="text-[10px]" style={{ color: "var(--business-muted)" }}>PDF, PNG, JPG, CSV ou TXT — até {Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))} MB.</p>

      {isBusy && <div className="h-16 rounded-xl lokat-business-shimmer" />}
      {clientError && <p className="text-[11px] text-red-600">{clientError}</p>}
      {status === "blocked" && <p className="text-[11px]" style={{ color: "var(--business-muted)" }}>Assistente temporariamente indisponível.</p>}
      {status === "error" && errorMessage && <p className="text-[11px] text-red-600">{errorMessage}</p>}

      {report && status === "completed" && (
        <div className="rounded-2xl border p-3 space-y-2" style={{ background: "var(--business-surface)", borderColor: "var(--business-border)" }}>
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" style={{ color: "var(--business-accent)" }} />
            <p className="text-xs font-bold" style={{ color: "var(--business-text)" }}>{report.period || "Período não identificado"} — {report.source || "fonte não identificada"}</p>
          </div>
          {report.metrics.length > 0 && (
            <ul className="text-[11px] space-y-0.5" style={{ color: "var(--business-text)" }}>
              {report.metrics.map((m, i) => <li key={i}>{m.label}: <strong>{m.value}</strong> {m.unit}</li>)}
            </ul>
          )}
          <p className="text-[11px]" style={{ color: "var(--business-muted)" }}>Classificação proposta: {report.proposedClassification || "—"} · Confiança: {report.confidence}</p>
          {report.missingData.length > 0 && <p className="text-[10px] text-amber-700">Dados ausentes: {report.missingData.join(", ")}</p>}
          {report.warnings.length > 0 && <p className="text-[10px] text-red-600">{report.warnings.join(" ")}</p>}
          {report.questions.length > 0 && (
            <ul className="text-[10px] list-disc list-inside" style={{ color: "var(--business-muted)" }}>
              {report.questions.map((q, i) => <li key={i}>{q}</li>)}
            </ul>
          )}
          {!proposals && (
            <button onClick={() => generateProposals(report)} className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white" style={{ background: "var(--business-accent)" }}>
              Gerar propostas de preenchimento
            </button>
          )}
        </div>
      )}

      {proposals && <ProposedUpdatesPanel updates={proposals} onApply={onApply} onCancel={() => setProposals(null)} />}
    </div>
  );
}
